"""Smoke test for the adaptive neural path. Skips cleanly if torch is absent,
so the suite still passes for people who never installed it.

It proves the four things the rest of the pipeline relies on:
  1. LSP        — predict() returns a Series aligned to X.index
  2. learning   — the net actually fits a learnable signal (beats mean)
  3. warm_start — continued training doesn't rebuild the net, and improves fit
  4. Persistable — save/load round-trips to identical predictions
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

torch = pytest.importorskip("torch")  # skip whole module if torch not installed

from fpl.models.neural import AdaptiveMlpPredictor, NeuralConfig

FEATURES = [f"f{i}" for i in range(6)]


def _data(n=800, seed=0):
    rng = np.random.default_rng(seed)
    X = pd.DataFrame(rng.normal(size=(n, len(FEATURES))), columns=FEATURES)
    # a learnable non-linear target so a working net must beat the mean
    y = pd.Series(
        2.0
        + 1.5 * X["f0"]
        - X["f1"]
        + 0.5 * (X["f2"] ** 2)
        + rng.normal(scale=0.3, size=n)
    )
    return X, y


def _fast_cfg(**kw):
    base = dict(hidden_sizes=(32, 16), epochs=40, batch_size=128, seed=0)
    return NeuralConfig(**{**base, **kw})


def test_predict_is_index_aligned_series():
    X, y = _data()
    model = AdaptiveMlpPredictor(_fast_cfg()).fit(X, y)
    pred = model.predict(X.iloc[100:130])
    assert isinstance(pred, pd.Series)
    assert list(pred.index) == list(X.iloc[100:130].index)  # LSP contract


def test_beats_mean_baseline():
    Xtr, ytr = _data(seed=0)
    Xte, yte = _data(seed=1)
    model = AdaptiveMlpPredictor(_fast_cfg(epochs=80)).fit(Xtr, ytr)
    nn_mae = np.mean(np.abs(model.predict(Xte).values - yte.values))
    mean_mae = np.mean(np.abs(ytr.mean() - yte.values))
    assert nn_mae < mean_mae * 0.7  # a clear improvement, not marginal


def test_warm_start_keeps_net_and_improves():
    X, y = _data()
    model = AdaptiveMlpPredictor(_fast_cfg(epochs=20)).fit(X, y)
    net_id = id(model._net)
    before = np.mean(np.abs(model.predict(X).values - y.values))
    model.fit(X, y, warm_start=True)  # continue, don't rebuild
    after = np.mean(np.abs(model.predict(X).values - y.values))
    assert id(model._net) == net_id  # same net object
    assert after <= before + 1e-6  # no worse for more training


def test_save_load_roundtrip(tmp_path):
    X, y = _data()
    model = AdaptiveMlpPredictor(_fast_cfg()).fit(X, y)
    p = tmp_path / "net.pt"
    model.save(str(p))
    restored = AdaptiveMlpPredictor().load(str(p))
    np.testing.assert_allclose(
        model.predict(X).values, restored.predict(X).values, rtol=1e-5, atol=1e-5
    )
