"""Predict an UPCOMING gameweek and pick a starting lineup — before it's played.

Inputs (one of): --team-id (FPL API), --squad-image (vision), --squad.
Adjust a fetched team with --out / --in.

--horizon N picks the squad on the best N-gameweek outlook (less single-match
noise, the right basis for transfers). Captaincy always stays single-GW.

A live availability gate drops injured/suspended/doubtful players (FPL status +
chance_of_playing_next_round) before selection, so the XI never starts someone
ruled out this week — the thing a lagging minutes filter can't catch.

Usage:
  python scripts/predict_upcoming.py --gw 8 --team-id 8350133 --horizon 6
"""

from __future__ import annotations
import argparse, sys
from dataclasses import replace
from pathlib import Path

# Windows consoles default to cp1252, which can't print names like "Mitrović".
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "src"))
import numpy as np
import pandas as pd
import requests
from fpl.config import FplConfig
from fpl.data.repository import JsonRawDataRepository
from fpl.features.builder import LeakFreeFeatureBuilder, FEATURE_COLUMNS
from fpl.models import registry
from fpl.optimization.ilp import IlpSquadOptimizer, default_constraints
from fpl.selection.captain import pick_captain

POS = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
OUT_STATUS = {"i", "s", "u", "n"}  # injured, suspended, unavailable, not in squad


def fetch_fixtures(cfg, gw):
    r = requests.get(
        f"{cfg.api_base}/fixtures/?event={gw}", timeout=cfg.request_timeout_s
    )
    r.raise_for_status()
    return r.json()


def future_fixture_map(fixtures):
    m = {}
    for fx in fixtures:
        h, a = fx.get("team_h"), fx.get("team_a")
        if h is None or a is None:
            continue
        m.setdefault(h, (a, True))
        m.setdefault(a, (h, False))
    return m


def unavailable(players, min_chance):
    """player_id -> reason, for anyone unfit to start this week."""
    out = {}
    for p in players:
        st = p.get("status", "a")
        ch = p.get("chance_of_playing_next_round")
        if st in OUT_STATUS:
            out[p["id"]] = f"{p['web_name']} (status={st})"
        elif ch is not None and ch < min_chance:
            out[p["id"]] = f"{p['web_name']} ({ch}% chance)"
    return out


def inject_placeholders(history, player_team, fmap, gw):
    out = {}
    nan = float("nan")
    for pid, rows in history.items():
        fx = fmap.get(player_team.get(pid))
        rows = [r for r in rows if r.get("round") != gw]
        if fx is not None:
            opp, home = fx
            rows.append(
                dict(
                    round=gw,
                    total_points=nan,
                    minutes=nan,
                    expected_goals=nan,
                    expected_assists=nan,
                    transfers_in=nan,
                    transfers_out=nan,
                    value=nan,
                    was_home=home,
                    opponent_team=opp,
                )
            )
        out[pid] = rows
    return out


def _horizon_train(current_train, horizon, gw):
    """Combined training set with an N-gameweek-sum target, leak-safe. Folds in
    past seasons from historical.parquet when present."""

    def nsum(g):
        return g[::-1].rolling(horizon, min_periods=horizon).sum()[::-1]

    c = current_train.sort_values("round").copy()
    c["target"] = c.groupby("player_id")["y"].transform(nsum)
    c = c[c["round"] + (horizon - 1) < gw].dropna(subset=["target"])
    parts = [c[FEATURE_COLUMNS + ["target"]]]

    hist_path = HERE / "data" / "processed" / "historical.parquet"
    if hist_path.exists():
        h = (
            pd.read_parquet(hist_path)
            .sort_values(["season", "player_id", "round"])
            .copy()
        )
        h["target"] = h.groupby(["season", "player_id"])["y"].transform(nsum)
        h = h.dropna(subset=["target"])
        parts.append(h[FEATURE_COLUMNS + ["target"]])
        print(
            f"training on {len(h)} historical + {len(c)} current rows (horizon {horizon})"
        )
    return pd.concat(parts, ignore_index=True)


