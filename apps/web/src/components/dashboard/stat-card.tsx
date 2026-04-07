"use client"

interface StatCardProps {
    label: string
    value: string
    detail?: string
    detailColor?: "positive" | "negative" | "neutral"
}

export default function StatCard({ label, value, detail, detailColor = "neutral" }: StatCardProps) {
    const colorMap = {
        positive: "text-emerald-600",
        negative: "text-red-500",
        neutral: "text-gray-500",
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
            {detail && (
                <p className={`mt-1 text-sm font-medium ${colorMap[detailColor]}`}>{detail}</p>
            )}
        </div>
    )
}
