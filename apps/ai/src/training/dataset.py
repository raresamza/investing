"""
Dataset builder.

Downloads historical OHLCV for a universe of stocks, computes features and
labels, and returns a single merged DataFrame ready for XGBoost training.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pandas as pd

from src.data.market import get_universe
from src.training.features import FEATURE_COLUMNS, compute_features, compute_labels

logger = logging.getLogger(__name__)

_MAX_WORKERS = 8
_CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "data_cache"


def _fetch_one(
    ticker: str,
    period: str,
    forward_days: int,
    buy_threshold: float,
    sell_threshold: float,
) -> pd.DataFrame | None:
    """Fetch, engineer features, and label a single ticker."""
    import yfinance as yf

    try:
        df = yf.Ticker(ticker).history(period=period, interval="1d")
        if df.empty or len(df) < 300:
            return None

        features = compute_features(df)
        labels = compute_labels(
            df,
            forward_days=forward_days,
            buy_threshold=buy_threshold,
            sell_threshold=sell_threshold,
        )

        # Align features and labels by index
        merged = features.join(labels, how="inner").dropna()
        merged["ticker"] = ticker
        merged["date"] = merged.index

        return merged

    except Exception as exc:
        logger.warning("Skipping %s during dataset build: %s", ticker, exc)
        return None


def build_dataset(
    universe: str = "sp500",
    period: str = "5y",
    forward_days: int = 126,
    buy_threshold: float = 0.10,
    sell_threshold: float = -0.05,
    max_tickers: int | None = None,
    cache: bool = True,
) -> pd.DataFrame:
    """
    Build a training dataset from scratch or load from cache.

    Parameters
    ----------
    universe : str
        Universe name (sp500, nasdaq100, or custom tickers).
    period : str
        yfinance period string (e.g. "5y", "10y").
    forward_days : int
        Number of days to look ahead for return labels.
    buy_threshold : float
        Forward return above this → BUY label.
    sell_threshold : float
        Forward return below this → SELL label.
    max_tickers : int | None
        Cap the number of tickers (useful for testing).
    cache : bool
        If True, cache to disk and reload next time.

    Returns
    -------
    pd.DataFrame
        Columns: [FEATURE_COLUMNS..., "label", "forward_return", "ticker", "date"]
    """
    cache_name = f"dataset_{universe}_{period}_{forward_days}d.parquet"
    cache_path = _CACHE_DIR / cache_name

    if cache and cache_path.exists():
        logger.info("Loading cached dataset from %s", cache_path)
        return pd.read_parquet(cache_path)

    tickers = get_universe(universe)
    if max_tickers:
        tickers = tickers[:max_tickers]

    logger.info(
        "Building dataset: %d tickers, period=%s, forward=%dd",
        len(tickers), period, forward_days,
    )

    frames: list[pd.DataFrame] = []

    with ThreadPoolExecutor(max_workers=_MAX_WORKERS) as pool:
        futures = {
            pool.submit(
                _fetch_one, t, period, forward_days, buy_threshold, sell_threshold
            ): t
            for t in tickers
        }
        done = 0
        for future in as_completed(futures):
            done += 1
            ticker = futures[future]
            try:
                result = future.result()
                if result is not None and len(result) > 0:
                    frames.append(result)
                    if done % 50 == 0:
                        logger.info(
                            "Progress: %d/%d tickers processed (%d with data)",
                            done, len(tickers), len(frames),
                        )
            except Exception as exc:
                logger.warning("Error processing %s: %s", ticker, exc)

    if not frames:
        logger.error("No data collected — dataset is empty")
        return pd.DataFrame(columns=FEATURE_COLUMNS + ["label", "forward_return", "ticker", "date"])

    dataset = pd.concat(frames, ignore_index=True)
    if "date" in dataset.columns:
        dataset = dataset.sort_values(["date", "ticker"]).reset_index(drop=True)

    # ── Class balance report ──────────────────────────────────────────
    counts = dataset["label"].value_counts().sort_index()
    logger.info(
        "Dataset built: %d samples | SELL=%d HOLD=%d BUY=%d",
        len(dataset),
        counts.get(0, 0),
        counts.get(1, 0),
        counts.get(2, 0),
    )

    if cache:
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        dataset.to_parquet(cache_path, index=False)
        logger.info("Cached dataset to %s", cache_path)

    return dataset
