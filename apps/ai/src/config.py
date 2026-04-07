"""Pydantic-based settings — reads from .env or environment variables."""

from __future__ import annotations

from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── FRED ────────────────────────────────────────────────────────
    fred_api_key: str = ""

    # ── FastAPI ─────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    # ── Strategy selector ───────────────────────────────────────────
    # "rules"    → rule-based composite scoring (default)
    # "ml"       → trained XGBoost model
    # "ensemble" → average of both
    strategy: Literal["rules", "ml", "ensemble"] = "rules"

    # ── Analysis tunables (rule-based) ──────────────────────────────
    fundamental_weight: float = 0.40
    technical_weight: float = 0.30
    quality_weight: float = 0.20
    macro_weight: float = 0.10

    # Score thresholds
    buy_threshold: float = 80.0
    hold_strong_threshold: float = 60.0
    hold_weak_threshold: float = 40.0
    sell_threshold: float = 20.0
    rebuy_threshold: float = 70.0

    # Long-term entry policy
    # Lower than buy_threshold to allow quality/fundamental names to become BUY
    # while still enforcing a minimum quality bar.
    long_term_buy_threshold: float = 68.0
    long_term_fundamental_floor: float = 52.0
    long_term_quality_floor: float = 52.0

    # Discovery universe
    discovery_universe: str = "sp500"
    discovery_buy_percentile: float = 0.90

    # ── Training tunables ───────────────────────────────────────────
    train_universe: str = "sp500"
    train_period: str = "5y"
    train_forward_days: int = 126
    train_buy_threshold: float = 0.10
    train_sell_threshold: float = -0.05


settings = Settings()

