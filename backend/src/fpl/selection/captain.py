"""Captain selection — restrict the armband to attackers.

Captaincy doubles the score, so it should never land on a keeper/defender. On a
well-trained model the highest-predicted started player is usually already an
attacker (the keeper-captain bug was a thin-data artifact), so this guard is
cheap insurance that matters most in the sparse current-season path. A backtest
showed an extra "upside tilt" didn't beat plain argmax, so we keep it simple.
"""

from __future__ import annotations
import pandas as pd

ATTACK_TYPES = {3, 4}  # MID, FWD


def pick_captain(xi: pd.DataFrame, pred_col: str = "pred") -> int:
    pool = xi
    if "element_type" in xi.columns:
        attackers = xi[xi["element_type"].isin(ATTACK_TYPES)]
        if not attackers.empty:
            pool = attackers  # never captain a keeper/defender if an attacker exists
    return pool[pred_col].astype(float).idxmax()
