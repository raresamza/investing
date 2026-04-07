"""
Portfolio scanner + stock discovery engine.

Supports three strategies via config:
  - "rules"    → rule-based composite scoring
  - "ml"       → XGBoost trained model
  - "ensemble" → average of both
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np

from src.config import settings
from src.analysis.composite import score_stock
from src.data.market import get_universe
from src.models.enums import Action, Conviction
from src.models.schemas import (
    DiscoverResponse,
    HoldingInput,
    PortfolioResponse,
    StockScore,
)

logger = logging.getLogger(__name__)

_MAX_WORKERS = 3


# ─── Strategy dispatcher ────────────────────────────────────────────
def _score_one(
    ticker: str,
    is_held: bool = False,
    previously_sold: bool = False,
    avg_cost: float | None = None,
    strategy: str | None = None,
) -> StockScore:
    """Score a single stock using the configured strategy."""
    strat = strategy or settings.strategy

    if strat == "rules":
        return score_stock(ticker, is_held, previously_sold, avg_cost)

    elif strat == "ml":
        from src.training.predictor import predict_stock
        result = predict_stock(ticker, is_held, previously_sold, avg_cost)
        if result is None:
            logger.warning("ML prediction unavailable for %s, falling back to rules", ticker)
            return score_stock(ticker, is_held, previously_sold, avg_cost)
        return result

    elif strat == "ensemble":
        rules_result = score_stock(ticker, is_held, previously_sold, avg_cost)
        rules_score = rules_result.composite_score

        from src.training.predictor import predict_stock
        ml_result = predict_stock(ticker, is_held, previously_sold, avg_cost)

        if ml_result is None:
            return rules_result

        # Average the scores
        ml_score = ml_result.composite_score
        avg_score = (rules_score + ml_score) / 2

        # Pick action from the averaged score using rules thresholds
        if is_held:
            if avg_score >= settings.buy_threshold:
                action, conviction = Action.HOLD, Conviction.STRONG
            elif avg_score >= settings.hold_strong_threshold:
                action, conviction = Action.HOLD, Conviction.MODERATE
            elif avg_score >= settings.hold_weak_threshold:
                action, conviction = Action.HOLD, Conviction.WEAK
            elif avg_score >= settings.sell_threshold:
                action, conviction = Action.SELL, Conviction.MODERATE
            else:
                action, conviction = Action.SELL, Conviction.STRONG
        else:
            quality_pass = (
                rules_result.fundamental.score >= settings.long_term_fundamental_floor
                and rules_result.quality.score >= settings.long_term_quality_floor
            )
            if previously_sold and avg_score >= settings.rebuy_threshold:
                action, conviction = Action.REBUY, Conviction.MODERATE
            elif avg_score >= settings.long_term_buy_threshold and quality_pass:
                action, conviction = Action.BUY, Conviction.MODERATE
            elif avg_score >= settings.hold_strong_threshold:
                action, conviction = Action.WATCH, Conviction.MODERATE
            else:
                action, conviction = Action.WATCH, Conviction.WEAK

        # Merge into a combined result
        rules_result.composite_score = round(avg_score, 1)
        rules_result.action = action
        rules_result.conviction = conviction
        rules_result.rationale = (
            f"Ensemble (rules={rules_score:.0f}, "
            f"ml={ml_score:.0f} → avg={avg_score:.0f}): "
            f"{rules_result.rationale.split(': ', 1)[-1]}"
        )
        return rules_result

    else:
        raise ValueError(f"Unknown strategy: {strat}")


# ─── Public API ──────────────────────────────────────────────────────
def scan_portfolio(
    holdings: list[HoldingInput],
    strategy: str | None = None,
) -> PortfolioResponse:
    """Score every holding in the user's portfolio."""
    results: list[StockScore] = []

    with ThreadPoolExecutor(max_workers=_MAX_WORKERS) as pool:
        futures = {
            pool.submit(
                _score_one,
                ticker=h.ticker,
                is_held=True,
                previously_sold=h.previously_sold,
                avg_cost=h.avg_cost,
                strategy=strategy,
            ): h
            for h in holdings
        }
        for future in as_completed(futures):
            holding = futures[future]
            try:
                result = future.result()
                results.append(result)
            except Exception as exc:
                logger.error("Failed to analyse %s: %s", holding.ticker, exc)

    results.sort(key=lambda s: s.composite_score, reverse=True)

    avg = sum(s.composite_score for s in results) / len(results) if results else 0
    sells = [s for s in results if s.action.value == "SELL"]
    buys = [s for s in results if s.action.value in ("BUY", "REBUY")]

    summary_parts = [f"Portfolio score: {avg:.0f}/100."]
    if sells:
        summary_parts.append(f"Consider selling: {', '.join(s.ticker for s in sells)}.")
    if buys:
        summary_parts.append(f"Re-buy candidates: {', '.join(s.ticker for s in buys)}.")
    if not sells and not buys:
        summary_parts.append("All holdings look stable.")

    strat = strategy or settings.strategy
    summary_parts.append(f"[strategy: {strat}]")

    return PortfolioResponse(
        holdings=results,
        portfolio_score=round(avg, 1),
        summary=" ".join(summary_parts),
    )


def discover_candidates(
    universe: str = "sp500",
    top_n: int = 10,
    exclude: list[str] | None = None,
    strategy: str | None = None,
) -> DiscoverResponse:
    """Scan a universe and return the top-N BUY candidates."""
    tickers = get_universe(universe)
    exclude_set = {t.upper() for t in (exclude or [])}
    tickers = [t for t in tickers if t.upper() not in exclude_set]

    logger.info("Scanning %d tickers in '%s' universe …", len(tickers), universe)

    scored: list[StockScore] = []

    with ThreadPoolExecutor(max_workers=_MAX_WORKERS) as pool:
        futures = {
            pool.submit(_score_one, ticker=t, is_held=False, strategy=strategy): t
            for t in tickers
        }
        for future in as_completed(futures):
            ticker = futures[future]
            try:
                result = future.result()
                scored.append(result)
            except Exception as exc:
                logger.warning("Skipping %s: %s", ticker, exc)

    # Long-term discovery policy: promote only top-percentile, quality-passing WATCH
    # names to BUY so the shortlist surfaces actionable long-horizon entries.
    if scored:
        percentile = min(max(settings.discovery_buy_percentile, 0.0), 0.99)
        buy_cutoff = float(np.quantile([s.composite_score for s in scored], percentile))

        for s in scored:
            quality_pass = (
                s.fundamental.score >= settings.long_term_fundamental_floor
                and s.quality.score >= settings.long_term_quality_floor
            )
            if s.action == Action.WATCH and s.composite_score >= buy_cutoff and quality_pass:
                s.action = Action.BUY
                s.conviction = Conviction.MODERATE
                s.rationale = (
                    f"Discovery top {int((1 - percentile) * 100):d}% long-term candidate: "
                    f"{s.rationale}"
                )

    scored.sort(key=lambda s: s.composite_score, reverse=True)
    candidates = scored[:top_n]

    summary = (
        f"Scanned {len(scored)}/{len(tickers)} tickers. "
        f"Top pick: {candidates[0].ticker} ({candidates[0].composite_score:.0f}/100)."
        if candidates else "No candidates found."
    )

    return DiscoverResponse(
        candidates=candidates,
        universe_scanned=len(scored),
        summary=summary,
    )
