# FPL Manager Dashboard — Frontend Build Prompt

> **This file is the single source of truth for building and extending the `fpl-xi` web dashboard frontend.**
> It is both the initial build prompt and the living conventions guide. Read it in full before writing any code.
> When conventions evolve, update this file first, then the code.

---

## 0. How to use this document

- **If you are an AI agent or developer starting the build:** treat everything below as binding requirements. Build in the order given in §12 (Build Order). Do not skip the documentation requirement in §9 — it is part of "done," not an afterthought.
- **If you are extending an existing feature:** read this file, then read the `README.md` inside the feature folder you are touching (see §9), then the atomic-layer guides for any component tier you add to.
- **Non-negotiables:** atomic design (§4), the component contract (§6), accessibility (§7), and per-section documentation (§9). Everything else is a strong default you may deviate from _with a recorded reason_ in the relevant guide.

---

## 1. Role & objective

You are building the **frontend of an FPL (Fantasy Premier League) manager dashboard**. It is the human-facing layer over the `fpl-xi` backend — a leak-free ML pipeline that predicts each player's next-gameweek points and solves for the optimal legal squad (formation, max-3-per-club, budget) via integer programming.

The dashboard turns that pipeline's output into something a manager actually uses each week: _who to start, who to captain, who to transfer in/out, and why._

**Design goals, in priority order:**

1. **Clarity under data density.** FPL is numbers-heavy (points, xG/xA, form, price, ownership, FDR). The UI must make the _decision_ obvious, not just dump the data.
2. **Reusability.** Every visual pattern that appears twice becomes a component. Atomic design (§4) is the discipline that enforces this.
3. **Excellent UX.** Fast, keyboard-navigable, accessible, responsive, forgiving. Loading/empty/error states are designed, not default.
4. **Maintainability.** A new contributor should find where anything lives in under a minute, guided by the per-section markdown (§9).

---

## 2. Product context (what the backend gives you)

The frontend talks to a FastAPI layer (`backend/api/`) over the existing pipeline. Assume (and align with the real OpenAPI schema when it exists) these capabilities:

| Concept                            | Backend source             | Frontend use                             |
| ---------------------------------- | -------------------------- | ---------------------------------------- |
| Player point predictions           | `models/` (gbm by default) | ranking, player cards, comparison        |
| Optimal XI + captain + bench       | `optimization/` (ILP)      | the "recommended lineup" view            |
| A manager's current squad          | `data/` by **FPL team ID** | "My Team" view                           |
| Transfers (`--out` / `--in`)       | pipeline params            | transfer planner                         |
| Fixture difficulty & team strength | `features/` + teams data   | fixtures / FDR view                      |
| Backtest / model confidence        | `evaluation/`              | honest "how much to trust this" surfaces |

**Honesty requirement (carried over from the backend's ethos):** the model gives a _season-long edge, not weekly certainty_ (single-GW correlation ≈ 0.53, and it can't see same-week injury news). The UI must **never imply false precision**. Show confidence/ranges where available, and surface an "always sanity-check against injury news" nudge near any recommendation. This is a UX principle, not a disclaimer to bury.

---

## 3. Tech stack (the chosen default — swap deliberately, record why)

> This stack is picked for a data-dense dashboard with heavy tables, charts, and server state. If you change a choice, note the swap and the reason in the root `README.md`.

- **Framework:** React + TypeScript, built with **Vite**.
- **Styling:** **Tailwind CSS** with design tokens (§5), plus **shadcn/ui** as the unstyled-but-accessible primitive layer (Radix under the hood). You own the components; shadcn gives you the a11y-correct starting point.
- **Routing:** React Router (data-router / file-based if you prefer a meta-framework — if so, Next.js or TanStack Router; record the choice).
- **Server state:** **TanStack Query** — never fetch in `useEffect` by hand.
- **Tables:** **TanStack Table** (headless) for the dense sortable/filterable grids.
- **Charts:** **Recharts** for standard charts; reach for **visx/D3** only for bespoke viz. Never ship a chart without an accessible table fallback or aria description.
- **Schema & validation:** **Zod** — every API response is parsed at the boundary (§8).
- **Forms:** React Hook Form + Zod resolver.
- **Component workbench & docs:** **Storybook** — every atom/molecule/organism has a story.
- **Testing:** **Vitest** + Testing Library (unit/component), **Playwright** (e2e), **axe** (a11y) wired into both.
- **Lint/format:** ESLint + Prettier + TypeScript strict mode. CI fails on type errors, lint errors, and failing tests.

Use current stable versions of each; pin them in the lockfile, not in this prose.

---

## 4. Atomic design — the core discipline

