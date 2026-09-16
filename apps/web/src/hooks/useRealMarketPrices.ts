import { useState, useEffect, useCallback } from 'react';
import marketDataApi, { type StockPrice } from '@/api/market-data.api';

export interface Investment {
  id: string;
  name: string;
  ticker: string;
  color: string;
  currentValue: number;
  totalInvested: number;
  pnl: number;
  pnlPct: number;
  shares: number;
  avgCost: number;
  currentPrice?: number;
}

export function useRealMarketPrices(investments: Investment[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!investments || investments.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const tickers = investments.map((inv) => inv.ticker);
      const response = await marketDataApi.getPrices(tickers);
      
      if (response.data) {
        const priceMap: Record<string, number> = {};
        response.data.forEach((priceData: StockPrice) => {
          priceMap[priceData.ticker] = priceData.price;
        });
        setPrices(priceMap);
      }
    } catch (err) {
      console.error('Failed to fetch market prices:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch prices'
      );
    } finally {
      setLoading(false);
    }
  }, [investments]);

  useEffect(() => {
    fetchPrices();
    // Refresh prices every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Update investments with real prices
  const investmentsWithRealPrices = investments.map((inv) => {
    if (prices[inv.ticker]) {
      const currentPrice = prices[inv.ticker];
      const currentValue = currentPrice * inv.shares;
      const pnl = currentValue - inv.totalInvested;
      const pnlPct = (pnl / inv.totalInvested) * 100;

      return {
        ...inv,
        currentPrice,
        currentValue: Math.round(currentValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        pnlPct: Math.round(pnlPct * 100) / 100,
      };
    }
    return inv;
  });

  return {
    investments: investmentsWithRealPrices,
    prices,
    loading,
    error,
    refetch: fetchPrices,
  };
}
