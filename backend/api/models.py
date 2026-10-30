"""Response models — the contract. Mirrors frontend/src/lib/api/schemas.ts field for
field (camelCase on the wire). Change both together."""

from __future__ import annotations
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Position = Literal["GK", "DEF", "MID", "FWD"]
Status = Literal["a", "d", "i", "s", "u", "n"]
Horizon = Literal[1, 3, 6]


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Freshness(Model):
    source: Literal["mock", "live"] = "live"
    data_fetched_at: datetime


class PredictionFreshness(Freshness):
    predictions_generated_at: datetime


class Prediction(Model):
    points: float
    low: float
    high: float


class Team(Model):
    id: int
    name: str
    short_name: str
    strength_home: float | None
    strength_away: float | None


class TeamsResponse(Freshness):
    teams: list[Team]


class Player(Model):
    id: int
    web_name: str
    first_name: str
    second_name: str
    team_id: int
    position: Position
    price: float
    status: Status
    chance_of_playing: float | None
    news: str
    selected_by_percent: float
    form: float
    total_points: float
    points_per_game: float
    minutes: float
    xg: float
    xa: float
    yellow_cards: int
    #: One more booking next GW triggers a ban (5 by GW19, 10 by GW32, 15 any time).
    one_yellow_from_ban: bool
    prediction: Prediction


class PlayersResponse(PredictionFreshness):
    gw: int
    horizon: Horizon
    players: list[Player]


class Fixture(Model):
    id: int
    gw: int
    kickoff: datetime
    home_team_id: int
    away_team_id: int
    home_difficulty: int = Field(ge=1, le=5)
    away_difficulty: int = Field(ge=1, le=5)
    finished: bool
    home_score: int | None
    away_score: int | None


class FixturesResponse(Freshness):
    fixtures: list[Fixture]


class LineupSlot(Model):
    player_id: int
    predicted: float


class Excluded(Model):
    player_id: int
    reason: str


class Range(Model):
    low: float
    high: float


class Lineup(PredictionFreshness):
    gw: int
    horizon: Horizon
    formation: str
    starters: list[LineupSlot]
    bench: list[LineupSlot]
    captain_id: int
    vice_captain_id: int
    projected_points: float
    projected_range: Range
    excluded: list[Excluded]


class Manager(Model):
    id: int
    player_name: str
    team_name: str
    overall_rank: int | None
    overall_points: float
    last_gw_points: float
    last_gw_rank: int | None
    previous_gw_points: float | None
    bank: float
    team_value: float
    free_transfers: int


class SquadPick(Model):
    player_id: int
    selling_price: float


class ManagerSquadResponse(PredictionFreshness):
    manager: Manager
    squad: list[SquadPick]
    recommended: Lineup


class ModelSummary(Model):
    name: str
    spearman: float
    spearman_std: float
    beats_persistence_pct: float
    held_out_gameweeks: int


class MetaResponse(Freshness):
    predictions_generated_at: datetime | None
    #: Gameweek the exported predictions were made for (may lag next_gw).
    predictions_gw: int | None
    current_gw: int | None
    next_gw: int
    next_deadline: datetime
    model: ModelSummary | None


class HealthResponse(Model):
    status: Literal["ok"]
    version: str
    uptime_s: int
    #: When the API last pulled from FPL (null until the first data request).
    data_fetched_at: datetime | None
    predictions_generated_at: datetime | None
    predictions_gw: int | None
    now: datetime


class BacktestPoint(Model):
    label: str
    model: float
    persistence: float


class BacktestResponse(Model):
    source: Literal["mock", "live"] = "live"
    model: str
    horizon: Horizon
    metric: Literal["spearman"] = "spearman"
    series: list[BacktestPoint]


class LeagueEntry(Model):
    entry_id: int
    rank: int
    last_rank: int | None
    player_name: str
    team_name: str
    gw_points: float
    total: float


class League(Model):
    id: int
    name: str
    entries: list[LeagueEntry]


class LeaguesResponse(Freshness):
    leagues: list[League]