def knn_interval(hold_pred, hold_actual, pred, k=150, q=(0.1, 0.9)):
    """Empirical interval for each value in `pred` from its k nearest held-out predictions.

    For a prediction p, take the k held-out rows whose predictions were closest to p and
    return the q-quantiles of what those players *actually* scored. Smooth in p (so a
    33-point and a 25-point prediction get different ranges), out-of-sample, and it
    widens where outcomes are genuinely wider. Clipped so low <= p <= high.

    Replaced a 5-bin version that gave every top player the same range and capped the
    top bin's upside barely above the highest predictions.
    """
    order = np.argsort(hold_pred)
    sp, sa = np.asarray(hold_pred)[order], np.asarray(hold_actual)[order]
    k = min(k, len(sp))
    starts = np.clip(np.searchsorted(sp, pred) - k // 2, 0, len(sp) - k)
    windows = sa[starts[:, None] + np.arange(k)]
    low = np.quantile(windows, q[0], axis=1)
    high = np.quantile(windows, q[1], axis=1)
    pred = np.asarray(pred, dtype=float)
    return np.minimum(low, pred), np.maximum(high, pred)


def _fit_with_interval(model_name, train, target_rows, q=(0.1, 0.9), holdout=0.15):
    """Fit on (1-holdout) of `train`; interval from the held-out rows via knn_interval.

    Checked on GW9/6-GW data: the 80% interval covered 88% of unseen held-out outcomes
    overall and 78.5% among the top-10% predictions. Returns (pred, low, high).
    """
    rng = np.random.default_rng(0)
    mask = rng.random(len(train)) < holdout
    fit, hold = train[~mask], train[mask]
    model = registry.create(model_name).fit(fit[FEATURE_COLUMNS], fit["target"])
    hold_pred = model.predict(hold[FEATURE_COLUMNS]).values
    pred = model.predict(target_rows[FEATURE_COLUMNS]).values
    low, high = knn_interval(hold_pred, hold["target"].values, pred, q=q)
    return pred, low, high


def predict_board(players, history, teams, fmap, gw, model_name="gbm", horizon=1, interval=False):
    """Predictions for every player with a GW `gw` fixture.

    Columns: pred (horizon-sum), capt_pred (1-GW), minutes_lag_1, plus FPL meta.
    With interval=True also pred_low/pred_high (80% empirical interval); the squad
    model is then fit on 85% of training rows so the interval is out-of-sample.
    """
    player_team = {p["id"]: p["team"] for p in players}
    aug = inject_placeholders(history, player_team, fmap, gw)
    feats = LeakFreeFeatureBuilder().build(aug, teams=teams)

    current_train = feats[feats["round"] < gw]
    target_rows = feats[feats["round"] == gw]
    if current_train.empty or target_rows.empty:
        raise SystemExit(f"no training rows, or no GW{gw} fixtures resolved")

    board = target_rows[["player_id"]].copy()
    squad_tr = _horizon_train(current_train, horizon, gw)
    if interval:
        pred, low, high = _fit_with_interval(model_name, squad_tr, target_rows)
        board["pred"], board["pred_low"], board["pred_high"] = pred, low, high
        capt_pred = pred
    else:
        squad_model = registry.create(model_name).fit(
            squad_tr[FEATURE_COLUMNS], squad_tr["target"]
        )
        board["pred"] = squad_model.predict(target_rows[FEATURE_COLUMNS]).values
        capt_pred = board["pred"].values
    if horizon != 1:
        capt_tr = _horizon_train(current_train, 1, gw)
        capt_model = registry.create(model_name).fit(
            capt_tr[FEATURE_COLUMNS], capt_tr["target"]
        )
        capt_pred = capt_model.predict(target_rows[FEATURE_COLUMNS]).values
    board["capt_pred"] = capt_pred
    board["minutes_lag_1"] = target_rows["minutes_lag_1"].values

    meta = pd.DataFrame(players)[["id", "element_type", "team", "now_cost", "web_name"]]
    return board.merge(meta, left_on="player_id", right_on="id")


def pick_upcoming(
    players,
    history,
    teams,
    fmap,
    gw,
    cfg,
    model_name="gbm",
    squad=None,
    min_minutes=60.0,
    horizon=1,
    excluded=None,
):
    excluded = excluded or {}
    board = predict_board(players, history, teams, fmap, gw, model_name, horizon)

    # live availability gate — never start someone ruled out this week
    hit = board[board["player_id"].isin(excluded)]
    if not hit.empty:
        print(
            "unavailable, excluded:", ", ".join(excluded[i] for i in hit["player_id"])
        )
    board = board[~board["player_id"].isin(excluded)].reset_index(drop=True)

    if squad:
        want = {s.strip().lower() for s in squad}
        board = board[board["web_name"].str.lower().isin(want)].reset_index(drop=True)
        found = set(board["web_name"].str.lower())
        missing = [s for s in squad if s.strip().lower() not in found]
        print(f"matched {len(board)}/{len(squad)} of your squad")
        if missing:
            print(
                "  not found (no fixture, injured/excluded, or name differs):",
                ", ".join(missing),
            )
        cfg = replace(cfg, budget_cap=1000.0)
    else:
        board = board[board["minutes_lag_1"] >= min_minutes].reset_index(drop=True)

    try:
        xi = IlpSquadOptimizer(default_constraints(cfg)).select(
            board, points_col="pred"
        )
    except RuntimeError:
        raise SystemExit(
            "Couldn't form a legal XI. If you passed a squad, check the names match "
            "web_name exactly (see the matched count) and that your available players "
            "still cover 1 GK, 3 DEF, 2 MID and 1 FWD."
        )
    bench = (
        board[~board["id"].isin(set(xi["id"]))].sort_values("pred", ascending=False)
        if squad
        else pd.DataFrame()
    )
    return xi, bench


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gw", type=int, required=True)
    ap.add_argument("--model", default="gbm")
    ap.add_argument(
        "--horizon",
        type=int,
        default=1,
        help="pick squad on best N-gameweek outlook (captaincy stays 1-GW)",
    )
    ap.add_argument(
        "--min-chance",
        type=float,
        default=75,
        help="drop doubtful players below this chance_of_playing %",
    )
    ap.add_argument(
        "--squad", default=None, help="comma-separated web_names of your 15"
    )
    ap.add_argument(
        "--team-id",
        dest="team_id",
        type=int,
        default=None,
        help="your FPL team ID — loads your squad from the FPL API",
    )
    ap.add_argument(
        "--team-event",
        dest="team_event",
        type=int,
        default=None,
        help="gameweek to read the squad from (default: last finished)",
    )
    ap.add_argument(
        "--squad-image",
        dest="squad_image",
        default=None,
        help="path to a screenshot of your FPL team (read via Claude vision)",
    )
    ap.add_argument("--vision-model", default="claude-sonnet-5-5")
    ap.add_argument("--out", default=None, help="web_names to remove (transfers out)")
    ap.add_argument(
        "--in", dest="in_", default=None, help="web_names to add (transfers in)"
    )
    ap.add_argument(
        "--no-availability", action="store_true", help="skip the injury/suspension gate"
    )
    ap.add_argument("--budget", type=float, default=None)
    args = ap.parse_args()

    cfg = FplConfig()
    if args.budget is not None:
        cfg = replace(cfg, budget_cap=args.budget)
    repo = JsonRawDataRepository(HERE / "data" / "raw")
    players = repo.load("players")
    history = {int(k): v for k, v in repo.load("history").items()}
    teams = {t["id"]: t for t in repo.load("teams")}
    fmap = future_fixture_map(fetch_fixtures(cfg, args.gw))
    excluded = {} if args.no_availability else unavailable(players, args.min_chance)

    if args.team_id:
        from fpl.api.manager import squad_names

        squad, ev = squad_names(args.team_id, players, cfg, args.team_event)
        print(
            f"loaded {len(squad)} players from team {args.team_id} (as of GW{ev}; "
            "edit if you've transferred since)"
        )
    elif args.squad_image:
        from fpl.vision.squad_reader import extract_squad

        squad = extract_squad(args.squad_image, args.vision_model)
        print("read squad from image:", ", ".join(squad))
    elif args.squad:
        squad = args.squad.split(",")
    else:
        squad = None

    if squad is not None and (args.out or args.in_):
        out_names = {
            s.strip().lower()
            for s in (args.out.split(",") if args.out else [])
            if s.strip()
        }
        in_names = [
            s.strip() for s in (args.in_.split(",") if args.in_ else []) if s.strip()
        ]
        squad = [s for s in squad if s.strip().lower() not in out_names] + in_names
        print(
            f"after transfers (out {len(out_names)}, in {len(in_names)}): {len(squad)} players"
        )

    xi, bench = pick_upcoming(
        players,
        history,
        teams,
        fmap,
        args.gw,
        cfg,
        args.model,
        squad,
        horizon=args.horizon,
        excluded=excluded,
    )

    xi = xi.copy()
    xi["pos"] = xi["element_type"].map(POS)
    xi = xi.sort_values(["element_type", "pred"], ascending=[True, False])
    cap = xi.loc[pick_captain(xi, "capt_pred")]
    tag = f"{args.horizon}-GW outlook" if args.horizon > 1 else "1-GW"
    print(f"\n=== GW{args.gw} starting XI (model={args.model}, {tag}) ===")
    for _, r in xi.iterrows():
        c = "  (C)" if r["web_name"] == cap["web_name"] else ""
        print(f"  {r['pos']:3} {r['web_name']:14} pred {r['pred']:5.1f}{c}")
    print(f"Captain: {cap['web_name']} (1-GW pred {cap['capt_pred']:.1f}, doubled)")
    if len(bench):
        print("Bench (auto-sub order):")
        for _, r in bench.iterrows():
            print(
                f"  {POS[r['element_type']]:3} {r['web_name']:14} pred {r['pred']:5.1f}"
            )


if __name__ == "__main__":
    main()
