"""
Rich CLI — beautiful terminal interface for the stock analyst.

Usage:
    python -m src.cli portfolio AAPL:50@142.50 MSFT:30@350
    python -m src.cli portfolio AAPL:50@142.50 --strategy ml
    python -m src.cli discover --universe sp500 --top 10
    python -m src.cli analyze AAPL
    python -m src.cli train --universe sp500 --period 5y
    python -m src.cli train --universe sp500 --max-tickers 50  (quick test)
    python -m src.cli server
"""

from __future__ import annotations

import sys
import time
import logging

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich import box

from src.analysis.composite import score_stock
from src.engine.scanner import discover_candidates, scan_portfolio, _score_one
from src.models.schemas import HoldingInput, StockScore
from src.utils.formatting import fmt_currency, fmt_pct, fmt_score

console = Console()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)


# ─── Arg parsing helpers ─────────────────────────────────────────────
def _extract_flag(args: list[str], flag: str, default: str | None = None) -> tuple[str | None, list[str]]:
    """Extract --flag value from args list, return (value, remaining_args)."""
    remaining = []
    value = default
    i = 0
    while i < len(args):
        if args[i] == flag and i + 1 < len(args):
            value = args[i + 1]
            i += 2
        else:
            remaining.append(args[i])
            i += 1
    return value, remaining


def _extract_bool_flag(args: list[str], flag: str) -> tuple[bool, list[str]]:
    """Extract boolean --flag from args."""
    if flag in args:
        return True, [a for a in args if a != flag]
    return False, args


# ─── Display helpers ─────────────────────────────────────────────────
def _action_style(action: str) -> str:
    return {
        "BUY": "bold green",
        "SELL": "bold red",
        "HOLD": "bold blue",
        "REBUY": "bold yellow",
        "WATCH": "dim",
    }.get(action, "")


def _render_stock_table(stocks: list[StockScore], title: str) -> Table:
    table = Table(
        title=title,
        box=box.ROUNDED,
        show_lines=True,
        title_style="bold white",
        border_style="bright_black",
        padding=(0, 1),
    )
    table.add_column("Ticker", style="bold white", width=8)
    table.add_column("Name", style="dim", max_width=24)
    table.add_column("Price", justify="right", style="cyan")
    table.add_column("Fund.", justify="right")
    table.add_column("Tech.", justify="right")
    table.add_column("Qual.", justify="right")
    table.add_column("Score", justify="right", style="bold")
    table.add_column("Action", justify="center")
    table.add_column("Rationale", max_width=44, style="dim")

    for s in stocks:
        action_text = Text(f"{s.action.emoji} {s.action.value}", style=_action_style(s.action.value))

        def _pillar_color(v: float) -> str:
            if v >= 70: return "green"
            if v >= 50: return "yellow"
            return "red"

        fund_text = Text(fmt_score(s.fundamental.score), style=_pillar_color(s.fundamental.score)) if s.fundamental.score > 0 else Text("—", style="dim")
        tech_text = Text(fmt_score(s.technical.score), style=_pillar_color(s.technical.score)) if s.technical.score > 0 else Text("—", style="dim")
        qual_text = Text(fmt_score(s.quality.score), style=_pillar_color(s.quality.score)) if s.quality.score > 0 else Text("—", style="dim")

        table.add_row(
            s.ticker,
            s.name[:24],
            fmt_currency(s.current_price),
            fund_text,
            tech_text,
            qual_text,
            Text(fmt_score(s.composite_score), style="bold " + _pillar_color(s.composite_score)),
            action_text,
            s.rationale[:44],
        )

    return table


