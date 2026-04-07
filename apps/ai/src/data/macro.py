"""Macro-economic data fetcher — wraps FRED API for rates, VIX, and yield curve."""

from __future__ import annotations

import logging
from functools import lru_cache

from src.config import settings

logger = logging.getLogger(__name__)


def _get_fred():
    """Lazily import and create FRED client."""
    if not settings.fred_api_key:
        logger.info("No FRED API key configured — macro scores will use defaults")
        return None
    try:
        from fredapi import Fred
        return Fred(api_key=settings.fred_api_key)
    except Exception as exc:
        logger.warning("Failed to initialise FRED client: %s", exc)
        return None


@lru_cache(maxsize=1)
def get_macro_snapshot() -> dict[str, float | None]:
    """
    Fetch key macro indicators:
      - fed_rate:           Effective Federal Funds Rate
      - vix:                CBOE Volatility Index
      - yield_curve_spread: 10Y minus 2Y Treasury spread
    """
    defaults: dict[str, float | None] = {
        "fed_rate": None,
        "vix": None,
        "yield_curve_spread": None,
    }

    fred = _get_fred()
    if fred is None:
        return defaults

    try:
        # Federal Funds Rate (latest observation)
        series = fred.get_series("FEDFUNDS", observation_start="2024-01-01")
        if series is not None and len(series) > 0:
            defaults["fed_rate"] = float(series.iloc[-1])
    except Exception as exc:
        logger.warning("FRED FEDFUNDS fetch failed: %s", exc)

    try:
        # VIX
        series = fred.get_series("VIXCLS", observation_start="2024-01-01")
        if series is not None and len(series) > 0:
            defaults["vix"] = float(series.dropna().iloc[-1])
    except Exception as exc:
        logger.warning("FRED VIXCLS fetch failed: %s", exc)

    try:
        # 10Y - 2Y spread
        t10 = fred.get_series("DGS10", observation_start="2024-01-01")
        t2 = fred.get_series("DGS2", observation_start="2024-01-01")
        if t10 is not None and t2 is not None and len(t10) > 0 and len(t2) > 0:
            defaults["yield_curve_spread"] = float(t10.dropna().iloc[-1] - t2.dropna().iloc[-1])
    except Exception as exc:
        logger.warning("FRED yield curve fetch failed: %s", exc)

    return defaults
