# ML Review — fpl-best11

Scope: I read the full pipeline (`build_historical.py` → `LeakFreeFeatureBuilder` → `evaluate.py` walk-forward → `registry` models → `IlpSquadOptimizer` / `pick_captain` → `predict_upcoming.py`). I also ran checks against `data/processed/historical.parquet` (110,304 rows, 4 seasons). Findings marked **[verified]** were reproduced on the data. The others come from reading the code.

**How one prediction is made.** vaastav `merged_gw.csv` has one row per *fixture*. Rows are grouped by `element` within a season. `.rolling().shift(1)` runs over row order, not gameweek order, to build 9 lagged features plus 3 un-lagged fixture features. `y` is that fixture's `total_points`. For test key *k*, `evaluate.py` trains on rows with `_key_end < k` and predicts every row at *k*. Spearman is then computed on rows with `minutes_lag_1 ≥ 60`, once per GW, and averaged over GWs. At deploy time the same predictions go into an ILP that maximises Σŷ under budget, position and club constraints. The captain is the argmax among MID/FWD.

Headline verdict: the walk-forward design is mostly sound. Lagging is correct within a fixture sequence, the split is expanding-window, ρ is computed per GW, and the persistence baseline is a good habit. However, the **row unit is a fixture, while the decision unit is a gameweek**. That mismatch causes a verified same-GW leak, a horizon-window leak and a deploy-time bug on double gameweeks. The reported improvements over time were also all selected on the same test GWs, and ρ is not the quantity the ILP optimises.

---

## Part 1 — What's wrong

### Leakage

**L1 · MAJOR · `src/fpl/features/builder.py:70,88-100` — features on a double-gameweek's second fixture include that same GW's first fixture [verified]**
- *Why:* `shift(1)` is applied over rows. In a DGW the player has two rows with the same `round`, so the second row's `points_lag_1`, `form_*`, `minutes_lag_1`, `xg_roll_3`, etc. contain the outcome of a match in the target GW.
- *Evidence:* 3,293 (season, player, round) groups are duplicated. In 100% of them the second row's `points_lag_1` equals the first row's `y`. `minutes_lag_1` also leaks into the **evaluation-pool filter** (`evaluate.py:100`), so the leak changes *which players are scored* as well as the predictions.
- *Measured impact:* on the 31 DGW test keys, mean started-pool ρ (gbm) is 0.2735 on the original features and 0.2773 when the second row reuses the first row's pre-GW features. The scored DGW pool changed from 44.9 to 56.1 rows per GW. The leak does not inflate the headline number, but it is a correctness bug and it distorts the pool.
- *Fix:* aggregate to **one row per (season, player, round)**: sum `total_points`, `minutes`, xG and xA, and add `n_fixtures` plus the mean or sum of fixture strengths. Compute lags over GW order after that. Add a unit test with a DGW fixture to `tests/test_no_leakage.py`. The current test only covers a clean 1..7 sequence.

**L2 · MAJOR · `scripts/evaluate.py:51-54` — the horizon target window can end after the test GW [verified]**
- *Why:* `y` sums the next *n* **rows**, but `_key_end = _key + n − 1` assumes those rows are *n* consecutive GWs. Blank GWs and missing rows (gap = 2 or 3 GWs in 2,800 cases) push the real window end later. A training row can then contain test-GW points in its target.
- *Evidence:* 4.7% of rows at n = 3 and 9.6% at n = 6 have a true window end later than the assumed `_key_end`. DGW rows push the error the other way: six rows can cover five GWs.
- *Fix:* after the L1 aggregation, reindex each player onto the full GW calendar, with NaN or 0 for blanks, and sum over **GW keys**. Set `_key_end` to the actual last key in the window. This is the "purge" step; with that in place, the `< key` test acts as the embargo.

