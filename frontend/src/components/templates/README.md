# Templates

## Purpose

Page-level layout skeletons with slots. They arrange organisms and never hold data.

## Scope / responsibilities

- Owns: grid and landmark structure (skip link, `<main id="main">`, sidebar, header and footer slots).
- Does NOT own: which organisms go in the slots (that's `app/RootLayout` and pages) or any data.

## Structure

- `AppShell.tsx`: sidebar (lg+), top bar, notice, `<main>` and footer slots, plus the skip link.
- `PageLayout.tsx`:
  - `PageLayout`: the page's single `<h1>`, eyebrow, description, actions and banner slots.
  - `SplitPaneLayout`: main + aside, stacking below `xl` with main first in reading order.
- `templates.stories.tsx` / `templates.test.tsx`: placeholder-block stories and landmark tests.
- `index.ts`: the barrel.

## Data & dependencies

- None.

## Key decisions & rationale

- **The prompt's `DashboardLayout` and `DetailLayout` became `AppShell` + `PageLayout` + `SplitPaneLayout`.** Every page shares the same header shape, and two-column pages share the same split, so three composable templates cover all seven routes.
- **Templates take slots, not organisms,** so they can't accidentally fetch. `RootLayout` (in `app/`) fills them.
- **Stories and tests are one file each for the tier.** Templates are a few lines of layout, and per-file stories would only duplicate the placeholder blocks.

## States

- Loading is the page's job. `RootLayout` adds a Suspense fallback skeleton for lazy routes.

## How to extend

- **New layout:** add a slot-based component, a placeholder story, and a test for its landmarks and reading order.

## Open questions / TODO

- None.