Components live in exactly one of five tiers. The tier is decided by _composition and responsibility_, not by size.

| Tier          | Definition                                                                          | Knows about...                              | FPL examples                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Atoms**     | Smallest usable UI units; no app logic, no data fetching.                           | nothing but their props                     | `Button`, `Badge`, `Avatar`, `Stat`, `PositionPill` (GK/DEF/MID/FWD), `PriceTag`, `FormDot`, `Spinner`, `Input`                                                                                                     |
| **Molecules** | A few atoms wired into one small reusable thing.                                    | its own local UI state                      | `PlayerName` (avatar + name + position pill), `FixtureChip` (opponent + FDR colour + H/A), `StatPair` (label + value + delta), `SearchField`, `GameweekSelector`, `DataFreshness` (as-of timestamp + staleness cue) |
| **Organisms** | Self-contained sections combining molecules/atoms; may read server state via hooks. | server state through hooks, not fetch calls | `PlayerCard`, `SquadPitch` (the 4-3-3 pitch view), `PlayerTable`, `TransferRow`, `FixtureTicker`, `CaptaincyPanel`, `AppNav`                                                                                        |
| **Templates** | Page-level layout skeletons with slots; no real data — arranges organisms.          | layout only                                 | `DashboardLayout`, `DetailLayout`, `SplitPaneLayout`                                                                                                                                                                |
| **Pages**     | A route. Binds real data to a template, handles URL/params, orchestrates.           | routing, data orchestration                 | `DashboardPage`, `MyTeamPage`, `TransfersPage`, `PlayersPage`, `FixturesPage`, `LeaguesPage`                                                                                                                        |

**Hard rules:**

- **Dependencies point one way:** pages → templates → organisms → molecules → atoms. An atom never imports an organism.
- **Atoms and molecules are presentational and pure** — no `useQuery`, no routing. Data enters via props. This is what makes them reusable and trivially testable/storybookable.
- **Data fetching lives in organisms and pages only**, through TanStack Query hooks (§8), ideally via a custom hook (`usePlayerPredictions()`), not inline.
- If a component is hard to place, it's usually doing too much — split it until each piece has one tier's worth of responsibility.

---

## 5. Design tokens & theming

No hard-coded colours, spacing, or font sizes in components — ever. Everything references a token.

- Define tokens as CSS custom properties on `:root`, re-declared for dark mode under `@media (prefers-color-scheme: dark)` and an explicit `[data-theme]` override. Tailwind's theme maps to these variables.
- **Token groups:** `color` (semantic: `--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--positive`, `--negative`, plus the **FDR scale** `--fdr-1 … --fdr-5` and **position colours** GK/DEF/MID/FWD), `space`, `radius`, `font-size`, `font-weight`, `shadow`, `z`.
- **Dark mode is a first-class requirement**, not a later toggle. FPL managers check scores at night.
- One `tokens.md` guide (§9) documents every token, its meaning, and when to use which — so nobody invents a sixth shade of green.

---

## 6. Component contract (how every component is authored)

Every component — regardless of tier — follows this contract:

1. **Typed props, no `any`.** Export the props type. Prefer explicit unions over booleans-soup (`variant: 'primary' | 'ghost'`, not five booleans).
2. **Composition over configuration.** Accept `children` and slots before adding a 12th prop. A component with 15 props is two components.
3. **Controlled by default; colocate state.** Lift state only when two siblings need it. Keep it in the lowest common owner.
4. **Styling via tokens + Tailwind utilities** through a `cn()`/`clsx` helper; expose a `className` passthrough for layout overrides.
5. **Accessible by construction** (§7) — semantic element first, ARIA only to fill gaps.
6. **Every atom/molecule/organism ships:**
   - a `.tsx` implementation,
   - a `.stories.tsx` (default + every meaningful variant + loading/empty/error where applicable),
   - a `.test.tsx` (behaviour + a11y assertion),
   - and is exported from the folder's `index.ts` barrel.
7. **Three states are mandatory** for anything that renders async data: **loading** (skeleton, not spinner-only, where layout allows), **empty** (explain + offer the next action), **error** (human message + retry). Default/unhandled states are a bug.
8. **No business logic in components.** Formatting, prediction math, ILP interpretation → pure functions in `lib/` or hooks, unit-tested separately.

---

## 7. Accessibility (WCAG 2.1 AA, non-negotiable)

- Semantic HTML first; one `<h1>` per page; logical heading order.
- **Full keyboard operability.** Every interactive thing is reachable and operable by keyboard, with a visible focus ring. The squad pitch, tables, and selectors included.
- Colour is never the only signal — the **FDR scale and form indicators carry a text/icon label too** (a red fixture chip also says "5"), because many FPL users are colour-blind to exactly the red/green you'll use.
- Contrast ≥ 4.5:1 for text; verify in both themes.
- All imagery/icons have text alternatives; charts have an aria description and a table fallback.
- Respect `prefers-reduced-motion`.
- `axe` runs in component tests and e2e; a11y failures break the build.

