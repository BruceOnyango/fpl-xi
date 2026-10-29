# Dashboard API (`backend/api`)

## Purpose
A read-only FastAPI layer the web dashboard (`frontend/`) calls. It joins **live FPL state** with **predictions you export** and never trains. In production it runs under PM2 as `fpl-api` on `127.0.0.1:8011`, public at `https://example.com/fpl`.

## Scope / responsibilities
- **Owns:**
  - live, cached pulls from the FPL API (prices, injury flags, deadlines, fixtures, a manager's picks/history, mini-leagues)
  - reading your exported artifacts
  - the availability gate
  - the ILP + captain rule on a 15-man squad (the same code `scripts/predict_upcoming.py` uses)
  - health/readiness checks
- **Does NOT own:**
  - training, features or evaluation (that's you, via `backend/scripts/`)
  - the frontend twin of the response contract (`frontend/src/lib/api/schemas.ts`)

## Structure
- `__main__.py`: `python -m api` starts uvicorn with `API_HOST`/`API_PORT` (default `127.0.0.1:8011`). PM2 runs exactly this.
- `main.py`: every route under one prefix (`/fpl`, set by `FPL_API_PREFIX`), the CORS allow-list (`CORS_ORIGINS`) and the error handlers. Every error has a human `detail`, which the UI shows as-is.
- `service.py`: assembles responses: availability gate, lineup (ILP), captain/vice, free-transfer estimate, leagues.
- `fpl_live.py`: requests + per-resource TTL cache. Each value remembers when it was pulled, which becomes `dataFetchedAt`.
- `store.py`: reads `backend/data/processed/predictions.json` and `backtest_h<N>.json`, and reloads them when the files change.
- `models.py`: Pydantic response models, camelCase on the wire. **These mirror the frontend Zod schemas; change both together.**
- Tests: `../tests/test_api.py`, with a fake FPL client and a temp predictions file. No network.

## Data & dependencies

| Route (prefix `/fpl`) | Source |
|---|---|
| `GET /health` | uptime, version, last FPL pull, predictions timestamp/GW. **Never calls FPL.** |
| `GET /ready` | 200 once predictions are exported; 503 with the command to run otherwise |
| `GET /meta` | live bootstrap (GW, deadline) + predictions/backtest file metadata |
| `GET /teams` | live bootstrap |
| `GET /players?horizon=1\|3\|6` | live bootstrap + `predictions.json` |
| `GET /fixtures?fromGw&toGw` | live `/fixtures/` |
| `GET /managers/{id}/squad?horizon` | live entry, history and picks (last finished GW) + predictions → ILP |
| `GET /managers/{id}/leagues` | live entry + `/leagues-classic/{id}/standings/` (invitational, first page) |
| `GET /model/backtest?horizon` | `backtest_h<N>.json` (empty series if not saved yet) |
| `GET /docs` | interactive OpenAPI docs |

Cache TTLs: bootstrap 15 min, fixtures 60 min, entry/history 5 min, picks 60 min, leagues 15 min.

Config (`backend/.env.example`): `API_HOST`, `API_PORT`, `FPL_API_PREFIX`, `CORS_ORIGINS`, `FPL_XI_PROCESSED_DIR`, `APP_VERSION`.

## Key decisions & rationale
- **No training in the API, by design.** You retrain and export on your own schedule; the API serves what you exported.
- **One prefix for every route**, so nginx/Apache forwards `/fpl/` untouched.
- **CORS is an explicit allow-list, not `*`.** Through nginx the app and API share an origin anyway.
- **One uvicorn process, because the FPL cache lives in memory.** That means `pm2 reload` leaves a gap of about a second (measured: 1 of 102 requests failed). The frontend retries gateway errors, so users don't see it.
- **Prices and injury flags are live, not from the export,** so the availability gate uses the freshest status. Players ruled out show 0 predicted points, on the pitch and in lists alike.
- **Prediction ranges** are the 10th–90th percentile of actual outcomes for the 150 held-out predictions nearest each player's (see `scripts/predict_upcoming.py:knn_interval`).
- **Public-data approximations,** because FPL only exposes these to the logged-in owner:
  - free transfers are *estimated* from public history
  - selling price is the current price
  - the squad is read from the last finished GW

## States
- **No `predictions.json`:** `/players` and `/managers/*/squad` return 503 with the command to run. `/ready` returns 503, while `/health` and `/meta` still work.
- **Predictions older than the next GW:** the frontend shows a banner with the export command.
- **FPL API down:** 502. **Bad team ID:** 404 ("Check it and try again").

## How to extend
- **New field:** add it to `models.py` *and* `frontend/src/lib/api/schemas.ts`, populate it in `service.py`, and add a test.
- **New route:** add it to `main.py` → `service.py`, then the frontend client, query key and hook (see `frontend/src/mocks/README.md`).

## Open questions / TODO
- League standings show page 1 only (50 entries).
- Phase 2: a scheduled `fetch_data → export_predictions` job (e.g. a PM2 cron app).

## Run (from `backend/`)

```bash
python scripts/fetch_data.py
python scripts/export_predictions.py --gw 9
python scripts/evaluate.py --horizon 1 --save     # optional: fills the "how much to trust this" panel

API_RELOAD=1 python -m api                        # http://127.0.0.1:8011/fpl/docs
python -m pytest tests/test_api.py
```
Production: PM2 (`../../ecosystem.config.js`) behind a reverse proxy.
