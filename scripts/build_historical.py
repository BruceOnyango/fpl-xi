"""Build historical training data from the vaastav FPL archive.

Downloads past-season gameweek data (2022-23 onward, where expected_goals exist),
runs each season through the SAME leak-free feature builder with that season's
team strengths, and saves one file the model trains on alongside the current
season. Seasons are processed independently, so rolling/lag features never bleed
across a season boundary.

Usage:
  python scripts/build_historical.py
  python scripts/build_historical.py --seasons 2024-25 2025-26
"""

from __future__ import annotations
import argparse, sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "src"))
import pandas as pd
from fpl.features.builder import LeakFreeFeatureBuilder, FEATURE_COLUMNS

RAW_BASE = (
    "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data"
)
DEFAULT_SEASONS = ["2022-23", "2023-24", "2024-25", "2025-26"]
STRENGTH = [
    "strength_attack_home",
    "strength_attack_away",
    "strength_defence_home",
    "strength_defence_away",
]
COLS = {
    "GW": "round",
    "total_points": "total_points",
    "minutes": "minutes",
    "expected_goals": "expected_goals",
    "expected_assists": "expected_assists",
    "transfers_in": "transfers_in",
    "transfers_out": "transfers_out",
    "value": "value",
    "was_home": "was_home",
    "opponent_team": "opponent_team",
}
PROC = HERE / "data" / "processed"


def _read(path_or_url):
    return pd.read_csv(path_or_url)


def season_features(season: str, base: str) -> pd.DataFrame:
    mg = _read(f"{base}/{season}/gws/merged_gw.csv")
    tdf = _read(f"{base}/{season}/teams.csv")
    teams = {
        int(r["id"]): {k: float(r[k]) for k in STRENGTH} for _, r in tdf.iterrows()
    }

    use = mg[list(COLS) + ["element"]].rename(columns=COLS)
    history = {
        int(el): g.drop(columns="element").to_dict("records")
        for el, g in use.groupby("element")
    }
    feats = LeakFreeFeatureBuilder().build(history, teams=teams)
    feats["season"] = season
    return feats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seasons", nargs="*", default=DEFAULT_SEASONS)
    ap.add_argument("--base", default=RAW_BASE, help="data root (URL or local path)")
    args = ap.parse_args()
    PROC.mkdir(parents=True, exist_ok=True)

    frames = []
    for s in args.seasons:
        print(f"building {s} …")
        f = season_features(s, args.base)
        print(f"  {len(f)} rows")
        frames.append(f)

    hist = pd.concat(frames, ignore_index=True)
    keep = ["season", "round", "player_id", *FEATURE_COLUMNS, "y"]
    hist[keep].to_parquet(PROC / "historical.parquet")
    print(
        f"\nhistorical: {len(hist)} rows across {len(args.seasons)} seasons "
        f"-> data/processed/historical.parquet"
    )


if __name__ == "__main__":
    main()