def _parse_holding(raw: str) -> HoldingInput:
    """Parse 'AAPL:50@142.50' or 'AAPL:50@142.50:sold' → HoldingInput."""
    try:
        parts = raw.split(":")
        ticker = parts[0].strip().upper()
        shares_cost = parts[1]
        shares_str, cost_str = shares_cost.split("@")
        previously_sold = len(parts) > 2 and parts[2].strip().lower() == "sold"
        return HoldingInput(
            ticker=ticker,
            shares=float(shares_str),
            avg_cost=float(cost_str),
            previously_sold=previously_sold,
        )
    except Exception:
        console.print(f"[red]Invalid holding format:[/red] {raw}")
        console.print("Expected: TICKER:SHARES@AVG_COST  (e.g. AAPL:50@142.50)")
        console.print("For previously sold: AAPL:50@142.50:sold")
        sys.exit(1)


# ─── Commands ────────────────────────────────────────────────────────
def cmd_portfolio(args: list[str]):
    """Analyse portfolio holdings."""
    strategy, args = _extract_flag(args, "--strategy")
    if not args:
        console.print("[red]Provide holdings:[/red] AAPL:50@142.50 MSFT:30@350")
        sys.exit(1)

    holdings = [_parse_holding(a) for a in args]
    strat_label = strategy or "rules"
    console.print(Panel(
        f"🔍 Analysing {len(holdings)} holdings  [dim](strategy: {strat_label})[/dim]",
        style="blue", expand=False,
    ))

    result = scan_portfolio(holdings, strategy=strategy)

    table = _render_stock_table(result.holdings, "📊 Portfolio Analysis")
    console.print(table)
    console.print()
    console.print(Panel(
        f"[bold]Portfolio Score:[/bold] {fmt_score(result.portfolio_score)}\n{result.summary}",
        title="Summary",
        border_style="bright_blue",
        expand=False,
    ))


def cmd_discover(args: list[str]):
    """Discover top BUY candidates."""
    universe, args = _extract_flag(args, "--universe", "sp500")
    top_str, args = _extract_flag(args, "--top", "10")
    strategy, args = _extract_flag(args, "--strategy")
    top_n = int(top_str) if top_str else 10

    strat_label = strategy or "rules"
    console.print(Panel(
        f"🔭 Scanning {universe} for top {top_n} candidates  "
        f"[dim](strategy: {strat_label})[/dim]",
        style="green", expand=False,
    ))

    result = discover_candidates(universe=universe, top_n=top_n, strategy=strategy)

    table = _render_stock_table(result.candidates, f"🏆 Top {top_n} ({universe})")
    console.print(table)
    console.print()
    console.print(Panel(
        f"Scanned {result.universe_scanned} tickers. {result.summary}",
        title="Discovery",
        border_style="bright_green",
        expand=False,
    ))


