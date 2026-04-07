"""
Composite scoring engine.

Combines fundamental, technical, quality, and macro scores into a
single 0–100 conviction score and maps it to an Action.
"""

from __future__ import annotations

import logging
from typing import Any

from src.config import settings
from src.models.enums import Action, Conviction
from src.models.schemas import (
    FundamentalBreakdown,
    MacroBreakdown,
    QualityBreakdown,
    StockScore,
    TechnicalBreakdown,
)
from src.analysis.fundamental import analyze_fundamentals
from src.analysis.technical import analyze_technicals
from src.data.market import get_history, get_info
from src.data.macro import get_macro_snapshot

logger = logging.getLogger(__name__)


# ─── Quality scoring ────────────────────────────────────────────────
def _score_quality(info: dict[str, Any]) -> QualityBreakdown:
    """Evaluate dividend consistency, institutional ownership, and beta."""
    div_yield = info.get("dividendYield")
    if div_yield is not None:
        try:
            div_yield = float(div_yield)
            # Some providers return dividend yield in percent (e.g. 2.8) instead
            # of ratio form (0.028). Normalize to ratio for scoring/output.
            if div_yield > 1:
                div_yield /= 100.0
            # Guard against another common encoding where 0.28 means 0.28%.
            if div_yield > 0.2:
                div_yield /= 100.0
        except (ValueError, TypeError):
            div_yield = None

    beta = info.get("beta")
    if beta is not None:
        try:
            beta = float(beta)
        except (ValueError, TypeError):
            beta = None

    inst = info.get("heldPercentInstitutions")
    if inst is not None:
        try:
            inst = float(inst)
        except (ValueError, TypeError):
            inst = None

    # Score components
    scores: list[float] = []

    # Dividend — having one is good, yield 1–4% is ideal for long-term
    if div_yield is not None and div_yield > 0:
        if 0.01 <= div_yield <= 0.04:
            scores.append(80)
        elif div_yield > 0.04:
            scores.append(65)  # very high yield can signal risk
        else:
            scores.append(55)
    else:
        scores.append(40)  # no dividend — neutral-ish for growth stocks

    # Institutional ownership — higher = more confidence
    if inst is not None:
        if inst > 0.7:
            scores.append(80)
        elif inst > 0.4:
            scores.append(65)
        else:
            scores.append(45)
    else:
        scores.append(50)

    # Beta — 0.8–1.2 is ideal for long term; too high = volatile
    if beta is not None:
        if 0.8 <= beta <= 1.2:
            scores.append(75)
        elif 0.5 <= beta < 0.8 or 1.2 < beta <= 1.5:
            scores.append(60)
        else:
            scores.append(40)
    else:
        scores.append(50)

    total = sum(scores) / len(scores) if scores else 50.0

    return QualityBreakdown(
        dividend_yield=div_yield,
        institutional_pct=inst,
        beta=beta,
        score=round(total, 1),
    )


# ─── Macro scoring ──────────────────────────────────────────────────
def _score_macro() -> MacroBreakdown:
    """Score the current macro environment (same for all stocks)."""
    snap = get_macro_snapshot()
    fed = snap.get("fed_rate")
    vix = snap.get("vix")
    spread = snap.get("yield_curve_spread")

    scores: list[float] = []

    # Fed rate — lower is generally better for equities
    if fed is not None:
        if fed < 3:
            scores.append(80)
        elif fed < 5:
            scores.append(55)
        else:
            scores.append(35)
    else:
        scores.append(50)

    # VIX — below 20 is calm, above 30 is fearful
    if vix is not None:
        if vix < 15:
            scores.append(80)
        elif vix < 25:
            scores.append(60)
        else:
            scores.append(35)
    else:
        scores.append(50)

    # Yield curve — positive = healthy, inverted = recession signal
    if spread is not None:
        if spread > 0.5:
            scores.append(75)
        elif spread > 0:
            scores.append(60)
        else:
            scores.append(35)
    else:
        scores.append(50)

    total = sum(scores) / len(scores) if scores else 50.0

    return MacroBreakdown(
        fed_rate=fed,
        vix=vix,
        yield_curve_spread=spread,
        score=round(total, 1),
    )


