"""Abstractions the whole pipeline depends on (DIP + ISP)."""
from __future__ import annotations
from typing import Protocol, runtime_checkable
import pandas as pd


@runtime_checkable
class DataSource(Protocol):
    def fetch_players(self) -> list[dict]:
        """Season-to-date snapshot: one dict per player."""
        ...
    def fetch_player_history(self, player_id: int) -> list[dict]:
        """Per-gameweek history for a single player."""
        ...


@runtime_checkable
class RawRepository(Protocol):
    def save(self, name: str, payload: object) -> None: ...
    def load(self, name: str) -> object: ...
    def exists(self, name: str) -> bool: ...


@runtime_checkable
class FeatureBuilder(Protocol):
    def build(self, raw_history: dict[int, list[dict]]) -> pd.DataFrame: ...


@runtime_checkable
class PointsPredictor(Protocol):
    """LSP: predict() returns a Series indexed identically to X."""
    def fit(self, X: pd.DataFrame, y: pd.Series) -> "PointsPredictor": ...
    def predict(self, X: pd.DataFrame) -> pd.Series: ...


@runtime_checkable
class Persistable(Protocol):
    """Segregated from PointsPredictor (ISP) so stateless models need not save."""
    def save(self, path: str) -> None: ...
    def load(self, path: str) -> "Persistable": ...


@runtime_checkable
class SquadOptimizer(Protocol):
    def select(self, players: pd.DataFrame, points_col: str) -> pd.DataFrame: ...