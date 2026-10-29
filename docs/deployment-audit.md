# Deployment audit — fpl-xi

Audit date: 2026-10-29 · Branch: `feature/deployment`

**How to read this.** *Before* is the repo state at `b47cfbf`, the end of `feature/dashboard`. *Finding* is that state against the spec. *After* is what changed in this branch.

Finding codes:
- **PASS:** already met.
- **GAP:** missing.
- **RISK:** present but fragile or wrong.

## §3 Decisions (maintainer answers)

| # | Question | Answer |
|---|---|---|
| 1 | Python dependency manager | `requirements.txt` kept (not switched); re-pinned. |
| 2 | CI provider | GitHub Actions. |
| 3 | Reverse proxy? | **Yes.** nginx/Apache: `example.com/fantasy-league/` → `:3011`, `/fpl/` → `:8011`. |
| 4 | Serving | Static SPA. |
| 5 | Frontend → API | `VITE_API_BASE_URL=/fpl` (same origin through the proxy). |

## §4 Findings

### 4.1 Repo structure & monorepo health

| Check | Before | Finding | After |
|---|---|---|---|
| Deployable units separated at the top level | `src/`, `scripts/`, `tests/`, `requirements.txt` at the root beside `frontend/` and `backend/api` | **GAP** | Python moved under `backend/` with `git mv` (history kept). The root holds only monorepo concerns. |
| Root is toolchain-neutral | pip and npm both at the root; one `.gitignore` mixing both | **GAP** | Root: README, `ecosystem.config.js`, `Makefile`, CI, `docs/`, LICENSE. Python ignores scoped to `backend/`. |
| Easy to tell what's deployable vs a one-off script | Not obvious | **RISK** | `backend/` (pipeline + API) and `frontend/` (SPA), each with its own README. |
| Dead code | Stray module-level `__init__` in `src/fpl/selection/filters.py` referencing undefined names (`PointsPredictor`, `SquadOptimizer`), found by ruff F821 | **RISK** | Removed. It was never called, and annotations aren't evaluated, so behaviour is unchanged. |
| `--squad-image` | `predict_upcoming.py` imports `fpl.vision.squad_reader`, which doesn't exist in `src/` | **RISK** | **Not fixed (out of scope).** The flag fails with ImportError; the other inputs (`--team-id`, `--squad`) work. |

### 4.2 Build reproducibility

| Check | Before | Finding | After |
|---|---|---|---|
| JS lockfile | `frontend/package-lock.json` committed | **PASS** | Unchanged. |
| Python pins match what runs | `requirements.txt` was a stale 150-line UTF-16 freeze: pandas 2.3.3 / FastAPI 0.110 pinned, while the tested venv runs pandas 3.0.6 / FastAPI 0.162; it also pulled in torch and anthropic | **RISK** | `backend/requirements.txt`: 11 direct runtime deps pinned to the tested versions (UTF-8). `requirements-dev.txt` adds pytest/httpx/ruff/pip-audit; `requirements-optional.txt` holds torch/anthropic. |
| Transitive Python deps locked | No (and still no) | **RISK (accepted)** | Direct deps only, per "don't switch the manager". Fully locking needs `pip-tools`/`uv`; recommended next step. |
| Runtime versions pinned | `.nvmrc` (22.12) only | **GAP** | Added `backend/.python-version` (3.12). `frontend/package.json` `engines.node >= 22.12`. |
| One command builds each app from clean | Implicit | **GAP** | `make install`, `make build` (backend has no build step). |
| Local dev machine | Node 22.9 < 22.12: npm skips Rolldown/oxc native bindings and Storybook refuses to run | **RISK (local only)** | CI and the server use 22.12 from `.nvmrc`. **Upgrade local Node.** |

### 4.3 Continuous integration

