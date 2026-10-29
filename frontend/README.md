# fpl-xi dashboard (frontend)

The web dashboard over the `fpl-xi` pipeline: who to start, who to captain, who to transfer, and how much to trust it.

**Read [`PROMPT.md`](./PROMPT.md) first.** It is the binding spec and conventions guide. Every folder below has its own `README.md` (§9).

## Run it

Requires **Node ≥ 22.12** (Vite 8, Rolldown and Storybook 10 refuse older versions; see _Known setup issues_).

```bash
npm install
npm run dev              # http://localhost:5173/fantasy-league/ — uses the mock API (MSW) by default
npm run build            # typecheck + production build to dist/
npm run preview          # serve dist/ on :4173
npm test                 # Vitest + Testing Library + axe (jsdom)
npm run e2e              # Playwright: flows + axe sweep incl. colour contrast, desktop + mobile
npm run lint             # ESLint (strict TS, jsx-a11y, atomic import rules)
npm run format           # Prettier (+ Tailwind class sorting)
npm run storybook        # component workbench on :6006
npm run mock:roster      # rebuild src/mocks/data/snapshot.json from ../data/raw (after fetch_data.py)
```

Environment (`.env.local`):

| Var              | Default | Meaning                                       |
| ---------------- | ------- | --------------------------------------------- |
| `VITE_USE_MOCKS` | on      | `false` to call a real backend instead of MSW |
| `VITE_API_BASE` | `/fpl` | the backend's single entry point (same origin in production) |

## Real data vs mock

**Real (your team):** run the read-only API (`../backend/README.md`) and turn mocks off:

```bash
# repo root
python scripts/fetch_data.py && python scripts/export_predictions.py --gw <next GW>
python -m uvicorn backend.api.main:app --reload --port 8000
# here
cp .env.example .env.local   # VITE_USE_MOCKS=false; dev/preview proxy /fpl → :8000
npm run dev
```

The API pulls prices, injury flags, fixtures, your squad and leagues live from FPL, and serves your exported predictions. If the predictions are missing or made for an older gameweek, a banner tells you the command to run.

**Mock (default, no backend needed):** MSW (`src/mocks/`) implements the same contract.

- Real in the mock: names, clubs, prices, injury flags, deadlines (from `../data/raw`), and the README's headline model metrics.
- Generated, and labelled "Mock data" in the UI: predictions, fixtures, squads, leagues and the per-GW backtest.

## Deployment

The app is built for **`/fantasy-league/`** (Vite `base`; the router basename and asset URLs follow it), and it calls the API at **`/fpl`** on the same origin. `npm run build` produces `dist/`, which is copied to the web server. See [`../deploy/README.md`](../deploy/README.md) for nginx, Apache and systemd configs.

## Layout

```
src/
  app/          router (lazy routes), providers, RootLayout, RouteError
  components/   atoms/ molecules/ organisms/ templates/   (atomic tiers; one-way imports, lint-enforced)
  features/     dashboard/ my-team/ transfers/ players/ fixtures/ leagues/ settings/
  lib/          api/ (zod, client, keys, hooks, views)  fpl/ (pure domain logic)  format/  settings/  utils/
  mocks/        MSW handlers + seeded resolvers + roster snapshot
  styles/       tokens.css, tokens.md, index.css (Tailwind v4 @theme mapping)
  test/         setup, axe helper, render helper, fixtures
e2e/            Playwright specs
.storybook/     Storybook config (providers + MSW + theme toolbar)
```

## Stack choices & recorded deviations (PROMPT.md §3)

| Choice                                                                                         | Why                                                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| React Router 7 (`createBrowserRouter`) + `React.lazy`                                          | Default from §3; each page is its own chunk.                                                                                   |
| Radix primitives used directly (Dialog, Tabs, Slot, Tooltip) instead of running the shadcn CLI | Same a11y primitives shadcn wraps; we own the styled components in `components/atoms`. The CLI adds nothing for this codebase. |
| **TanStack Table pinned to v8**                                                                | v9 changed the core API (features-based `createCoreRowModel`); v8 is still maintained. Revisit when upgrading.                 |
| **Context + localStorage for settings** (`lib/settings`)                                       | Three values (team ID, theme, horizon) don't justify Zustand.                                                                  |
| **axe-core called directly** (`src/test/axe.ts`) instead of `vitest-axe`                       | `vitest-axe` is unmaintained (0.1.0). Contrast is skipped in jsdom and checked in Playwright instead.                          |
| **jsdom pinned to 26**                                                                         | jsdom 27 needs Node ≥ 22.12 for `require(esm)`. Unpin once Node is upgraded.                                                   |
| Vendor chunk groups in `vite.config.ts`                                                        | The entry chunk is ~69 KB; React, data, charts and UI vendors cache separately. Charts load only with routes that use them.    |
| Settings page "Reload from server" just invalidates queries                                    | Re-running the pipeline is Phase 2 (§12). Preferred approach: a scheduled backend refresh.                                     |

## Known setup issues

- **Node 22.9 is too old.** npm silently skips native optional bindings whose `engines` exclude your Node version (`@rolldown/binding-*`, `@oxc-parser/binding-*`). The symptom is `Cannot find native binding`. Fix: upgrade Node to ≥ 22.12 (LTS 24 recommended), then `rm -rf node_modules && npm install`.
- npm 10.8 crashes with `Cannot read properties of null (reading 'edgesOut')` on this dependency tree. Use npm ≥ 11 (`npx npm@11 install`).

## Spec discrepancy to resolve

PROMPT.md §2 quotes "single-GW correlation ≈ 0.53". The repo README's walk-forward backtest reports **0.273 Spearman** at 1 GW (≈0.47 at a 6-GW horizon). The UI shows the README numbers. Update §2 once confirmed.
