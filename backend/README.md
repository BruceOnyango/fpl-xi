# fpl-xi — backend (ML pipeline + API)

> This is the Python half of the `fpl-xi` monorepo. **Run every command below from
> `backend/`.** The dashboard API lives in [`api/`](api/README.md); the web app is in
> `../frontend/`; deployment runbook: your local `DEPLOY.local.md` (gitignored).

Predict Fantasy Premier League points and pick the best legal starting XI,
captain and bench — from your own team or the whole player pool. Trained on four
seasons (~110k player-gameweeks) and validated with a leak-free walk-forward
backtest.

Two problems, kept separate:
1. **Prediction** — rank players by expected points (regression).
2. **Selection** — pick the optimal legal squad from those rankings (integer
   linear program, not ML).

## Measured results

Expanding-window walk-forward over 147 held-out gameweeks (2024-25 → 2025-26),
scored on the *started pool* (players with ≥60 min last week — the pool the
optimiser actually ranks over). Rank correlation (Spearman) is the headline
metric, because the downstream job is ranking, not point-accuracy.

| Model | Spearman | Precision@20 | beats persistence |
|---|---|---|---|
| **gbm** | **0.273 ± 0.10** | **0.222** | **90% of GWs** |
| ridge | 0.274 ± 0.09 | 0.214 | 91% |
| persistence (last GW) | 0.112 ± 0.09 | 0.128 | — |
| mean | — | 0.121 | 0% |

- gbm beats "predict last gameweek's points" by **+0.16 Spearman on average,
  winning 90% of 147 gameweeks** — a real, consistent, leak-free edge.

**On the sample:** 0.273 is the 4-season average (the conservative, headline
figure). Single-season slices run higher — e.g. **~0.32 on 2024-25 alone**
(`--test-seasons 2024-25`) — because one season is a more homogeneous test set.
The spread across seasons (±0.10 per-GW std) is itself a reminder that the edge,
while consistent in direction, varies week to week. The 4-season number is
reported first on purpose: it's the least cherry-picked.

- **Horizon lifts it further.** Predicting the *next 6 gameweeks* instead of one
  raises started-pool Spearman to **~0.47** (and ~0.40 at a 3-GW horizon), and
  beats persistence in **100%** of weeks — longer horizons average out
  single-match noise and are the right basis for transfer planning.

Reproduce it yourself:
```bash
python scripts/evaluate.py                       # single-GW, all seasons: ~0.27, 90% win
python scripts/evaluate.py --test-seasons 2024-25  # one season: ~0.32
python scripts/evaluate.py --horizon 6           # 6-GW outlook: ~0.47, 100% win
```

## Honest ceiling

Single-gameweek football is mostly luck: ~0.27 Spearman means the model explains
a modest slice of one week, and the rest is irreducible (deflections, red cards,
a keeper howler). The win is a **consistent edge over many weeks**, not a correct
lineup every Saturday. The two things that actually moved the number were **more
data** and a **longer horizon** — not cleverer features (see below).

## What didn't work (measured, then dropped)

Every "add a smarter feature/objective" idea was prototyped and killed by the
backtest before being wired in:

- **Opponent-adjusted rolling fixture features** — 0.315 → 0.310 (no gain).
  Over one match, who you play is swamped by whether you play.
- **Rolling-minutes / start-rate features** — 0.315 → 0.317, started-pool MAE
  2.18 → 2.18 (no gain). `minutes_lag_1` already carries the signal.
- **Pairwise ranker (LGBMRanker/lambdarank)** — 0.317 → 0.204 (*worse*). FPL
  points make poor ranking labels (heavy ties at 1-3 pts).
- **Upside-tilt captaincy** — a wash vs plain argmax; the keeper-captain bug was
  a thin-data artifact, not a model flaw.

These nulls are the point: the single-GW model is at its information ceiling with
the available features, and we have the receipts.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (macOS/Linux: source .venv/bin/activate)
python -m pip install -r requirements-dev.txt    # runtime + pytest/ruff/pip-audit
# optional: python -m pip install -r requirements-optional.txt  (torch neural model, anthropic)
```
Python 3.12 (`.python-version`). `requirements.txt` pins the direct runtime
dependencies to the versions the tests and the live API run on.
> On Windows always use `python -m pip` / `python -m pytest` so they hit the venv.

## Usage

```bash
# one-time data
python scripts/fetch_data.py          # current-season data from the FPL API
python scripts/build_dataset.py       # leak-free current-season dataset
python scripts/build_historical.py    # 4 past seasons (~110k rows) from the archive

# pick your team for an upcoming gameweek (6-week outlook, injuries screened)
python scripts/predict_upcoming.py --gw 8 --team-id 8350133 --horizon 6

# evaluate / explore
python scripts/evaluate.py --horizon 6      # the backtest numbers above
python scripts/select_xi.py --model gbm --backtest 4 5 6
python scripts/sweep_budget.py --model gbm  # points-vs-budget curve
python -m pytest                             # leakage, optimiser, intervals, API tests
ruff check .                                 # lint (syntax + pyflakes; see ruff.toml)

# feed the dashboard API (see api/README.md)
python scripts/export_predictions.py --gw 9  # → data/processed/predictions.json
python scripts/evaluate.py --horizon 1 --save
python -m api                                # http://127.0.0.1:8011/fpl/docs
```

### predict_upcoming inputs
- `--team-id N` — load your 15 from the FPL API (as of the last finished GW).
  `--team-event G` forces a specific gameweek's squad; `--out/--in "A,B"` apply
  this week's transfers on top.
- `--squad "Name1,...,Name15"` — names manually (FPL `web_name`).
- `--squad-image team.png` — read a screenshot via Claude vision (needs
  `anthropic` + `ANTHROPIC_API_KEY`).
- `--horizon N` — pick the squad on an N-gameweek outlook (captaincy stays 1-GW).
- `--min-chance P` — drop doubtful players below P% chance of playing
  (`--no-availability` skips the injury gate, e.g. when scoring a past GW).

## Architecture (SOLID)

Concrete classes sit behind `Protocol`s in `src/fpl/protocols.py`; high-level
code depends only on those, and the scripts are the composition root.

| Layer | Responsibility | Extend by |
|---|---|---|
| `data/`, `api/` | fetch/cache raw data; a manager's squad by ID | new `DataSource` |
| `features/` | leak-free (X, y) matrix | new `FeatureBuilder` |
| `models/` | predict points (baseline, ridge, gbm, neural) | `@register` a `PointsPredictor` |
| `optimization/` | select the XI under FPL rules | new `Constraint` / `SquadOptimizer` |
| `selection/` | availability gate, captaincy | new filter |
| `evaluation/` | walk-forward backtest | — |

Maths behind each piece (ILP / 0-1 knapsack, ridge/L2, gradient boosting, the
MLP + Adam, leakage-free lagging, walk-forward validation) is documented in
comment blocks in the relevant files.

## Limitations

- FPL points are noisy; this is a season-long edge, not weekly certainty.
- Injury flags are a live snapshot — re-run `fetch_data.py` near the deadline.
- Double/blank gameweeks are not modelled yet.
- The FPL API and the historical archive are unofficial; cache politely. Not
  affiliated with the Premier League or FPL.

## Data & credits

- Live data: the official FPL API (`fantasy.premierleague.com/api`).
- Historical seasons: the
  [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)
  archive.

## License

MIT .