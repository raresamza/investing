"""
Fundamental analysis engine.

Evaluates a stock's intrinsic value using three sub-pillars:
  1. Valuation — P/E, PEG, P/B relative to sector norms
  2. Profitability — ROE, profit margins, revenue growth
  3. Financial Health — D/E, current ratio, free-cash-flow yield
"""

from __future__ import annotations

import logging
from typing import Any

from src.models.schemas import FundamentalBreakdown

logger = logging.getLogger(__name__)


# ─── Sector median P/E benchmarks (rough approximations) ────────────
_SECTOR_PE: dict[str, float] = {
    "Technology": 30.0,
    "Healthcare": 22.0,
    "Financial Services": 14.0,
    "Consumer Cyclical": 20.0,
    "Consumer Defensive": 22.0,
    "Industrials": 20.0,
    "Energy": 12.0,
    "Utilities": 18.0,
    "Real Estate": 35.0,
    "Basic Materials": 15.0,
    "Communication Services": 20.0,
}
_DEFAULT_PE = 20.0


def _safe(info: dict[str, Any], key: str) -> float | None:
    """Safely extract a numeric value from yfinance info."""
    val = info.get(key)
    if val is None:
        return None
    try:
        f = float(val)
        return f if f == f else None  # NaN check
    except (ValueError, TypeError):
        return None


def _score_range(value: float | None, low: float, high: float, invert: bool = False) -> float:
    """
    Map value into 0–100 linearly between low (worst) and high (best).
    If invert=True, lower is better (e.g. D/E ratio).
    """
    if value is None:
        return 50.0  # neutral if missing
    if invert:
        value = -value
        low, high = -high, -low
    clamped = max(low, min(value, high))
    return ((clamped - low) / (high - low)) * 100 if high != low else 50.0


def analyze_fundamentals(info: dict[str, Any]) -> FundamentalBreakdown:
    """Compute fundamental score from yfinance info dict."""
    sector = info.get("sector", "")
    sector_pe = _SECTOR_PE.get(sector, _DEFAULT_PE)

    pe = _safe(info, "trailingPE")
    peg = _safe(info, "pegRatio")
    pb = _safe(info, "priceToBook")
    roe = _safe(info, "returnOnEquity")
    de = _safe(info, "debtToEquity")
    cr = _safe(info, "currentRatio")
    rev_growth = _safe(info, "revenueGrowth")
    profit_margin = _safe(info, "profitMargins")

    # FCF yield = FCF / market_cap
    fcf = _safe(info, "freeCashflow")
    mcap = _safe(info, "marketCap")
    fcf_yield = (fcf / mcap) if fcf and mcap and mcap > 0 else None

    # ── Sub-scores ──────────────────────────────────────────────────
    # Valuation — lower P/E relative to sector is better
    pe_score = _score_range(
        (sector_pe / pe * 50) if pe and pe > 0 else None,
        0, 100,
    )
    peg_score = _score_range(peg, 3.0, 0.5, invert=True)   # <1 = great, >3 = expensive
    pb_score = _score_range(pb, 10.0, 1.0, invert=True)

    valuation = (pe_score * 0.4 + peg_score * 0.35 + pb_score * 0.25)

    # Profitability — higher is better
    roe_score = _score_range(roe, 0.0, 0.30)
    margin_score = _score_range(profit_margin, 0.0, 0.30)
    growth_score = _score_range(rev_growth, -0.05, 0.30)

    profitability = (roe_score * 0.4 + margin_score * 0.3 + growth_score * 0.3)

    # Health — lower D/E is better, higher CR is better
    de_score = _score_range(de, 200.0, 0.0, invert=True)
    cr_score = _score_range(cr, 0.5, 3.0)
    fcf_score = _score_range(fcf_yield, -0.02, 0.10)

    health = (de_score * 0.4 + cr_score * 0.3 + fcf_score * 0.3)

    # ── Weighted composite ──────────────────────────────────────────
    total = valuation * 0.35 + profitability * 0.35 + health * 0.30

    return FundamentalBreakdown(
        pe_ratio=pe,
        peg_ratio=peg,
        price_to_book=pb,
        roe=roe,
        debt_to_equity=de,
        current_ratio=cr,
        fcf_yield=round(fcf_yield, 4) if fcf_yield else None,
        revenue_growth=rev_growth,
        profit_margin=profit_margin,
        score=round(max(0, min(100, total)), 1),
    )
