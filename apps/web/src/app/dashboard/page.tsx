"use client"

import { useState, useMemo } from "react"
import PortfolioChart from "@/components/dashboard/portfolio-chart"
import TimeRangeSelector from "@/components/dashboard/time-range-selector"
import InvestmentList from "@/components/dashboard/investment-list"
import StatCard from "@/components/dashboard/stat-card"
import {
    getPortfolioData,
    getInvestmentData,
    getPortfolioSummary,
    INVESTMENTS,
    type TimeRange,
} from "@/lib/mock-data"

export default function DashboardPage() {
    const [range, setRange] = useState<TimeRange>("1Y")
    const [selectedInvestment, setSelectedInvestment] = useState<string | null>(null)

    const summary = useMemo(() => getPortfolioSummary(), [])

    const chartData = useMemo(() => {
        if (selectedInvestment) {
            return getInvestmentData(selectedInvestment, range)
        }
        return getPortfolioData(range)
    }, [selectedInvestment, range])

    const activeInvestment = useMemo(
        () => INVESTMENTS.find((i) => i.id === selectedInvestment),
        [selectedInvestment],
    )

    // Compute header stats from chart data
    const periodStart = chartData[0]?.value ?? 0
    const periodEnd = chartData[chartData.length - 1]?.value ?? 0
    const periodChange = periodEnd - periodStart
    const periodChangePct = periodStart > 0 ? (periodChange / periodStart) * 100 : 0
    const isPositive = periodChange >= 0

    const displayName = activeInvestment
        ? `${activeInvestment.ticker} — ${activeInvestment.name}`
        : "Total Portfolio"

    const displayValue = activeInvestment
        ? activeInvestment.currentValue
        : summary.totalValue

    const displayInvested = activeInvestment
        ? activeInvestment.totalInvested
        : summary.totalInvested

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* ── Top bar ──────────────────────────────────────────────── */}
            <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <h1 className="text-lg font-semibold tracking-tight text-gray-900">Dashboard</h1>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center text-xs font-semibold text-white">
                            R
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                {/* ── Stat cards ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    <StatCard
                        label="Current Value"
                        value={`$${displayValue.toLocaleString("en-US")}`}
                    />
                    <StatCard
                        label="Total Invested"
                        value={`$${displayInvested.toLocaleString("en-US")}`}
                    />
                    <StatCard
                        label={`Period P/L (${range})`}
                        value={`${isPositive ? "+" : ""}$${Math.abs(periodChange).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                        detail={`${isPositive ? "+" : ""}${periodChangePct.toFixed(2)}%`}
                        detailColor={isPositive ? "positive" : "negative"}
                    />
                    <StatCard
                        label="Holdings"
                        value={`${INVESTMENTS.length}`}
                        detail="Individual investments"
                    />
                </div>

                {/* ── Main grid: chart + sidebar ────────────────────────── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Chart card */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        {/* Chart header */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                            <div>
                                <h2 className="text-sm font-medium text-gray-500">{displayName}</h2>
                                <div className="flex items-baseline gap-3 mt-1">
                                    <span className="text-3xl font-semibold tracking-tight text-gray-900">
                                        ${periodEnd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className={`text-sm font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                                        {isPositive ? "↑" : "↓"} {Math.abs(periodChangePct).toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                            <TimeRangeSelector selected={range} onChange={setRange} />
                        </div>

                        {/* Chart */}
                        <PortfolioChart
                            data={chartData}
                            range={range}
                            color={activeInvestment?.color}
                            height={400}
                        />
                    </div>

                    {/* Investment sidebar */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <h3 className="mb-4 px-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                            Investments
                        </h3>
                        <InvestmentList
                            investments={summary.investments}
                            selectedId={selectedInvestment}
                            onSelect={setSelectedInvestment}
                        />
                    </div>
                </div>
            </main>
        </div>
    )
}
