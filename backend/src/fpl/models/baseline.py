"""Baselines you must beat. Stateless -> implement PointsPredictor, not Persistable (ISP)."""

from __future__ import annotations
import pandas as pd


class MeanPredictor:
    def __init__(self) -> None:
        self._mu: float = 0.0

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "MeanPredictor":
        self._mu = float(y.mean())
        return self

    def predict(self, X: pd.DataFrame) -> pd.Series:
        return pd.Series(self._mu, index=X.index)


class PersistencePredictor:
    def __init__(self, lag_col: str = "points_lag_1") -> None:
        self._lag_col = lag_col

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "PersistencePredictor":
        return self

    def predict(self, X: pd.DataFrame) -> pd.Series:
        return X[self._lag_col].astype(float)
