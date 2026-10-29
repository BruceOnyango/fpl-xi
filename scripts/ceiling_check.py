"""Self-contained: model XI (with captain) vs the hindsight-best XI (the real
ceiling that week). Depends only on core fpl modules — nothing new to create.

Usage:  python scripts/ceiling_check.py --model gbm --gw 6 --budget 105
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
from fpl.config import FplConfig
from fpl.features.builder import FEATURE_COLUMNS
from fpl.models import registry
from fpl.optimization.ilp import IlpSquadOptimizer, default_constraints

POS = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}


def _lsq(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    if len(x) < 2 or np.std(x) < 1e-9:
        return (1.0, 0.0)
    s, b = np.polyfit(x, y, 1)
    return (float(np.clip(s, 0.0, 2.0)), float(b))


def _fit_calibration(pred, actual, positions, min_points=40):
    coef, glob, positions = {}, _lsq(pred, actual), np.asarray(positions)
    for p in np.unique(positions):
        m = positions == p
        if m.sum() >= min_points:
            coef[int(p)] = _lsq(np.asarray(pred)[m], np.asarray(actual)[m])
    return coef, glob


def _apply_calibration(pred, positions, coef, glob):
    out = np.empty(len(pred), float)
    for i, (v, p) in enumerate(zip(pred, positions)):
        s, b = coef.get(int(p), glob)
        out[i] = max(s * float(v) + b, 0.0)
    return out


def _minutes_filter(board, min_minutes=60.0):
    if "minutes_lag_1" not in board.columns:
        return board
    return board[board["minutes_lag_1"] >= min_minutes].reset_index(drop=True)


def calibrated_pick(dataset, meta, gw, cfg, model_name="gbm", min_minutes=60.0):
    train = dataset[dataset["round"] < gw]
    test = dataset[dataset["round"] == gw]
    if train.empty or test.empty:
        raise SystemExit(f"no training rows before GW{gw}, or no rows for GW{gw}")

    cal_gw = int(train["round"].max())
    fit, cal = train[train["round"] < cal_gw], train[train["round"] == cal_gw]
    coef, glob = {}, (1.0, 0.0)
    if not fit.empty and not cal.empty:
        m = registry.create(model_name).fit(fit[FEATURE_COLUMNS], fit["y"])
        cal_pred = m.predict(cal[FEATURE_COLUMNS]).values
        cal_pos = cal.merge(meta, left_on="player_id", right_on="id")[
            "element_type"
        ].values
        coef, glob = _fit_calibration(cal_pred, cal["y"].values, cal_pos)

    model = registry.create(model_name).fit(train[FEATURE_COLUMNS], train["y"])
    board = test[["player_id", "y", "minutes_lag_1"]].copy()
    board["raw_pred"] = model.predict(test[FEATURE_COLUMNS]).values
    board = board.merge(meta, left_on="player_id", right_on="id")
    board["pred"] = _apply_calibration(
        board["raw_pred"].values, board["element_type"].values, coef, glob
    )
    board = _minutes_filter(board, min_minutes)
    return IlpSquadOptimizer(default_constraints(cfg)).select(board, points_col="pred")


def with_captain(xi, score_col, actual_col="y"):
    cap = xi[score_col].idxmax()
    return (
        xi.loc[cap, "web_name"],
        float(xi[score_col].sum() + xi.loc[cap, score_col]),
        float(xi[actual_col].sum() + xi.loc[cap, actual_col]),
    )


def hindsight_xi(dataset, meta, gw, cfg):
    test = dataset[dataset["round"] == gw]
    board = (
        test[["player_id", "y"]].copy().merge(meta, left_on="player_id", right_on="id")
    )
    return IlpSquadOptimizer(default_constraints(cfg)).select(board, points_col="y")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="gbm")
    ap.add_argument("--gw", type=int, required=True)
    ap.add_argument("--budget", type=float, default=None)
    args = ap.parse_args()
    PROC = HERE / "data" / "processed"
    dataset = pd.read_parquet(PROC / "dataset.parquet")
    meta = pd.read_parquet(PROC / "player_meta.parquet")
    cfg = FplConfig()
    if args.budget is not None:
        cfg = replace(cfg, budget_cap=args.budget)

    xi = calibrated_pick(dataset, meta, args.gw, cfg, args.model)
    cap_name, pred_c, act_c = with_captain(xi, "pred")
    model_plain = float(xi["y"].sum())
    hs = hindsight_xi(dataset, meta, args.gw, cfg)
    hs_cap, _, hs_act_c = with_captain(hs, "y")
    hs_plain = float(hs["y"].sum())

    print(f"\n=== GW{args.gw}  (model={args.model}, budget <= £{cfg.budget_cap}m) ===")
    print(
        f"Model XI:       {model_plain:5.0f} actual | {act_c:5.0f} with (C) {cap_name} | predicted {pred_c:5.1f}"
    )
    print(
        f"Hindsight best: {hs_plain:5.0f} actual | {hs_act_c:5.0f} with (C) {hs_cap}  <- ceiling that week"
    )
    print(
        f"Gap to ceiling: {hs_plain - model_plain:.0f} pts ({100*model_plain/max(hs_plain,1):.0f}% of perfect)"
    )


if __name__ == "__main__":
    main()
