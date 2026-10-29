# Leagues / Standings

## Purpose

Mini-league standings: rank, movement, GW points and total, with your row highlighted.

## Scope / responsibilities

- Owns: `/leagues` (LeaguesPage): tabs per league.
- Does NOT own: the table (`LeagueTable` organism).

## Structure

- `LeaguesPage.tsx`: Radix Tabs (one per league), each holding a LeagueTable.

## Data & dependencies

- `useLeagues(teamId)` → `/managers/:id/leagues`. Schema: `LeaguesResponse`.

## Key decisions & rationale

- **Tabs rather than stacked tables.** Managers usually check one league at a time, and Radix Tabs gives arrow-key navigation for free.
- **Movement is shown with an arrow plus a number plus sr-only words** ("3 places up").

## States

- **No team ID:** EmptyState plus TeamIdForm.
- **Loading:** skeleton.
- **Error:** QueryState.
- **No leagues:** EmptyState explaining how to join one.

## How to extend

- **Pagination for big leagues:** add `page` to the endpoint and the query key.

## Open questions / TODO

- The FPL backend doesn't expose leagues yet, so this page is all mock. It needs a `/managers/:id/leagues` endpoint wrapping the FPL entry and leagues APIs.
