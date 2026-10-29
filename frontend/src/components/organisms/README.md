# Organisms

## Purpose

Self-contained dashboard sections such as the pitch, tables, panels, nav and forms. Most take view-model props; a few read server state or settings through hooks.

## Scope / responsibilities

- Owns: section-level UI, accessible structure (tables, regions, drawers) and wiring to hooks where needed.
- Does NOT own: fetching (they call `lib/api/hooks` and never `fetch`), domain maths (`lib/fpl`) or page orchestration and URL state (`features/*`).

## Structure

- `SquadPitch.tsx`: GK→FWD rows on a striped pitch, bench below, selectable tokens. Props: `SlotView[]`.
- `CaptaincyPanel.tsx`: top-N captain options by single-GW prediction with ranges, plus a "close call" note when the ranges overlap.
- `FlaggedPlayers.tsx`: injury/doubt watchlist with an empty state.
- `FixtureTicker.tsx`: teams × GWs `<table>`; sort by easiest run, highlight squad clubs, blank cells, focusable scroll region.
- `PlayerTable.tsx`: TanStack Table v8 + TanStack Virtual; sortable header buttons with `aria-sort`; compare checkboxes.
- `PlayerCard.tsx`: full profile used in comparison and My Team.
- `TransferRow.tsx`: out → in, points swing, cost, undo.
- `LeagueTable.tsx`: standings with movement arrows plus sr-only text, and `aria-current` on the viewer's row.
- `ModelConfidence.tsx` _(uses `useBacktest`, `useMeta`)_: backtest chart, honest summary, table fallback.
- `TopBar.tsx` _(uses `useMeta`, settings)_: deadline badge, team chip, theme toggle, mobile nav drawer (Radix Dialog).
- `AppNav.tsx`: primary NavLinks and `Brand`.
- `TeamIdForm.tsx` _(settings)_: React Hook Form + Zod; demo team button.
- `HorizonToggle.tsx` _(settings)_: 1/3/6-GW SegmentedControl, plus the `horizonLabel()` helper.
- Every organism has `X.stories.tsx` and `X.test.tsx`.

## Data & dependencies

- Hooks: `useMeta`, `useBacktest` (`lib/api/hooks`); `useSettings` (`lib/settings`).
- View models: `SlotView`, `SquadView` (`lib/api/views.ts`).
- Lib: `lib/fpl/{lineup,fixtures,players,rules}`, `lib/format`.
- Schemas: `Player`, `Team`, `Fixture`, `League`, `Prediction`, `Horizon`.

## Key decisions & rationale

- **Most organisms take props rather than calling hooks.** The page joins resources once (`useSquadView`) and passes slices down, which avoids duplicate subscriptions and keeps stories and tests simple. Organisms that are useful standalone (`ModelConfidence`, `TopBar`) fetch for themselves.
- **`TeamIdForm` and `HorizonToggle` were promoted here** because four or more features use them (§10 promotion rule).
- **`PlayerTable` doesn't filter.** Filters are URL state owned by the Players page. Sorting is local.
- **Virtualisation pads with spacer rows** inside a real `<table>`, so screen readers still get table semantics, plus `aria-rowcount` and `aria-rowindex`.
- **Scroll regions are focusable** (`tabIndex=0`, labelled). axe needs this for keyboard scrolling on mobile; there's a lint disable with the reason inline.
- **The chart has an aria description and a table toggle** (§7). Recharts is excluded from the axe sweep, which is covered by those two.

## States

- `ModelConfidence` uses `QueryState` (skeleton, error with retry, empty).
- `FlaggedPlayers` has an empty state.
- `TopBar` shows a skeleton while meta loads.
- Prop-driven organisms leave loading to the page.

## How to extend

- **New section:** used by one feature? Build it in that feature's folder. When a second feature needs it, promote it here and update both guides.
- **New table column:** add it to the `columns` memo in `PlayerTable`. Put the maths in `lib/fpl`.

## Open questions / TODO

- **Chip strategy panel.** The backend doesn't model chips yet.
- `PlayerTable` could support keyboard row navigation (grid pattern). Today rows are reachable through their controls.