---

## 8. Data layer

- **One typed API client** in `lib/api/`. Generate types/client from the backend OpenAPI schema when available; otherwise hand-write and keep in sync with `packages/shared`.
- **Validate at the boundary with Zod.** Every response is parsed; invalid data fails loudly in dev, degrades gracefully in prod. Components consume parsed, typed data only.
- **TanStack Query owns server state.** Centralise **query keys** in one file (`lib/api/queryKeys.ts`). Define sensible `staleTime` per resource (predictions refresh around the GW deadline; team strength is near-static).
- Custom hooks wrap queries per domain: `usePlayerPredictions`, `useOptimalXI`, `useManagerSquad(teamId)`, `useFixtures`. Pages/organisms call these, never `fetch` directly.
- **Client/UI state** (filters, selected GW, comparison set) via URL params where it should be shareable/bookmarkable, else local state or a light store (Zustand/Context) — not TanStack Query.
- Loading/error/empty are handled per §6.7.

**Data freshness (first-class, not optional).** FPL data goes stale in ways that change the right answer — prices move daily and a player can be flagged injured hours before kickoff — so every response that feeds a recommendation carries timestamps, and the UI shows them. Keep **three distinct times** separate; do not conflate them:

- **`dataFetchedAt`** — when the backend last pulled from the FPL API (drives prices, injury flags). **The one that matters most.**
- **`predictionsGeneratedAt`** — when the model last computed the XI/captain.
- **client fetch time** — when the browser last hit _your_ API; TanStack Query provides it, but it is the least meaningful and is never shown as "data freshness."

Every prediction/recommendation surface renders a `DataFreshness` molecule from `dataFetchedAt` (and `predictionsGeneratedAt` where relevant): a relative "updated 2h ago" in the normal case, escalating to a visible warning when the data is old **or** the GW deadline is near. Zod schemas include these timestamp fields; the API is expected to return them.

---

## 9. 📌 Documentation requirement — every section has a guide (MANDATORY)

> This is the requirement that keeps the codebase navigable. **A feature or component tier is not "done" until its guide exists.** PRs that add a section without its `README.md` are incomplete.

Place a `README.md` at the root of:

- each **feature module** under `features/` (dashboard, my-team, transfers, players, fixtures, leagues, …),
- each **atomic tier** under `components/` (`atoms/`, `molecules/`, `organisms/`, `templates/`),
- the **design-tokens** folder (`tokens.md`),
- and the frontend root (a short `README.md` pointing here and to the run commands).

**Every section guide uses this exact template:**

```markdown
# <Section name>

## Purpose

One or two sentences: what this section is for and who uses it.

## Scope / responsibilities

- What this section owns.
- What it explicitly does NOT own (and where that lives instead).

## Structure

Annotated file/folder tree of this section, one line per entry on what it is.

## Data & dependencies

- Backend endpoints / hooks consumed.
- Other components or lib functions it depends on.
- Zod schemas involved.

## Key decisions & rationale

Why it's built this way. Any deviation from PROMPT.md and the reason.
(This is the section that saves the next person a week.)

## States

How loading / empty / error are handled here.

## How to extend

The common next changes and the correct way to make each one.

## Open questions / TODO

Known gaps, deferred work, things to revisit.
```

Keep guides short and current. A stale guide is worse than none — update it in the same PR as the code change.

---

## 10. Suggested folder structure

```
frontend/
├── PROMPT.md                      # ← this file
├── README.md                      # run commands + pointer to PROMPT.md
├── src/
│   ├── components/
│   │   ├── atoms/        + README.md
│   │   ├── molecules/    + README.md
│   │   ├── organisms/    + README.md
│   │   └── templates/    + README.md
│   ├── features/                  # feature-first; each is a vertical slice
│   │   ├── dashboard/   + README.md   (pages, feature-specific organisms, hooks)
│   │   ├── my-team/     + README.md
│   │   ├── transfers/   + README.md
│   │   ├── players/     + README.md
│   │   ├── fixtures/    + README.md
│   │   └── leagues/     + README.md
│   ├── lib/
│   │   ├── api/                   # client, queryKeys, zod schemas, generated types
│   │   ├── format/                # pure formatters (price, points, dates)
│   │   └── utils/                 # cn(), guards, small helpers
│   ├── styles/
│   │   ├── tokens.css             # CSS custom properties (light + dark)
│   │   └── tokens.md              # the token guide
│   ├── app/                       # router, providers, root layout
│   └── test/                      # setup, axe harness, test utils
├── .storybook/
└── e2e/                           # Playwright specs
```

