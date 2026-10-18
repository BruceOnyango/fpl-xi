# fpl-xi

Predict Fantasy Premier League points for an upcoming gameweek and pick the best
legal starting XI, captain and bench — from your own team or from the whole
player pool.

Two problems, kept separate:
1. **Prediction** — estimate each player's next-gameweek points (regression).
2. **Selection** — pick the optimal legal squad from those predictions
   (integer linear program, not ML).

Trained on ~110k player-gameweeks across four seasons, so it ranks players
sensibly (premium forwards above cheap defenders) rather than regressing
everyone to the mean.

## What it does

- Pulls live data from the official FPL API (form, points, xG/xA, transfers,
  price changes, fixtures, team strengths).
- Builds a **leak-free** feature matrix: every feature is known *before* kickoff
  (rolling form is lagged; fixture context is the scheduled opponent).
- Trains a model (gradient boosting by default; ridge, a persistence baseline,
  and an adaptive neural net also available) and folds in historical seasons.
- Picks your best XI under FPL's formation, max-3-per-club and budget rules via
  an integer program, names a captain, and orders your bench.
- Loads your actual team by **FPL team ID**, with `--out`/`--in` for the week's
  transfers — no typing 15 names.

## Install

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows  (macOS/Linux: source .venv/bin/activate)
python -m pip install -r requirements.txt
# optional extras:
python -m pip install torch       # for the neural model
python -m pip install anthropic   # for reading a team from a screenshot
```

> On Windows, always use `python -m pip` / `python -m pytest` so they target the
> venv, not a global/Store Python.

## Quick start

```bash
python scripts/fetch_data.py            # cache current-season data from the FPL API
python scripts/build_dataset.py         # leak-free dataset (settled gameweeks only)
python scripts/build_historical.py      # download + build 4 past seasons (~110k rows)

# your real team for the upcoming gameweek, with this week's transfer:
python scripts/predict_upcoming.py --gw 8 --team-id 1234567 --out Szoboszlai --in Mbeumo
```

Other entry points:

```bash
python scripts/select_xi.py --model gbm --backtest 4 5 6   # evaluate on past weeks
python scripts/sweep_budget.py --model gbm                 # points-vs-budget curve
python scripts/ceiling_check.py --gw 6                     # model XI vs the perfect XI
pytest                                                     # tests (leakage, optimiser, neural)
```

## Inputs for your squad

`predict_upcoming.py` takes one of:
- `--team-id N` — loads your 15 from the FPL API (as of the last finished GW;
  the upcoming team is private until the deadline, so adjust with `--out`/`--in`).
- `--squad "Name1,...,Name15"` — names manually.
- `--squad-image team.png` — read a screenshot via Claude vision (needs
  `anthropic` + `ANTHROPIC_API_KEY`).

Names must match FPL's `web_name`; the run prints how many matched and flags any
it couldn't place.

## Architecture (SOLID)

Every concrete class sits behind a `Protocol` in `src/fpl/protocols.py`;
high-level code depends only on those abstractions, and the scripts are the
composition root where concretes are wired in.

| Layer | Responsibility | Extend by |
|---|---|---|
| `data/`, `api/` | fetch + cache raw data; a manager's squad | new `DataSource` |
| `features/` | leak-free (X, y) matrix | new `FeatureBuilder` |
| `models/` | predict points | `@register` a new `PointsPredictor` |
| `optimization/` | select the XI | new `Constraint` / `SquadOptimizer` |
| `selection/` | availability filters, calibration | new filter |
| `evaluation/` | walk-forward backtest | — |

The maths behind each piece (ILP / 0-1 knapsack, ridge/L2, gradient boosting,
the MLP + Adam, leakage-free lagging, walk-forward validation) is documented in
comment blocks in the relevant files, each tagged with the topic to read more.

## Honest limitations

- FPL is genuinely noisy; the realistic goal is a **small edge over many weeks**,
  not a big score every gameweek. Even the perfect hindsight XI varies wildly
  week to week.
- The model doesn't know this week's injuries/suspensions — sanity-check the XI
  against FPL news before trusting the captain.
- The FPL API and the historical archive are unofficial; cache politely.

## Data & credits

- Live data: the official FPL API (`fantasy.premierleague.com/api`).
- Historical seasons: the
  [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)
  archive.

## License

MIT .