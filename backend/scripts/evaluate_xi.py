"""Realised XI points — the decision metric, not a ranking proxy.

For each test gameweek: train each model, pick the formation-legal best XI from
its predictions, and score the XI's ACTUAL points with the captain (best MID/FWD)
doubled. Compare models to each other, to the hindsight-perfect XI (ceiling), and
report a block-bootstrap CI on the gbm-vs-baseline gap.

Formation only (1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD, 11 players) — budget/club are
deploy constraints that don't test prediction quality and need columns not in
historical.parquet. This measures: do better predictions build a better team?

Usage:
  python scripts/evaluate_xi.py
  python scripts/evaluate_xi.py --test-seasons 2024-25 --models gbm ridge persistence
"""

from __future__ import annotations
import argparse, sys
from pathlib import Path

# Windows consoles default to cp1252, which can't print names like "Mitrović".
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "src"))
import warnings
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
from fpl.features.builder import FEATURE_COLUMNS
from fpl.models import registry
from fpl.optimization.ilp import IlpSquadOptimizer
from fpl.optimization.constraints import SquadSizeConstraint, PositionBoundsConstraint
from fpl.selection.captain import pick_captain

PROC = HERE / "data" / "processed"
BOUNDS = {1: (1, 1), 2: (3, 5), 3: (2, 5), 4: (1, 3)}
OPT = IlpSquadOptimizer([SquadSizeConstraint(11), PositionBoundsConstraint(BOUNDS)])


def _key(df):
    o = {s: i for i, s in enumerate(sorted(df["season"].unique()))}
    return df["season"].map(o) * 100 + df["round"]


def xi_points(board, score_col):
    """Pick best formation XI by score_col, return actual points with (C) doubled."""
    b = board.rename(columns={"player_id": "id"})
    xi = OPT.select(b, points_col=score_col)
    cap = xi.loc[pick_captain(xi, score_col)]
    return float(xi["y"].sum() + cap["y"])  # captain's actual points counted twice


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--models", nargs="*", default=["gbm", "ridge", "persistence", "mean"]
    )
    ap.add_argument("--baseline", default="persistence")
    ap.add_argument("--test-seasons", nargs="*", default=None)
    ap.add_argument(
        "--min-train", type=int, default=3000, help="min training rows per GW"
    )
    args = ap.parse_args()

    df = pd.read_parquet(PROC / "historical.parquet").reset_index(drop=True)
    df = df.dropna(subset=["element_type"]).copy()
    df["element_type"] = df["element_type"].astype(int)
    df["_key"] = _key(df)

    test_df = df if not args.test_seasons else df[df["season"].isin(args.test_seasons)]
    keys = sorted(
        k for k in test_df["_key"].unique() if (df["_key"] < k).sum() >= args.min_train
    )

    per_gw = {m: [] for m in args.models}
    ceil = []
    for key in keys:
        train = df[df["_key"] < key]
        test = df[df["_key"] == key].copy()
        if test["element_type"].nunique() < 4:
            continue
        for m in args.models:
            model = registry.create(m).fit(train[FEATURE_COLUMNS], train["y"])
            test[f"p_{m}"] = model.predict(test[FEATURE_COLUMNS]).values
            per_gw[m].append(xi_points(test, f"p_{m}"))
        ceil.append(xi_points(test, "y"))  # hindsight-perfect XI

    ceil = np.array(ceil)
    print(f"evaluated {len(ceil)} gameweeks | formation XI, captain doubled\n")
    print(f"{'model':12} {'XI pts/GW':>12} {'% of ceiling':>14}")
    print("-" * 40)
    res = {m: np.array(v) for m, v in per_gw.items()}
    for m in args.models:
        v = res[m]
        print(
            f"{m:12} {v.mean():>8.1f} ± {v.std()/np.sqrt(len(v)):>3.1f} {100*v.mean()/ceil.mean():>12.0f}%"
        )
    print(f"{'hindsight':12} {ceil.mean():>8.1f}        {'100%':>12}")

    # block-bootstrap CI on paired gbm - baseline XI points
    if "gbm" in res and args.baseline in res:
        diff = res["gbm"] - res[args.baseline]
        blocks = [diff[i : i + 5] for i in range(0, len(diff), 5)]
        rng = np.random.default_rng(0)
        bs = []
        for _ in range(2000):
            picks = rng.integers(0, len(blocks), len(blocks))
            samp = np.concatenate([blocks[i] for i in picks])
            bs.append(samp.mean())
        lo, hi = np.percentile(bs, [2.5, 97.5])
        print(
            f"\ngbm - {args.baseline}: {diff.mean():+.2f} pts/GW  "
            f"(95% block-bootstrap CI [{lo:+.2f}, {hi:+.2f}])"
        )


if __name__ == "__main__":
    main()
