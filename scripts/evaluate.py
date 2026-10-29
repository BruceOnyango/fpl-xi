"""Walk-forward evaluation on historical.parquet — the self-verifying harness.

Expanding window: for each test gameweek, train on all rows whose target window
ended strictly before it, predict it, and score on the STARTED pool
(minutes_lag_1 >= min_minutes). One model fit per (model, gameweek) — ranking and
captaincy metrics share that fit.

--horizon N predicts the sum of points over the next N gameweeks instead of one.
Longer horizons rank far better (less single-match noise) and are what you plan
transfers on. N=1 is the classic single-gameweek number.

Usage:
  python scripts/evaluate.py
  python scripts/evaluate.py --horizon 6
  python scripts/evaluate.py --models gbm ridge --test-seasons 2024-25 --k 20
"""

from __future__ import annotations
import argparse, sys
from pathlib import Path

# Windows consoles default to cp1252, which can't print names like "Mitrović".
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "src"))
import warnings
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
from fpl.features.builder import FEATURE_COLUMNS
from fpl.models import registry
from fpl.selection.captain import pick_captain

PROC = HERE / "data" / "processed"


def _global_index(df):
    order = {s: i for i, s in enumerate(sorted(df["season"].unique()))}
    return df["season"].map(order) * 100 + df["round"]


def apply_horizon(df, n):
    """Replace y with the sum of points over the next n gameweeks (per player,
    within season). Rows without a full n-window ahead are dropped. Also records
    _key_end = the key of the window's last gameweek, so the walk-forward split
    can require a row's whole target to be observed before the test GW."""
    if n <= 1:
        df = df.copy()
        df["_key_end"] = df["_key"]
        return df
    d = df.sort_values(["season", "player_id", "round"]).copy()
    d["y"] = d.groupby(["season", "player_id"])["y"].transform(
        lambda s: s[::-1].rolling(n, min_periods=n).sum()[::-1]
    )
    d["_key_end"] = d["_key"] + (n - 1)  # round+n-1 (seasons < 100 GWs, safe)
    return d.dropna(subset=["y"]).reset_index(drop=True)


def precision_at_k(pred, actual, k):
    k = min(k, len(pred))
    if k == 0:
        return np.nan
    return len(set(np.argsort(-pred)[:k]) & set(np.argsort(-actual)[:k])) / k


