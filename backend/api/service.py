"""Assemble API responses from live FPL state + your exported predictions.

No training happens here. The only "computation" is cheap: joining, the availability
gate, and the same ILP + captain rule predict_upcoming.py uses, run on a 15-man squad.
"""

from __future__ import annotations
import math
from dataclasses import replace

import pandas as pd

from fpl.config import FplConfig
from fpl.optimization.ilp import IlpSquadOptimizer, default_constraints
from fpl.selection.captain import pick_captain

from . import models as m
from .fpl_live import FplLive
from .store import ArtifactStore, PlayerPrediction, Predictions

POS = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
#: Mirrors scripts/predict_upcoming.py: injured, suspended, unavailable, not in squad.
OUT_STATUS = {"i", "s", "u", "n"}
#: Same default as predict_upcoming --min-chance.
MIN_CHANCE = 75
ZERO = PlayerPrediction(0.0, 0.0, 0.0, 0.0)
#: Premier League yellow-card bans: (yellows, last GW the count applies to). Reaching the
#: count within that window means a ban. The rule counts a club's matches, not GWs;
#: the GW is a close-enough proxy (blanks/doubles shift it by a game or so).
BAN_THRESHOLDS = ((5, 19), (10, 32), (15, 38))


def one_yellow_from_ban(yellows: int, next_gw: int) -> bool:
    """True if one more booking in `next_gw` would trigger a suspension."""
    return any(yellows == n - 1 and next_gw <= last for n, last in BAN_THRESHOLDS)


class NoPredictions(Exception):
    """predictions.json hasn't been exported yet."""


