"""
Technical analysis engine.

Evaluates price action using three sub-pillars:
  1. Trend — Price vs SMA-50/200, golden/death cross
  2. Momentum — RSI-14, MACD histogram
  3. Volatility — Bollinger band position, ATR as % of price
"""

from __future__ import annotations

import logging

import pandas as pd
import pandas_ta as ta

from src.models.enums import Trend
from src.models.schemas import TechnicalBreakdown

logger = logging.getLogger(__name__)


def analyze_technicals(df: pd.DataFrame) -> TechnicalBreakdown:
    """
    Compute technical score from OHLCV DataFrame.
    Expects columns: Open, High, Low, Close, Volume.
    """
    result = TechnicalBreakdown()

    if df.empty or len(df) < 50:
        logger.warning("Insufficient price data for technical analysis (%d rows)", len(df))
        result.score = 50.0
        return result

    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    price = float(close.iloc[-1])

    # ── SMA ──────────────────────────────────────────────────────────
    sma_50 = ta.sma(close, length=50)
    sma_200 = ta.sma(close, length=200)

    sma50_val = float(sma_50.iloc[-1]) if sma_50 is not None and not sma_50.empty else None
    sma200_val = float(sma_200.iloc[-1]) if sma_200 is not None and not sma_200.empty and len(sma_200.dropna()) > 0 else None

    if sma50_val:
        result.sma_50_vs_price = round((price - sma50_val) / sma50_val * 100, 2)
    if sma200_val:
        result.sma_200_vs_price = round((price - sma200_val) / sma200_val * 100, 2)

    # Golden / Death cross (SMA-50 crosses SMA-200)
    if sma_50 is not None and sma_200 is not None and len(sma_50.dropna()) > 2 and len(sma_200.dropna()) > 2:
        prev_50 = float(sma_50.dropna().iloc[-2])
        prev_200 = float(sma_200.dropna().iloc[-2])
        curr_50 = float(sma_50.dropna().iloc[-1])
        curr_200 = float(sma_200.dropna().iloc[-1])
        if prev_50 <= prev_200 and curr_50 > curr_200:
            result.golden_cross = True
        elif prev_50 >= prev_200 and curr_50 < curr_200:
            result.death_cross = True

    # ── RSI ──────────────────────────────────────────────────────────
    rsi = ta.rsi(close, length=14)
    if rsi is not None and not rsi.empty:
        result.rsi_14 = round(float(rsi.iloc[-1]), 1)

    # ── MACD ─────────────────────────────────────────────────────────
    macd_df = ta.macd(close)
    if macd_df is not None and not macd_df.empty:
        hist_col = [c for c in macd_df.columns if "MACDh" in c or "Histogram" in c.title()]
        if hist_col:
            hist = float(macd_df[hist_col[0]].iloc[-1])
            result.macd_signal = "bullish" if hist > 0 else ("bearish" if hist < 0 else "neutral")
        else:
            # Fallback: MACD - Signal
            cols = list(macd_df.columns)
            if len(cols) >= 2:
                diff = float(macd_df[cols[0]].iloc[-1]) - float(macd_df[cols[1]].iloc[-1])
                result.macd_signal = "bullish" if diff > 0 else "bearish"

    # ── Bollinger Bands ───────────────────────────────────────────────
    bbands = ta.bbands(close, length=20)
    if bbands is not None and not bbands.empty:
        upper_col = [c for c in bbands.columns if "BBU" in c]
        lower_col = [c for c in bbands.columns if "BBL" in c]
        if upper_col and lower_col:
            upper = float(bbands[upper_col[0]].iloc[-1])
            lower = float(bbands[lower_col[0]].iloc[-1])
            if upper != lower:
                result.bollinger_position = round((price - lower) / (upper - lower), 2)

    # ── ATR ──────────────────────────────────────────────────────────
    atr = ta.atr(high, low, close, length=14)
    if atr is not None and not atr.empty and price > 0:
        result.atr_pct = round(float(atr.iloc[-1]) / price * 100, 2)

    # ── Trend classification ─────────────────────────────────────────
    above_50 = result.sma_50_vs_price is not None and result.sma_50_vs_price > 0
    above_200 = result.sma_200_vs_price is not None and result.sma_200_vs_price > 0

    if above_50 and above_200:
        result.trend = Trend.BULLISH
    elif not above_50 and not above_200:
        result.trend = Trend.BEARISH
    else:
        result.trend = Trend.NEUTRAL

    # ── Score computation ────────────────────────────────────────────
    # Trend score (0–100)
    trend_score = 50.0
    if result.sma_50_vs_price is not None:
        trend_score += min(max(result.sma_50_vs_price * 2, -25), 25)
    if result.sma_200_vs_price is not None:
        trend_score += min(max(result.sma_200_vs_price, -15), 15)
    if result.golden_cross:
        trend_score += 10
    if result.death_cross:
        trend_score -= 10
    trend_score = max(0, min(100, trend_score))

    # Momentum score (0–100) — RSI sweet spot is 40–60
    momentum_score = 50.0
    if result.rsi_14 is not None:
        if 40 <= result.rsi_14 <= 60:
            momentum_score = 70.0  # healthy range
        elif 30 <= result.rsi_14 < 40:
            momentum_score = 80.0  # oversold bounce potential
        elif result.rsi_14 < 30:
            momentum_score = 60.0  # deeply oversold — risk
        elif 60 < result.rsi_14 <= 70:
            momentum_score = 60.0  # slightly overbought
        else:
            momentum_score = 35.0  # overbought
    if result.macd_signal == "bullish":
        momentum_score += 10
    elif result.macd_signal == "bearish":
        momentum_score -= 10
    momentum_score = max(0, min(100, momentum_score))

    # Volatility score — moderate vol = good for long term
    vol_score = 60.0
    if result.atr_pct is not None:
        if result.atr_pct < 1.5:
            vol_score = 75.0  # low vol, stable
        elif result.atr_pct < 3.0:
            vol_score = 60.0  # moderate
        else:
            vol_score = 40.0  # high vol, risky

    total = trend_score * 0.45 + momentum_score * 0.35 + vol_score * 0.20
    result.score = round(max(0, min(100, total)), 1)

    return result
