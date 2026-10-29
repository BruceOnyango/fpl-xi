"""Best-11 selection as a 0/1 ILP (implements SquadOptimizer). Holds no rules
of its own — every rule arrives as a Constraint object (OCP)."""

from __future__ import annotations
import pandas as pd
import pulp
from .constraints import Constraint

# =============================================================================
# MATH — Integer Linear Programming (dive: "0/1 knapsack problem", "binary
#  integer programming", "branch and bound", "LP relaxation")
#   Variables:  x_i ∈ {0,1}  (1 = player i selected)
#   Objective:  max Σ_i ŷ_i·x_i
#   Subject to: Σ_i x_i = 11                            (squad size)
#               Σ_i cost_i·x_i ≤ budget_cap             (budget)
#               lo_p ≤ Σ_{i∈p} x_i ≤ hi_p  ∀ position   (formation)
#               Σ_{i∈c} x_i ≤ 3           ∀ club        (max per club)
#   ~600 players + a few constraints → CBC branch-and-bound returns the proven
#   optimum in <1s. Greedy "sort by points" fails: budget & club couplings
#   interact. Dive: "why greedy fails the 0/1 knapsack".
# =============================================================================


class IlpSquadOptimizer:
    def __init__(self, constraints: list[Constraint]):
        self._constraints = constraints  # DIP: rules injected

    def select(self, players: pd.DataFrame, points_col: str) -> pd.DataFrame:
        df = players.set_index("id") if "id" in players.columns else players
        ids = list(df.index)
        problem = pulp.LpProblem("best_eleven", pulp.LpMaximize)
        pick = {i: pulp.LpVariable(f"x_{i}", cat="Binary") for i in ids}

        yhat = df[points_col].to_dict()
        problem += pulp.lpSum(yhat[i] * pick[i] for i in ids), "predicted_points"
        for constraint in self._constraints:
            constraint.apply(problem, pick, df)

        problem.solve(pulp.PULP_CBC_CMD(msg=False))
        if pulp.LpStatus[problem.status] != "Optimal":
            raise RuntimeError(f"solver status: {pulp.LpStatus[problem.status]}")
        chosen = [i for i in ids if pick[i].value() == 1]
        return df.loc[chosen].reset_index()


def default_constraints(config) -> list[Constraint]:
    from .constraints import (
        BudgetConstraint,
        MaxPerClubConstraint,
        PositionBoundsConstraint,
        SquadSizeConstraint,
    )

    return [
        SquadSizeConstraint(config.squad_size),
        BudgetConstraint(int(round(config.budget_cap * 10))),  # £m -> tenths
        PositionBoundsConstraint(config.position_bounds),
        MaxPerClubConstraint(config.max_per_club),
    ]