**L3 · MINOR · `scripts/build_historical.py:111-114`, `scripts/build_dataset.py:35` — team strengths are one snapshot per season**
- *Why:* each season has only 17–21 distinct `opp_attack_strength` values, i.e. one value per team. FPL changes `strength_*` during the season, and vaastav's `teams.csv` is a single late snapshot, so early-GW rows use ratings that were only known later. The live path applies the current `teams.json` to every past round as well.
- *Fix:* use a rolling, point-in-time team rating such as Elo or rolling xG for/against computed from lagged results. Alternatively, accept the issue and document it. The README already reports that fixture features add nothing, so the impact is probably small.

**L4 · MINOR · `src/fpl/features/builder.py:98-100` — `transfers_*` and `value` semantics are not pinned down**
- *Why:* lag-1 is safe whichever convention the data uses. If `transfers_in[t]` already covers the window before deadline *t*, then using it un-lagged is legitimate and stronger. As written the code may be throwing away valid signal, not leaking.
- *Fix:* check the API semantics. If confirmed, add `transfers_in_t` (known before the deadline) as a feature.

### Split integrity

**S1 · MAJOR · `README.md` "What didn't work", `scripts/evaluate.py:84-86` — the test set was used for model selection, and there is no untouched holdout**
- *Why:* every feature, objective and captaincy ablation, as well as the choice of gbm/ridge defaults, was decided on the same walk-forward GWs that produce the headline number. With about 5 ideas tried, the reported 0.273 is optimistically selected, even though most ideas were rejected.
- *Fix:* freeze **2025-26 as the final holdout**, evaluated once. Do all selection on walk-forward GWs in 2022-23 to 2024-25, with hyperparameters tuned on an inner time-ordered validation window.

**S2 · MINOR · `scripts/evaluate.py:84-86` vs `README.md:17-18` — the test window does not match the documentation**
- *Why:* with no `--test-seasons` argument, every key with at least 200 prior training rows is tested, starting in **2022-23 GW ~3**. Those early GWs train on a few hundred rows. The README describes the 147 GWs as "2024-25 → 2025-26" and elsewhere as a "4-season average". The "0.315/0.317" figures in the ablation list come from a different setup again.
- *Fix:* set a minimum training size in GWs (e.g. one full season) and report results per season. Regenerate every README number from one script invocation that is saved to `results/`.

**S3 · MINOR · `src/fpl/evaluation/backtester.py:161-162` — a second backtest path splits on `round` with no `season`**
- *Why:* it is correct only for a single season. It also merges per-fixture rows, so DGW players are duplicated on the board. `IlpSquadOptimizer` then builds `pick` and `yhat` dicts from a duplicated index: the duplicates collapse silently while `df.loc[chosen]` returns both rows.
- *Fix:* delete it or route it through the same harness as `evaluate.py`. Dedupe by player-GW as described in L1.

### Evaluation

**E1 · MAJOR · `scripts/evaluate.py:107,132,137` — uncertainty is reported as the per-GW SD, with no paired inference**
- *Why:* "0.273 ± 0.10" is the dispersion across GWs, not the uncertainty of the mean. GWs within a season are autocorrelated (same players, same model). "Wins 90% of GWs" against a weak baseline does not show that gbm beats ridge: 0.273 vs 0.274 cannot be told apart, yet the README bolds gbm.
- *Fix:* report mean ρ, a **block-bootstrap 95% CI** with season or 5-GW blocks, the paired difference against the strongest competitor (ridge), and a per-season table.

**E2 · MAJOR · `scripts/evaluate.py:58-62` — Precision@k breaks ties arbitrarily**
- *Why:* `np.argsort(-actual)` breaks ties by index order. With heavy ties at 1, 2 and 6 points, the "true top-20" set is arbitrary, so P@20 has extra noise and depends on row order.
- *Fix:* define relevance as `actual >= actual.nlargest(k).min()` (tie-inclusive), or use **NDCG@k** with graded gains.

