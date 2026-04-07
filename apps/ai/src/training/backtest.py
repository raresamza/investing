"""
Historical backtesting engine.

Simulates how the trained ML model would have performed over time
compared to a simple Buy & Hold baseline.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from typing import Any

from src.training.dataset import build_dataset
from src.training.features import FEATURE_COLUMNS
from src.training.trainer import load_model

logger = logging.getLogger(__name__)


def run_backtest(
    universe: str = "sp500",
    period: str = "5y",
    forward_days: int = 126,
    max_tickers: int | None = None,
) -> dict[str, Any]:
    """
    Simulate trading the ML model over the historical dataset.
    Note: Assumes model is already trained.
    """
    loaded = load_model()
    if not loaded:
        raise ValueError("No trained model found. Run `train` first.")
    model, _ = loaded

    dataset = build_dataset(
        universe=universe,
        period=period,
        forward_days=forward_days,
        max_tickers=max_tickers,
    )

    if dataset.empty:
        raise ValueError("No testing data available")

    # We need the actual future return to calculate performance
    # label=2 (BUY) means we buy here and hold for `forward_days`
    # Let's approximate: we just track the average forward return of our "BUY" predictions
    
    X = dataset[FEATURE_COLUMNS].values
    y_true = dataset["label"].values.astype(int)
    forward_returns = dataset["forward_return"].values.astype(float)
    
    y_pred = model.predict(X)
    
    total_samples = len(y_true)
    total_buys = np.sum(y_pred == 2)
    successful_buys = np.sum((y_pred == 2) & (y_true == 2))
    
    precision_buy = successful_buys / total_buys if total_buys > 0 else 0.0
    
    baseline_buys = np.sum(y_true == 2)
    baseline_win_rate = baseline_buys / total_samples if total_samples > 0 else 0.0

    predicted_buy_returns = forward_returns[y_pred == 2]
    market_returns = forward_returns

    mean_buy_return = float(np.mean(predicted_buy_returns)) if len(predicted_buy_returns) > 0 else 0.0
    mean_market_return = float(np.mean(market_returns)) if len(market_returns) > 0 else 0.0

    edge = precision_buy - baseline_win_rate
    return_edge = mean_buy_return - mean_market_return

    results = {
        "total_samples_analyzed": int(total_samples),
        "total_buy_signals": int(total_buys),
        "baseline_market_win_rate": float(baseline_win_rate),
        "model_buy_win_rate": float(precision_buy),
        "model_mean_forward_return_on_buy": float(mean_buy_return),
        "market_mean_forward_return": float(mean_market_return),
        "statistical_edge": float(edge),
        "return_edge": float(return_edge),
        "conclusion": (
            "Model shows positive edge versus baseline"
            if edge > 0.05 or return_edge > 0.01
            else "Model edge is marginal or negative vs buy-and-hold"
        )
    }
    
    return results