def _f(v, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


class Service:
    def __init__(self, live: FplLive, store: ArtifactStore, cfg: FplConfig | None = None):
        self.live = live
        self.store = store
        self.cfg = cfg or FplConfig()

    # -- helpers ------------------------------------------------------------

    def _preds(self) -> Predictions:
        p = self.store.predictions()
        if p is None:
            raise NoPredictions(
                "No predictions exported yet. Run: cd backend && python scripts/export_predictions.py --gw <next GW>"
            )
        return p

    def _events(self) -> list[dict]:
        return self.live.bootstrap().data["events"]

    def _gw_state(self) -> tuple[int | None, int, str]:
        events = self._events()
        current = next((e["id"] for e in events if e.get("is_current")), None)
        nxt = next((e for e in events if e.get("is_next")), None) or events[-1]
        return current, nxt["id"], nxt["deadline_time"]

    def _last_finished(self) -> int:
        finished = [e["id"] for e in self._events() if e.get("finished")]
        if not finished:
            raise LookupError("No finished gameweeks yet, so there's no squad to read.")
        return max(finished)

    @staticmethod
    def _unavailable(el: dict) -> str | None:
        name = el["web_name"]
        if el.get("status") in OUT_STATUS:
            label = {"i": "injured", "s": "suspended", "u": "unavailable", "n": "not in the squad"}[el["status"]]
            return f"{name} is flagged {label}"
        ch = el.get("chance_of_playing_next_round")
        if ch is not None and ch < MIN_CHANCE:
            return f"{name} has a {ch}% chance of playing"
        return None

    def _player(self, el: dict, pred: PlayerPrediction, next_gw: int) -> m.Player:
        if el.get("status") in OUT_STATUS:
            # Ruled out: the model can't see that, but we can. Don't show phantom points.
            pred = ZERO
        return m.Player(
            id=el["id"],
            web_name=el["web_name"],
            first_name=el["first_name"],
            second_name=el["second_name"],
            team_id=el["team"],
            position=POS[el["element_type"]],
            price=el["now_cost"] / 10,
            status=el.get("status", "a"),
            chance_of_playing=el.get("chance_of_playing_next_round"),
            news=el.get("news") or "",
            selected_by_percent=_f(el.get("selected_by_percent")),
            form=_f(el.get("form")),
            total_points=_f(el.get("total_points")),
            points_per_game=_f(el.get("points_per_game")),
            minutes=_f(el.get("minutes")),
            xg=_f(el.get("expected_goals")),
            xa=_f(el.get("expected_assists")),
            yellow_cards=int(el.get("yellow_cards") or 0),
            # Already banned players are flagged "s" by FPL; no point warning about them too.
            one_yellow_from_ban=el.get("status") != "s"
            and one_yellow_from_ban(int(el.get("yellow_cards") or 0), next_gw),
            prediction=m.Prediction(points=pred.points, low=pred.low, high=pred.high),
        )

    def _elements(self) -> list[dict]:
        return [e for e in self.live.bootstrap().data["elements"] if e.get("element_type") in POS]

    # -- resources ----------------------------------------------------------

    def meta(self) -> m.MetaResponse:
        current, nxt, deadline = self._gw_state()
        p = self.store.predictions()
        bt = self.store.backtest(1)
        summary = None
        if bt:
            s = bt["summary"]
            summary = m.ModelSummary(
                name=bt.get("model", "gbm"),
                spearman=s["spearman_mean"],
                spearman_std=s["spearman_std"],
                beats_persistence_pct=s["beats_baseline_pct"],
                held_out_gameweeks=s["held_out_gameweeks"],
            )
        return m.MetaResponse(
            data_fetched_at=self.live.bootstrap().fetched_at,
            predictions_generated_at=p.generated_at if p else None,
            predictions_gw=p.gw if p else None,
            current_gw=current,
            next_gw=nxt,
            next_deadline=deadline,
            model=summary,
        )

    def teams(self) -> m.TeamsResponse:
        b = self.live.bootstrap()
        return m.TeamsResponse(
            data_fetched_at=b.fetched_at,
            teams=[
                m.Team(
                    id=t["id"],
                    name=t["name"],
                    short_name=t["short_name"],
                    strength_home=t.get("strength_overall_home"),
                    strength_away=t.get("strength_overall_away"),
                )
                for t in b.data["teams"]
            ],
        )

    def players(self, horizon: int) -> m.PlayersResponse:
        p = self._preds()
        preds = p.by_horizon.get(horizon, {})
        _, next_gw, _ = self._gw_state()
        return m.PlayersResponse(
            data_fetched_at=self.live.bootstrap().fetched_at,
            predictions_generated_at=p.generated_at,
            gw=p.gw,
            horizon=horizon,
            players=[self._player(el, preds.get(el["id"], ZERO), next_gw) for el in self._elements()],
        )

    def fixtures(self, from_gw: int, to_gw: int) -> m.FixturesResponse:
        f = self.live.fixtures()
        out = []
        for x in f.data:
            gw = x.get("event")
            if gw is None or not (from_gw <= gw <= to_gw) or not x.get("kickoff_time"):
                continue
            out.append(
                m.Fixture(
                    id=x["id"],
                    gw=gw,
                    kickoff=x["kickoff_time"],
                    home_team_id=x["team_h"],
                    away_team_id=x["team_a"],
                    home_difficulty=x["team_h_difficulty"],
                    away_difficulty=x["team_a_difficulty"],
                    finished=bool(x.get("finished")),
                    home_score=x.get("team_h_score"),
                    away_score=x.get("team_a_score"),
                )
            )
        return m.FixturesResponse(data_fetched_at=f.fetched_at, fixtures=out)

    def backtest(self, horizon: int) -> m.BacktestResponse:
        bt = self.store.backtest(horizon)
        series = (
            [m.BacktestPoint(label=r["label"], model=r["model"], persistence=r["baseline"]) for r in bt["series"]]
            if bt
            else []
        )
        return m.BacktestResponse(model=(bt or {}).get("model", "gbm"), horizon=horizon, series=series)

    # -- manager ------------------------------------------------------------

    @staticmethod
    def free_transfers(history: dict, last_gw: int) -> int:
        """Estimate FTs available for the next GW from public history.

        Rule (2024/25+): +1 per GW, banked up to 5; wildcard / free hit weeks don't
        consume banked transfers. The FPL API only exposes the exact number to the
        logged-in owner, so this is an estimate.
        """
        chips = {c["event"]: c["name"] for c in history.get("chips", [])}
        made = {r["event"]: r.get("event_transfers", 0) for r in history.get("current", [])}
        first = min(made) if made else last_gw
        ft = 1
        for gw in range(first + 1, last_gw + 1):
            if chips.get(gw) in {"wildcard", "freehit"}:
                ft = min(5, ft + 1)
            else:
                ft = min(5, max(0, ft - made.get(gw, 0)) + 1)
        return ft

    def _lineup(self, squad: list[dict], horizon: int, p: Predictions) -> m.Lineup:
        hp = p.by_horizon.get(horizon, {})
        one = p.by_horizon.get(1, {})
        rows = []
        excluded: list[m.Excluded] = []
        for el in squad:
            reason = self._unavailable(el)
            if reason:
                excluded.append(m.Excluded(player_id=el["id"], reason=reason))
            # Ruled-out players score nothing — same rule as /players, so the pitch and lists agree.
            pr = ZERO if el.get("status") in OUT_STATUS else hp.get(el["id"], ZERO)
            rows.append(
                dict(
                    id=el["id"],
                    element_type=el["element_type"],
                    team=el["team"],
                    now_cost=el["now_cost"],
                    pred=pr.points,
                    capt_pred=one.get(el["id"], ZERO).capt,
                )
            )
        board = pd.DataFrame(rows)
        excluded_ids = {e.player_id for e in excluded}
        # Squad is already a legal 15, so lift the budget (as predict_upcoming does).
        opt = IlpSquadOptimizer(default_constraints(replace(self.cfg, budget_cap=1000.0)))
        try:
            xi = opt.select(board[~board["id"].isin(excluded_ids)], points_col="pred")
        except RuntimeError:
            # Too many absentees to field a legal XI: ignore the gate rather than fail.
            xi = opt.select(board, points_col="pred")
            excluded = []
            excluded_ids = set()
        xi = xi.set_index("id", drop=False)
        cap = int(pick_captain(xi, "capt_pred"))
        vice = int(pick_captain(xi.drop(index=cap), "capt_pred"))

        starter_ids = set(xi["id"])
        rest = board[~board["id"].isin(starter_ids)]
        bench_gk = rest[(rest["element_type"] == 1) & ~rest["id"].isin(excluded_ids)]
        bench_out = rest[(rest["element_type"] != 1) & ~rest["id"].isin(excluded_ids)].sort_values(
            "pred", ascending=False
        )
        bench_ex = rest[rest["id"].isin(excluded_ids)]
        bench = pd.concat([bench_gk, bench_out, bench_ex])

        counts = xi["element_type"].value_counts()
        formation = f"{counts.get(2, 0)}-{counts.get(3, 0)}-{counts.get(4, 0)}"
        counted = list(xi["id"]) + [cap]
        total = sum(one.get(i, ZERO).points for i in counted)
        # Ranges don't add linearly; combine per-player deviations in quadrature.
        dn = math.sqrt(sum((one.get(i, ZERO).points - one.get(i, ZERO).low) ** 2 for i in counted))
        up = math.sqrt(sum((one.get(i, ZERO).high - one.get(i, ZERO).points) ** 2 for i in counted))

        xi_sorted = xi.sort_values(["element_type", "pred"], ascending=[True, False])
        return m.Lineup(
            data_fetched_at=self.live.bootstrap().fetched_at,
            predictions_generated_at=p.generated_at,
            gw=p.gw,
            horizon=horizon,
            formation=formation,
            starters=[m.LineupSlot(player_id=int(r.id), predicted=round(r.pred, 2)) for r in xi_sorted.itertuples()],
            bench=[m.LineupSlot(player_id=int(r.id), predicted=round(r.pred, 2)) for r in bench.itertuples()],
            captain_id=cap,
            vice_captain_id=vice,
            projected_points=round(total, 1),
            projected_range=m.Range(low=round(max(0.0, total - dn), 1), high=round(total + up, 1)),
            excluded=excluded,
        )

    def manager_squad(self, team_id: int, horizon: int) -> m.ManagerSquadResponse:
        p = self._preds()
        last = self._last_finished()
        entry = self.live.entry(team_id).data
        history = self.live.entry_history(team_id).data
        picks = self.live.picks(team_id, last).data
        by_id = {el["id"]: el for el in self._elements()}
        squad = [by_id[pk["element"]] for pk in picks.get("picks", []) if pk["element"] in by_id]
        if len(squad) != 15:
            raise LookupError(f"Team {team_id} has {len(squad)} players in GW{last}; expected 15.")

        current = sorted(history.get("current", []), key=lambda r: r["event"])
        last_row = current[-1] if current else {}
        prev_row = current[-2] if len(current) > 1 else None
        eh = picks.get("entry_history", {})
        name = f"{entry.get('player_first_name', '')} {entry.get('player_last_name', '')}".strip()

        return m.ManagerSquadResponse(
            data_fetched_at=self.live.bootstrap().fetched_at,
            predictions_generated_at=p.generated_at,
            manager=m.Manager(
                id=team_id,
                player_name=name or f"Team {team_id}",
                team_name=entry.get("name") or f"Team {team_id}",
                overall_rank=entry.get("summary_overall_rank"),
                overall_points=_f(entry.get("summary_overall_points")),
                last_gw_points=_f(last_row.get("points", eh.get("points"))),
                last_gw_rank=last_row.get("rank"),
                previous_gw_points=_f(prev_row["points"]) if prev_row else None,
                bank=_f(eh.get("bank", entry.get("last_deadline_bank"))) / 10,
                team_value=_f(eh.get("value", entry.get("last_deadline_value"))) / 10,
                free_transfers=self.free_transfers(history, last),
            ),
            # Selling price needs the owner's login; current price is the public approximation.
            squad=[m.SquadPick(player_id=el["id"], selling_price=el["now_cost"] / 10) for el in squad],
            recommended=self._lineup(squad, horizon, p),
        )

    def leagues(self, team_id: int, limit: int = 5) -> m.LeaguesResponse:
        entry = self.live.entry(team_id)
        classic = entry.data.get("leagues", {}).get("classic", [])
        # Invitational ('x') mini-leagues only; system leagues (overall, country) have millions of entries.
        private = [lg for lg in classic if lg.get("league_type") == "x"][:limit]
        leagues = []
        for lg in private:
            st = self.live.league(lg["id"]).data
            results = st.get("standings", {}).get("results", [])
            leagues.append(
                m.League(
                    id=lg["id"],
                    name=lg["name"],
                    entries=[
                        m.LeagueEntry(
                            entry_id=r["entry"],
                            rank=r["rank"],
                            last_rank=r.get("last_rank") or None,
                            player_name=r["player_name"],
                            team_name=r["entry_name"],
                            gw_points=r["event_total"],
                            total=r["total"],
                        )
                        for r in results
                    ],
                )
            )
        return m.LeaguesResponse(data_fetched_at=entry.fetched_at, leagues=leagues)