**E3 · MAJOR · `scripts/evaluate.py:106-110` — ρ, MAE and the decision are measured on different populations and units**
- *Why:* ρ uses the started pool, MAE uses all rows (about 60% of which are zeros), and both are per fixture, while the ILP acts per player-GW under a budget. The harness never scores the **realised XI points**, which are the actual objective.
- *Fix:* for each test GW, run the ILP on the predictions and record the XI's actual points with the captain doubled. Do the same for the persistence-, form- and ridge-driven XIs and for the hindsight-optimal XI (`ceiling_check.py` already contains this logic).

**E4 · MINOR · `scripts/evaluate.py:68` — only a weak baseline**
- *Why:* persistence (last GW's points) is a straw man in FPL.
- *Fix:* add `form_5`, `value_lag_1` (price encodes the market's xP) and a 2-feature ridge as baselines. If FPL's `ep_next` can be archived, it is the baseline that matters most.

**E5 · MINOR · `scripts/evaluate.py:107` — ρ is pooled across positions within a GW**
- *Why:* a GK's ceiling and a FWD's ceiling differ a lot, and the ILP chooses *within* position slots. Pooled ρ can rise just by ranking FWDs above GKs.
- *Fix:* report ρ per position, and the average of the per-position values per GW.

### Target & framing

**T1 · MAJOR · `src/fpl/features/builder.py:19-32` — position is not a feature**
- *Why:* `element_type` is in the parquet but missing from `FEATURE_COLUMNS`. Scoring rules differ by position (goal = 4/5/6 points, clean sheet = 4/4/1/0, defensive-contribution points), so the model has to infer position from xG patterns.
- *Fix:* add `element_type` as a categorical feature. This change has a high prior of helping.

**T2 · MAJOR · `scripts/predict_upcoming.py:46-54,70-91` — at inference, DGW players are predicted for one fixture only**
- *Why:* `setdefault` keeps the first fixture per team, and one placeholder row is injected. A DGW player's 2-match expectation is therefore scored as 1 match, which drives the ILP away from the players most worth picking. A team that does not appear in the fixture list gets no row, which is correct for a blank GW.
- *Fix:* use per-GW rows (L1) with `n_fixtures`, and build the inference row from all fixtures in that GW.

**T3 · MINOR · framing — the regression target mixes "plays?" and "scores if plays"**
- *Why:* the started-pool filter uses last week's minutes as a proxy for availability. Rotation risk is the main source of variance in a single GW.
- *Fix:* use a two-stage model, P(minutes ≥ 60) × E[points | plays], or add an explicit minutes model. Score the started-pool ρ separately from the selection impact.

**T4 · MINOR · 2025-26 changed the scoring rules (defensive contributions)**
- *Why:* the target distribution shifts between seasons, and training pools 2022-25 with 2025-26 as if they were stationary.
- *Fix:* add a season or rules-era indicator, or apply recency weighting. Check whether per-season ρ for DEF drops in 2025-26.

### Reproducibility

**R1 · MAJOR · `requirements.txt` — a UTF-16 `pip freeze` of an unrelated environment**
- *Why:* it lists supabase, reflex, selenium and others, but not lightgbm, which the README's ranker claim relies on. Being UTF-16 makes it fragile with `pip install -r` on some setups.
- *Fix:* write a minimal UTF-8 `requirements.txt` (numpy, pandas, scikit-learn, pyarrow, pulp, requests, plus optional torch/lightgbm/anthropic) together with a lock file.

**R2 · MAJOR · `scripts/build_historical.py:80-82` — data is pulled from the mutable `master` of vaastav, and the FPL API is live**
- *Why:* rerunning later can change past rows, because vaastav backfills and corrects data. The parquet files are gitignored and have no hash.
- *Fix:* pin a commit SHA in `RAW_BASE` and write a manifest (row counts plus a sha256 of each parquet) alongside the outputs. `evaluate.py` should print the manifest.

**R3 · MINOR — single seed, no variance across seeds**
- *Why:* `HistGradientBoostingRegressor` turns on early stopping automatically above 10k rows, which uses a random 10% internal split (fixed by `random_state=0`), and MLP training is stochastic. The effect of the seed is unknown.
- *Fix:* run 5 seeds and report the SD across seeds next to the CI across GWs.

**R4 · MINOR — dead or broken code**
- `src/fpl/selection/filters.py:9-20` contains a stray module-level `__init__`.
- `predict_upcoming.py:276` imports `fpl.vision.squad_reader`, which does not exist in the repo.
- `predict_upcoming.py` does not apply the "settled GW" filter that `build_dataset.py:40` uses.

---

## Part 2 — Is Spearman the right metric?

**How predictions are used:** (1) a knapsack ILP maximises Σŷ subject to budget, position and club constraints; (2) the captain is the argmax and counts double; (3) multi-GW predictions guide transfers.

- **The ILP uses magnitudes, not only ordering.** It trades predicted points against price. Two models with identical ρ but different spreads (e.g. a compressed top end) choose different XIs, and ρ cannot detect this. Calibration within position, measured by MAE on the started pool and a reliability curve, matters directly.
- **Only the top slice is acted on.** About 11 of roughly 230 started players are chosen each GW, and a single one becomes captain. ρ weights a swap between rank 150 and 151 the same as a swap between rank 1 and 2.
- **Ties.** Over 60% of all rows, and many started rows, sit at 0–2 points. ρ averages tied ranks; Kendall's τ-b deals with ties more cleanly and has a lower-variance estimator for the same signal. τ is still a ranking-only metric, though.
- **Hidden per-group weakness.** Pooled ρ mixes positions (E5) and the DGW/SGW units (L1).

**Recommendation:**
- **Primary decision metric:** realised XI points per GW with the captain doubled, as a paired difference against a baseline XI and as a percentage of the hindsight-optimal XI. Report mean ± block-bootstrap CI.
- **Secondary ranking metric:** NDCG@20 per position per GW with graded gains. Keep ρ, or τ-b, only as a diagnostic.
- **Captaincy:** top-3 hit rate and expected captain points. These are already partly computed at `evaluate.py:111-121`, so promote them.
- **Calibration:** MAE and a slope/intercept fit per position on the started pool. This is what the budget trade-off depends on.

---

## Part 3 — A better path on the chosen metric

Each item gives the hypothesis (H), a minimal experiment (X) and the expected effect (E). Expected effects are priors, not results.

1. **Fix the unit (L1, L2, T2).**
   - H: per-GW rows plus an `n_fixtures` feature make DGW players rankable and remove the leaks.
   - X: aggregate in `build_historical.py`, then rerun `evaluate.py` at horizons 1, 3 and 6.
   - E: about ±0.01 single-GW ρ overall. Clear improvements in DGW-week XI points. Horizon ρ may *drop* slightly once the window leak is gone, and the result becomes honest.
2. **Add position (T1) and cross-sectional transforms.**
   - H: ranking within a GW and position is the actual task. Percentile-ranking `form_5`, `xg_roll_3` and `value_lag_1` within (GW, position) removes drift across seasons and GWs.
   - X: add `element_type`, plus `*_pct_in_pos` versions of 4 features.
   - E: +0.01 to +0.03 ρ, with lower variance across seasons.
3. **Align the objective with the metric.**
   - H: MSE on a zero-inflated target spends its capacity separating 0s from 1s.
   - X: (a) train on the per-GW rank-gauss of `y` within position; (b) use LightGBM `lambdarank` with query = (GW, position), a non-negative graded label (e.g. 0 for <3, 1 for 3–5, 2 for 6–9, 3 for ≥10) and `lambdarank_truncation_level≈20`, evaluated on NDCG@20, not ρ.
   - Background: the README's ranker result (0.317 → 0.204) probably used raw points as labels, which can be negative, and a single query per GW. That setup does not fairly test LTR.
   - E: neutral on ρ, +0.02 to +0.05 on NDCG@20 / top-slice.
4. **Two-stage minutes × points (T3).**
   - X: a classifier for P(≥60 min) on lagged minutes and start-rate, a regressor for points among starters, and the product as ŷ.
   - E: small change to started-pool ρ. Larger improvement in XI points from fewer blanks, plus better calibration.
5. **Grouped, temporal CV with proper reporting (S1, E1).**
   - X: season-blocked expanding folds; a purge of n − 1 GWs for horizon n using true window ends; 2025-26 as a single-shot holdout. Report mean ± block-bootstrap CI, per-season ρ, % GWs with ρ > baseline, and seed SD.
   - E: no change to the level. The CI shows whether gbm and ridge actually differ (probably not).
6. **Rank-average ensembling.**
   - H: gbm and ridge both reach about 0.27 but make different errors.
   - X: average their per-GW percentile ranks. For the ILP, average calibrated predictions instead, because magnitude matters there.
   - E: +0.005 to +0.015 ρ and lower per-GW variance. Cheap.

---

## Part 4 — Frontier methods

| Method | Fit for this problem | Cost | Expected effect | Verdict |
|---|---|---|---|---|
| **Tuned LightGBM / CatBoost** (vs. default HistGBR) | Strong default for 12 low-dimensional, noisy features. CatBoost handles `element_type` and team categoricals natively. Monotone constraints (e.g. on `xg_roll_3`) regularise. | Low | +0.00 to +0.01 ρ | **Do it**, but only after Part 3 fixes 1–2 |
| **Learning-to-rank** (LambdaMART, query = GW × position) | Matches top-k selection if labels are graded and non-negative. | Low | ρ flat; NDCG@k up | **Do it, evaluated on NDCG@k** |
| **FT-Transformer / SAINT** | About 110k rows, 12–20 features and very low signal-to-noise. Published benchmarks rarely show these beating tuned GBDTs in this regime. | Medium to high (GPU, tuning) | ≈0 ± noise | **Skip** unless the feature set becomes rich, e.g. per-match event sequences |
| **TabPFN (v2)** | Strong on small tables. A 10k-row context limit would mean subsampling or retrieval. Per-GW refits fit its fast in-context inference. | Medium | Possibly matches GBDT; unlikely to beat it | Optional sanity check on one season |
| **Stacking trees + NN** | Only pays off if the base models are diverse and individually decent. The current MLP is not validated. | Medium | +0.005 at best over a rank-average of gbm + ridge | Use rank-averaging (Part 3 #6) first |
| **Sequence model over a player's GW history** (GRU/TCN) | Could learn form dynamics in place of hand-built rolls. Histories are short (≤38 per season) and seasons do not link, because vaastav ids reset each season. | High | Small | Skip until cross-season player linking exists |
| **Neutralisation** | Neutralising predictions against `value_lag_1` and ownership would isolate the model's edge over market consensus. Useful as a *diagnostic*, harmful for actual picks, because price carries real signal. | Low | Diagnostic only | Report ρ of the residual against price |
| **Shift robustness** (season weights, rules-era indicator, adversarial validation) | The 2025-26 rule change is a real shift (T4). | Low | Lower variance across seasons | **Do it** (recency weight or era flag) |
| **Self-supervised pretraining** | No large unlabeled corpus, and the features are already compact summaries. | High | ≈0 | Skip |

**Honest bottom line:** the README's conclusion is right that more signal beats more architecture. The best uses of effort are: fix the unit and the leaks → evaluate on the decision (XI points, NDCG@k) with CIs and a frozen holdout → add position, a minutes model and better data (bonus/BPS, set-piece duty, rolling start-rate, point-in-time team ratings, cross-season player linking). Tabular deep learning is the lowest-value item on this list.
