# FPL-XI Monorepo — Deployability, CI/CD & PM2 Deployment Prompt

> **Lives at the monorepo root (`fpl-xi/DEPLOYMENT.md`).**
> This is a prompt to **evaluate** whether the repo is deployable, **fix** what isn't, and **set up** CI/CD + PM2 deployment for both halves. It is also the living deployment guide — keep it current.
> Companion to `frontend/PROMPT.md` (the frontend build spec). Where they overlap, that file owns frontend internals; this file owns build, CI/CD, and runtime.

> **Status (current):** audited and remediated. Findings, decisions and verification evidence:
> [`docs/deployment-audit.md`](docs/deployment-audit.md). The runbook (first deploy, update, logs,
> rollback) is kept locally in `DEPLOY.local.md` (gitignored: it holds server specifics). Answers to §3 and the deviations from the
> §5.3 skeleton are recorded inline below, marked **Decision:**.

---

## 0. How to use this document

Work in three passes, in order:
1. **Audit (§4)** — walk every dimension, record a finding for each (`PASS` / `GAP` / `RISK`) with a one-line reason. Produce the findings as a table in `docs/deployment-audit.md`.
2. **Remediate (§5)** — apply the required changes. The port reconfiguration, PM2 ecosystem file, and monorepo restructure are mandatory, not optional.
3. **Verify (§8)** — tick the definition of done; prove it runs on the target server.

Do not skip the audit and jump to config. The point is to know *why* each thing is the way it is.

---

## 1. Role & objective

You are a **release/DevOps engineer** making the `fpl-xi` monorepo deployable to a single Linux server, with both applications running under **PM2** as separate process objects.

**Target runtime:**
- **Backend API** (FastAPI over the ML pipeline) → **port `8011`**, PM2 app `fpl-api`.
- **Frontend** (built Vite SPA, served as static) → **port `3011`**, PM2 app `fpl-web`.
- Both managed by one `ecosystem.config.js` at the repo root, started/reloaded/persisted via PM2.

**Objective:** a reproducible build, a CI pipeline that gates merges, and a documented, repeatable deploy — plus an honest verdict on whether the monorepo structure holds up now that a frontend has been added.

---

## 2. Context — the repo as it stands

`fpl-xi` began as a **Python CLI ML project** (leak-free prediction + ILP squad optimisation), with its code in the **root**: `src/fpl/` (data/api/features/models/optimization/selection/evaluation behind Protocols) and `scripts/` as the composition root. A **frontend** has since been added.

The structural question this prompt must answer: **with the frontend in, is a root-level Python layout still maintainable and scalable?** (See §6 for the required assessment and verdict.)

---

## 3. Assumptions to confirm before remediating

