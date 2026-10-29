# Transfers / Planner

## Purpose

Simulate out → in moves before making them, with live budget, club-limit, squad-shape and points feedback.

## Scope / responsibilities

- Owns: `/transfers` (TransfersPage), the planner hook, URL encoding, and the replacement picker.
- Does NOT own: the rules and maths (`lib/fpl/rules.ts`, `lib/fpl/lineup.ts`) or making transfers on FPL (never; this is read-only).

## Structure

- `TransfersPage.tsx`: squad sell-list | picker | plan summary (StatTiles, violations, TransferRows), plus InjuryNudge.
- `useTransferPlan.ts`: URL-backed plan → `simulateTransfers` → `solveLineup` before and after, with `preview()` for the picker.
- `ReplacementPicker.tsx`: same-position candidates ranked by prediction; blocked options are disabled with the reason as text.
- `transferParams.ts` (+ test): `?t=outId-inId,…&sell=id` parse/serialise; drops junk and duplicates.
- `TransfersPage.test.tsx`: sell → pick → legal plan → reset.

## Data & dependencies

- `useSquadView` (squad, selling prices, bank, free transfers) and `usePlayerMap(horizon)`.
- Lib: `simulateTransfers`, `validateSquad`, `describeViolation`, `HIT_COST`, `solveLineup`.

## Key decisions & rationale

- **The plan lives in the URL,** so it's shareable and survives reloads (§8). Stale pairs (an out-player no longer in the squad) are ignored.
- **The headline number is "Best-XI change", not Σin − Σout.** It re-solves the best lineup before and after, net of hits, because a bench-to-bench swap is worth about 0. `solveLineup` is exact for a fixed 15 (see `lib/fpl/lineup.ts`), so this runs in the browser instantly.
- **Constraints are checked client-side for instant feedback.** The backend stays authoritative once a "validate plan" endpoint exists.
- **The picker hides injured/suspended players** and disables, rather than hides, budget or club-limit breakers, so users can see why.

## States

- **No team ID:** EmptyState plus TeamIdForm.
- **Loading:** skeleton.
- **Error:** QueryState.
- **Empty plan:** "No transfers yet" with the next action.
- **Picker:** "No matches" when the search finds nothing.

## How to extend

- **Wildcard / Free Hit:** set `freeTransfers` to ∞ in the simulation input and show a chip badge.
- **Server validation:** call it from `useTransferPlan`, but keep the local checks for responsiveness.

## Open questions / TODO

- Multi-GW plans (rolling transfers, banking a free transfer) aren't modelled.
