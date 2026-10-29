# Fixtures / FDR

## Purpose

Fixture difficulty for every club over the next 3, 5 or 8 gameweeks, so managers can plan transfers around runs.

## Scope / responsibilities

- Owns: `/fixtures` (FixturesPage): span and sort controls, difficulty key.
- Does NOT own: the grid (`FixtureTicker` organism) or run maths (`lib/fpl/fixtures.ts`).

## Structure

- `FixturesPage.tsx`: header controls, key, freshness, ticker. Highlights your squad's clubs when a team is loaded.

## Data & dependencies

- `useMeta` (next GW), `useTeams`, `useFixtures(from, to)`, `useSquadView` (for highlighting).
- Schemas: `FixturesResponse`, `TeamsResponse`.

## Key decisions & rationale

- **Every cell prints opponent, venue and an FDR number,** plus a visible key (§7, colour-blind safe).
- **Blank gameweeks count as 5 in the average,** since no fixture means no points. Doubles stack in one cell.
- **Span and sort are local state, not URL.** They're low value to share; move them to the URL if users ask.

## States

- **Loading:** grid skeleton.
- **Error:** QueryState with retry.
- **No fixtures in range:** blank chips.

## How to extend

- **Attack/defence-specific FDR:** add fields to `fixtureSchema` and a toggle that chooses which difficulty to render.

## Open questions / TODO

- **Mock fixtures are a generated round-robin,** not the real schedule. The backend should expose `/fixtures` from the FPL API.
