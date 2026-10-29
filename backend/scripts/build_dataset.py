"""Composition root #2 — raw data -> leak-free model matrix + player meta.
Adds fixture features from team strengths, and drops any unsettled gameweek."""

from __future__ import annotations
import sys
from pathlib import Path

# Windows consoles default to cp1252, which can't print names like "Mitrović".
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import pandas as pd
from fpl.config import FplConfig
from fpl.data.api_source import FplApiDataSource
from fpl.data.repository import JsonRawDataRepository
from fpl.features.builder import LeakFreeFeatureBuilder

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROC = ROOT / "data" / "processed"


def _cached_or_fetch(repo, name, fetch):
    if repo.exists(name):
        return repo.load(name)
    data = fetch()
    repo.save(name, data)
    return data


def main() -> None:
    PROC.mkdir(parents=True, exist_ok=True)
    repo = JsonRawDataRepository(RAW)
    source = FplApiDataSource(FplConfig())

    players = repo.load("players")
    history = {int(k): v for k, v in repo.load("history").items()}
    teams = {t["id"]: t for t in _cached_or_fetch(repo, "teams", source.fetch_teams)}
    events = _cached_or_fetch(repo, "events", source.fetch_events)

    dataset = LeakFreeFeatureBuilder().build(history, teams=teams)

    settled = {e["id"] for e in events if e.get("finished") and e.get("data_checked")}
    before = dataset["round"].nunique()
    dataset = dataset[dataset["round"].isin(settled)].reset_index(drop=True)
    print(
        f"kept {dataset['round'].nunique()}/{before} settled gameweeks: "
        f"{sorted(dataset['round'].unique())}"
    )

    dataset.to_parquet(PROC / "dataset.parquet")
    print(f"dataset: {len(dataset)} rows -> data/processed/dataset.parquet")

    meta = pd.DataFrame(players)[["id", "element_type", "team", "now_cost", "web_name"]]
    meta.to_parquet(PROC / "player_meta.parquet")
    print(f"meta: {len(meta)} players -> data/processed/player_meta.parquet")


if __name__ == "__main__":
    main()