| Check | Before | Finding | After |
|---|---|---|---|
| CI for both halves | Frontend workflow only; nothing for Python | **GAP** | `ci.yml`: `backend` job (ruff → pytest → API smoke → pip-audit) and `frontend` job (typecheck → lint → prettier → Vitest+axe → build → Storybook → Playwright+axe → npm audit). |
| Path-filtered | Frontend workflow used `paths:`, which leaves required checks pending when skipped | **RISK** | `dorny/paths-filter` + a `ci` gate job that always reports: one required check, skipped jobs count as OK. |
| Caching | npm only | **GAP** | npm + pip caches keyed on lockfile/requirements. |
| Blocks merges | No branch protection configured | **GAP** | **To do in GitHub settings:** require the `ci` check on `main`. |
| e2e hermetic | e2e build read the developer's `.env.local` (mocks off), so it could hit a live API | **RISK** | `--mode e2e` + `.env.e2e` (`VITE_USE_MOCKS=true`): mode files beat `.env.local`. |
| Ran on GitHub | Not yet | **RISK** | Every step was run locally with the same commands. The first GitHub run happens on push. |

### 4.4 CD & runtime (PM2)

| Check | Before | Finding | After |
|---|---|---|---|
| `ecosystem.config.js` with both apps | None (a systemd unit for the API only) | **GAP** | `fpl-api` (fork, 1 process, `python -m api`, :8011) and `fpl-web` (cluster ×2, `server.mjs`, :3011). Loads `backend/.env`. The systemd unit was removed. |
| Zero-downtime reload | — | **GAP** | `fpl-web`: **0 of 247** requests failed during `pm2 reload`. `fpl-api`: **1 of 102** failed (~1 s, single process). The frontend now retries 502/504, which covers it. |
| Boot persistence | — | **GAP** | `pm2 save` in `make start`/`make deploy`, plus `pm2 startup` (documented). |
| Logs per app + rotation | — | **GAP** | `logs/fpl-api.*.log`, `logs/fpl-web.*.log` (timestamped); `pm2 install pm2-logrotate` documented. |

### 4.5 Configuration & secrets

| Check | Before | Finding | After |
|---|---|---|---|
| Secrets committed | None (`ANTHROPIC_API_KEY` env-only) | **PASS** | Unchanged. |
| `.env.example` per app | Frontend only | **GAP** | `backend/.env.example` added; frontend's updated. Real `.env` gitignored. |
| Ports / URLs / CORS from env | API port on the CLI; no CORS; `VITE_API_BASE` naming | **GAP** | `API_HOST`, `API_PORT`, `FPL_API_PREFIX`, `CORS_ORIGINS`, `APP_VERSION`, `WEB_PORT`. Frontend uses `VITE_API_BASE_URL` (renamed to match the spec). |
| Build-time vs runtime env | Already correct (Vite inlines at build; the API reads at start) | **PASS** | `.env.production` defaults real builds to `VITE_USE_MOCKS=false`. |

### 4.6 Health, logging, monitoring

| Check | Before | Finding | After |
|---|---|---|---|
| `/health` with version + freshness | None | **GAP** | `GET /fpl/health`: status, version, uptime, `dataFetchedAt`, `predictionsGeneratedAt`, `predictionsGw`. **It never calls FPL**, so monitors can poll freely. |
| `/ready` | None | **GAP** | `GET /fpl/ready`: 200 once predictions are exported, 503 with the command otherwise. |
| Frontend 200 + history fallback | Depended on nginx `try_files` | **GAP** | `server.mjs`: `/` and `/fantasy-league` → 301, client routes → `index.html`, missing assets → real 404, path traversal blocked, `/healthz`. |
| Restart on crash | systemd `Restart=on-failure` (API only) | **GAP** | PM2 `autorestart`, `max_restarts: 10`, `min_uptime`, `restart_delay`. |

### 4.7 Security & dependency hygiene