> **Atomic × feature-first:** shared, generic components live in `components/<tier>/`. Components used by exactly one feature live inside that feature. When a feature-local component is reused by a second feature, **promote it** to the shared `components/` tree (and note the move in both guides).

---

## 11. Feature sections to build

Each is a feature module with its own guide (§9). Build the slice end-to-end (page → organisms → data hook → states → tests → guide) before moving on.

1. **Dashboard / Overview** — the landing view. This week's recommended XI + captain, key deltas vs last GW, deadline countdown, model-confidence note, **data-freshness indicator** (§8), "check injury news" nudge.
2. **My Team** — load squad by **FPL team ID**; the `SquadPitch` (pitch-formation view), bench, projected points, flagged/doubtful players.
3. **Transfers / Planner** — propose and simulate `out`/`in` moves; show projected point delta, budget impact, and the 3-per-club / budget constraints enforced live.
4. **Players** — the dense explorer: `PlayerTable` (sort/filter by position, price, form, predicted points, xG/xA, ownership) + a **side-by-side player comparison**.
5. **Fixtures / FDR** — the fixture ticker with difficulty colouring (text-labelled, §7), run-of-fixtures per team, home/away.
6. **Leagues / Standings** — mini-league tables (if the backend exposes them); rank, GW points, movement.
7. **Settings** — team ID, theme, data-refresh, units/preferences.

(Captaincy and chip strategy can be panels within Dashboard/My-Team rather than their own routes — decide and record in the relevant guide.)

---

## 12. Build order

1. **Foundation:** Vite + TS strict, Tailwind + `tokens.css`/`tokens.md`, lint/format, Storybook, test harness (Vitest + axe + Playwright), CI.
2. **API layer:** Zod schemas, typed client, query keys, TanStack Query provider, mock handlers (MSW) so the UI builds before the backend API is finished.
3. **Atoms → molecules → organisms** (with stories + tests + tier guides as you go).
4. **Templates + app shell** (nav, routing, providers, theme toggle).
5. **Features, one vertical slice at a time**, in the order of §11 (Dashboard first — it proves the whole pipeline end to end).
6. **Polish pass:** loading skeletons, empty/error states, responsive + keyboard audit, a11y sweep, performance budget check.

**Phase 2 (after the initial build):** user-triggered "refresh latest data." This re-runs the pipeline (fetch → features → predict → optimise) against the _unofficial_ FPL API, so it needs an async job, progress feedback, and a rate-limit guard. **Preferred approach: a scheduled backend refresh** (cron a few times a day, ramping up near the deadline) so the frontend only _displays_ freshness and trusts the schedule — this keeps us polite to the unofficial API and makes manual refresh a convenience rather than load-bearing.

---

## 13. Performance budget

- Route-level code-splitting; lazy-load heavy views (tables, charts).
- Virtualise long lists/tables (the full player pool is ~700 rows).
- Memoise expensive derived data; keep render-time math out of components (§6.8).
- Target: interactive dashboard on a mid-range phone in under ~2.5s on a warm cache; no layout shift on data load (reserve space with skeletons).

---

## 14. Definition of done (per slice)

- [ ] Builds with zero TS/lint errors; strict mode on.
- [ ] Atoms/molecules/organisms have stories covering every variant + async states.
- [ ] Unit/component tests pass, including an `axe` assertion.
- [ ] Loading, empty, and error states are designed and handled.
- [ ] Keyboard-navigable; contrast verified in light **and** dark.
- [ ] Data parsed through Zod; no `any` at the API boundary.
- [ ] No duplicated pattern that should have been a shared component.
- [ ] **The section `README.md` exists and is accurate** (§9).
- [ ] Any deviation from this prompt is recorded with its reason in the relevant guide.

---

## 15. Guardrails

- **Never imply the model is certain.** Surface confidence/ranges; keep the injury-news nudge visible near recommendations (§2).
- **Never show numbers without their freshness.** Any prediction/recommendation renders its `dataFetchedAt` (§8); stale data gets a visible warning, not a silent old number. Confident-looking figures with no "as of when" are a bug, not a shortcut.
- **No invented data.** If an endpoint isn't ready, use typed mocks (MSW) clearly marked as mock — never fake numbers that look real.
- **Respect the unofficial-API ethos:** cache politely, don't hammer; "not affiliated with the Premier League / FPL" stays in the footer.
- **Accessibility and the documentation requirement are not optional** and are not "phase 2."

---

_When this document and the code disagree, the document wins — fix the code or fix the document, in the same PR._
