"""Model registry — the OCP mechanism for adding models (no if/elif ladder)."""

from __future__ import annotations
from typing import Callable
from ..protocols import PointsPredictor
from .baseline import MeanPredictor, PersistencePredictor
from .neural import AdaptiveMlpPredictor
from .sklearn_models import GradientBoostingPredictor, RidgePredictor

_REGISTRY: dict[str, Callable[[], PointsPredictor]] = {}


def register(name: str):
    def deco(factory):
        if name in _REGISTRY:
            raise KeyError(f"model '{name}' already registered")
        _REGISTRY[name] = factory
        return factory

    return deco


def create(name: str) -> PointsPredictor:
    if name not in _REGISTRY:
        raise KeyError(f"unknown model '{name}'. known: {sorted(_REGISTRY)}")
    return _REGISTRY[name]()


def available() -> list[str]:
    return sorted(_REGISTRY)


register("mean")(MeanPredictor)
register("persistence")(PersistencePredictor)
register("ridge")(RidgePredictor)
register("gbm")(GradientBoostingPredictor)
register("neural")(AdaptiveMlpPredictor)
