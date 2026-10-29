"""Read-only access to the artifacts you produce offline.

- data/processed/predictions.json  ← scripts/export_predictions.py
- data/processed/backtest_h<N>.json ← scripts/evaluate.py --horizon N --save

Files are re-read when their mtime changes, so re-exporting is picked up without
restarting the API.
"""

from __future__ import annotations
import json
import os
import threading
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

#: Override with FPL_XI_PROCESSED_DIR to serve artifacts from elsewhere.
PROCESSED = Path(
    os.environ.get("FPL_XI_PROCESSED_DIR") or Path(__file__).resolve().parents[1] / "data" / "processed"
)


@dataclass(frozen=True)
class PlayerPrediction:
    points: float
    low: float
    high: float
    capt: float


@dataclass(frozen=True)
class Predictions:
    gw: int
    model: str
    generated_at: datetime
    data_fetched_at: datetime
    by_horizon: dict[int, dict[int, PlayerPrediction]]


class ArtifactStore:
    def __init__(self, root: Path = PROCESSED):
        self._root = root
        self._cache: dict[Path, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def _load_json(self, path: Path) -> Any | None:
        if not path.exists():
            return None
        mtime = path.stat().st_mtime
        with self._lock:
            hit = self._cache.get(path)
            if hit and hit[0] == mtime:
                return hit[1]
        data = json.loads(path.read_text(encoding="utf-8"))
        with self._lock:
            self._cache[path] = (mtime, data)
        return data

    def predictions(self) -> Predictions | None:
        raw = self._load_json(self._root / "predictions.json")
        if raw is None:
            return None
        return Predictions(
            gw=int(raw["gw"]),
            model=str(raw.get("model", "gbm")),
            generated_at=datetime.fromisoformat(raw["generated_at"]),
            data_fetched_at=datetime.fromisoformat(raw["data_fetched_at"]),
            by_horizon={
                int(h): {
                    int(r["player_id"]): PlayerPrediction(r["pred"], r["low"], r["high"], r["capt_pred"])
                    for r in rows
                }
                for h, rows in raw["horizons"].items()
            },
        )

    def backtest(self, horizon: int) -> dict | None:
        return self._load_json(self._root / f"backtest_h{horizon}.json")
