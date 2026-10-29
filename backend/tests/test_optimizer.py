import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import pandas as pd
from fpl.config import FplConfig
from fpl.optimization.ilp import IlpSquadOptimizer, default_constraints


def _toy_players(n_per_pos=6):
    rows, pid = [], 0
    for etype in (1, 2, 3, 4):
        for k in range(n_per_pos):
            pid += 1
            rows.append(
                dict(
                    id=pid,
                    element_type=etype,
                    team=(pid % 5),
                    now_cost=40 + k * 5,
                    pred=float(pid),
                )
            )
    return pd.DataFrame(rows)


def test_selects_exactly_eleven_valid_players():
    cfg = FplConfig()
    xi = IlpSquadOptimizer(default_constraints(cfg)).select(_toy_players(), "pred")
    assert len(xi) == 11
    counts = xi["element_type"].value_counts().to_dict()
    assert counts.get(1, 0) == 1
    assert 3 <= counts.get(2, 0) <= 5
    assert 2 <= counts.get(3, 0) <= 5
    assert 1 <= counts.get(4, 0) <= 3
    assert xi["now_cost"].sum() <= cfg.budget_cap * 10
    assert (xi["team"].value_counts() <= cfg.max_per_club).all()
