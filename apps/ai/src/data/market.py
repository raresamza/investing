"""Market data fetcher — wraps yfinance for price history and fundamentals."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any
from io import StringIO
import time
from threading import Lock

import pandas as pd
import requests
import yfinance as yf

logger = logging.getLogger(__name__)


_INFO_API_BLOCKED = False
_INFO_API_BLOCKED_LOCK = Lock()


def _is_blocked_info_error(exc: Exception) -> bool:
    text = str(exc).lower()
    markers = (
        "invalid crumb",
        "unable to access this feature",
        "finance-api-feedback",
        "unauthorized",
    )
    return any(m in text for m in markers)


def _mark_info_api_blocked(ticker: str, exc: Exception) -> None:
    global _INFO_API_BLOCKED
    with _INFO_API_BLOCKED_LOCK:
        if not _INFO_API_BLOCKED:
            _INFO_API_BLOCKED = True
            logger.warning(
                "Yahoo quote-info endpoint blocked (first seen on %s): %s. "
                "Falling back to history/fast_info-only mode.",
                ticker,
                exc,
            )


def _coerce_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        f = float(value)
        return f if f == f else None
    except (TypeError, ValueError):
        return None


# ─── Ticker info cache ──────────────────────────────────────────────
@lru_cache(maxsize=256)
def _get_ticker(symbol: str) -> yf.Ticker:
    return yf.Ticker(symbol)


def get_info(ticker: str) -> dict[str, Any]:
    """Return the full info dict for a ticker (cached by yfinance)."""
    if _INFO_API_BLOCKED:
        t = _get_ticker(ticker)
        fast = getattr(t, "fast_info", None)
        if fast is None:
            return {}

        return {
            "currentPrice": _coerce_float(fast.get("lastPrice")),
            "regularMarketPrice": _coerce_float(fast.get("lastPrice")),
            "marketCap": _coerce_float(fast.get("marketCap")),
            "currency": fast.get("currency"),
            "exchange": fast.get("exchange"),
            "quoteType": fast.get("quoteType"),
        }

    for attempt in range(1, 4):
        try:
            info = _get_ticker(ticker).info
            return info if isinstance(info, dict) else {}
        except Exception as exc:
            if _is_blocked_info_error(exc):
                _mark_info_api_blocked(ticker, exc)
                return get_info(ticker)
            if attempt == 3:
                logger.warning("Failed to fetch info for %s: %s", ticker, exc)
                return {}
            time.sleep(0.4 * attempt)
    return {}


def get_history(
    ticker: str,
    period: str = "2y",
    interval: str = "1d",
) -> pd.DataFrame:
    """Fetch OHLCV history as a DataFrame."""
    for attempt in range(1, 4):
        try:
            df = _get_ticker(ticker).history(period=period, interval=interval)
            if df.empty and attempt == 3:
                logger.warning("No history data for %s", ticker)
            if not df.empty or attempt == 3:
                return df
        except Exception as exc:
            if attempt == 3:
                logger.warning("Failed to fetch history for %s: %s", ticker, exc)
                return pd.DataFrame()
        time.sleep(0.4 * attempt)
    return pd.DataFrame()


def get_financials(ticker: str) -> dict[str, pd.DataFrame]:
    """Fetch income statement, balance sheet, and cash flow."""
    t = _get_ticker(ticker)
    return {
        "income": getattr(t, "income_stmt", pd.DataFrame()),
        "balance": getattr(t, "balance_sheet", pd.DataFrame()),
        "cashflow": getattr(t, "cashflow", pd.DataFrame()),
    }


# ─── Universe lists ─────────────────────────────────────────────────
_SP500_URL = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
_NASDAQ100_URL = "https://en.wikipedia.org/wiki/Nasdaq-100#Components"
_RUSSELL1000_URL = "https://en.wikipedia.org/wiki/Russell_1000_Index"
_SP500_CSV_FALLBACK = "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv"
_RUSSELL1000_CSV_FALLBACK = (
    "https://www.ishares.com/us/products/239707/ishares-russell-1000-etf/1467271812596.ajax"
    "?fileType=csv&fileName=IWB_holdings&dataType=fund"
)


_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
    )
}


def _fetch_html_tables(url: str) -> list[pd.DataFrame]:
    resp = requests.get(url, headers=_HEADERS, timeout=20)
    resp.raise_for_status()
    return pd.read_html(StringIO(resp.text))


def _read_csv_with_headers(url: str, **kwargs: Any) -> pd.DataFrame:
    resp = requests.get(url, headers=_HEADERS, timeout=20)
    resp.raise_for_status()
    return pd.read_csv(StringIO(resp.text), **kwargs)


def _normalize_symbols(symbols: list[str]) -> list[str]:
    cleaned = []
    for s in symbols:
        t = str(s).strip().upper().replace(".", "-")
        if not t:
            continue
        if any(ch.isalpha() for ch in t):
            cleaned.append(t)
    return sorted(set(cleaned))


@lru_cache(maxsize=4)
def get_universe(name: str = "sp500") -> list[str]:
    """Return a list of tickers for the given universe."""
    try:
        if name == "sp500":
            try:
                tables = _fetch_html_tables(_SP500_URL)
                if "Symbol" in tables[0].columns:
                    return _normalize_symbols(tables[0]["Symbol"].tolist())
            except Exception as exc:
                logger.warning("SP500 HTML source failed: %s", exc)

            df = _read_csv_with_headers(_SP500_CSV_FALLBACK)
            symbol_col = "Symbol" if "Symbol" in df.columns else "symbol"
            return _normalize_symbols(df[symbol_col].tolist())
        elif name == "nasdaq100":
            tables = _fetch_html_tables(_NASDAQ100_URL)
            for table in tables:
                for col in table.columns:
                    c = str(col).lower()
                    if "ticker" in c or "symbol" in c:
                        return _normalize_symbols(table[col].tolist())
            raise ValueError("Could not locate ticker column for nasdaq100")
        elif name == "russell1000":
            try:
                tables = _fetch_html_tables(_RUSSELL1000_URL)
                for table in tables:
                    for col in table.columns:
                        c = str(col).lower()
                        if "ticker" in c or "symbol" in c:
                            return _normalize_symbols(table[col].tolist())
            except Exception as exc:
                logger.warning("Russell1000 HTML source failed: %s", exc)

            df = _read_csv_with_headers(_RUSSELL1000_CSV_FALLBACK, skiprows=9)
            ticker_col = "Ticker" if "Ticker" in df.columns else "ticker"
            return _normalize_symbols(df[ticker_col].tolist())
    except Exception as exc:
        logger.warning("Failed to fetch universe %s: %s", name, exc)

    # Fallback — a small set of blue-chip tickers
    return [
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
        "JPM", "V", "JNJ", "UNH", "XOM", "PG", "MA", "HD", "COST", "ABBV",
        "KO", "PEP", "MRK", "LLY", "AVGO", "TMO", "ORCL", "CSCO", "ACN",
        "MCD", "WMT", "ABT", "DHR", "TXN", "NEE", "PM", "UNP", "QCOM",
    ]
