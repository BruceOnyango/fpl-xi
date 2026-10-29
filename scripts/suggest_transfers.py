"""Recommend free transfers for the upcoming gameweek(s).

Predicts every player's points over an N-gameweek horizon (the right basis for a
multi-week transfer), then for your squad finds the swaps with the best
predicted-points gain under budget and the 3-per-club limit. Free transfers need
a positive gain; each extra transfer is a -4 hit and must clearly beat that.

Sell value is approximated as current price (FPL's half-price-rise rule needs a
login the public API doesn't give), so pass your real --bank.

Usage:
  python scripts/suggest_transfers.py --gw 9 --team-id 8350133 --team-event 8 \
      --horizon 6 --bank 2 --free-transfers 1
"""

from __future__ import annotations
import argparse, sys
from pathlib import Path

# Windows consoles default to cp1252, which can't print names like "Mitrović".
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "src"))
import pandas as pd
from fpl.config import FplConfig
from fpl.data.repository import JsonRawDataRepository
from fpl.features.builder import LeakFreeFeatureBuilder, FEATURE_COLUMNS
from fpl.models import registry

# reuse the validated, DGW-correct prediction pieces
from predict_upcoming import (
    future_fixture_map,
    inject_placeholders,
    _horizon_train,
    fetch_fixtures,
    unavailable,
)

POS = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}


def scored_board(players, history, teams, fmap, gw, horizon, model_name="gbm"):
    """Every player with an N-GW horizon prediction for the target gameweek."""
    player_team = {p["id"]: p["team"] for p in players}
    feats = LeakFreeFeatureBuilder().build(
        inject_placeholders(history, player_team, fmap, gw), teams=teams
    )
    train = feats[feats["round"] < gw]
    target = feats[feats["round"] == gw]
    if train.empty or target.empty:
        raise SystemExit(f"no training rows, or no GW{gw} fixtures resolved")
    model = registry.create(model_name).fit(*_split(_horizon_train(train, horizon, gw)))
    meta = pd.DataFrame(players)[["id", "element_type", "team", "now_cost", "web_name"]]
    board = target[["player_id"]].copy()
    board["pred"] = model.predict(target[FEATURE_COLUMNS]).values
    board = board.merge(meta, left_on="player_id", right_on="id")
    board["now_cost"] = board["now_cost"] / 10.0  # FPL stores tenths -> £m
    return board


def _split(tr):
    return tr[FEATURE_COLUMNS], tr["target"]


def candidate_swaps(squad, market, bank):
    owned = set(squad["id"])
    club_count = squad["team"].value_counts().to_dict()
    rows = []
    for _, out in squad.iterrows():
        budget = bank + out["now_cost"]
        pool = market[
            (market["element_type"] == out["element_type"])
            & (~market["id"].isin(owned))
            & (market["now_cost"] <= budget)
        ]
        for _, inn in pool.iterrows():
            cc = dict(club_count)
            cc[out["team"]] = cc.get(out["team"], 0) - 1
            if cc.get(inn["team"], 0) >= 3:
                continue
            rows.append(
                dict(
                    out=out["web_name"],
                    inn=inn["web_name"],
                    out_id=out["id"],
                    in_id=inn["id"],
                    gain=float(inn["pred"] - out["pred"]),
                    spend=float(inn["now_cost"] - out["now_cost"]),
                )
            )
    return pd.DataFrame(rows).sort_values("gain", ascending=False)


def recommend(squad, market, bank, free_transfers, hit=4.0):
    swaps = candidate_swaps(squad, market, bank)
    chosen, used_out, used_in, spent = [], set(), set(), 0.0
    for _, s in swaps.iterrows():
        if s["out_id"] in used_out or s["in_id"] in used_in:
            continue
        threshold = 0.0 if len(chosen) < free_transfers else hit
        if s["gain"] <= threshold or spent + s["spend"] > bank + 1e-9:
            continue
        chosen.append(s)
        used_out.add(s["out_id"])
        used_in.add(s["in_id"])
        spent += s["spend"]
        if len(chosen) >= free_transfers + 2:
            break
    return chosen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gw", type=int, required=True)
    ap.add_argument("--model", default="gbm")
    ap.add_argument("--horizon", type=int, default=6)
    ap.add_argument("--bank", type=float, default=0.0, help="money in the bank (£m)")
    ap.add_argument("--free-transfers", dest="ft", type=int, default=1)
    ap.add_argument("--team-id", dest="team_id", type=int, default=None)
    ap.add_argument("--team-event", dest="team_event", type=int, default=None)
    ap.add_argument(
        "--squad", default=None, help="comma-separated web_names (if no team-id)"
    )
    ap.add_argument("--min-chance", type=float, default=75)
    args = ap.parse_args()

    cfg = FplConfig()
    repo = JsonRawDataRepository(HERE / "data" / "raw")
    players = repo.load("players")
    history = {int(k): v for k, v in repo.load("history").items()}
    teams = {t["id"]: t for t in repo.load("teams")}
    fmap = future_fixture_map(fetch_fixtures(cfg, args.gw))

    if args.team_id:
        from fpl.api.manager import squad_names

        names, ev = squad_names(args.team_id, players, cfg, args.team_event)
        print(f"loaded team {args.team_id} as of GW{ev}")
    elif args.squad:
        names = [s.strip() for s in args.squad.split(",")]
    else:
        raise SystemExit("pass --team-id or --squad")

    board = scored_board(
        players, history, teams, fmap, args.gw, args.horizon, args.model
    )
    want = {n.lower() for n in names}
    squad = board[board["web_name"].str.lower().isin(want)].reset_index(drop=True)
    print(f"matched {len(squad)}/{len(names)} of your squad")

    # market = everyone not owned and fit to play
    excluded = unavailable(players, args.min_chance)
    market = board[
        (~board["id"].isin(set(squad["id"]))) & (~board["id"].isin(excluded))
    ].reset_index(drop=True)

    recs = recommend(squad, market, args.bank, args.ft)
    tag = f"{args.horizon}-GW" if args.horizon > 1 else "1-GW"
    print(
        f"\n=== Transfer suggestions (GW{args.gw}, {tag} outlook, "
        f"{args.ft} free, bank £{args.bank}m) ==="
    )
    if not recs:
        print("  No transfer clears the bar — hold your transfer(s).")
        return
    total_gain, hits = 0.0, max(0, len(recs) - args.ft)
    for i, s in enumerate(recs):
        tag_hit = "  (-4 hit)" if i >= args.ft else ""
        print(
            f"  {POS[int(squad.loc[squad.id==s['out_id'],'element_type'].iloc[0])]}  "
            f"OUT {s['out']:14} -> IN {s['inn']:14}  +{s['gain']:.1f} pts over {tag}"
            f"  (£{s['spend']:+.1f}m){tag_hit}"
        )
        total_gain += s["gain"]
    net = total_gain - 4 * hits
    print(
        f"\n  gross +{total_gain:.1f} pts | {hits} hit(s) -{4*hits} | net +{net:.1f} over {tag}"
    )
    if hits and net <= 0:
        print("  → the hit doesn't pay off; take only the free transfer(s).")


if __name__ == "__main__":
    main()
