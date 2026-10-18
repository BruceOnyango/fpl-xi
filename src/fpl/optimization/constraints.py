"""Selection constraints as pluggable strategy objects (OCP + SRP)."""

from __future__ import annotations
from typing import Protocol
import pandas as pd
import pulp


class Constraint(Protocol):
    def apply(
        self,
        problem: pulp.LpProblem,
        pick: dict[int, pulp.LpVariable],
        players: pd.DataFrame,
    ) -> None: ...


class SquadSizeConstraint:
    def __init__(self, size: int):
        self._size = size

    def apply(self, problem, pick, players) -> None:
        problem += pulp.lpSum(pick.values()) == self._size, "squad_size"


class BudgetConstraint:
    def __init__(self, cap_tenths: int):
        self._cap = cap_tenths

    def apply(self, problem, pick, players) -> None:
        cost = players["now_cost"].to_dict()
        problem += (
            pulp.lpSum(cost[i] * v for i, v in pick.items()) <= self._cap,
            "budget",
        )


class PositionBoundsConstraint:
    def __init__(self, bounds: dict[int, tuple[int, int]]):
        self._bounds = bounds

    def apply(self, problem, pick, players) -> None:
        pos = players["element_type"].to_dict()
        for p, (lo, hi) in self._bounds.items():
            members = [v for i, v in pick.items() if pos[i] == p]
            problem += pulp.lpSum(members) >= lo, f"pos_{p}_min"
            problem += pulp.lpSum(members) <= hi, f"pos_{p}_max"


class MaxPerClubConstraint:
    def __init__(self, max_per_club: int):
        self._max = max_per_club

    def apply(self, problem, pick, players) -> None:
        club = players["team"].to_dict()
        for c in set(club.values()):
            members = [v for i, v in pick.items() if club[i] == c]
            problem += pulp.lpSum(members) <= self._max, f"club_{c}"
