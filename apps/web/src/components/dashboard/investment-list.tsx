"use client"

import type { Investment } from "@/lib/mock-data"

interface Props {
    investments: Investment[]
    selectedId: string | null
    onSelect: (id: string | null) => void
}

export default function InvestmentList({ investments, selectedId, onSelect }: Props) {
    return (
        <div className="space-y-1">
            {/* "All investments" option */}
            <button
                onClick={() => onSelect(null)}
                className={`
          w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all duration-200
          ${selectedId === null
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-transparent text-gray-700 hover:bg-gray-50"
                    }
        `}
            >
                <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${selectedId === null ? "bg-white" : "bg-gray-400"}`} />
                    <span className="text-sm font-medium">Total Portfolio</span>
                </div>
            </button>

            {investments.map((inv) => {
                const isActive = selectedId === inv.id
                const isPositive = inv.pnl >= 0
                return (
                    <button
                        key={inv.id}
                        onClick={() => onSelect(inv.id)}
                        className={`
              w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all duration-200
              ${isActive
                                ? "bg-gray-900 text-white shadow-sm"
                                : "bg-transparent text-gray-700 hover:bg-gray-50"
                            }
            `}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: isActive ? "#fff" : inv.color }}
                            />
                            <div>
                                <p className="text-sm font-medium">{inv.ticker}</p>
                                <p className={`text-xs ${isActive ? "text-gray-300" : "text-gray-400"}`}>
                                    {inv.name}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums">
                                ${inv.currentValue.toLocaleString()}
                            </p>
                            <p className={`text-xs font-medium tabular-nums ${isActive
                                    ? isPositive ? "text-emerald-300" : "text-red-300"
                                    : isPositive ? "text-emerald-600" : "text-red-500"
                                }`}>
                                {isPositive ? "+" : ""}{inv.pnlPct.toFixed(2)}%
                            </p>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
