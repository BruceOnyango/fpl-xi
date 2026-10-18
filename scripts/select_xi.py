"""Composition root #3 — train, predict next GW, pick the XI, or backtest."""

from __future__ import annotations
import argparse, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import pandas as pd
from fpl.config import FplConfig
from fpl.evaluation.backtester import Backtester
from fpl.features.builder import FEATURE_COLUMNS
from fpl.models import registry
from fpl.optimization.ilp import IlpSquadOptimizer, default_constraints
from fpl.selection.filters import MinutesFilter, apply_filters

PROC = Path(__file__).resolve().parents[1] / "data" / "processed"


def load():
    return (
        pd.read_parquet(PROC / "dataset.parquet"),
        pd.read_parquet(PROC / "player_meta.parquet"),
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="gbm")
    ap.add_argument("--backtest", nargs="*", type=int, default=None)
    ap.add_argument("--list-models", action="store_true")
    args = ap.parse_args()

    if args.list_models:
        print("Available models:", ", ".join(registry.available()))
        return

    config = FplConfig()
    dataset, meta = load()
    predictor = registry.create(args.model)  # injection here
    optimizer = IlpSquadOptimizer(default_constraints(config))
    filters = [MinutesFilter(60)]

    if args.backtest:
        for r in Backtester(predictor, optimizer, meta, filters).run(
            dataset, args.backtest
        ):
            print(
                f"GW{r.gameweek}: XI scored {r.actual_points:.0f} "
                f"(predicted {r.predicted_points:.1f}, MAE {r.prediction_mae:.2f})"
            )
        return

    latest_gw = int(dataset["round"].max())
    predictor.fit(dataset[FEATURE_COLUMNS], dataset["y"])
    upcoming = dataset[dataset["round"] == latest_gw].copy()
    upcoming["pred"] = predictor.predict(upcoming[FEATURE_COLUMNS]).values
    board = upcoming.merge(meta, left_on="player_id", right_on="id")
    board = apply_filters(board, filters)
    xi = optimizer.select(board, points_col="pred")
    cols = ["web_name", "element_type", "team", "now_cost", "pred"]
    xi = xi[cols].sort_values(["element_type", "pred"], ascending=[True, False])
    print(f"\nBest XI (model={args.model}, budget<= £{config.budget_cap}m):\n")
    print(xi.to_string(index=False))
    print(
        f"\nTotal predicted points: {xi['pred'].sum():.1f}  "
        f"| cost: £{xi['now_cost'].sum()/10:.1f}m"
    )


if __name__ == "__main__":
    main()
