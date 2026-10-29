# Mocks

## Purpose

A typed mock of the backend API (MSW) so the dashboard runs before `backend/api/` exists.

## Scope / responsibilities

- Owns: `handlers.ts` (routes), `db.ts` (seeded resolvers), `data/snapshot.json` (real FPL roster).
- Does NOT own: the contract itself — that is `src/lib/api/schemas.ts`. Handlers must satisfy it.

## Structure

- `handlers.ts` — MSW routes mirroring the planned FastAPI endpoints.
- `db.ts` — deterministic resolvers; every response carries `source: "mock"`.
- `browser.ts` / `node.ts` — worker for dev, server for Vitest.
- `data/snapshot.json` — built by `npm run mock:roster` from `../data/raw/*.json`.

## Data & dependencies

- Real (from the backend's cached FPL pulls): names, clubs, positions, prices, status/news,
  ownership, season stats, deadlines. `dataFetchedAt` = mtime of `data/raw/players.json`.
- Mock: predictions, fixtures, squads, leagues, per-GW backtest series. Headline model metrics
  (Spearman 0.273 ± 0.10, 90% beats persistence) are the real README numbers.

## Key decisions & rationale

- Seeded PRNG so screenshots/tests are stable.
- Team ID `404` always 404s, to exercise error states.
- Mock lineups reuse `lib/fpl/lineup.ts`, the same exact solver the planner uses.

## States

- Dev latency 250–600 ms so skeletons are visible; zero in tests.

## How to extend

- New endpoint: add schema → client fn → query key → hook → handler here → resolver in `db.ts`.
- Refresh the roster: `python scripts/fetch_data.py` (repo root), then `npm run mock:roster`.

## Open questions / TODO

- Delete this folder's use in prod once the FastAPI layer ships (`VITE_USE_MOCKS=false`).
