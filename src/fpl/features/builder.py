"""Leak-free feature construction: raw per-FIXTURE history -> supervised (X, y),
with one row per (player, gameweek).

Double gameweeks give a player two fixtures in one round. We aggregate those to a
single round-level row (sum points/minutes/xG/xA, count n_fixtures, average
venue + opponent strength) BEFORE lagging, so:
  * y is the player's full-gameweek points (both matches), and
  * shift(1) runs over gameweeks, never leaking a DGW's first match into its
    second.
"""

from __future__ import annotations
import pandas as pd

_NEUTRAL_STRENGTH = 1100.0

# =============================================================================
# LEAKAGE CONTRACT
#   y_t = points in gameweek t (summed over its fixtures). Two kinds of feature:
#   (1) PAST OUTCOMES (form, points, xG, transfers, value): shifted by one GW so
#       row t never sees GW t. The .shift(1), applied AFTER round-aggregation, is
#       the guard — it lags over gameweeks, not over fixtures.
#   (2) FIXTURE CONTEXT (was_home, opponent strength, n_fixtures): properties of
#       the GW-t schedule, known before kickoff. Used un-lagged.
# =============================================================================

FEATURE_COLUMNS = [
    "form_3",
    "form_5",
    "points_lag_1",
    "minutes_lag_1",
    "xg_roll_3",
    "xa_roll_3",
    "transfers_in_lag_1",
    "transfers_out_lag_1",
    "value_lag_1",
    "was_home",
    "opp_attack_strength",
    "opp_defence_strength",
    "n_fixtures",
]


class LeakFreeFeatureBuilder:
    def __init__(self, short_window: int = 3, long_window: int = 5):
        self._short = short_window
        self._long = long_window

    def build(self, raw_history, teams=None):
        frames = [
            self._build_one(pid, rows, teams)
            for pid, rows in raw_history.items()
            if rows
        ]
        if not frames:
            return pd.DataFrame(columns=["player_id", "round", *FEATURE_COLUMNS, "y"])
        return pd.concat(frames, ignore_index=True)

    def _opp_strengths(self, row, teams):
        if teams is None or pd.isna(row.get("opponent_team")):
            return _NEUTRAL_STRENGTH, _NEUTRAL_STRENGTH
        t = teams.get(int(row["opponent_team"]))
        if not t:
            return _NEUTRAL_STRENGTH, _NEUTRAL_STRENGTH
        if bool(row.get("was_home", False)):
            return (
                float(t.get("strength_attack_away", _NEUTRAL_STRENGTH)),
                float(t.get("strength_defence_away", _NEUTRAL_STRENGTH)),
            )
        return (
            float(t.get("strength_attack_home", _NEUTRAL_STRENGTH)),
            float(t.get("strength_defence_home", _NEUTRAL_STRENGTH)),
        )

    def _build_one(self, player_id, rows, teams):
        df = pd.DataFrame(rows)
        for col in (
            "total_points",
            "minutes",
            "expected_goals",
            "expected_assists",
            "transfers_in",
            "transfers_out",
            "value",
            "opponent_team",
        ):
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        if "was_home" not in df.columns:
            df["was_home"] = False
        df["was_home"] = df["was_home"].astype(float)

        # per-fixture opponent strengths, then aggregate fixtures -> one row per GW.
        # Built from explicit grouped series (robust across pandas versions) so a
        # double gameweek always collapses to exactly one row per round.
        st = df.apply(lambda r: self._opp_strengths(r, teams), axis=1)
        df["_oa"] = [s[0] for s in st]
        df["_od"] = [s[1] for s in st]
        grp = df.groupby("round", sort=True)
        g = (
            pd.DataFrame(
                {
                    "total_points": grp["total_points"].sum(),
                    "minutes": grp["minutes"].sum(),
                    "expected_goals": grp["expected_goals"].sum(),
                    "expected_assists": grp["expected_assists"].sum(),
                    "transfers_in": grp["transfers_in"].last(),
                    "transfers_out": grp["transfers_out"].last(),
                    "value": grp["value"].last(),
                    "was_home": grp["was_home"].mean(),
                    "opp_attack_strength": grp["_oa"].mean(),
                    "opp_defence_strength": grp["_od"].mean(),
                    "n_fixtures": grp.size(),
                }
            )
            .reset_index()
            .sort_values("round")
            .reset_index(drop=True)
        )

        out = pd.DataFrame({"player_id": player_id, "round": g["round"]})
        out["y"] = g["total_points"]

        pts = g["total_points"]
        out["form_3"] = pts.rolling(self._short, min_periods=1).mean().shift(1)
        out["form_5"] = pts.rolling(self._long, min_periods=1).mean().shift(1)
        out["points_lag_1"] = pts.shift(1)
        out["minutes_lag_1"] = g["minutes"].shift(1)
        out["xg_roll_3"] = (
            g["expected_goals"].rolling(self._short, min_periods=1).mean().shift(1)
        )
        out["xa_roll_3"] = (
            g["expected_assists"].rolling(self._short, min_periods=1).mean().shift(1)
        )
        out["transfers_in_lag_1"] = g["transfers_in"].shift(1)
        out["transfers_out_lag_1"] = g["transfers_out"].shift(1)
        out["value_lag_1"] = g["value"].shift(1)
        out["was_home"] = g["was_home"].astype(float)
        out["opp_attack_strength"] = g["opp_attack_strength"]
        out["opp_defence_strength"] = g["opp_defence_strength"]
        out["n_fixtures"] = g["n_fixtures"].astype(float)

        return out.dropna(subset=FEATURE_COLUMNS).reset_index(drop=True)
