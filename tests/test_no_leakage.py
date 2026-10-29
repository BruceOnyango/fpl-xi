"""Leakage guards for the feature builder.
1. lag features are strictly past (single-fixture sequence)
2. double gameweeks aggregate to one row and never leak match-1 into match-2
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from fpl.features.builder import LeakFreeFeatureBuilder, FEATURE_COLUMNS


def _row(r, pts, **kw):
    base = dict(
        round=r,
        total_points=pts,
        minutes=90,
        expected_goals=0.1,
        expected_assists=0.05,
        transfers_in=r,
        transfers_out=r,
        value=50,
        was_home=True,
        opponent_team=1,
    )
    base.update(kw)
    return base


def test_lag_feature_is_strictly_past():
    hist = {10: [_row(r, r * 2) for r in range(1, 8)]}
    df = LeakFreeFeatureBuilder().build(hist)
    for _, row in df.iterrows():
        assert row["points_lag_1"] == row["y"] - 2
    assert df["round"].min() == 2


def test_double_gameweek_aggregates_without_leak():
    hist = {
        10: [
            _row(1, 2),
            _row(2, 3),
            _row(3, 5, opponent_team=1),
            _row(3, 7, opponent_team=2),
            _row(4, 4),
        ]
    }
    df = LeakFreeFeatureBuilder().build(hist)
    assert df.duplicated(["player_id", "round"]).sum() == 0
    gw3 = df[df["round"] == 3]
    assert len(gw3) == 1
    assert gw3["y"].iloc[0] == 12
    assert gw3["n_fixtures"].iloc[0] == 2
    assert gw3["points_lag_1"].iloc[0] == 3
    assert df[df["round"] == 4]["points_lag_1"].iloc[0] == 12
