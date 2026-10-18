"""Adaptive MLP regressor — the model you grow as you learn new techniques.

OCP/adaptive: architecture is DATA (hidden_sizes, activation) from config.
fit(warm_start=True) continues training on new gameweeks. Implements both
PointsPredictor (LSP) and Persistable (ISP). torch imported lazily.
"""

from __future__ import annotations
from dataclasses import dataclass, field
import numpy as np
import pandas as pd


@dataclass(frozen=True, slots=True)
class NeuralConfig:
    hidden_sizes: tuple[int, ...] = (64, 32)
    activation: str = "relu"
    dropout: float = 0.1
    lr: float = 1e-3
    weight_decay: float = 1e-4  # L2 — same idea as Ridge's α
    epochs: int = 150
    batch_size: int = 256
    seed: int = 0
    feature_names: tuple[str, ...] = field(default=())


# =============================================================================
# MATH — Feed-forward net + training (dive: "multilayer perceptron",
#  "backpropagation", "Adam optimizer", "universal approximation theorem")
#   Forward:  a_0=x;  z_l=W_l a_{l-1}+b_l;  a_l=σ(z_l)=ReLU(z);  ŷ=a_L (linear head)
#   Loss (MSE): L = (1/|B|) Σ_{i∈B} (ŷ_i - y_i)²
#   Backprop:  δ_l = (W_{l+1}ᵀ δ_{l+1}) ⊙ σ'(z_l)
#   Adam:  m_t=β₁m+(1-β₁)g;  v_t=β₂v+(1-β₂)g²;  θ_t=θ-lr·m̂/(√v̂+ε)
#   weight_decay adds λ‖θ‖² to L — regularizes the collinear inputs, like Ridge.
# =============================================================================


class AdaptiveMlpPredictor:
    def __init__(self, config: NeuralConfig | None = None):
        self._cfg = config or NeuralConfig()
        self._net = None
        self._mu = None
        self._sd = None

    def _build(self, n_features: int):
        import torch
        from torch import nn

        acts = {"relu": nn.ReLU, "gelu": nn.GELU, "tanh": nn.Tanh}
        Act = acts[self._cfg.activation]
        layers: list = []
        prev = n_features
        for h in self._cfg.hidden_sizes:
            layers += [nn.Linear(prev, h), Act(), nn.Dropout(self._cfg.dropout)]
            prev = h
        layers += [nn.Linear(prev, 1)]
        torch.manual_seed(self._cfg.seed)
        return nn.Sequential(*layers)

    def _standardize(self, X: np.ndarray, fit: bool) -> np.ndarray:
        if fit:
            self._mu = X.mean(axis=0)
            self._sd = X.std(axis=0) + 1e-8
        return (X - self._mu) / self._sd

    def fit(
        self, X: pd.DataFrame, y: pd.Series, warm_start: bool = False
    ) -> "AdaptiveMlpPredictor":
        import torch
        from torch import nn
        from torch.utils.data import DataLoader, TensorDataset

        Xv = self._standardize(X.values.astype("float32"), fit=not warm_start)
        yv = y.values.astype("float32").reshape(-1, 1)
        if self._net is None or not warm_start:
            self._net = self._build(Xv.shape[1])
        ds = TensorDataset(torch.tensor(Xv), torch.tensor(yv))
        loader = DataLoader(ds, batch_size=self._cfg.batch_size, shuffle=True)
        opt = torch.optim.Adam(
            self._net.parameters(), lr=self._cfg.lr, weight_decay=self._cfg.weight_decay
        )
        loss_fn = nn.MSELoss()
        self._net.train()
        for _ in range(self._cfg.epochs):
            for xb, yb in loader:
                opt.zero_grad()
                loss_fn(self._net(xb), yb).backward()
                opt.step()
        return self

    def predict(self, X: pd.DataFrame) -> pd.Series:
        import torch

        Xv = self._standardize(X.values.astype("float32"), fit=False)
        self._net.eval()
        with torch.no_grad():
            out = self._net(torch.tensor(Xv)).numpy().ravel()
        return pd.Series(out, index=X.index)

    def save(self, path: str) -> None:
        import torch

        torch.save(
            {
                "state": self._net.state_dict(),
                "mu": self._mu,
                "sd": self._sd,
                "cfg": self._cfg,
            },
            path,
        )

    def load(self, path: str) -> "AdaptiveMlpPredictor":
        import torch

        ckpt = torch.load(path, weights_only=False)
        self._cfg = ckpt["cfg"]
        self._mu, self._sd = ckpt["mu"], ckpt["sd"]
        self._net = self._build(len(self._mu))
        self._net.load_state_dict(ckpt["state"])
        return self
