"use client"

import type { TimeRange } from "@/lib/mock-data"

const RANGES: { label: string; value: TimeRange }[] = [
    { label: "1W", value: "1W" },
    { label: "1M", value: "1M" },
    { label: "3M", value: "3M" },
    { label: "6M", value: "6M" },
    { label: "1Y", value: "1Y" },
    { label: "Max", value: "MAX" },
]

interface Props {
    selected: TimeRange
    onChange: (range: TimeRange) => void
}

export default function TimeRangeSelector({ selected, onChange }: Props) {
    return (
        <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100/80 p-1">
            {RANGES.map((r) => {
                const isActive = r.value === selected
                return (
                    <button
                        key={r.value}
                        onClick={() => onChange(r.value)}
                        className={`
              relative rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200
              ${isActive
                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5"
                                : "text-gray-500 hover:text-gray-700"
                            }
            `}
                    >
                        {r.label}
                    </button>
                )
            })}
        </div>
    )
}
