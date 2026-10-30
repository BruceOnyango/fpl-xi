"""API tests against a fake FPL client and a temp predictions file — no network."""

from __future__ import annotations
import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import api.main as main
from api.fpl_live import FplNotFound, Pulled
from api.service import Service, one_yellow_from_ban
from api.store import ArtifactStore

NOW = datetime(2026, 10, 29, 12, tzinfo=timezone.utc)

# 15-man squad: 2 GK, 5 DEF, 5 MID, 3 FWD across 8 clubs (≤3 each).
SHAPE = [1] * 2 + [2] * 5 + [3] * 5 + [4] * 3


def _elements():
    els = []
    for i, et in enumerate(SHAPE, start=1):
        els.append(
            dict(
                id=i, web_name=f"P{i}", first_name="F", second_name=f"P{i}", team=(i % 8) + 1,
                element_type=et, now_cost=50 + i, status="a", chance_of_playing_next_round=None,
                news="", selected_by_percent="1.0", form="3.0", total_points=10, points_per_game="3.0",
                minutes=500, expected_goals="0.5", expected_assists="0.2",
            )
        )
    els[14]["status"] = "i"  # a forward is injured → availability gate
    els[14]["news"] = "Hamstring"
    els[5]["yellow_cards"] = 4  # one booking from a ban (next GW is 9, before the GW19 cutoff)
    els[6]["yellow_cards"] = 5  # past the threshold: already served (or serving) the ban
    return els


class FakeLive:
    def peek(self, key):
        return self.bootstrap() if key == "bootstrap" else None

    def bootstrap(self):
        return Pulled(
            {
                "elements": _elements(),
                "teams": [dict(id=t, name=f"Team {t}", short_name=f"T{t}", strength_overall_home=3,
                               strength_overall_away=4) for t in range(1, 9)],
                "events": [
                    dict(id=8, finished=True, is_current=True, is_next=False, deadline_time="2026-10-23T17:30:00Z"),
                    dict(id=9, finished=False, is_current=False, is_next=True, deadline_time="2026-10-31T11:00:00Z"),
                ],
            },
            NOW,
        )

    def fixtures(self):
        return Pulled(
            [
                dict(id=1, event=9, kickoff_time="2026-10-31T12:30:00Z", team_h=1, team_a=2, team_h_difficulty=2,
                     team_a_difficulty=4, finished=False, team_h_score=None, team_a_score=None),
                dict(id=2, event=None, kickoff_time=None, team_h=3, team_a=4, team_h_difficulty=3,
                     team_a_difficulty=3, finished=False, team_h_score=None, team_a_score=None),
            ],
            NOW,
        )

    def entry(self, team_id):
        if team_id == 404:
            raise FplNotFound("/entry/404/")
        return Pulled(
            dict(player_first_name="Ada", player_last_name="L", name="Ada's XI", summary_overall_rank=12345,
                 summary_overall_points=480, last_deadline_bank=15, last_deadline_value=1012,
                 leagues={"classic": [dict(id=77, name="Office", league_type="x"),
                                      dict(id=1, name="Overall", league_type="s")]}),
            NOW,
        )

    def entry_history(self, team_id):
        return Pulled(
            {"current": [dict(event=g, points=50 + g, rank=1000 * g, event_transfers=(1 if g == 7 else 0))
                         for g in range(1, 9)],
             "chips": [dict(name="wildcard", event=5)]},
            NOW,
        )

    def picks(self, team_id, event):
        return Pulled({"picks": [dict(element=i) for i in range(1, 16)],
                       "entry_history": dict(points=58, bank=15, value=1012)}, NOW)

    def league(self, league_id):
        return Pulled({"standings": {"results": [
            dict(entry=1, rank=1, last_rank=2, player_name="Ada L", entry_name="Ada's XI", event_total=58, total=480),
            dict(entry=2, rank=2, last_rank=1, player_name="Bob", entry_name="Bob FC", event_total=40, total=470),
        ]}}, NOW)


def _write_predictions(root):
    rows = [dict(player_id=i, pred=float(i), low=max(0.0, i - 2.0), high=i + 3.0, capt_pred=float(i) / 2)
            for i in range(1, 16)]
    (root / "predictions.json").write_text(json.dumps({
        "gw": 9, "model": "gbm", "generated_at": "2026-10-29T10:00:00+00:00",
        "data_fetched_at": "2026-10-29T09:00:00+00:00", "horizons": {"1": rows, "3": rows, "6": rows},
    }))


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "service", Service(FakeLive(), ArtifactStore(tmp_path)))
    return TestClient(main.app), tmp_path


def test_meta_without_predictions_still_works(client):
    c, _ = client
    r = c.get("/fpl/meta")
    assert r.status_code == 200
    body = r.json()
    assert body["nextGw"] == 9 and body["currentGw"] == 8
    assert body["predictionsGeneratedAt"] is None and body["model"] is None
    assert body["source"] == "live"


def test_players_require_exported_predictions(client):
    c, root = client
    r = c.get("/fpl/players")
    assert r.status_code == 503 and "export_predictions.py" in r.json()["detail"]
    _write_predictions(root)
    body = c.get("/fpl/players?horizon=6").json()
    assert body["gw"] == 9 and body["horizon"] == 6 and len(body["players"]) == 15
    injured = next(p for p in body["players"] if p["id"] == 15)
    assert injured["prediction"] == {"points": 0.0, "low": 0.0, "high": 0.0}  # gated, not phantom points
    assert body["players"][0]["teamId"] == 2  # camelCase on the wire
    risk = {p["id"]: (p["yellowCards"], p["oneYellowFromBan"]) for p in body["players"]}
    assert risk[6] == (4, True) and risk[7] == (5, False) and risk[1] == (0, False)


