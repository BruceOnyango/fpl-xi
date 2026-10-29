"""Live, cached reads from the public FPL API.

The dashboard API never trains; it pulls current FPL state (prices, injury flags,
deadlines, fixtures, a manager's picks) and joins it with the predictions file you
export. Every resource has its own TTL so we stay polite to an unofficial API, and
each cached value remembers *when* it was pulled — that becomes `dataFetchedAt`.
"""

from __future__ import annotations
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable

import requests

API_BASE = "https://fantasy.premierleague.com/api"

MINUTE = 60.0
TTL = {
    "bootstrap": 15 * MINUTE,  # prices + injury flags; FPL updates these a few times a day
    "fixtures": 60 * MINUTE,
    "entry": 5 * MINUTE,
    "history": 5 * MINUTE,
    "picks": 60 * MINUTE,  # picks for a finished GW never change
    "league": 15 * MINUTE,
}


class FplUnavailable(Exception):
    """The FPL API couldn't be reached or returned a server error."""


class FplNotFound(Exception):
    """The FPL API returned 404 (bad team / league id)."""


@dataclass(frozen=True)
class Pulled:
    data: Any
    fetched_at: datetime


class FplLive:
    def __init__(self, base: str = API_BASE, timeout_s: float = 20.0, session: requests.Session | None = None):
        self._base = base
        self._timeout = timeout_s
        self._session = session or requests.Session()
        self._session.headers.setdefault("User-Agent", "fpl-xi-dashboard (personal, cached)")
        self._cache: dict[str, tuple[float, Pulled]] = {}
        self._lock = threading.Lock()

    # -- core ---------------------------------------------------------------

    def _get(self, path: str) -> Any:
        try:
            r = self._session.get(f"{self._base}{path}", timeout=self._timeout)
        except requests.RequestException as e:
            raise FplUnavailable(f"Couldn't reach the FPL API ({e.__class__.__name__}).") from e
        if r.status_code == 404:
            raise FplNotFound(path)
        if r.status_code >= 400:
            raise FplUnavailable(f"The FPL API returned {r.status_code}. It may be updating — try again shortly.")
        return r.json()

    def _cached(self, key: str, kind: str, fetch: Callable[[], Any]) -> Pulled:
        now = time.monotonic()
        with self._lock:
            hit = self._cache.get(key)
            if hit and now - hit[0] < TTL[kind]:
                return hit[1]
        pulled = Pulled(fetch(), datetime.now(timezone.utc))
        with self._lock:
            self._cache[key] = (now, pulled)
        return pulled

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

    # -- resources ----------------------------------------------------------

    def bootstrap(self) -> Pulled:
        return self._cached("bootstrap", "bootstrap", lambda: self._get("/bootstrap-static/"))

    def fixtures(self) -> Pulled:
        return self._cached("fixtures", "fixtures", lambda: self._get("/fixtures/"))

    def entry(self, team_id: int) -> Pulled:
        return self._cached(f"entry:{team_id}", "entry", lambda: self._get(f"/entry/{team_id}/"))

    def entry_history(self, team_id: int) -> Pulled:
        return self._cached(f"history:{team_id}", "history", lambda: self._get(f"/entry/{team_id}/history/"))

    def picks(self, team_id: int, event: int) -> Pulled:
        return self._cached(
            f"picks:{team_id}:{event}", "picks", lambda: self._get(f"/entry/{team_id}/event/{event}/picks/")
        )

    def league(self, league_id: int) -> Pulled:
        return self._cached(
            f"league:{league_id}", "league", lambda: self._get(f"/leagues-classic/{league_id}/standings/")
        )
