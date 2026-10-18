"""Leak-free feature construction: raw per-GW history -> supervised (X, y)."""

from __future__ import annotations
import pandas as pd

# neutral fallback when a fixture/team can't be resolved (blank GW, missing data)
_NEUTRAL_STRENGTH = 1100.0

# =============================================================================
# LEAKAGE CONTRACT (dive: "look-ahead bias", "feature lagging")
#   Target y_t = points in GW t. Two kinds of feature:
#   (1) PAST OUTCOMES (form, points, xG, transfers, value) — must be shifted by
#       one GW so row t never sees GW t. The .shift(1) below is the guard.
#   (2) FIXTURE CONTEXT (was_home, opponent strength) — a property of the GW-t
#       match, which is SCHEDULED in advance and therefore known before kickoff.
#       Used un-lagged. This is legitimate forward information, not leakage.
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
        """Opponent's attack & defence rating for THIS match, venue-adjusted.
        opponent attack → clean-sheet risk (defenders/GK); opponent defence →
        attacking-return difficulty (mids/forwards)."""
        if teams is None or pd.isna(row.get("opponent_team")):
            return _NEUTRAL_STRENGTH, _NEUTRAL_STRENGTH
        t = teams.get(int(row["opponent_team"]))
        if not t:
            return _NEUTRAL_STRENGTH, _NEUTRAL_STRENGTH
        if bool(row.get("was_home", False)):  # opponent played away
            return (
                float(t.get("strength_attack_away", _NEUTRAL_STRENGTH)),
                float(t.get("strength_defence_away", _NEUTRAL_STRENGTH)),
            )
        return (
            float(t.get("strength_attack_home", _NEUTRAL_STRENGTH)),  # opp home
            float(t.get("strength_defence_home", _NEUTRAL_STRENGTH)),
        )

    def _build_one(self, player_id, rows, teams):
        df = pd.DataFrame(rows).sort_values("round").reset_index(drop=True)
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

        out = pd.DataFrame({"player_id": player_id, "round": df["round"]})
        out["y"] = df["total_points"]

        pts = df["total_points"]
        out["form_3"] = pts.rolling(self._short, min_periods=1).mean().shift(1)
        out["form_5"] = pts.rolling(self._long, min_periods=1).mean().shift(1)
        out["points_lag_1"] = pts.shift(1)
        out["minutes_lag_1"] = df["minutes"].shift(1)
        out["xg_roll_3"] = (
            df["expected_goals"].rolling(self._short, min_periods=1).mean().shift(1)
        )
        out["xa_roll_3"] = (
            df["expected_assists"].rolling(self._short, min_periods=1).mean().shift(1)
        )
        out["transfers_in_lag_1"] = df["transfers_in"].shift(1)
        out["transfers_out_lag_1"] = df["transfers_out"].shift(1)
        out["value_lag_1"] = df["value"].shift(1)

        # fixture context (un-lagged: describes the target GW, known pre-match)
        wh = (
            df["was_home"]
            if "was_home" in df.columns
            else pd.Series(False, index=df.index)
        )
        out["was_home"] = wh.astype(float)
        strengths = df.apply(lambda r: self._opp_strengths(r, teams), axis=1)
        out["opp_attack_strength"] = [s[0] for s in strengths]
        out["opp_defence_strength"] = [s[1] for s in strengths]

        return out.dropna(subset=FEATURE_COLUMNS).reset_index(drop=True)