def test_one_yellow_from_ban_thresholds():
    assert one_yellow_from_ban(4, 19) and not one_yellow_from_ban(4, 20)  # 5-yellow rule ends at GW19
    assert one_yellow_from_ban(9, 32) and not one_yellow_from_ban(9, 33)
    assert one_yellow_from_ban(14, 38)
    assert not one_yellow_from_ban(3, 9) and not one_yellow_from_ban(5, 9)


def test_manager_squad_solves_a_legal_lineup(client):
    c, root = client
    _write_predictions(root)
    body = c.get("/fpl/managers/123/squad?horizon=3").json()
    rec = body["recommended"]
    assert len(body["squad"]) == 15 and len(rec["starters"]) == 11
    starters = {s["playerId"] for s in rec["starters"]}
    assert 15 not in starters  # injured forward benched by the gate
    assert rec["excluded"] == [{"playerId": 15, "reason": "P15 is flagged injured"}]
    assert rec["bench"][0]["playerId"] in {1, 2}  # backup GK first
    injured = next(b for b in rec["bench"] if b["playerId"] == 15)
    assert injured["predicted"] == 0.0  # same zeroing as /players, so pitch and lists agree
    assert rec["captainId"] in starters and rec["captainId"] != rec["viceCaptainId"]
    d, mid, f = map(int, rec["formation"].split("-"))
    assert d + mid + f == 10 and 3 <= d <= 5 and 2 <= mid <= 5 and 1 <= f <= 3
    assert rec["projectedRange"]["low"] <= rec["projectedPoints"] <= rec["projectedRange"]["high"]
    mgr = body["manager"]
    assert mgr["teamName"] == "Ada's XI" and mgr["bank"] == 1.5 and mgr["teamValue"] == 101.2
    assert mgr["lastGwPoints"] == 58 and mgr["previousGwPoints"] == 57


def test_free_transfer_estimate():
    hist = {"current": [dict(event=g, event_transfers=0) for g in range(1, 9)], "chips": []}
    assert Service.free_transfers(hist, 8) == 5  # banked, capped at 5
    hist["current"][6]["event_transfers"] = 3  # GW7: 5 banked, 3 used → 3 for GW8 → +1 unused → 4 for GW9
    assert Service.free_transfers(hist, 8) == 4
    hist["chips"] = [{"name": "wildcard", "event": 7}]  # wildcard: transfers don't consume the bank
    assert Service.free_transfers(hist, 8) == 5


def test_unknown_team_is_a_human_404(client):
    c, root = client
    _write_predictions(root)
    r = c.get("/fpl/managers/404/squad")
    assert r.status_code == 404 and "Check it" in r.json()["detail"]


def test_fixtures_leagues_teams_backtest(client):
    c, root = client
    fx = c.get("/fpl/fixtures?fromGw=9&toGw=9").json()["fixtures"]
    assert [f["homeDifficulty"] for f in fx] == [2]  # unscheduled fixture skipped
    lg = c.get("/fpl/managers/1/leagues").json()["leagues"]
    assert [x["name"] for x in lg] == ["Office"]  # system leagues excluded
    assert lg[0]["entries"][0]["lastRank"] == 2
    assert len(c.get("/fpl/teams").json()["teams"]) == 8
    assert c.get("/fpl/model/backtest").json()["series"] == []  # not saved yet → empty, not error
    (root / "backtest_h1.json").write_text(json.dumps({
        "model": "gbm", "summary": {"spearman_mean": 0.27, "spearman_std": 0.1, "beats_baseline_pct": 90,
                                    "held_out_gameweeks": 2},
        "series": [{"label": "24-25 GW1", "model": 0.3, "baseline": 0.1}]}))
    assert c.get("/fpl/model/backtest").json()["series"][0]["persistence"] == 0.1
    assert c.get("/fpl/meta").json()["model"]["spearman"] == 0.27


def test_bad_horizon_rejected(client):
    c, _ = client
    assert c.get("/fpl/players?horizon=2").status_code == 422


def test_routes_live_under_the_single_prefix(client):
    c, _ = client
    assert c.get("/fpl/meta").status_code == 200
    assert c.get("/api/meta").status_code == 404  # nothing outside the prefix
    assert c.get("/fpl/openapi.json").status_code == 200


def test_health_reports_version_and_freshness_without_calling_fpl(client):
    c, root = client
    body = c.get("/fpl/health").json()
    assert body["status"] == "ok" and body["version"] and body["uptimeS"] >= 0
    assert body["dataFetchedAt"] is not None and body["predictionsGeneratedAt"] is None
    assert c.get("/fpl/ready").status_code == 503  # no predictions yet → not ready
    _write_predictions(root)
    ready = c.get("/fpl/ready")
    assert ready.status_code == 200 and ready.json()["predictionsGw"] == 9


def test_cors_allows_only_configured_origins(client):
    c, _ = client
    ok = c.get("/fpl/meta", headers={"Origin": "http://localhost:3011"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:3011"
    evil = c.get("/fpl/meta", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in evil.headers

