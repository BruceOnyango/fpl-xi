# Molecules

## Purpose

Small, reusable combinations of atoms that express one FPL idea, such as a fixture, a player name, a freshness stamp or a prediction range.

## Scope / responsibilities

- Owns: presentational compositions with at most local UI state.
- Does NOT own: server state (no hooks from `lib/api/hooks`) or routing. Data comes in via props.

## Structure

- `PlayerName.tsx`: avatar + name + PositionPill + club + optional meta slot.
- `FixtureChip.tsx`: "LIV (A) 4" filled with the FDR colour, plus sr-only "away, difficulty 4 of 5". `BlankFixtureChip` marks blank gameweeks.
- `StatTile.tsx`: KPI card with label, value, Delta and hint, plus a `loading` skeleton. (This is the prompt's `StatPair`, framed as a tile.)
- `SearchField.tsx`: labelled search input; Escape and the × button clear it.
- `GameweekSelector.tsx`: previous/next stepper with an `<output aria-live>`.
- `DataFreshness.tsx`: "Data pulled 2h ago · model run 1h ago". `inline` or `banner` variant, escalating to warn or stale (rules in `lib/fpl/freshness.ts`), with a "Mock data" badge when `source === 'mock'`.
- `SegmentedControl.tsx`: generic radio group with roving tabindex and arrow keys.
- `StateViews.tsx`: `EmptyState`, `ErrorState` (`role="alert"`, retry) and `QueryState`, which routes a query to loading, error, empty or content.
- `InjuryNudge.tsx`: the honesty callout, full or compact.
- `AvailabilityFlag.tsx`: status icon + label + news; `icon` variant for pitch tokens.
- `DeadlineCountdown.tsx`: ticking `role="timer"` with a spoken summary. Turns red under 6h.
- `PredictionRange.tsx`: low–high bar with a point tick and an `aria-label` sentence.
- `PitchPlayer.tsx`: pitch token (shirt, name plate, points, fixture, armband, flag); renders as a button when `onSelect` is given.
- Every molecule has `X.stories.tsx` and `X.test.tsx`.

## Data & dependencies

- Atoms; `lib/format`; `lib/fpl/{freshness,players,fixtures}`; types from `lib/api/schemas`.
- `QueryState` takes a minimal `QueryLike` shape, so the tier stays fetch-agnostic.

## Key decisions & rationale

- **`DataFreshness` never shows client fetch time,** only `dataFetchedAt` and `predictionsGeneratedAt` (§8). The banner renders nothing when data is fresh, so it costs nothing on the happy path.
- **`PredictionRange` exists so no prediction appears as a bare number** where there's room for its range (§2, §15).
- **`QueryState` is the single place where the three async states (§6.7) are wired.** Every async surface uses it.
- `StatPair` from the prompt became `StatTile`. In the Dribbble-style layout every label/value/delta appears as a tile, and a bare pair has no second use yet.

## States

- `StatTile` has `loading`. `QueryState` implements loading, error and empty for everything above it.

## How to extend

- Keep molecules pure. If you need `useQuery`, build an organism that passes data into a molecule.
- New freshness rules go in `lib/fpl/freshness.ts` (unit-tested), not in the component.

## Open questions / TODO

- `GameweekSelector` isn't used by a page yet. Viewing past gameweeks needs a backend endpoint for historical lineups.
