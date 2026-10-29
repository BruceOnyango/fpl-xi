"""FastAPI app: the read-only API the dashboard calls.

Every route lives under one prefix (default /fpl, override with FPL_API_PREFIX), so a
reverse proxy can forward that single path — e.g. example.com/fpl — to uvicorn
without rewriting. Interactive docs: <prefix>/docs.

Run (from backend/):
    python -m api                 # API_HOST/API_PORT, default 127.0.0.1:8011
    API_RELOAD=1 python -m api    # auto-reload while developing

The frontend dev server proxies /fpl to :8011 (cd frontend && npm run dev).
In production PM2 runs `python -m api` as `fpl-api` (see ecosystem.config.js).
"""

from __future__ import annotations
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # backend/src

from fastapi import APIRouter, FastAPI, HTTPException, Path as P, Query  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from . import models as m  # noqa: E402
from .fpl_live import FplLive, FplNotFound, FplUnavailable  # noqa: E402
from .service import NoPredictions, Service  # noqa: E402
from .store import ArtifactStore  # noqa: E402

#: The single public entry point, e.g. https://example.com/fpl
PREFIX = "/" + os.environ.get("FPL_API_PREFIX", "/fpl").strip("/")

app = FastAPI(
    title="fpl-xi dashboard API",
    version="0.1.0",
    docs_url=f"{PREFIX}/docs",
    redoc_url=None,
    openapi_url=f"{PREFIX}/openapi.json",
)
VERSION = os.environ.get("APP_VERSION") or "0.1.0"
STARTED = time.monotonic()

#: Browser origins allowed to call the API directly. Same-origin traffic through
#: nginx/Apache needs none; listing the web app's origins keeps direct :3011 access working.
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:3011").split(",")
    if o.strip()
]
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET"], allow_headers=["*"])

router = APIRouter(prefix=PREFIX)
live = FplLive()
service = Service(live, ArtifactStore())

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


@router.get("/health", response_model=m.HealthResponse)
def health():
    """Liveness + freshness. Never calls FPL, so monitoring can poll it freely."""
    pulled = service.live.peek("bootstrap")
    p = service.store.predictions()
    return m.HealthResponse(
        status="ok",
        version=VERSION,
        uptime_s=int(time.monotonic() - STARTED),
        data_fetched_at=pulled.fetched_at if pulled else None,
        predictions_generated_at=p.generated_at if p else None,
        predictions_gw=p.gw if p else None,
        now=datetime.now(timezone.utc),
    )


@router.get("/ready", response_model=m.HealthResponse)
def ready():
    """Ready to serve recommendations = predictions have been exported. 503 otherwise."""
    h = health()
    if h.predictions_generated_at is None:
        return JSONResponse(
            status_code=503,
            content={"detail": "No predictions exported yet. Run: cd backend && python scripts/export_predictions.py --gw <next GW>"},
        )
    return h


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
