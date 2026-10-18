"""Fetch a manager's squad from the public FPL API by team ID.

Pre-deadline, a manager's upcoming team is private — the API only exposes picks
for FINISHED gameweeks. So by default we read their squad as of the last settled
gameweek (their current 15 unless they've since transferred). The caller prints
this caveat and lets the user edit.
"""

from __future__ import annotations
import requests


def _get(url, cfg):
    r = requests.get(url, timeout=cfg.request_timeout_s)
    r.raise_for_status()
    return r.json()


def last_finished_event(cfg) -> int:
    events = _get(f"{cfg.api_base}/bootstrap-static/", cfg)["events"]
    finished = [e["id"] for e in events if e.get("finished")]
    if not finished:
        raise SystemExit("no finished gameweeks yet")
    return max(finished)


def fetch_picks(team_id: int, event: int, cfg) -> list[int]:
    """Element ids of the 15 players the manager fielded in `event`."""
    data = _get(f"{cfg.api_base}/entry/{team_id}/event/{event}/picks/", cfg)
    return [p["element"] for p in data.get("picks", [])]


def squad_names(team_id: int, players, cfg, event=None) -> tuple[list[str], int]:
    """Returns (web_names, event_used). Defaults to the last finished gameweek."""
    if event is None:
        event = last_finished_event(cfg)
    ids = fetch_picks(team_id, event, cfg)
    by_id = {p["id"]: p["web_name"] for p in players}
    names = [by_id[i] for i in ids if i in by_id]
    if not names:
        raise SystemExit(
            f"no squad found for team {team_id} at GW{event} " "(check the team ID)"
        )
    return names, event
