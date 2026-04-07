"""
Feature engineering pipeline.

Computes a fixed-width feature vector from OHLCV history at each point in time.
All features are designed to be computable from price/volume data alone so they
can be reconstructed historically for training **and** at inference time for
live predictions.

Feature categories:
  - Returns: 5d, 10d, 21d, 63d, 126d, 252d lookback returns
  - Moving averages: price relative to SMA-20/50/100/200
  - Momentum: RSI-14, MACD histogram, Stochastic %K
  - Volatility: ATR-14 as % of price, rolling 21d & 63d std
  - Volume: OBV slope, volume ratio vs 50d average
  - Trend: ADX-14, golden/death cross flag
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
import pandas_ta as ta

logger = logging.getLogger(__name__)

# ─── Feature column names (order matters — must match training) ──────
FEATURE_COLUMNS: list[str] = [
    # Returns
    "ret_5d", "ret_10d", "ret_21d", "ret_63d", "ret_126d", "ret_252d",
    # Moving average ratios
    "price_sma20_ratio", "price_sma50_ratio", "price_sma100_ratio", "price_sma200_ratio",
    # Momentum
    "rsi_14", "macd_hist", "stoch_k",
    # Volatility
    "atr_pct", "vol_21d", "vol_63d",
    # Volume
    "volume_ratio_50d",
    # Trend
    "adx_14", "sma50_sma200_ratio",
]


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Given an OHLCV DataFrame (index = date), compute feature columns for
    every row. Returns a new DataFrame with FEATURE_COLUMNS.

    Rows with insufficient lookback (NaN features) are dropped.
    """
    if df.empty or len(df) < 260:
        logger.warning("Need ≥260 rows for full feature engineering, got %d", len(df))
        return pd.DataFrame(columns=FEATURE_COLUMNS)

    out = pd.DataFrame(index=df.index)
    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"]

    # ── Returns ──────────────────────────────────────────────────────
    for n, col in [(5, "ret_5d"), (10, "ret_10d"), (21, "ret_21d"),
                   (63, "ret_63d"), (126, "ret_126d"), (252, "ret_252d")]:
        out[col] = close.pct_change(n)

    # ── Moving average ratios ────────────────────────────────────────
    for n, col in [(20, "price_sma20_ratio"), (50, "price_sma50_ratio"),
                   (100, "price_sma100_ratio"), (200, "price_sma200_ratio")]:
        sma = ta.sma(close, length=n)
        out[col] = (close / sma) - 1.0 if sma is not None else np.nan

    # ── Momentum ─────────────────────────────────────────────────────
    rsi = ta.rsi(close, length=14)
    out["rsi_14"] = rsi / 100.0 if rsi is not None else np.nan  # normalise to 0–1

    macd_df = ta.macd(close)
    if macd_df is not None and not macd_df.empty:
        hist_cols = [c for c in macd_df.columns if "MACDh" in c]
        if hist_cols:
            out["macd_hist"] = macd_df[hist_cols[0]] / close  # normalise by price
        else:
            out["macd_hist"] = np.nan
    else:
        out["macd_hist"] = np.nan

    stoch = ta.stoch(high, low, close)
    if stoch is not None and not stoch.empty:
        k_cols = [c for c in stoch.columns if "STOCHk" in c]
        out["stoch_k"] = stoch[k_cols[0]] / 100.0 if k_cols else np.nan
    else:
        out["stoch_k"] = np.nan

    # ── Volatility ───────────────────────────────────────────────────
    atr = ta.atr(high, low, close, length=14)
    out["atr_pct"] = (atr / close) if atr is not None else np.nan

    out["vol_21d"] = close.pct_change().rolling(21).std()
    out["vol_63d"] = close.pct_change().rolling(63).std()

    # ── Volume ───────────────────────────────────────────────────────
    vol_sma50 = volume.rolling(50).mean()
    out["volume_ratio_50d"] = volume / vol_sma50

    # ── Trend ────────────────────────────────────────────────────────
    adx_df = ta.adx(high, low, close, length=14)
    if adx_df is not None and not adx_df.empty:
        adx_cols = [c for c in adx_df.columns if "ADX" in c and "DM" not in c]
        out["adx_14"] = adx_df[adx_cols[0]] / 100.0 if adx_cols else np.nan
    else:
        out["adx_14"] = np.nan

    sma50 = ta.sma(close, length=50)
    sma200 = ta.sma(close, length=200)
    if sma50 is not None and sma200 is not None:
        out["sma50_sma200_ratio"] = (sma50 / sma200) - 1.0
    else:
        out["sma50_sma200_ratio"] = np.nan

    # ── Drop rows with NaN (insufficient lookback) ───────────────────
    out = out[FEATURE_COLUMNS].dropna()

    return out


def compute_labels(
    df: pd.DataFrame,
    forward_days: int = 126,
    buy_threshold: float = 0.10,
    sell_threshold: float = -0.05,
) -> pd.DataFrame:
    """
    Compute classification labels based on forward returns.

      - 2 = BUY   (forward return > buy_threshold)
      - 1 = HOLD  (between sell and buy threshold)
      - 0 = SELL  (forward return < sell_threshold)

    Returns a DataFrame aligned to df.index with:
      - label
      - forward_return
    """
    close = df["Close"]
    fwd_ret = close.shift(-forward_days) / close - 1.0

    labels = pd.Series(1, index=df.index, name="label")  # default HOLD
    labels[fwd_ret > buy_threshold] = 2   # BUY
    labels[fwd_ret < sell_threshold] = 0  # SELL

    # Drop rows where we can't compute forward return
    labels[fwd_ret.isna()] = np.nan

    return pd.DataFrame(
        {
            "label": labels,
            "forward_return": fwd_ret,
        },
        index=df.index,
    )
