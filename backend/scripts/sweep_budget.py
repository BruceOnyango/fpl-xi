"""Composition root #4 — budget-cap sweep.

Fits the model ONCE, predicts ONCE, then re-runs only the ILP selection across a
range of budget caps. The predictions are fixed; only the optimizer's budget
constraint changes (same OCP seam as everything else). Output is the
predicted-points-vs-budget curve — the diminishing-returns story.

Usage:
  python scripts/sweep_budget.py --model gbm --gw 8 --lo 70 --hi 100 --step 2.5
"""

from __future__ import annotations
import argparse, sys
from dataclasses import replace
from pathlib import Path

# Windows consoles default to cp1252, which can't print names like "Mitrović".
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import numpy as np
import pandas as pd
from fpl.config import FplConfig
from fpl.features.builder import FEATURE_COLUMNS
from fpl.models import registry
from fpl.optimization.ilp import IlpSquadOptimizer, default_constraints

PROC = Path(__file__).resolve().parents[1] / "data" / "processed"


# -- pure, testable core: a scored board + caps -> one row per cap -----------
def sweep_caps(
    board: pd.DataFrame, base_config: FplConfig, caps: list[float]
) -> pd.DataFrame:
    """For each cap, pick the XI and record what it's worth. `board` must carry
    id, element_type, team, now_cost, pred (and y if you want realised points).
    Infeasible caps (too low to field a legal XI) are recorded, not crashed."""
    has_actual = "y" in board.columns
    rows = []
    for cap in caps:
        cfg = replace(base_config, budget_cap=cap)  # frozen dataclass -> copy
        optimizer = IlpSquadOptimizer(default_constraints(cfg))
        try:
            xi = optimizer.select(board, points_col="pred")
        except RuntimeError:
            rows.append(
                dict(
                    budget_cap=cap,
                    feasible=False,
                    predicted=np.nan,
                    actual=np.nan,
                    cost=np.nan,
                )
            )
            continue
        chosen = xi["id"] if "id" in xi.columns else xi["player_id"]
        picked = board[board["id"].isin(set(chosen))]
        rows.append(
            dict(
                budget_cap=cap,
                feasible=True,
                predicted=float(picked["pred"].sum()),
                actual=float(picked["y"].sum()) if has_actual else np.nan,
                cost=float(picked["now_cost"].sum()) / 10.0,
            )
        )
    return pd.DataFrame(rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="gbm")
    ap.add_argument(
        "--gw", type=int, default=None, help="eval gameweek (default: latest)"
    )
    ap.add_argument("--lo", type=float, default=70.0)
    ap.add_argument("--hi", type=float, default=100.0)
    ap.add_argument("--step", type=float, default=2.5)
    args = ap.parse_args()

    config = FplConfig()
    dataset = pd.read_parquet(PROC / "dataset.parquet")
    meta = pd.read_parquet(PROC / "player_meta.parquet")

    gw = args.gw or int(dataset["round"].max())
    train = dataset[dataset["round"] < gw]
    test = dataset[dataset["round"] == gw]

    predictor = registry.create(args.model)
    predictor.fit(train[FEATURE_COLUMNS], train["y"])  # fit ONCE

    board = test[["player_id", "y"]].copy()
    board["pred"] = predictor.predict(test[FEATURE_COLUMNS]).values
    board = board.merge(meta, left_on="player_id", right_on="id")

    caps = list(np.arange(args.lo, args.hi + 1e-9, args.step))
    curve = sweep_caps(board, config, caps)
    print(f"Budget sweep (model={args.model}, GW{gw}):\n")
    print(
        curve.to_string(
            index=False,
            formatters={
                "budget_cap": "£{:.1f}m".format,
                "predicted": "{:.1f}".format,
                "actual": "{:.0f}".format,
                "cost": "£{:.1f}m".format,
            },
        )
    )

    feas = curve[curve.feasible]
    if len(feas) > 1:
        knee = feas["predicted"].diff()
        print(
            f"\nMarginal predicted points per step tails off from "
            f"{knee.max():.2f} to {knee.iloc[-1]:.2f} — that's the diminishing return."
        )


if __name__ == "__main__":
    main()
