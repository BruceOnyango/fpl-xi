# Dashboard API (`backend/api`)

## Purpose
A read-only FastAPI layer the web dashboard (`frontend/`) calls. It joins **live FPL state** with **predictions you export** and never trains.

## Scope / responsibilities
- **Owns:**
  - live, cached pulls from the FPL API (prices, injury flags, deadlines, fixtures, a manager's picks/history, mini-leagues)
  - reading your exported artifacts
  - the availability gate
  - the ILP + captain rule on a 15-man squad (the same code `predict_upcoming.py` uses)
- **Does NOT own:**
  - training, features or evaluation (that's you, via `scripts/`)
  - the response contract's frontend twin (`frontend/src/lib/api/schemas.ts`)

## Structure
- `api/main.py`: every route under one prefix, `/fpl` by default (`FPL_API_PREFIX` overrides it), so a reverse proxy forwards that single path untouched. Docs at `/fpl/docs`. Also holds the error handlers. Every error has a human `detail`, which the UI shows as-is.
- `api/service.py`: assembles responses: availability gate, lineup (ILP), captain/vice, free-transfer estimate, leagues.
- `api/fpl_live.py`: requests + per-resource TTL cache. Each value remembers when it was pulled, which becomes `dataFetchedAt`.
- `api/store.py`: reads `data/processed/predictions.json` and `backtest_h<N>.json`, and reloads them when the files change.
- `api/models.py`: Pydantic response models, camelCase on the wire. **These mirror the frontend Zod schemas; change both together.**
- `tests/test_api.py`: route tests with a fake FPL client and a temp predictions file. No network.

## Data & dependencies

| Route | Source |
|---|---|
| `GET /fpl/meta` | live bootstrap (GW, deadline) + predictions/backtest file metadata |
| `GET /fpl/teams` | live bootstrap |
| `GET /fpl/players?horizon=1\|3\|6` | live bootstrap + `predictions.json` |
| `GET /fpl/fixtures?fromGw&toGw` | live `/fixtures/` |
| `GET /fpl/managers/{id}/squad?horizon` | live entry, history and picks (last finished GW) + predictions → ILP |
| `GET /fpl/managers/{id}/leagues` | live entry + `/leagues-classic/{id}/standings/` (invitational leagues only, first page) |
| `GET /fpl/model/backtest?horizon` | `backtest_h<N>.json` (empty series if not saved yet) |

Cache TTLs: bootstrap 15 min, fixtures 60 min, entry/history 5 min, picks 60 min, leagues 15 min.

## Key decisions & rationale
- **No training in the API, by design.** You retrain and export on your own schedule; the API just serves what you exported.
- **Prices and injury flags are live, not from the export,** so the availability gate uses the freshest status. Players flagged out show 0 predicted points rather than phantom points.
- **The prediction interval is out-of-sample.** `export_predictions.py` fits on 85% of rows; each player's range is the 10th–90th percentile of what the 150 held-out rows with the nearest predictions actually scored. That makes it smooth, so Haaland and Rice get different ranges; a coarse 5-bin version gave every top player the same one.
- **The team range combines player spreads in quadrature.** Eleven players won't all hit their ceiling at once.
- **Public-data approximations,** because FPL only exposes these to the logged-in owner:
  - free transfers are *estimated* from public history (+1 per GW, max 5; wildcard/free hit don't consume)
  - selling price is the current price
- **The squad is read from the last finished GW.** The upcoming team is private before the deadline; this is the same caveat as the CLI.

## States
- **No `predictions.json`:** `/players` and `/managers/*/squad` return 503 with the exact command to run. `/meta` still works (`predictionsGeneratedAt: null`).
- **Predictions older than the next GW:** the frontend shows a banner with the export command.
- **FPL API down:** 502. **Bad team ID:** 404 ("Check it and try again").

## How to extend
- **New field:** add it to `models.py` *and* `frontend/src/lib/api/schemas.ts`, populate it in `service.py`, and add a test.
- **New route:** add it to `main.py` → `service.py`, then the frontend client, query key and hook (see `frontend/src/mocks/README.md`).

## Open questions / TODO
- League standings show page 1 only (50 entries).
- Phase 2: a scheduled `fetch_data → export_predictions` job, so predictions keep up with the deadline without manual runs.

## Run

```bash
# once per data refresh / retrain (you):
python scripts/fetch_data.py
python scripts/export_predictions.py --gw 9
python scripts/evaluate.py --horizon 1 --save     # optional: fills the "how much to trust this" panel

# serve (repo root):
python -m uvicorn backend.api.main:app --reload --port 8000

# frontend (another terminal):
cd frontend && cp .env.example .env.local && npm run dev   # http://localhost:5173/fantasy-league/, proxies /fpl → :8000
```

Tests: `python -m pytest backend/tests`.

Production (bruceonyango.link/fpl behind nginx or Apache): see [`../deploy/README.md`](../deploy/README.md).
