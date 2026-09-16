import type { StockScore } from '@/api/ai.api';

interface Props {
  analysis: StockScore | null;
  loading?: boolean;
  error?: string | null;
}

export default function PredictionCard({ analysis, loading, error }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 shadow-sm border border-red-200">
        <p className="text-sm font-semibold text-red-900">Analysis unavailable</p>
        <p className="text-xs text-red-700 mt-1">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const actionColors: Record<string, { bg: string; text: string; badge: string }> = {
    BUY: { bg: 'bg-emerald-50', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' },
    HOLD: { bg: 'bg-blue-50', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-800' },
    SELL: { bg: 'bg-red-50', text: 'text-red-900', badge: 'bg-red-100 text-red-800' },
    REBUY: { bg: 'bg-amber-50', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-800' },
    WATCH: { bg: 'bg-gray-50', text: 'text-gray-900', badge: 'bg-gray-100 text-gray-800' },
  };

  const convictionColors: Record<string, string> = {
    STRONG: 'bg-emerald-200 text-emerald-900',
    MODERATE: 'bg-amber-200 text-amber-900',
    WEAK: 'bg-gray-200 text-gray-900',
  };

  const colors = actionColors[analysis.action] || actionColors.HOLD;
  const convictionColor = convictionColors[analysis.conviction] || convictionColors.MODERATE;

  return (
    <div className={`rounded-2xl ${colors.bg} p-6 shadow-sm border border-gray-200`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`text-lg font-bold ${colors.text}`}>AI Analysis</h3>
          <p className="text-xs text-gray-600 mt-1">{analysis.name} ({analysis.sector})</p>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
            {analysis.action}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${convictionColor}`}>
            {analysis.conviction}
          </span>
        </div>
      </div>

      <div className="mb-4 p-3 bg-white bg-opacity-50 rounded-lg">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">{analysis.composite_score.toFixed(1)}</span>
          <span className="text-sm text-gray-600">/ 100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 font-medium">Fundamentals</p>
          <p className="text-lg font-bold text-gray-900">{analysis.fundamental.score.toFixed(1)}</p>
        </div>
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 font-medium">Technical</p>
          <p className="text-lg font-bold text-gray-900">{analysis.technical.score.toFixed(1)}</p>
        </div>
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 font-medium">Quality</p>
          <p className="text-lg font-bold text-gray-900">{analysis.quality.score.toFixed(1)}</p>
        </div>
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 font-medium">Macro</p>
          <p className="text-lg font-bold text-gray-900">{analysis.macro.score.toFixed(1)}</p>
        </div>
      </div>

      <div className="bg-white bg-opacity-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 font-medium mb-2">Analysis</p>
        <p className="text-sm text-gray-800 leading-relaxed">{analysis.rationale}</p>
      </div>

      {analysis.unrealized_pnl_pct !== undefined && (
        <div className="mt-4 pt-4 border-t border-gray-300 border-opacity-30">
          <p className="text-xs text-gray-600 font-medium">Your Position P&L</p>
          <p className={`text-lg font-bold ${analysis.unrealized_pnl_pct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {analysis.unrealized_pnl_pct >= 0 ? '+' : ''}{analysis.unrealized_pnl_pct.toFixed(2)}%
          </p>
        </div>
      )}
    </div>
  );
}
