"""Number and currency formatting helpers."""

from __future__ import annotations


def fmt_currency(value: float | None) -> str:
    if value is None:
        return "—"
    if abs(value) >= 1_000_000_000:
        return f"${value / 1_000_000_000:.1f}B"
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    if abs(value) >= 1_000:
        return f"${value / 1_000:.1f}K"
    return f"${value:,.2f}"


def fmt_pct(value: float | None, decimals: int = 1) -> str:
    if value is None:
        return "—"
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.{decimals}f}%"


def fmt_score(value: float) -> str:
    return f"{value:.0f}/100"
