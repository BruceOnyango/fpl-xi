"""Candidate filtering before selection (SRP + OCP).

A CandidateFilter trims the pool the optimizer sees, so the ILP can't pick a
player who won't start. Each filter is a strategy object, injected like the
constraints — new availability rules extend without editing the optimizer.
"""

from __future__ import annotations
from typing import Protocol
import pandas as pd


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


class CandidateFilter(Protocol):
    def apply(self, board: pd.DataFrame) -> pd.DataFrame: ...


class MinutesFilter:
    """Keep only players whose recent minutes suggest they start.

    Leak-free: uses `minutes_lag_1` (minutes in the PREVIOUS gameweek), known
    before the target GW. A benched/injured player who logged few minutes last
    week is dropped before the optimizer can pick him on xG alone — the fix for
    the GW7-style blank XI. Fails open if the column is missing.
    """

    def __init__(self, min_minutes: float = 60.0, minutes_col: str = "minutes_lag_1"):
        self._min = min_minutes
        self._col = minutes_col

    def apply(self, board: pd.DataFrame) -> pd.DataFrame:
        if self._col not in board.columns:
            return board
        return board[board[self._col] >= self._min].reset_index(drop=True)


def apply_filters(board: pd.DataFrame, filters: list[CandidateFilter]) -> pd.DataFrame:
    for f in filters:
        board = f.apply(board)
    return board
