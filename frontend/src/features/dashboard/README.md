# Dashboard

## Purpose

The landing view: this week's recommended XI and captain, headline numbers, the deadline, how much to trust the model, and who to bring in. Used every gameweek.

## Scope / responsibilities

- Owns: `/` (DashboardPage) and its feature-local sections (`components/`).
- Does NOT own: the pitch, captaincy, flags or confidence UI (shared organisms), squad joining (`lib/api/views.ts`) or lineup maths (backend; mirrored in `lib/fpl/lineup.ts`).

## Structure

- `DashboardPage.tsx`: orchestrates `useSquadView(teamId, horizon)` and lays out the sections. Shows the TeamIdForm when no ID is set.
- `components/KpiRow.tsx`: projected (next GW, with range), last GW (with delta), overall rank, bank and value, deadline countdown.
- `components/RecommendedXiCard.tsx`: SquadPitch, formation, DataFreshness, availability-gate note, InjuryNudge.
- `components/TransferTargets.tsx` _(uses `usePlayerPredictions`)_: top fit players not owned, with ranges.
- `components/SquadFixtures.tsx` _(uses `useFixtures`, `useTeams`)_: ticker for your clubs, easiest first.
- `DashboardPage.test.tsx`: no-team → demo, full render, 404, contract-violation degradation.

## Data & dependencies

- Endpoints: `/meta`, `/managers/:id/squad?horizon`, `/players?horizon` (horizon + 1 GW), `/fixtures`, `/teams`, `/model/backtest`.
- Schemas: `ManagerSquadResponse`, `Lineup`, `PlayersResponse`, `MetaResponse`.
- Organisms: SquadPitch, CaptaincyPanel, FlaggedPlayers, ModelConfidence, HorizonToggle, TeamIdForm.

## Key decisions & rationale

- **Captaincy lives here as a panel, not a route** (§11 allows either). The decision is made where the XI is.
- **Projected points are always single-GW, even when the XI is picked on a 3/6-GW horizon.** That matches the backend (captaincy stays 1-GW), and the KPI label says "next GW".
- **The projected range comes from the API.** The mock combines per-player spreads in quadrature. Summing highs gave an impossible "13.9–149.7", which was caught in review.
- **The page-level freshness banner only appears when data is aging or stale**, so the happy path stays calm and the warning stays meaningful.
- **Layout follows the Dribbble reference:** KPI strip, then the pitch with a right rail (captaincy, flags), then confidence with targets, then fixtures.

## States

- **No team ID:** EmptyState plus TeamIdForm, with confidence, targets and fixtures still shown.
- **Loading:** KPI tile skeletons and a pitch/rail skeleton sized like the real layout.
- **Error:** QueryState ErrorState with retry. 404 says to check the ID; a contract violation says it's our bug.

## How to extend

- **New KPI:** add a `StatTile` in `KpiRow`, and put any derivation in `lib/`.
- **Chip advice:** add a card in the right rail once the backend models chips.

## Open questions / TODO

- "Key deltas vs last GW" only covers points right now. Rank delta needs `lastGwRank` history from the API.
