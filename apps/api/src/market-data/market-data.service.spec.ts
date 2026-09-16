import { Test, TestingModule } from '@nestjs/testing';
import { MarketDataService } from './market-data.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MarketDataService', () => {
  let service: MarketDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketDataService],
    }).compile();

    service = module.get<MarketDataService>(MarketDataService);
    jest.clearAllMocks();
  });

  describe('getStockPrice', () => {
    it('should fetch stock price from YFinance', async () => {
      const mockResponse = {
        data: {
          quoteSummary: {
            result: [
              {
                price: {
                  regularMarketPrice: {
                    raw: 175.5,
                  },
                },
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.getStockPrice('AAPL');

      expect(result.ticker).toBe('AAPL');
      expect(result.price).toBe(175.5);
      expect(result.source).toBe('yfinance');
    });

    it('should cache prices for 5 minutes', async () => {
      const mockResponse = {
        data: {
          quoteSummary: {
            result: [
              {
                price: {
                  regularMarketPrice: {
                    raw: 180.25,
                  },
                },
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result1 = await service.getStockPrice('MSFT');
      const result2 = await service.getStockPrice('MSFT');

      expect(result1.price).toBe(result2.price);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Only called once, second from cache
    });

    it('should handle price fetch errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(service.getStockPrice('INVALID')).rejects.toThrow();
    });
  });

  describe('getMultiplePrices', () => {
    it('should fetch multiple stock prices', async () => {
      const mockResponse = {
        data: {
          quoteSummary: {
            result: [
              {
                price: {
                  regularMarketPrice: {
                    raw: 175.5,
                  },
                },
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.getMultiplePrices(['AAPL', 'MSFT']);

      expect(result).toHaveLength(2);
      expect(result[0].ticker).toBe('AAPL');
      expect(result[1].ticker).toBe('MSFT');
    });

    it('should handle partial failures in batch requests', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('AAPL')) {
          return Promise.resolve({
            data: {
              quoteSummary: {
                result: [
                  {
                    price: {
                      regularMarketPrice: {
                        raw: 175.5,
                      },
                    },
                  },
                ],
              },
            },
          });
        }
        return Promise.reject(new Error('Failed to fetch MSFT'));
      });

      const result = await service.getMultiplePrices(['AAPL', 'MSFT']);

      expect(result).toHaveLength(1);
      expect(result[0].ticker).toBe('AAPL');
    });
  });

  describe('clearCache', () => {
    it('should clear cached prices', async () => {
      const mockResponse = {
        data: {
          quoteSummary: {
            result: [
              {
                price: {
                  regularMarketPrice: {
                    raw: 175.5,
                  },
                },
              },
            ],
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await service.getStockPrice('AAPL');
      service.clearCache();

      await service.getStockPrice('AAPL');

      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Called twice, cache was cleared
    });
  });
});
