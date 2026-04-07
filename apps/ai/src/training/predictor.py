"""
ML predictor.

Loads a trained XGBoost model and predicts BUY/HOLD/SELL for live stocks
from their current OHLCV data.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from src.data.market import get_history, get_info
from src.config import settings
from src.models.enums import Action, Conviction
from src.models.schemas import (
    FundamentalBreakdown,
    MacroBreakdown,
    QualityBreakdown,
    StockScore,
    TechnicalBreakdown,
)
from src.training.features import FEATURE_COLUMNS, compute_features
from src.training.trainer import load_model

logger = logging.getLogger(__name__)

_CLASS_MAP = {0: Action.SELL, 1: Action.HOLD, 2: Action.BUY}


def predict_stock(
    ticker: str,
    is_held: bool = False,
    previously_sold: bool = False,
    avg_cost: float | None = None,
) -> StockScore | None:
    """
    Use the trained ML model to predict action for a single stock.

    Returns None if no model is loaded or data is insufficient.
    """
    loaded = load_model()
    if loaded is None:
        logger.warning("No trained model available")
        return None

    model, meta = loaded

    # ── Fetch current data ───────────────────────────────────────────
    hist = get_history(ticker, period="2y")
    info = get_info(ticker)

    if hist.empty or len(hist) < 260:
        logger.warning("Insufficient data for ML prediction on %s", ticker)
        return None

    # ── Compute features at latest point ─────────────────────────────
    features_df = compute_features(hist)
    if features_df.empty:
        logger.warning("Could not compute features for %s", ticker)
        return None

    feature_cols = meta.get("feature_columns") if isinstance(meta, dict) else None
    if not isinstance(feature_cols, list) or not feature_cols:
        feature_cols = FEATURE_COLUMNS

    missing_cols = [c for c in feature_cols if c not in features_df.columns]
    if missing_cols:
        logger.warning("Model feature mismatch for %s: missing=%s", ticker, missing_cols)
        return None

    latest = features_df.iloc[[-1]][feature_cols].values

    # ── Predict ──────────────────────────────────────────────────────
    proba = model.predict_proba(latest)[0]  # [P(SELL), P(HOLD), P(BUY)]
    pred_class = int(np.argmax(proba))
    confidence = float(proba[pred_class])

    model_action = _CLASS_MAP[pred_class]

    # ── Score mapping (probability → 0-100) ──────────────────────────
    # Expected score under class anchor values.
    # SELL=15, HOLD=55, BUY=90 keeps interpretation aligned with rule thresholds.
    composite = proba[0] * 15 + proba[1] * 55 + proba[2] * 90
    composite = max(0, min(100, composite))

    # Long-term action mapping prioritizes score over instantaneous class label.
    if is_held:
        if composite >= settings.buy_threshold:
            action, conviction = Action.HOLD, Conviction.STRONG
        elif composite >= settings.hold_strong_threshold:
            action, conviction = Action.HOLD, Conviction.MODERATE
        elif composite >= settings.hold_weak_threshold:
            action, conviction = Action.HOLD, Conviction.WEAK
        elif composite >= settings.sell_threshold:
            action, conviction = Action.SELL, Conviction.MODERATE
        else:
            action, conviction = Action.SELL, Conviction.STRONG
    else:
        if previously_sold and composite >= settings.rebuy_threshold:
            action, conviction = Action.REBUY, Conviction.MODERATE
        elif composite >= settings.long_term_buy_threshold:
            action = Action.BUY
            conviction = Conviction.STRONG if confidence >= 0.7 else Conviction.MODERATE
        elif composite >= settings.hold_strong_threshold:
            action, conviction = Action.WATCH, Conviction.MODERATE
        else:
            action, conviction = Action.WATCH, Conviction.WEAK

    # ── Build rationale ──────────────────────────────────────────────
    proba_str = f"SELL:{proba[0]:.0%} HOLD:{proba[1]:.0%} BUY:{proba[2]:.0%}"
    rationale = (
        f"ML prediction ({proba_str}) — class={model_action.value}, "
        f"confidence {confidence:.0%}"
    )

    # ── Price & PnL ──────────────────────────────────────────────────
    price = float(info.get("currentPrice") or info.get("regularMarketPrice") or 0)
    pnl_pct = None
    if avg_cost and avg_cost > 0 and price > 0:
        pnl_pct = round((price - avg_cost) / avg_cost * 100, 2)

    return StockScore(
        ticker=ticker.upper(),
        name=info.get("shortName", ""),
        sector=info.get("sector", ""),
        current_price=price,
        market_cap=info.get("marketCap"),
        composite_score=round(composite, 1),
        action=action,
        conviction=conviction,
        rationale=rationale,
        avg_cost=avg_cost,
        unrealized_pnl_pct=pnl_pct,
    )
