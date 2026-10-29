"""FastAPI app: the read-only API the dashboard calls.

Every route lives under one prefix (default /fpl, override with FPL_API_PREFIX), so a
reverse proxy can forward that single path — e.g. bruceonyango.link/fpl — to uvicorn
without rewriting. Interactive docs: <prefix>/docs.

Run from the repo root:
    uvicorn backend.api.main:app --reload --port 8000

Then start the frontend with mocks off (its dev server proxies /fpl to :8000):
    cd frontend && VITE_USE_MOCKS=false npm run dev
"""

from __future__ import annotations
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from fastapi import APIRouter, FastAPI, HTTPException, Path as P, Query  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from . import models as m  # noqa: E402
from .fpl_live import FplLive, FplNotFound, FplUnavailable  # noqa: E402
from .service import NoPredictions, Service  # noqa: E402
from .store import ArtifactStore  # noqa: E402

#: The single public entry point, e.g. https://bruceonyango.link/fpl
PREFIX = "/" + os.environ.get("FPL_API_PREFIX", "/fpl").strip("/")

app = FastAPI(
    title="fpl-xi dashboard API",
    version="0.1.0",
    docs_url=f"{PREFIX}/docs",
    redoc_url=None,
    openapi_url=f"{PREFIX}/openapi.json",
)
router = APIRouter(prefix=PREFIX)
service = Service(FplLive(), ArtifactStore())

Horizon = Query(1, description="1, 3 or 6 gameweeks")
TeamId = P(..., gt=0, lt=100_000_000)


def _horizon(h: int) -> int:
    if h not in (1, 3, 6):
        raise HTTPException(422, "horizon must be 1, 3 or 6")
    return h


# Errors carry a human `detail` the frontend shows as-is.
@app.exception_handler(FplUnavailable)
def _fpl_down(_, exc: FplUnavailable):
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.exception_handler(FplNotFound)
def _fpl_404(_, exc: FplNotFound):
    return JSONResponse(status_code=404, content={"detail": "FPL has no record of that ID. Check it and try again."})


@app.exception_handler(NoPredictions)
def _no_preds(_, exc: NoPredictions):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(LookupError)
def _lookup(_, exc: LookupError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@router.get("/meta", response_model=m.MetaResponse)
def meta():
    return service.meta()


@router.get("/teams", response_model=m.TeamsResponse)
def teams():
    return service.teams()


@router.get("/players", response_model=m.PlayersResponse)
def players(horizon: int = Horizon):
    return service.players(_horizon(horizon))


@router.get("/fixtures", response_model=m.FixturesResponse)
def fixtures(fromGw: int = Query(1, ge=1, le=38), toGw: int = Query(38, ge=1, le=38)):  # noqa: N803
    return service.fixtures(fromGw, toGw)


@router.get("/managers/{team_id}/squad", response_model=m.ManagerSquadResponse)
def manager_squad(team_id: int = TeamId, horizon: int = Horizon):
    return service.manager_squad(team_id, _horizon(horizon))


@router.get("/managers/{team_id}/leagues", response_model=m.LeaguesResponse)
def leagues(team_id: int = TeamId):
    return service.leagues(team_id)


@router.get("/model/backtest", response_model=m.BacktestResponse)
def backtest(horizon: int = Horizon):
    return service.backtest(_horizon(horizon))


app.include_router(router)
