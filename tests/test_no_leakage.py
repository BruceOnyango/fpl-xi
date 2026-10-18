import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from fpl.features.builder import LeakFreeFeatureBuilder


def _history():
    rounds = range(1, 8)
    return {
        10: [
            dict(
                round=r,
                total_points=r * 2,
                minutes=90,
                expected_goals=0.1 * r,
                expected_assists=0.05 * r,
                transfers_in=r,
                transfers_out=r,
                value=50 + r,
            )
            for r in rounds
        ]
    }


def test_lag_feature_is_strictly_past():
    df = LeakFreeFeatureBuilder().build(_history())
    for _, row in df.iterrows():
        assert row["points_lag_1"] == row["y"] - 2  # reflects t-1, never t
    assert df["round"].min() == 2
