"""Typed, immutable configuration — one injected object, one reason to change."""

from __future__ import annotations
from dataclasses import dataclass, field

_BOOTSTRAP = "/bootstrap-static/"
_ELEMENT = "/element-summary/{player_id}/"


@dataclass(frozen=True, slots=True)
class FplConfig:
    api_base: str = "https://fantasy.premierleague.com/api"
    bootstrap_path: str = _BOOTSTRAP
    element_path: str = _ELEMENT
    request_timeout_s: float = 20.0
    polite_delay_s: float = 0.2

    budget_cap: float = 82.5  # ~11/15 of the £100m squad budget
    squad_size: int = 11
    max_per_club: int = 3
    position_bounds: dict[int, tuple[int, int]] = field(
        default_factory=lambda: {1: (1, 1), 2: (3, 5), 3: (2, 5), 4: (1, 3)}
    )

    def bootstrap_url(self) -> str:
        return f"{self.api_base}{self.bootstrap_path}"

    def element_url(self, player_id: int) -> str:
        return f"{self.api_base}{self.element_path.format(player_id=player_id)}"
