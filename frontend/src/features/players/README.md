# Players

## Purpose

The dense explorer: every player, with predictions and ranges, sortable and filterable, plus a side-by-side comparison of up to three.

## Scope / responsibilities

- Owns: `/players` (PlayersPage) and the URL filter model (`playerFilters.ts`).
- Does NOT own: the table and card (shared organisms `PlayerTable`, `PlayerCard`).

## Structure

- `PlayersPage.tsx`: comparison section (PlayerCards), filter bar (search, position, club, max price, fit only, reset), PlayerTable.
- `playerFilters.ts` (+ test): `readFilters` / `writeFilters` (URL ↔ state) and `applyFilters` (accent-insensitive search).
- `PlayersPage.test.tsx`: URL filters and the empty state.

## Data & dependencies

- `usePlayerPredictions(horizon)`, `useTeams`, `useFixtureContext` (for fixtures in cards).
- Schema: `PlayersResponse`.

## Key decisions & rationale

- **All filters and the comparison set live in the URL** (`q, pos, team, max, fit, cmp`). Views are shareable and the back button works.
- **Filtering happens here; sorting happens in the table.** That keeps PlayerTable reusable.
- **The comparison cap is 3.** Wider than that, the cards stop being side by side on a laptop.
- **The comparison flow is tested in Playwright, not jsdom.** In jsdom the MemoryRouter search-param update doesn't commit for the virtualised table; in real browsers it does. See `e2e/flows.spec.ts`.

## States

- **Loading:** table-sized skeleton.
- **Error:** QueryState.
- **Empty:** "No players match" with Reset filters.

## How to extend

- **New filter:** add it to `PlayerFilters`, read/write/apply it plus a test, then add a control to the bar.
- **Saved views:** they're just URLs; offer "copy link".

## Open questions / TODO

- Per-90 columns and a column picker.
