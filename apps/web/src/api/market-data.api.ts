import axiosInstance from './axios-instance';

export interface StockPrice {
  ticker: string;
  price: number;
  timestamp: string;
  source: string;
}

export const marketDataApi = {
  // Get single stock price
  getPrice: (ticker: string) =>
    axiosInstance.get<StockPrice>(`/market-data/price`, {
      params: { ticker },
    }),

  // Get multiple stock prices
  getPrices: (tickers: string[]) =>
    axiosInstance.get<StockPrice[]>(`/market-data/prices`, {
      params: { tickers: tickers.join(',') },
    }),
};

export default marketDataApi;
