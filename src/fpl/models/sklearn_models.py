"""Classical models wrapped to the PointsPredictor contract (DIP + LSP)."""

from __future__ import annotations
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline as SkPipeline
from sklearn.preprocessing import StandardScaler

# =============================================================================
# MATH — Ridge regression (dive: "L2 regularization", "bias–variance trade-off",
#  "Tikhonov regularization")
#   β̂ = argmin_β ||y - Xβ||² + α||β||²  = (XᵀX + αI)⁻¹ Xᵀy
#   α shrinks coefficients → less variance. Essential: form/points/transfers/
#   price are strongly collinear (price moves ARE net transfers). Scale first.
# =============================================================================


class RidgePredictor:
    def __init__(self, alpha: float = 1.0):
        self._model = SkPipeline(
            [("scale", StandardScaler()), ("ridge", Ridge(alpha=alpha))]
        )

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "RidgePredictor":
        self._model.fit(X.values, y.values)
        return self

    def predict(self, X: pd.DataFrame) -> pd.Series:
        return pd.Series(self._model.predict(X.values), index=X.index)


# =============================================================================
# MATH — Gradient-boosted trees (dive: "gradient boosting", "functional
#  gradient descent", "additive models")
#   F_M(x) = Σ_m ν·h_m(x); each tree h_m fits the negative gradient:
#       r_{im} = -[∂L(y_i, F(x_i))/∂F(x_i)]_{F=F_{m-1}}
#       F_m = F_{m-1} + ν·h_m           (ν = shrinkage / learning rate)
#   For squared error r = (y - F): each tree chases the ensemble's residual.
# =============================================================================


class GradientBoostingPredictor:
    def __init__(self, **kwargs):
        defaults = dict(
            learning_rate=0.05,
            max_depth=3,
            max_iter=400,
            l2_regularization=1.0,
            random_state=0,
        )
        self._model = HistGradientBoostingRegressor(**{**defaults, **kwargs})

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "GradientBoostingPredictor":
        self._model.fit(X.values, y.values)
        return self

    def predict(self, X: pd.DataFrame) -> pd.Series:
        return pd.Series(self._model.predict(X.values), index=X.index)
