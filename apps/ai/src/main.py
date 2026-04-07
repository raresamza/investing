"""FastAPI application — serves analysis endpoints for the frontend."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.engine.scanner import discover_candidates, scan_portfolio
from src.models.schemas import (
    DiscoverRequest,
    DiscoverResponse,
    PortfolioRequest,
    PortfolioResponse,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)

app = FastAPI(
    title="Stock Analyst AI",
    version="0.1.0",
    description="Long-term investment recommendation engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/analyze/portfolio", response_model=PortfolioResponse)
def analyze_portfolio(req: PortfolioRequest):
    """Analyse the user's held positions and return recommendations."""
    try:
        return scan_portfolio(req.holdings, strategy=req.strategy)
    except Exception as exc:
        logging.error("Portfolio analysis failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/analyze/discover", response_model=DiscoverResponse)
def analyze_discover(req: DiscoverRequest):
    """Discover top BUY candidates from a market universe."""
    try:
        return discover_candidates(
            universe=req.universe,
            top_n=req.top_n,
            exclude=req.exclude_tickers,
            strategy=req.strategy,
        )
    except Exception as exc:
        logging.error("Discovery scan failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