# ─── Action mapping ─────────────────────────────────────────────────
def _map_action(
    score: float,
    is_held: bool,
    previously_sold: bool,
    fund_score: float,
    quality_score: float,
) -> tuple[Action, Conviction]:
    """Map composite score to Action + Conviction."""
    quality_pass = (
        fund_score >= settings.long_term_fundamental_floor
        and quality_score >= settings.long_term_quality_floor
    )

    if previously_sold and score >= settings.rebuy_threshold and quality_pass:
        return Action.REBUY, Conviction.STRONG if score >= 85 else Conviction.MODERATE

    if is_held:
        if score >= settings.buy_threshold:
            return Action.HOLD, Conviction.STRONG
        elif score >= settings.hold_strong_threshold:
            return Action.HOLD, Conviction.MODERATE
        elif score >= settings.hold_weak_threshold:
            return Action.HOLD, Conviction.WEAK
        elif score >= settings.sell_threshold:
            return Action.SELL, Conviction.MODERATE
        else:
            return Action.SELL, Conviction.STRONG
    else:
        if score >= settings.long_term_buy_threshold and quality_pass:
            return Action.BUY, Conviction.STRONG if score >= 90 else Conviction.MODERATE
        elif score >= settings.hold_strong_threshold:
            return Action.WATCH, Conviction.MODERATE
        else:
            return Action.WATCH, Conviction.WEAK


def _build_rationale(
    action: Action,
    fund: FundamentalBreakdown,
    tech: TechnicalBreakdown,
    quality: QualityBreakdown,
    score: float,
) -> str:
    """Generate a one-liner rationale for the recommendation."""
    parts: list[str] = []

    if fund.score >= 70:
        parts.append("strong fundamentals")
    elif fund.score <= 35:
        parts.append("weak fundamentals")

    if tech.trend.value == "BULLISH":
        parts.append("bullish trend")
    elif tech.trend.value == "BEARISH":
        parts.append("bearish trend")

    if tech.rsi_14 is not None:
        if tech.rsi_14 < 30:
            parts.append("oversold (RSI)")
        elif tech.rsi_14 > 70:
            parts.append("overbought (RSI)")

    if tech.golden_cross:
        parts.append("golden cross")
    if tech.death_cross:
        parts.append("death cross")

    if quality.dividend_yield and quality.dividend_yield > 0.02:
        parts.append(f"{quality.dividend_yield:.1%} dividend")

    if not parts:
        parts.append("mixed signals")

    prefix = {
        Action.BUY: "Buy signal",
        Action.SELL: "Sell signal",
        Action.HOLD: "Hold",
        Action.REBUY: "Re-entry signal",
        Action.WATCH: "Watchlist",
    }[action]

    return f"{prefix} (score {score:.0f}/100): {', '.join(parts)}."


# ─── Public API ──────────────────────────────────────────────────────
def score_stock(
    ticker: str,
    is_held: bool = False,
    previously_sold: bool = False,
    avg_cost: float | None = None,
) -> StockScore:
    """
    Run full analysis on a single stock and return a scored recommendation.
    """
    logger.info("Analysing %s …", ticker)

    info = get_info(ticker)
    hist = get_history(ticker, period="2y")

    # ── Pillar analyses ──────────────────────────────────────────────
    fund = analyze_fundamentals(info)
    tech = analyze_technicals(hist)
    quality = _score_quality(info)
    macro = _score_macro()

    # ── Weighted composite ───────────────────────────────────────────
    composite = (
        fund.score * settings.fundamental_weight
        + tech.score * settings.technical_weight
        + quality.score * settings.quality_weight
        + macro.score * settings.macro_weight
    )
    composite = round(max(0, min(100, composite)), 1)

    # ── Determine action ─────────────────────────────────────────────
    action, conviction = _map_action(
        composite,
        is_held,
        previously_sold,
        fund.score,
        quality.score,
    )
    rationale = _build_rationale(action, fund, tech, quality, composite)

    # ── Unrealised P/L ───────────────────────────────────────────────
    price = float(info.get("currentPrice") or info.get("regularMarketPrice") or 0)
    if price <= 0 and not hist.empty and "Close" in hist.columns:
        try:
            price = float(hist["Close"].iloc[-1])
        except Exception:
            price = 0.0

    name = info.get("shortName") or info.get("longName") or ticker.upper()

    pnl_pct = None
    if avg_cost and avg_cost > 0 and price > 0:
        pnl_pct = round((price - avg_cost) / avg_cost * 100, 2)

    return StockScore(
        ticker=ticker.upper(),
        name=name,
        sector=info.get("sector", ""),
        current_price=price,
        market_cap=info.get("marketCap"),
        fundamental=fund,
        technical=tech,
        quality=quality,
        macro=macro,
        composite_score=composite,
        action=action,
        conviction=conviction,
        rationale=rationale,
        avg_cost=avg_cost,
        unrealized_pnl_pct=pnl_pct,
    )
