# Settings

## Purpose

Per-browser preferences: FPL team ID, theme, default prediction horizon, and a data-status panel.

## Scope / responsibilities

- Owns: `/settings` (SettingsPage).
- Does NOT own: the settings store (`lib/settings`) or the team ID form (`TeamIdForm` organism).

## Structure

- `SettingsPage.tsx`: three cards (Your team, Display, Data).

## Data & dependencies

- `useSettings` (Context + localStorage), `useMeta` (freshness), and `queryKeys.all` (to invalidate everything).

## Key decisions & rationale

- **Settings are browser-local** (wrapped in try/catch, so a private window still works with defaults). No account system is needed.
- **"Reload from server" only invalidates the query cache.** It does not re-run the pipeline: that's Phase 2 (§12), and a scheduled backend refresh is the preferred approach, to stay polite to the unofficial FPL API.
- **There are no units preferences.** FPL has one currency (£m) and points, so the §11 "units" item doesn't apply.

## States

- Data card shows "Loading data status…" until meta loads.
- The reload button shows "Refreshing…" while any query is fetching.

## How to extend

- **New preference:** add it to `Settings` with a default and a validated `load()` branch in `lib/settings`, then add a control here.

## Open questions / TODO

- Sync settings across devices if accounts are ever added.
