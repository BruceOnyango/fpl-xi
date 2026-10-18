"""Pick the best XI for a specific gameweek at a chosen budget, and show the
roster — not just the score. Trains on everything before --gw, predicts --gw,
selects under budget + formation + club + minutes filters.

Usage:
  python scripts/pick_gw.py --model gbm --gw 6 --budget 105
"""

from __future__ import annotations
import argparse, sys
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import pandas as pd
from fpl.config import FplConfig
from fpl.features.builder import FEATURE_COLUMNS
from fpl.models import registry
from fpl.optimization.ilp import IlpSquadOptimizer, default_constraints
from fpl.selection.filters import MinutesFilter, apply_filters

PROC = Path(__file__).resolve().parents[1] / "data" / "processed"
POS = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="gbm")
    ap.add_argument("--gw", type=int, required=True)
    ap.add_argument(
        "--budget", type=float, default=None, help="£m cap (default: config)"
    )
    ap.add_argument("--min-minutes", type=float, default=60.0)
    args = ap.parse_args()

    dataset = pd.read_parquet(PROC / "dataset.parquet")
    meta = pd.read_parquet(PROC / "player_meta.parquet")

    cfg = FplConfig()
    if args.budget is not None:
        cfg = replace(cfg, budget_cap=args.budget)

    train = dataset[dataset["round"] < args.gw]
    test = dataset[dataset["round"] == args.gw]
    if train.empty or test.empty:
        raise SystemExit(
            f"no training rows before GW{args.gw}, or no rows for GW{args.gw}"
        )

    model = registry.create(args.model).fit(train[FEATURE_COLUMNS], train["y"])
    board = test[["player_id", "y", "minutes_lag_1"]].copy()
    board["pred"] = model.predict(test[FEATURE_COLUMNS]).values
    board = board.merge(meta, left_on="player_id", right_on="id")
    board = apply_filters(board, [MinutesFilter(args.min_minutes)])

    xi = IlpSquadOptimizer(default_constraints(cfg)).select(board, points_col="pred")
    xi["pos"] = xi["element_type"].map(POS)
    xi["cost"] = xi["now_cost"] / 10.0
    xi = xi.sort_values(["element_type", "pred"], ascending=[True, False])

    out = xi[["web_name", "pos", "team", "cost", "pred", "y"]].rename(
        columns={"team": "team_id", "pred": "pred_pts", "y": "actual_pts"}
    )
    print(
        f"\nBest XI — GW{args.gw}, model={args.model}, budget <= £{cfg.budget_cap}m\n"
    )
    print(
        out.to_string(
            index=False,
            formatters={
                "cost": "£{:.1f}".format,
                "pred_pts": "{:.1f}".format,
                "actual_pts": "{:.0f}".format,
            },
        )
    )
    print(
        f"\nTotal predicted: {xi['pred'].sum():.1f} | "
        f"actual: {xi['y'].sum():.0f} | cost: £{xi['cost'].sum():.1f}m"
    )


if __name__ == "__main__":
    main()