def cmd_analyze(args: list[str]):
    """Deep-dive analysis on a single ticker."""
    strategy, args = _extract_flag(args, "--strategy")
    if not args:
        console.print("[red]Provide a ticker:[/red] python -m src.cli analyze AAPL")
        sys.exit(1)

    ticker = args[0].upper()
    strat_label = strategy or "rules"
    console.print(Panel(
        f"🔬 Deep analysis: {ticker}  [dim](strategy: {strat_label})[/dim]",
        style="cyan", expand=False,
    ))

    s = _score_one(ticker, is_held=False, strategy=strategy)

    # Detail panel
    detail = Table(box=box.SIMPLE, show_header=False, border_style="bright_black")
    detail.add_column("Key", style="bold")
    detail.add_column("Value")

    detail.add_row("Name", s.name)
    detail.add_row("Sector", s.sector)
    detail.add_row("Price", fmt_currency(s.current_price))
    detail.add_row("Market Cap", fmt_currency(s.market_cap))
    detail.add_row("", "")

    if s.fundamental.score > 0:
        detail.add_row("── Fundamentals ──", fmt_score(s.fundamental.score))
        detail.add_row("  P/E", f"{s.fundamental.pe_ratio:.1f}" if s.fundamental.pe_ratio else "—")
        detail.add_row("  PEG", f"{s.fundamental.peg_ratio:.2f}" if s.fundamental.peg_ratio else "—")
        detail.add_row("  ROE", fmt_pct(s.fundamental.roe * 100 if s.fundamental.roe else None))
        detail.add_row("  D/E", f"{s.fundamental.debt_to_equity:.1f}" if s.fundamental.debt_to_equity else "—")
        detail.add_row("  Rev Growth", fmt_pct(s.fundamental.revenue_growth * 100 if s.fundamental.revenue_growth else None))
        detail.add_row("  FCF Yield", fmt_pct(s.fundamental.fcf_yield * 100 if s.fundamental.fcf_yield else None))
        detail.add_row("", "")

    if s.technical.score > 0:
        detail.add_row("── Technicals ──", fmt_score(s.technical.score))
        detail.add_row("  RSI-14", f"{s.technical.rsi_14:.1f}" if s.technical.rsi_14 else "—")
        detail.add_row("  MACD", s.technical.macd_signal or "—")
        detail.add_row("  SMA-50 vs Price", fmt_pct(s.technical.sma_50_vs_price))
        detail.add_row("  SMA-200 vs Price", fmt_pct(s.technical.sma_200_vs_price))
        detail.add_row("  Trend", s.technical.trend.value)
        detail.add_row("", "")

    if s.quality.score > 0:
        detail.add_row("── Quality ──", fmt_score(s.quality.score))
        detail.add_row("  Div Yield", fmt_pct(s.quality.dividend_yield * 100 if s.quality.dividend_yield else None))
        detail.add_row("  Inst. Ownership", fmt_pct(s.quality.institutional_pct * 100 if s.quality.institutional_pct else None))
        detail.add_row("  Beta", f"{s.quality.beta:.2f}" if s.quality.beta else "—")

    console.print(Panel(detail, title=f"{s.action.emoji}  {ticker} — {s.action.value}", border_style="cyan"))
    console.print()

    action_text = Text(f"{s.action.emoji} {s.action.value} ({s.conviction.value})", style=_action_style(s.action.value))
    console.print(f"  Composite Score: [bold]{fmt_score(s.composite_score)}[/bold]")
    console.print(f"  Recommendation:  ", end="")
    console.print(action_text)
    console.print(f"  Rationale:       {s.rationale}")


