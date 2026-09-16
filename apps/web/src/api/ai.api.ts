import axiosInstance from './axios-instance';

export interface HoldingInput {
  ticker: string;
  shares: number;
  avg_cost: number;
  previously_sold?: boolean;
}

export interface FundamentalBreakdown {
  pe_ratio?: number;
  peg_ratio?: number;
  price_to_book?: number;
  roe?: number;
  debt_to_equity?: number;
  current_ratio?: number;
  fcf_yield?: number;
  revenue_growth?: number;
  profit_margin?: number;
  score: number;
}

export interface TechnicalBreakdown {
  rsi_14?: number;
  macd_signal?: string;
  sma_50_vs_price?: number;
  sma_200_vs_price?: number;
  golden_cross: boolean;
  death_cross: boolean;
  bollinger_position?: number;
  atr_pct?: number;
  trend: string;
  score: number;
}

export interface QualityBreakdown {
  dividend_yield?: number;
  dividend_consistency?: number;
  institutional_pct?: number;
  beta?: number;
  score: number;
}

export interface MacroBreakdown {
  fed_rate?: number;
  vix?: number;
  yield_curve_spread?: number;
  score: number;
}

export interface StockScore {
  ticker: string;
  name: string;
  sector: string;
  current_price: number;
  market_cap?: number;
  fundamental: FundamentalBreakdown;
  technical: TechnicalBreakdown;
  quality: QualityBreakdown;
  macro: MacroBreakdown;
  composite_score: number;
  action: string;
  conviction: string;
  rationale: string;
  avg_cost?: number;
  unrealized_pnl_pct?: number;
}

export interface PortfolioAnalysisResponse {
  holdings: StockScore[];
  portfolio_score: number;
  summary: string;
}

export interface DiscoverResponse {
  candidates: StockScore[];
  universe_scanned: number;
  summary: string;
}

export const aiApi = {
  // Health check
  healthCheck: () => axiosInstance.get('/ai/health'),

  // Portfolio analysis
  analyzePortfolio: (holdings: HoldingInput[], strategy?: string) =>
    axiosInstance.post<PortfolioAnalysisResponse>('/ai/analyze/portfolio', {
      holdings,
      strategy,
    }),

  // Stock discovery
  discoverCandidates: (
    universe = 'sp500',
    top_n = 10,
    exclude_tickers: string[] = [],
    strategy?: string
  ) =>
    axiosInstance.post<DiscoverResponse>('/ai/analyze/discover', {
      universe,
      top_n,
      exclude_tickers,
      strategy,
    }),
};

export default aiApi;