def _save_backtest(gbm, base, args):
    """Per-GW series + summary for the dashboard's "how much to trust this" panel."""
    import json
    from datetime import datetime, timezone

    g = gbm.merge(base, on="key", suffixes=("", "_b")).sort_values("key")
    out = PROC / f"backtest_h{args.horizon}.json"
    out.write_text(
        json.dumps(
            {
                "model": "gbm",
                "baseline": args.baseline,
                "horizon": args.horizon,
                "metric": "spearman",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "summary": {
                    "spearman_mean": round(float(g["spearman"].mean()), 4),
                    "spearman_std": round(float(g["spearman"].std()), 4),
                    "beats_baseline_pct": round(float(100 * (g["spearman"] > g["spearman_b"]).mean()), 1),
                    "held_out_gameweeks": int(len(g)),
                },
                "series": [
                    {"label": r.label, "model": round(float(r.spearman), 4), "baseline": round(float(r.spearman_b), 4)}
                    for r in g.itertuples()
                ],
            }
        ),
        encoding="utf-8",
    )
    print(f"\nsaved {len(g)} gameweeks -> {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--models", nargs="*", default=["gbm", "ridge", "persistence", "mean"]
    )
    ap.add_argument("--baseline", default="persistence")
    ap.add_argument("--test-seasons", nargs="*", default=None)
    ap.add_argument("--horizon", type=int, default=1)
    ap.add_argument("--min-minutes", type=float, default=60.0)
    ap.add_argument("--k", type=int, default=20)
    ap.add_argument(
        "--save",
        action="store_true",
        help="write per-GW gbm vs baseline Spearman to data/processed/backtest_h<N>.json "
        "(served by the dashboard API)",
    )
    args = ap.parse_args()

    path = PROC / "historical.parquet"
    if not path.exists():
        raise SystemExit("run scripts/build_historical.py first")
    df = pd.read_parquet(path).reset_index(drop=True)
    df["_key"] = _global_index(df)
    df = apply_horizon(df, args.horizon)

    test_df = df if not args.test_seasons else df[df["season"].isin(args.test_seasons)]
    test_keys = sorted(
        k for k in test_df["_key"].unique() if (df["_key_end"] < k).sum() >= 200
    )
    print(
        f"evaluating {len(test_keys)} gameweeks | horizon={args.horizon} GW | "
        f"started pool minutes>={args.min_minutes:.0f} | Precision@{args.k}\n"
    )

    rank = {m: [] for m in args.models}
    cap_rows = []
    for key in test_keys:
        train = df[df["_key_end"] < key]  # whole target observed before test GW
        test = df[df["_key"] == key]
        if len(train) < 200 or test.empty:
            continue
        started = test[test["minutes_lag_1"] >= args.min_minutes]
        if len(started) < args.k:
            continue
        for m in args.models:
            model = registry.create(m).fit(train[FEATURE_COLUMNS], train["y"])
            pred = model.predict(test[FEATURE_COLUMNS])
            s = started.assign(pred=pred.loc[started.index].values)
            sp = s["pred"].corr(s["y"], method="spearman")
            pk = precision_at_k(s["pred"].values, s["y"].values, args.k)
            mae = float(np.mean(np.abs(pred.values - test["y"].values)))
            label = f"{test['season'].iloc[0]} GW{int(test['round'].iloc[0])}"
            rank[m].append(dict(key=key, label=label, spearman=sp, precision=pk, mae=mae))
            if m == "gbm":
                thr = s["y"].nlargest(3).min()
                naive = s.loc[s["pred"].idxmax()]
                ceil = s.loc[pick_captain(s, "pred")]
                cap_rows.append(
                    dict(
                        naive_hit=int(naive["y"] >= thr),
                        ceil_hit=int(ceil["y"] >= thr),
                        ceil_pts=float(ceil["y"]),
                    )
                )

    hdr = f"{'model':12} {'Spearman':>16} {'Precision@'+str(args.k):>16} {'MAE':>8}  {'win% vs '+args.baseline:>14}"
    print(hdr)
    print("-" * len(hdr))
    res = {m: pd.DataFrame(r) for m, r in rank.items()}
    base = res.get(args.baseline)
    for m, r in res.items():
        if r.empty:
            print(f"{m:12} {'(no rows)':>16}")
            continue
        sp = f"{r['spearman'].mean():.3f} ± {r['spearman'].std():.3f}"
        pk = f"{r['precision'].mean():.3f} ± {r['precision'].std():.3f}"
        win = ""
        if base is not None and m != args.baseline and not base.empty:
            mg = r.merge(base, on="key", suffixes=("", "_b"))
            win = f"{100*(mg['spearman'] > mg['spearman_b']).mean():.0f}%"
        print(f"{m:12} {sp:>16} {pk:>16} {r['mae'].mean():>8.3f}  {win:>14}")

    if base is not None and not res["gbm"].empty:
        g = res["gbm"].merge(base, on="key", suffixes=("", "_b"))
        e = g["spearman"] - g["spearman_b"]
        print(
            f"\ngbm vs {args.baseline}: Spearman edge mean +{e.mean():.3f}, "
            f"median +{e.median():.3f}, wins {100*(e>0).mean():.0f}% of GWs"
        )
    if args.save and base is not None and not res["gbm"].empty:
        _save_backtest(res["gbm"], base, args)

    if cap_rows:
        c = pd.DataFrame(cap_rows)
        print(
            f"\nCaptaincy (gbm): ceiling top-3 hit {100*c['ceil_hit'].mean():.0f}% "
            f"(avg {c['ceil_pts'].mean():.2f}) vs naive {100*c['naive_hit'].mean():.0f}%"
        )


if __name__ == "__main__":
    main()