| Check | Before | Finding | After |
|---|---|---|---|
| CORS restricted | No CORS middleware (same-origin only) | **GAP** | Allow-list from `CORS_ORIGINS`, GET only. Tested: allowed origin echoed, other origins refused. |
| Dependency audit in CI | None | **GAP** | `pip-audit` and `npm audit --omit=dev --audit-level=high`, both non-blocking. |
| Not-affiliated notice | In the app footer | **PASS** | Unchanged. |
| Unofficial API not hammered | Per-resource TTL cache (15/60/5 min) | **PASS** | Health checks don't call FPL; one API process means one cache. |
| Services bound to localhost | API on 127.0.0.1 | **PASS** | Both apps bind 127.0.0.1; only nginx is public. `--forwarded-allow-ips 127.0.0.1`. |

## Verification evidence (this branch, local machine)

| What | Result |
|---|---|
| Backend tests after the move (`cd backend && python -m pytest`) | **22 passed**: ML, intervals, API incl. health/ready/CORS |
| Backend lint (`ruff check .`) | clean (after removing the dead code and two unused imports) |
| Pipeline after the move | `export_predictions.py --gw 9` → 668 players × 3 horizons; `predict_upcoming.py --gw 9 --team-id 8350133` → XI + captain. (One run failed on a transient DNS error and succeeded on retry.) |
| Frontend | typecheck, eslint (0 errors), prettier, **104 Vitest tests**, production build (`/fantasy-league/` assets, no mock worker), e2e build (mock worker present) |
| e2e | **36 passed** (desktop + mobile, light + dark, axe incl. colour contrast) under `/fantasy-league/` |
| PM2 (7.1.1, Windows, test ports 8099/3099) | Both apps online. `/fpl/health` 200, `/fpl/ready` 200, `/fpl/meta` live, web `/` → 301, client route 200. **Reload: web 0/247 failed, API 1/102 failed.** |
| `server.mjs` | 301/200/404 matrix as above; hashed assets `immutable`, `index.html` `no-cache`; `../` traversal → 404 |
| **Not verified** | A run on the Linux server, and the first GitHub Actions run |

## §6 Monorepo verdict

**Keep the monorepo; the restructure is finished.**

*Why a monorepo.* This is one product with one deploy target. Most importantly, the backend's response models (`backend/api/models.py`, Pydantic) and the frontend's parsers (`frontend/src/lib/api/schemas.ts`, Zod) are two halves of one contract. When an endpoint changes, its consumer has to change in the same commit, and the contract tests on both sides have to run together. Splitting the repo would turn every such change into a cross-repo, version-synchronised release, for no benefit at this size.

*What was wrong, and why it wouldn't scale.* The Python `src/` + `scripts/` lived at the root:
- Two toolchains (pip/venv and npm/node) competed for the same top level, with mixed ignores and ambiguous config.
- CI couldn't cleanly answer "did the backend change?" when the backend *was* the root.
- PM2 `cwd` and deploy scripts had to use brittle relative paths.
- A newcomer couldn't tell which parts get deployed.

*Now.* Each app is a self-contained unit (`backend/`, `frontend/`) with its own deps, pins, tests, README and env template. The root holds only monorepo concerns. CI path-filters per unit, and PM2 has one simple `cwd` per app.

*Scaling path.* A new app is a new top-level folder, a new path-filtered CI job and a new PM2 entry. No workspace or Turborepo/Nx tooling is needed: a `Makefile` of one-liners is enough. Revisit npm workspaces or a task runner only if a second JS package appears and needs shared code hoisted.

## Open items

1. **GitHub:** push, confirm the first `ci` run is green, then add branch protection on `main` requiring `ci`.
2. **Server:** do the first deploy. Check `make install` works with `python3.12-venv` and Node ≥ 22.12, then `pm2 startup`.
3. **Local Node:** upgrade to ≥ 22.12, then `rm -rf frontend/node_modules && npm ci`.
4. **Python lock:** consider `pip-tools`/`uv` to lock transitive deps.
5. **`--squad-image`:** restore or remove `fpl.vision.squad_reader`.
6. **Phase 2:** scheduled `fetch_data → export_predictions`, e.g. a PM2 `cron_restart` app.
