"""knn_interval: prediction ranges used by export_predictions.py / the dashboard."""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from predict_upcoming import knn_interval  # noqa: E402


def _synthetic(n=20_000, seed=0):
    # Outcomes get noisier as the prediction grows — like FPL hauls vs blanks.
    rng = np.random.default_rng(seed)
    p = rng.gamma(2.0, 4.0, n)
    actual = np.maximum(0, p + rng.normal(0, 1 + 0.4 * p))
    return p, actual


def test_ranges_differ_between_high_predictions():
    p, a = _synthetic()
    low, high = knn_interval(p, a, np.array([20.0, 30.0]))
    assert high[1] > high[0] and (high[1] - low[1]) > (high[0] - low[0])


def test_interval_contains_prediction_and_is_ordered():
    p, a = _synthetic()
    preds = np.array([0.0, 1.0, 8.0, 25.0, 60.0])  # includes beyond the held-out max
    low, high = knn_interval(p, a, preds)
    assert np.all(low <= preds) and np.all(preds <= high) and np.all(low >= 0)


def test_coverage_is_close_to_nominal_on_unseen_rows():
    p, a = _synthetic(seed=1)
    tp, ta = _synthetic(seed=2)
    low, high = knn_interval(p, a, tp)
    coverage = np.mean((ta >= low) & (ta <= high))
    assert 0.75 <= coverage <= 0.88


def test_small_holdout_uses_everything():
    low, high = knn_interval(np.array([1.0, 2.0, 3.0]), np.array([0.0, 2.0, 9.0]), np.array([2.0]), k=150)
    assert low[0] <= 2.0 <= high[0]
