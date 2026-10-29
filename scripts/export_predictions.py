"""Export predictions for the dashboard API to serve.

Run this whenever you've refreshed data or retrained; the API never trains, it only
reads the file this writes (data/processed/predictions.json).

For each horizon (1, 3, 6 GWs) it writes every player's point estimate plus an
80% empirical interval (see predict_board(interval=True)), and the 1-GW captaincy
score. The availability gate is NOT applied here — the API applies it at request
time from live FPL status, which is fresher than this file.

Usage:
  python scripts/fetch_data.py
  python scripts/export_predictions.py --gw 9
"""

from __future__ import annotations
import argparse, json, sys
from datetime import datetime, timezone
from pathlib import Path

# Windows consoles default to cp1252, which can't print names like "Mitrović".
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "src"))
sys.path.insert(0, str(HERE / "scripts"))
from fpl.config import FplConfig
from fpl.data.repository import JsonRawDataRepository
from predict_upcoming import fetch_fixtures, future_fixture_map, predict_board

HORIZONS = (1, 3, 6)
OUT = HERE / "data" / "processed" / "predictions.json"


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gw", type=int, required=True, help="the upcoming gameweek")
    ap.add_argument("--model", default="gbm")
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()

    cfg = FplConfig()
    raw = HERE / "data" / "raw"
    repo = JsonRawDataRepository(raw)
    players = repo.load("players")
    history = {int(k): v for k, v in repo.load("history").items()}
    teams = {t["id"]: t for t in repo.load("teams")}
    fmap = future_fixture_map(fetch_fixtures(cfg, args.gw))

    horizons = {}
    for h in HORIZONS:
        print(f"horizon {h}…")
        board = predict_board(players, history, teams, fmap, args.gw, args.model, h, interval=True)
        horizons[str(h)] = [
            {
                "player_id": int(r.player_id),
                "pred": round(float(r.pred), 2),
                "low": round(max(0.0, float(r.pred_low)), 2),
                "high": round(float(r.pred_high), 2),
                "capt_pred": round(float(r.capt_pred), 2),
            }
            for r in board.itertuples()
        ]

    payload = {
        "gw": args.gw,
        "model": args.model,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        # When the training data was pulled from FPL (fetch_data.py writes players.json).
        "data_fetched_at": _iso((raw / "players.json").stat().st_mtime),
        "interval": "80% empirical: 10th–90th percentile of actuals for the 150 nearest held-out predictions",
        "horizons": horizons,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload), encoding="utf-8")
    n = len(horizons["1"])
    print(f"wrote {n} players × {len(HORIZONS)} horizons for GW{args.gw} -> {args.out}")


if __name__ == "__main__":
    main()
