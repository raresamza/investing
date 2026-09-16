import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface StockPrice {
  ticker: string;
  price: number;
  timestamp: Date;
  source: string;
}

@Injectable()
export class MarketDataService {
  private readonly finnhubApiKey = process.env.FINNHUB_API_KEY;
  private readonly finnhubBaseUrl = 'https://finnhub.io/api/v1';
  private priceCache = new Map<string, { price: number; timestamp: Date }>();

  async getStockPrice(ticker: string): Promise<StockPrice> {
    try {
      // Check cache (5 minute TTL)
      const cached = this.priceCache.get(ticker);
      if (cached && Date.now() - cached.timestamp.getTime() < 5 * 60 * 1000) {
        return {
          ticker,
          price: cached.price,
          timestamp: cached.timestamp,
          source: 'cache',
        };
      }

      // Try Finnhub first (requires API key)
      if (this.finnhubApiKey) {
        try {
          const response = await axios.get(`${this.finnhubBaseUrl}/quote`, {
            params: {
              symbol: ticker,
              token: this.finnhubApiKey,
            },
          });

          if (response.data.c) {
            const price = response.data.c;
            this.priceCache.set(ticker, { price, timestamp: new Date() });
            return {
              ticker,
              price,
              timestamp: new Date(),
              source: 'finnhub',
            };
          }
        } catch (error) {
          console.warn(`Finnhub API failed for ${ticker}, falling back to YFinance`);
        }
      }

      // Fallback to YFinance via public API
      const yfinanceUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price`;
      const response = await axios.get(yfinanceUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (
        response.data.quoteSummary?.result?.[0]?.price?.regularMarketPrice
          ?.raw
      ) {
        const price =
          response.data.quoteSummary.result[0].price.regularMarketPrice.raw;
        this.priceCache.set(ticker, { price, timestamp: new Date() });
        return {
          ticker,
          price,
          timestamp: new Date(),
          source: 'yfinance',
        };
      }

      throw new Error(`No price data for ${ticker}`);
    } catch (error) {
      console.error(`Failed to fetch price for ${ticker}:`, error);

      // Return last known price or throw
      const cached = this.priceCache.get(ticker);
      if (cached) {
        return {
          ticker,
          price: cached.price,
          timestamp: cached.timestamp,
          source: 'cache-stale',
        };
      }

      throw new Error(`Unable to fetch price for ${ticker}`);
    }
  }

  async getMultiplePrices(tickers: string[]): Promise<StockPrice[]> {
    const results = await Promise.allSettled(
      tickers.map((ticker) => this.getStockPrice(ticker))
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<StockPrice>).value);
  }

  clearCache(): void {
    this.priceCache.clear();
  }
}
