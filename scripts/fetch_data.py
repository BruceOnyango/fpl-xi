"""Composition root #1 — download and cache raw FPL data."""

from __future__ import annotations
import sys
from pathlib import Path

# Windows consoles default to cp1252, which can't print names like "Mitrović".
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fpl.config import FplConfig
from fpl.data.api_source import FplApiDataSource
from fpl.data.repository import JsonRawDataRepository

RAW_DIR = Path(__file__).resolve().parents[1] / "data" / "raw"


def main() -> None:
    config = FplConfig()
    source = FplApiDataSource(config)
    repo = JsonRawDataRepository(RAW_DIR)

    print("Fetching player list…")
    players = source.fetch_players()
    repo.save("players", players)
    print(f"  {len(players)} players cached.")

    print("Fetching per-gameweek history (a few minutes)…")
    history: dict[str, list[dict]] = {}
    for n, player in enumerate(players, 1):
        pid = player["id"]
        history[str(pid)] = source.fetch_player_history(pid)
        if n % 50 == 0:
            print(f"  {n}/{len(players)}")
    repo.save("history", history)
    print("Done. Raw data in data/raw/.")


if __name__ == "__main__":
    main()
