# My Team

## Purpose

The manager's 15: the best lineup from them, every player's prediction range, selling prices, and who's flagged.

## Scope / responsibilities

- Owns: `/my-team` (MyTeamPage) and `SquadList`.
- Does NOT own: the pitch and player card (shared organisms) or squad loading (`useSquadView`).

## Structure

- `MyTeamPage.tsx`: SplitPaneLayout. Main has the selectable SquadPitch and SquadList; the aside has the PlayerCard for the selected player (the captain by default) and FlaggedPlayers.
- `SquadList.tsx`: grouped by position, with a bench marker, availability icon, PredictionRange and selling price.

## Data & dependencies

- `useSquadView(teamId, horizon)` → `/managers/:id/squad`, `/players`, `/fixtures`, `/teams`, `/meta`.
- Schemas: `ManagerSquadResponse`, `Player`.

## Key decisions & rationale

- **Selection is local state, not a URL param.** It's a transient detail view and not worth sharing.
- **The captain is selected by default,** so the aside is never empty.

## States

- **No team ID:** EmptyState plus TeamIdForm.
- **Loading:** two-column skeleton.
- **Error:** QueryState with retry.

## How to extend

- **Manual lineup editing (drag to swap):** keep it client-side, re-validate with `solveLineup`/`FORMATIONS` from `lib/fpl/lineup.ts`, and make pitch tokens draggable with a keyboard alternative.

## Open questions / TODO

- Show purchase price as well as selling price when the API exposes it.
