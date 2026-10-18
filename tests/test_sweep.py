import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import numpy as np
import pandas as pd
from fpl.config import FplConfig
from sweep_budget import sweep_caps


def _board():
    rows, pid = [], 0
    for et in (1, 2, 3, 4):
        for k in range(6):
            pid += 1
            rows.append(
                dict(
                    id=pid,
                    player_id=pid,
                    element_type=et,
                    team=pid % 5,
                    now_cost=40 + k * 12,
                    pred=float(40 + k * 12),
                    y=1.0,
                )
            )
    return pd.DataFrame(rows)


def test_curve_is_monotonic_and_marks_infeasible():
    curve = sweep_caps(_board(), FplConfig(), [45, 55, 65, 80])
    feas = curve[curve.feasible]
    # a looser cap can never score fewer predicted points than a tighter one
    assert feas["predicted"].is_monotonic_increasing
    # spend never exceeds the cap
    assert (feas["cost"] <= feas["budget_cap"] + 1e-6).all()
    # some low cap is correctly flagged infeasible rather than crashing
    assert (~curve["feasible"]).any()
