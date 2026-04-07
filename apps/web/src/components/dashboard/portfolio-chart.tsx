"use client"

import { useMemo } from "react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"
import { format, parseISO } from "date-fns"
import type { PortfolioDataPoint, TimeRange } from "@/lib/mock-data"

// ── Custom tooltip ─────────────────────────────────────────────────
function ChartTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const d: PortfolioDataPoint = payload[0].payload
    const isPositive = d.pnl >= 0
    return (
        <div className="rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-medium text-gray-400">{d.label}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-gray-900">
                ${d.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className={`mt-0.5 text-sm font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                {isPositive ? "+" : ""}${d.pnl.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                {" "}
                <span className="text-xs">
                    ({isPositive ? "+" : ""}{d.pnlPct.toFixed(2)}%)
                </span>
            </p>
        </div>
    )
}

// ── Helpers ────────────────────────────────────────────────────────
function dateTickFormatter(range: TimeRange) {
    return (value: string) => {
        if (!value) return ""
        try {
            const d = parseISO(value)
            if (range === "1W") return format(d, "dd")
            if (range === "1M") return format(d, "MMM dd")
            return format(d, "MMM yy")
        } catch {
            return value
        }
    }
}

function getTickInterval(dataLength: number, range: TimeRange) {
    if (range === "1W") return 0
    if (range === "1M") return Math.floor(dataLength / 6)
    if (range === "3M") return Math.floor(dataLength / 8)
    if (range === "6M") return Math.floor(dataLength / 8)
    if (range === "1Y") return Math.floor(dataLength / 10)
    return Math.floor(dataLength / 12)
}

// ── Component ──────────────────────────────────────────────────────
interface PortfolioChartProps {
    data: PortfolioDataPoint[]
    range: TimeRange
    color?: string
    height?: number
}

export default function PortfolioChart({
    data,
    range,
    color,
    height = 380,
}: PortfolioChartProps) {
    const isPositive = useMemo(() => {
        if (data.length < 2) return true
        return data[data.length - 1].value >= data[0].value
    }, [data])

    const chartColor = color ?? (isPositive ? "#10b981" : "#ef4444")
    const gradientId = `gradient-${chartColor.replace("#", "")}`

    const interval = useMemo(() => getTickInterval(data.length, range), [data.length, range])

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center" style={{ height }}>
                <p className="text-sm text-gray-400">No data for this period</p>
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    vertical={false}
                    stroke="#f3f4f6"
                    strokeDasharray="4 4"
                />
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    interval={interval}
                    tickFormatter={dateTickFormatter(range)}
                    dy={8}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickFormatter={(v: number) =>
                        v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                    }
                    width={55}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#d1d5db", strokeWidth: 1 }} />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartColor}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    animationDuration={800}
                    animationEasing="ease-out"
                    dot={false}
                    activeDot={{
                        r: 5,
                        fill: chartColor,
                        stroke: "#fff",
                        strokeWidth: 2,
                    }}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
