"""Predict an UPCOMING gameweek and pick a starting lineup — before it's played.

Inputs (one of): --team-id (FPL API), --squad-image (vision), --squad.
Adjust a fetched team with --out / --in. No squad -> best XI from all players.

Usage:
  python scripts/predict_upcoming.py --gw 7 --team-id 8350133 --out Szoboszlai --in Mbeumo
"""

from __future__ import annotations
import argparse, sys
from dataclasses import replace
from pathlib import Path

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

POS = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}


def fetch_fixtures(cfg, gw):
    url = f"{cfg.api_base}/fixtures/?event={gw}"
    r = requests.get(url, timeout=cfg.request_timeout_s)
    r.raise_for_status()
    return r.json()


def future_fixture_map(fixtures):
    """team_id -> (opponent_team, was_home). First fixture wins on a double GW."""
    m = {}
    for fx in fixtures:
        h, a = fx.get("team_h"), fx.get("team_a")
        if h is None or a is None:
            continue
        m.setdefault(h, (a, True))
        m.setdefault(a, (h, False))
    return m


def inject_placeholders(history, player_team, fmap, gw):
    """Replace any real/partial target-GW rows with a schedule-only placeholder."""
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
):
    player_team = {p["id"]: p["team"] for p in players}
    aug = inject_placeholders(history, player_team, fmap, gw)
    feats = LeakFreeFeatureBuilder().build(aug, teams=teams)

    train = feats[feats["round"] < gw]
    target = feats[feats["round"] == gw]
    if train.empty or target.empty:
        raise SystemExit(f"no training rows, or no GW{gw} fixtures resolved")

    train = train[FEATURE_COLUMNS + ["y"]]
    _hist = HERE / "data" / "processed" / "historical.parquet"
    if _hist.exists():  # fold in past seasons — the big data boost
        h = pd.read_parquet(_hist)[FEATURE_COLUMNS + ["y"]]
        train = pd.concat([train, h], ignore_index=True)
        print(f"training on {len(h)} historical + current rows")

    model = registry.create(model_name).fit(train[FEATURE_COLUMNS], train["y"])

    meta = pd.DataFrame(players)[["id", "element_type", "team", "now_cost", "web_name"]]
    board = target[["player_id"]].copy()
    board["pred"] = model.predict(target[FEATURE_COLUMNS]).values
    board["minutes_lag_1"] = target["minutes_lag_1"].values
    board = board.merge(meta, left_on="player_id", right_on="id")

    if squad:
        want = {s.strip().lower() for s in squad}
        board = board[board["web_name"].str.lower().isin(want)].reset_index(drop=True)
        found = set(board["web_name"].str.lower())
        missing = [s for s in squad if s.strip().lower() not in found]
        print(f"matched {len(board)}/{len(squad)} of your squad")
        if missing:
            print(
                "  not found for this GW (no fixture, or name differs from FPL):",
                ", ".join(missing),
            )
        cfg = replace(cfg, budget_cap=1000.0)  # you own them; budget doesn't bind
    else:
        board = board[board["minutes_lag_1"] >= min_minutes].reset_index(drop=True)

    try:
        xi = IlpSquadOptimizer(default_constraints(cfg)).select(
            board, points_col="pred"
        )
    except RuntimeError:
        raise SystemExit(
            "Couldn't form a legal XI. If you passed a squad, check the names match "
            "web_name exactly (see the matched count) and that your 15 contain at least "
            "1 GK, 3 DEF, 2 MID and 1 FWD."
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
    ap.add_argument(
        "--out",
        default=None,
        help="web_names to remove (transfers out), comma-separated",
    )
    ap.add_argument(
        "--in",
        dest="in_",
        default=None,
        help="web_names to add (transfers in), comma-separated",
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
        players, history, teams, fmap, args.gw, cfg, args.model, squad
    )

    xi = xi.copy()
    xi["pos"] = xi["element_type"].map(POS)
    xi = xi.sort_values(["element_type", "pred"], ascending=[True, False])
    cap = xi.loc[xi["pred"].idxmax()]
    print(f"\n=== GW{args.gw} starting XI (model={args.model}) ===")
    for _, r in xi.iterrows():
        c = "  (C)" if r["web_name"] == cap["web_name"] else ""
        print(f"  {r['pos']:3} {r['web_name']:14} pred {r['pred']:4.1f}{c}")
    print(f"Captain: {cap['web_name']} (pred {cap['pred']:.1f}, doubled)")
    if len(bench):
        print("Bench (auto-sub order):")
        for _, r in bench.iterrows():
            print(
                f"  {POS[r['element_type']]:3} {r['web_name']:14} pred {r['pred']:4.1f}"
            )


if __name__ == "__main__":
    main()