def cmd_train(args: list[str]):
    """Train the XGBoost ML model."""
    universe, args = _extract_flag(args, "--universe", "sp500")
    period, args = _extract_flag(args, "--period", "5y")
    max_str, args = _extract_flag(args, "--max-tickers")
    fwd_str, args = _extract_flag(args, "--forward-days", "126")
    buy_str, args = _extract_flag(args, "--buy-threshold", "0.10")
    sell_str, args = _extract_flag(args, "--sell-threshold", "-0.05")
    use_gpu, args = _extract_bool_flag(args, "--gpu")
    no_cache, args = _extract_bool_flag(args, "--no-cache")

    max_tickers = int(max_str) if max_str else None
    forward_days = int(fwd_str) if fwd_str else 126
    buy_threshold = float(buy_str) if buy_str else 0.10
    sell_threshold = float(sell_str) if sell_str else -0.05

    console.print(Panel(
        f"🏋️  Training XGBoost model\n"
        f"    Universe:     {universe}\n"
        f"    Period:       {period}\n"
        f"    Forward days: {forward_days}\n"
        f"    Max tickers:  {max_tickers or 'all'}\n"
        f"    Buy thresh:   {buy_threshold:.2%}\n"
        f"    Sell thresh:  {sell_threshold:.2%}\n"
        f"    Device:       {'gpu (cuda)' if use_gpu else 'cpu'}",
        style="magenta",
        expand=False,
    ))

    start = time.time()

    from src.training.trainer import train
    model, metrics = train(
        universe=universe,
        period=period,
        forward_days=forward_days,
        buy_threshold=buy_threshold,
        sell_threshold=sell_threshold,
        max_tickers=max_tickers,
        use_gpu=use_gpu,
        cache=not no_cache,
    )

    elapsed = time.time() - start

    # Results
    results_table = Table(
        title="📈 Training Results",
        box=box.ROUNDED,
        border_style="bright_magenta",
    )
    results_table.add_column("Metric", style="bold")
    results_table.add_column("Value")

    results_table.add_row("Samples", f"{metrics['n_samples']:,}")
    results_table.add_row("Features", str(metrics['n_features']))
    results_table.add_row("Device", metrics.get('device', 'cpu'))
    results_table.add_row("CV Accuracy", f"{metrics['cv_accuracy_mean']:.3f} ± {metrics['cv_accuracy_std']:.3f}")
    results_table.add_row("CV Balanced Acc", f"{metrics['cv_balanced_accuracy_mean']:.3f}")
    results_table.add_row("CV Macro F1", f"{metrics['cv_f1_macro_mean']:.3f}")
    results_table.add_row("CV BUY Precision", f"{metrics['cv_buy_precision_mean']:.3f}")
    results_table.add_row("OOS Accuracy", f"{metrics['oos_accuracy']:.3f}")
    results_table.add_row("OOS Balanced Acc", f"{metrics['oos_balanced_accuracy']:.3f}")
    results_table.add_row("OOS Macro F1", f"{metrics['oos_f1_macro']:.3f}")
    results_table.add_row("OOS BUY Precision", f"{metrics['oos_buy_precision']:.3f}")
    results_table.add_row(
        "OOS BUY fwd return",
        f"{metrics['oos_mean_forward_return_predicted_buy'] * 100:.2f}%",
    )
    results_table.add_row(
        "OOS market fwd return",
        f"{metrics['oos_mean_forward_return_all_samples'] * 100:.2f}%",
    )
    results_table.add_row("Time", f"{elapsed:.1f}s")
    results_table.add_row("", "")
    results_table.add_row("Class Distribution", "")
    for cls, count in metrics["class_distribution"].items():
        results_table.add_row(f"  {cls}", f"{count:,}")
    results_table.add_row("", "")
    results_table.add_row("Top Features", "")
    for feat, imp in metrics["feature_importance"].items():
        bar = "█" * int(imp * 100)
        results_table.add_row(f"  {feat}", f"{imp:.3f} {bar}")

    console.print(results_table)
    console.print()
    console.print(Panel(
        "✅ Model saved. Use [cyan]--strategy ml[/cyan] or [cyan]--strategy ensemble[/cyan] to use it.\n"
        "Example: [dim]python -m src.cli analyze AAPL --strategy ml[/dim]",
        border_style="bright_green",
        expand=False,
    ))


def cmd_optimize(args: list[str]):
    """Run Optuna hyperparameter optimization."""
    universe, args = _extract_flag(args, "--universe", "sp500")
    trials, args = _extract_flag(args, "--trials", "20")
    max_str, args = _extract_flag(args, "--max-tickers")
    use_gpu, args = _extract_bool_flag(args, "--gpu")
    
    n_trials = int(trials) if trials else 20
    max_tickers = int(max_str) if max_str else None
    
    console.print(Panel(
        f"⚙️ Running Optuna Optimization ({n_trials} trials)\n"
        f"    Device: {'gpu (cuda)' if use_gpu else 'cpu'}",
        style="yellow",
        expand=False,
    ))
    
    from src.training.optimize import optimize_hyperparameters
    try:
        best_params = optimize_hyperparameters(
            n_trials=n_trials,
            universe=universe,
            max_tickers=max_tickers,
            use_gpu=use_gpu,
        )
        console.print(Panel(str(best_params), title="🏆 Best XGBoost Params", border_style="bright_yellow"))
    except Exception as e:
        console.print(f"[red]Error during optimization:[/red] {e}")


