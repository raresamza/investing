import { subDays, subMonths, subYears, format, eachDayOfInterval, startOfDay } from "date-fns"

// ── Types ──────────────────────────────────────────────────────────
export interface PortfolioDataPoint {
    date: string     // "2025-06-15"
    label: string    // "Jun 15"
    value: number    // portfolio value in $
    pnl: number      // cumulative P/L in $
    pnlPct: number   // cumulative P/L %
}

export interface Investment {
    id: string
    name: string
    ticker: string
    color: string
    currentValue: number
    totalInvested: number
    pnl: number
    pnlPct: number
    shares: number
    avgCost: number
}

export type TimeRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "MAX"

// ── Seed-able pseudo-random (deterministic) ───────────────────────
function seededRandom(seed: number) {
    let s = seed
    return () => {
        s = (s * 16807) % 2147483647
        return (s - 1) / 2147483646
    }
}

// ── Generate smooth daily series using random walk ────────────────
function generateSeries(
    startDate: Date,
    endDate: Date,
    startValue: number,
    annualReturn: number,
    volatility: number,
    seed: number,
): PortfolioDataPoint[] {
    const rand = seededRandom(seed)
    const days = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) })
    const dailyReturn = annualReturn / 365
    const dailyVol = volatility / Math.sqrt(365)
    const points: PortfolioDataPoint[] = []
    let value = startValue
    const basis = startValue

    for (const day of days) {
        const shock = (rand() - 0.5) * 2 * dailyVol
        value = value * (1 + dailyReturn + shock)
        value = Math.max(value, basis * 0.3) // floor so it doesn't go to zero
        const pnl = value - basis
        const pnlPct = ((value - basis) / basis) * 100
        points.push({
            date: format(day, "yyyy-MM-dd"),
            label: format(day, "MMM dd"),
            value: Math.round(value * 100) / 100,
            pnl: Math.round(pnl * 100) / 100,
            pnlPct: Math.round(pnlPct * 100) / 100,
        })
    }
    return points
}

// ── Investments ────────────────────────────────────────────────────
export const INVESTMENTS: Investment[] = [
    { id: "aapl", name: "Apple Inc.", ticker: "AAPL", color: "#0071e3", currentValue: 18420, totalInvested: 14200, pnl: 4220, pnlPct: 29.72, shares: 82, avgCost: 173.17 },
    { id: "msft", name: "Microsoft Corp.", ticker: "MSFT", color: "#7b68ee", currentValue: 14850, totalInvested: 12600, pnl: 2250, pnlPct: 17.86, shares: 35, avgCost: 360.00 },
    { id: "tsla", name: "Tesla Inc.", ticker: "TSLA", color: "#e31937", currentValue: 9240, totalInvested: 11500, pnl: -2260, pnlPct: -19.65, shares: 32, avgCost: 359.38 },
    { id: "nvda", name: "NVIDIA Corp.", ticker: "NVDA", color: "#76b900", currentValue: 22100, totalInvested: 15000, pnl: 7100, pnlPct: 47.33, shares: 160, avgCost: 93.75 },
    { id: "amzn", name: "Amazon.com Inc.", ticker: "AMZN", color: "#ff9900", currentValue: 11200, totalInvested: 10500, pnl: 700, pnlPct: 6.67, shares: 56, avgCost: 187.50 },
    { id: "googl", name: "Alphabet Inc.", ticker: "GOOGL", color: "#4285f4", currentValue: 8950, totalInvested: 8000, pnl: 950, pnlPct: 11.88, shares: 52, avgCost: 153.85 },
    { id: "btc", name: "Bitcoin", ticker: "BTC", color: "#f7931a", currentValue: 15300, totalInvested: 10000, pnl: 5300, pnlPct: 53.00, shares: 0.18, avgCost: 55555.56 },
]

const TOTAL_INVESTED = INVESTMENTS.reduce((s, i) => s + i.totalInvested, 0)
const TOTAL_CURRENT = INVESTMENTS.reduce((s, i) => s + i.currentValue, 0)

// ── Pre-generate full history (2 years back) ──────────────────────
const NOW = new Date()
const HISTORY_START = subYears(NOW, 2)

const PORTFOLIO_FULL = generateSeries(HISTORY_START, NOW, TOTAL_INVESTED, 0.14, 0.18, 42)

const INVESTMENT_SERIES: Record<string, PortfolioDataPoint[]> = {}
INVESTMENTS.forEach((inv, idx) => {
    const annual = inv.pnl > 0 ? 0.08 + Math.random() * 0.3 : -0.05 - Math.random() * 0.15
    INVESTMENT_SERIES[inv.id] = generateSeries(HISTORY_START, NOW, inv.totalInvested, annual, 0.22, 100 + idx * 7)
})

// ── Filter by TimeRange ───────────────────────────────────────────
function filterByRange(data: PortfolioDataPoint[], range: TimeRange): PortfolioDataPoint[] {
    const now = new Date()
    let start: Date
    switch (range) {
        case "1W": start = subDays(now, 7); break
        case "1M": start = subMonths(now, 1); break
        case "3M": start = subMonths(now, 3); break
        case "6M": start = subMonths(now, 6); break
        case "1Y": start = subYears(now, 1); break
        case "MAX": return data
    }
    const startStr = format(start, "yyyy-MM-dd")
    return data.filter(d => d.date >= startStr)
}

// ── Public API ────────────────────────────────────────────────────
export function getPortfolioData(range: TimeRange): PortfolioDataPoint[] {
    return filterByRange(PORTFOLIO_FULL, range)
}

export function getInvestmentData(investmentId: string, range: TimeRange): PortfolioDataPoint[] {
    const series = INVESTMENT_SERIES[investmentId]
    if (!series) return []
    return filterByRange(series, range)
}

export function getPortfolioSummary() {
    const last = PORTFOLIO_FULL[PORTFOLIO_FULL.length - 1]
    return {
        totalValue: TOTAL_CURRENT,
        totalInvested: TOTAL_INVESTED,
        totalPnl: last?.pnl ?? 0,
        totalPnlPct: last?.pnlPct ?? 0,
        investments: INVESTMENTS,
    }
}