| # | Question | Default if unanswered | **Decision** |
|---|---|---|---|
| 1 | Python dependency manager? | Whatever the backend already uses — do not switch it; just pin it. | `requirements.txt` kept; re-pinned to the tested versions and split into runtime / dev / optional. |
| 2 | CI provider? | **GitHub Actions** | GitHub Actions (`.github/workflows/ci.yml`). |
| 3 | Reverse proxy in front, or 8011/3011 hit directly? | Direct ports now, nginx documented. | **nginx/Apache in front** (maintainer's choice): `example.com/fantasy-league/` → `:3011`, `example.com/fpl/` → `:8011`. |
| 4 | Static SPA or SSR? | Static SPA | Static SPA. |
| 5 | How does the frontend reach the API? | `VITE_API_BASE_URL`, default the API origin on `:8011`. | `VITE_API_BASE_URL` = **`/fpl`** (same origin via the proxy). An absolute URL is only needed if served cross-origin. |

---

## 4. The audit — dimensions to evaluate

For each, record **what good looks like** vs. **what's here**, then a finding. → **Done: [`docs/deployment-audit.md`](docs/deployment-audit.md).**

### 4.1 Repo structure & monorepo health
- Clear top-level separation of deployable units; no language's build files polluting the root.
- A root that holds only **monorepo-level** concerns (README, `ecosystem.config.js`, CI config, task runner, shared docs).
- **The scripts-in-root issue (§2):** flag it. Python `src/`+`scripts/` sitting at the root alongside `frontend/` mixes two toolchains at the top level and will not scale. → see §5.1 and §6.

### 4.2 Build reproducibility
- Lockfiles committed for **both** halves (`package-lock.json`/`pnpm-lock.yaml`; `requirements.txt` pinned / `poetry.lock` / `uv.lock`).
- Runtime versions pinned: `.nvmrc` (Node), `.python-version` (Python).
- A single command builds each app from a clean checkout.

### 4.3 Continuous integration
- CI runs on PR and on push to main: **lint → typecheck → test → build**, for each app.
- **Path-filtered jobs** — frontend CI only runs when `frontend/**` changes, backend only when backend changes.
- Dependency caching (npm/pip) for speed.
- CI fails the merge on any error (TS strict, lint, tests, `axe` a11y — per `frontend/PROMPT.md §14`).

### 4.4 CD & runtime (PM2)
- A root `ecosystem.config.js` defining **both** apps on the correct ports (§5.3).
- **Zero-downtime reloads** (`pm2 reload`, not `restart`) where possible.
- Boot persistence: `pm2 save` + `pm2 startup`.
- Logs captured per app; log rotation configured (`pm2-logrotate`).

### 4.5 Configuration & secrets
- No secrets committed. `.env.example` for each app; real `.env` gitignored.
- Ports, API base URL, CORS origins, and any API keys read from env — never hard-coded.
- Frontend env baked at **build time** (Vite inlines `VITE_*`); backend env read at **runtime**.

### 4.6 Health, logging, monitoring
- Backend exposes **`GET /health`** (and ideally `/ready`) returning build/version + the data-freshness timestamps (`dataFetchedAt`, `predictionsGeneratedAt` — ties to `frontend/PROMPT.md §8`).
- Frontend serving returns 200 on `/` and does history-fallback for client routes.
- PM2 restart-on-crash + a documented way to read logs.

### 4.7 Security & dependency hygiene
- CORS on the API restricted to the frontend origin — not `*`.
- Dependency audit in CI (`npm audit` / `pip-audit`) at least non-blocking.
- "Not affiliated with the Premier League / FPL" notice present; unofficial-API calls are cached/scheduled, not hammered.

---

## 5. Required changes

### 5.1 Monorepo restructure (mandatory) — **Done.**
Python moved under `backend/` (`src/fpl/`, `scripts/`, `tests/`, `data/`, requirements), root is toolchain-neutral:

```
fpl-xi/
├── backend/            # src/fpl/, scripts/, tests/, data/, requirements*.txt, ruff.toml, .python-version
│   └── api/            # FastAPI app (python -m api) — routes under /fpl incl. /fpl/health, /fpl/ready
├── frontend/           # Vite SPA (frontend/PROMPT.md governs internals) + server.mjs (prod static server)
├── deploy/             # nginx.conf / apache.conf reverse-proxy snippets
├── ecosystem.config.js # PM2: fpl-api + fpl-web
├── .github/workflows/  # ci.yml (path-filtered)
├── docs/deployment-audit.md
├── Makefile            # install, dev-api, dev-web, test, lint, build, deploy, start, logs, data, predictions
└── README.md           # overview + develop + deploy + rollback
```

Pipeline re-verified after the move (tests, export, CLI pick, API) — evidence in the audit.

### 5.2 Port reconfiguration → 8011 / 3011 (mandatory) — **Done.**
- **Backend:** `python -m api` on `API_PORT` (default **8011**), `API_HOST` default `127.0.0.1` (behind the proxy; not `0.0.0.0`).
- **Frontend:** `fpl-web` on **3011**; Vite dev and preview also on 3011 (`strictPort`).
- **Wiring:** `VITE_API_BASE_URL=/fpl` (same origin via nginx); dev/preview proxy `/fpl` → `:8011`.
- **CORS:** `CORS_ORIGINS` allow-list (`https://example.com,http://localhost:3011`), GET only.

### 5.3 PM2 ecosystem config (mandatory) — **Done:** see [`ecosystem.config.js`](ecosystem.config.js).

**Decision — deviations from the original skeleton, and why:**
- `fpl-api` runs **`<venv>/python -m api`** rather than the `uvicorn` binary: host/port come from env (`API_HOST`/`API_PORT`), proxy headers are trusted only from localhost, and the venv's Python is found on Linux *and* Windows layouts (or `FPL_PYTHON`). Config is loaded from `backend/.env`.
- `fpl-web` runs **`frontend/server.mjs`** (≈80 lines, zero dependencies) rather than `serve -s`: the app is built for the `/fantasy-league/` base path, and `serve` would need the proxy to strip the prefix and can't give hashed assets `immutable` caching while keeping `index.html` `no-cache`.
- `fpl-web` runs **2 cluster workers** with `wait_ready`, so `pm2 reload` is genuinely zero-downtime (measured: 247/247 requests OK during a reload). `fpl-api` stays **1 fork process** (its FPL cache is in-memory; more workers = more calls to FPL), so its reload has a ~1 s gap (measured: 1/102 failed), absorbed by the frontend retrying 502/504.

Deploy flow: `make deploy` = `npm run build` → `pm2 reload ecosystem.config.js --update-env` → `pm2 save`. First time: `make start` (`pm2 start ecosystem.config.js && pm2 save`) then `pm2 startup`.

### 5.4 CI workflow — **Done:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- `changes` (dorny/paths-filter) → `backend` job (pip cache → ruff → pytest → API smoke `/fpl/health` → pip-audit, non-blocking) and `frontend` job (npm cache → typecheck → lint → prettier → Vitest+axe → build → Storybook → Playwright e2e+axe → npm audit, non-blocking).
- A final **`ci`** gate job always runs and fails if any needed job failed — make **`ci`** the single required status check in branch protection (skipped = unaffected = OK).

### 5.5 Env templates — **Done:** `backend/.env.example`, `frontend/.env.example`. Real `.env` files are gitignored.

---

## 6. Monorepo maintainability & scalability — required assessment

**Verdict: keep the monorepo; the restructure is finished.** Full reasoning in [`docs/deployment-audit.md` §6](docs/deployment-audit.md#6-monorepo-verdict).

One product, one deploy, and a shared API contract (Pydantic `backend/api/models.py` ↔ Zod `frontend/src/lib/api/schemas.ts`) that must change in the same commit — that is exactly the case a monorepo serves. The one structural problem (Python at the root) is fixed: each app is a self-contained unit, the root holds only monorepo concerns, CI path-filters cleanly, and PM2 `cwd`s are simple. Adding a third app = new top-level folder + a path-filtered CI job + a PM2 entry. No workspace/Turbo tooling needed at this size; revisit only if a second JS package needs shared code.

---

## 7. Deliverables

1. ✅ `docs/deployment-audit.md` — §4 findings + §6 verdict.
2. ✅ §5.1 restructure applied, pipeline re-verified.
3. ✅ Ports 8011 / 3011, frontend↔backend wired, CORS set.
4. ✅ `ecosystem.config.js` at the root.
5. ✅ `.github/workflows/ci.yml`.
6. ✅ `backend/.env.example` + `frontend/.env.example`.
7. ✅ Root `README.md` deploy section: build → `pm2 reload` → `pm2 save`, logs, rollback.

---

## 8. Definition of done

- [x] Audit findings recorded for every §4 dimension.
- [x] Monorepo restructured; backend pipeline verified post-move.
- [x] API serves on **8011**, frontend on **3011**; ports env-driven, not hard-coded.
- [x] `VITE_API_BASE_URL` wired; CORS restricted to the frontend origin; frontend rebuilt against it.
- [x] `GET /fpl/health` returns version + freshness timestamps (`/fpl/ready` too).
- [x] `ecosystem.config.js` starts **both** apps; `pm2 reload` is zero-downtime for `fpl-web` (≈1 s for single-process `fpl-api`, retried client-side); `pm2 save` + `pm2 startup` documented.
- [~] CI runs lint/typecheck/test/build for both halves, path-filtered, with a single `ci` gate — **written and locally validated; first GitHub run + enabling branch protection on `ci` still to do.**
- [x] Lockfiles + version pins committed (direct deps pinned; transitive Python deps not locked — see audit).
- [x] No secrets committed; `.env.example` present for each app.
- [x] Full deploy + rollback runbook written (kept local: `DEPLOY.local.md`, gitignored); §6 verdict written down.
- [ ] **Proven on the target server** — PM2 start/reload verified locally (Windows, PM2 7.1.1); a run on the Linux server is still to do.

---

*If this document and the running server disagree, fix one of them in the same change — a deploy guide that lies is worse than none.*
