"""Walk-forward backtest. Depends only on protocols (DIP) → grades every model
through one code path (LSP)."""

from __future__ import annotations
from dataclasses import dataclass
import numpy as np
import pandas as pd
from ..features.builder import FEATURE_COLUMNS
from ..protocols import PointsPredictor, SquadOptimizer
from ..selection.filters import CandidateFilter, apply_filters


@dataclass(frozen=True, slots=True)
class BacktestResult:
    gameweek: int
    predicted_points: float
    actual_points: float
    prediction_mae: float


# =============================================================================
# METHOD — Walk-forward (expanding-window) validation (dive: "time-series
#  cross-validation", "out-of-sample evaluation")
#   For each test GW t:  train on round < t  → predict t  → optimise XI
#   → score XI vs ACTUAL points in t. Report predicted vs actual separately:
#   a model can rank well (good XI) yet be poorly calibrated (bad MAE).
# =============================================================================


class Backtester:
    def __init__(
        self,
        predictor: PointsPredictor,
        optimizer: SquadOptimizer,
        player_meta: pd.DataFrame,
        filters: list[CandidateFilter] | None = None,
    ):
        self._predictor = predictor
        self._optimizer = optimizer
        self._meta = player_meta
        self._filters = filters or []

    def run(
        self, dataset: pd.DataFrame, test_gameweeks: list[int]
    ) -> list[BacktestResult]:
        results: list[BacktestResult] = []
        for gw in test_gameweeks:
            train = dataset[dataset["round"] < gw]
            test = dataset[dataset["round"] == gw]
            if train.empty or test.empty:
                continue
            self._predictor.fit(train[FEATURE_COLUMNS], train["y"])
            yhat = self._predictor.predict(test[FEATURE_COLUMNS])
            mae = float(np.mean(np.abs(yhat.values - test["y"].values)))

            board = test[["player_id", "y", "minutes_lag_1"]].copy()
            board["pred"] = yhat.values
            board = board.merge(self._meta, left_on="player_id", right_on="id")
            board = apply_filters(board, self._filters)

            xi = self._optimizer.select(board, points_col="pred")

            chosen = set(xi["player_id"] if "player_id" in xi else xi["id"])
            actual = float(test[test["player_id"].isin(chosen)]["y"].sum())
            predicted = float(board[board["player_id"].isin(chosen)]["pred"].sum())
            results.append(BacktestResult(gw, predicted, actual, mae))
        return results
