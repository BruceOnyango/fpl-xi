"""Live FPL API data source. Only responsibility: HTTP -> list[dict] (SRP)."""

from __future__ import annotations
import time
import requests
from ..config import FplConfig


class FplApiDataSource:
    def __init__(self, config: FplConfig, session: requests.Session | None = None):
        self._config = config
        self._session = session or requests.Session()

    def _get(self, url: str) -> dict:
        resp = self._session.get(url, timeout=self._config.request_timeout_s)
        resp.raise_for_status()
        return resp.json()

    def fetch_players(self) -> list[dict]:
        return self._get(self._config.bootstrap_url())["elements"]

    def fetch_events(self) -> list[dict]:
        """Gameweek metadata, incl. `finished` and `data_checked` flags."""
        return self._get(self._config.bootstrap_url())["events"]

    def fetch_teams(self) -> list[dict]:
        """Clubs with strength ratings (attack/defence, home/away)."""
        return self._get(self._config.bootstrap_url())["teams"]

    def fetch_player_history(self, player_id: int) -> list[dict]:
        time.sleep(self._config.polite_delay_s)
        return self._get(self._config.element_url(player_id))["history"]