def cmd_backtest(args: list[str]):
    """Evaluate trained model quality against baseline using historical data."""
    universe, args = _extract_flag(args, "--universe", "sp500")
    period, args = _extract_flag(args, "--period", "5y")
    fwd_str, args = _extract_flag(args, "--forward-days", "126")
    max_str, args = _extract_flag(args, "--max-tickers")

    forward_days = int(fwd_str) if fwd_str else 126
    max_tickers = int(max_str) if max_str else None

    console.print(Panel(
        f"🧪 Running ML backtest\n"
        f"    Universe:     {universe}\n"
        f"    Period:       {period}\n"
        f"    Forward days: {forward_days}\n"
        f"    Max tickers:  {max_tickers or 'all'}",
        style="blue",
        expand=False,
    ))

    from src.training.backtest import run_backtest

    try:
        metrics = run_backtest(
            universe=universe,
            period=period,
            forward_days=forward_days,
            max_tickers=max_tickers,
        )

        table = Table(
            title="📊 Backtest Results",
            box=box.ROUNDED,
            border_style="bright_blue",
        )
        table.add_column("Metric", style="bold")
        table.add_column("Value")

        table.add_row("Samples", f"{metrics['total_samples_analyzed']:,}")
        table.add_row("BUY Signals", f"{metrics['total_buy_signals']:,}")
        table.add_row("Model BUY Win Rate", f"{metrics['model_buy_win_rate'] * 100:.2f}%")
        table.add_row("Baseline Win Rate", f"{metrics['baseline_market_win_rate'] * 100:.2f}%")
        table.add_row("Statistical Edge", f"{metrics['statistical_edge'] * 100:+.2f}%")
        table.add_row(
            "Model BUY Fwd Return",
            f"{metrics['model_mean_forward_return_on_buy'] * 100:+.2f}%",
        )
        table.add_row(
            "Market Mean Fwd Return",
            f"{metrics['market_mean_forward_return'] * 100:+.2f}%",
        )
        table.add_row("Return Edge", f"{metrics['return_edge'] * 100:+.2f}%")

        console.print(table)
        console.print(
            Panel(metrics["conclusion"], title="Conclusion", border_style="bright_green", expand=False)
        )
    except Exception as exc:
        console.print(f"[red]Error during backtest:[/red] {exc}")


# ─── Main ────────────────────────────────────────────────────────────
def main():
    args = sys.argv[1:]
    if not args:
        console.print(Panel(
            "[bold]Stock Analyst AI[/bold]\n\n"
            "[bold cyan]Analysis commands:[/bold cyan]\n"
            "  [cyan]portfolio[/cyan]  AAPL:50@142.50 MSFT:30@350 [dim][--strategy rules|ml|ensemble][/dim]\n"
            "  [cyan]discover[/cyan]   --universe sp500 --top 10 [dim][--strategy rules|ml|ensemble][/dim]\n"
            "  [cyan]analyze[/cyan]    AAPL [dim][--strategy rules|ml|ensemble][/dim]\n\n"
            "[bold magenta]Training commands:[/bold magenta]\n"
            "  [magenta]train[/magenta]        --universe sp500 --period 5y [dim][--gpu][/dim]\n"
            "  [magenta]optimize[/magenta]     --trials 20 [dim][--gpu][/dim]\n"
            "  [magenta]backtest[/magenta]     --universe sp500\n\n"
            "[bold green]Server:[/bold green]\n"
            "  [green]server[/green]       Start the FastAPI server",
            title="Usage",
            border_style="bright_blue",
            expand=False,
        ))
        sys.exit(0)

    command = args[0].lower()
    rest = args[1:]

    if command == "portfolio":
        cmd_portfolio(rest)
    elif command == "discover":
        cmd_discover(rest)
    elif command == "analyze":
        cmd_analyze(rest)
    elif command == "train":
        cmd_train(rest)
    elif command == "optimize":
        cmd_optimize(rest)
    elif command == "backtest":
        cmd_backtest(rest)
    elif command == "server":
        import uvicorn
        from src.config import settings
        console.print(Panel(
            f"🚀 Starting API server on {settings.host}:{settings.port}\n"
            f"   Strategy: {settings.strategy}",
            style="green", expand=False,
        ))
        uvicorn.run("src.main:app", host=settings.host, port=settings.port, reload=True)
    else:
        console.print(f"[red]Unknown command:[/red] {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
