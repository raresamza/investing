import { Test, TestingModule } from '@nestjs/testing';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';

describe('MarketDataController', () => {
  let controller: MarketDataController;
  let service: MarketDataService;

  const mockMarketDataService = {
    getStockPrice: jest.fn(),
    getMultiplePrices: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketDataController],
      providers: [
        {
          provide: MarketDataService,
          useValue: mockMarketDataService,
        },
      ],
    }).compile();

    controller = module.get<MarketDataController>(MarketDataController);
    service = module.get<MarketDataService>(MarketDataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrice', () => {
    it('should return stock price for ticker', async () => {
      const mockPrice = {
        ticker: 'AAPL',
        price: 175.5,
        timestamp: new Date(),
        source: 'yfinance',
      };

      mockMarketDataService.getStockPrice.mockResolvedValue(mockPrice);

      const result = await controller.getPrice('AAPL');

      expect(result).toEqual(mockPrice);
      expect(service.getStockPrice).toHaveBeenCalledWith('AAPL');
    });

    it('should throw error when ticker is missing', async () => {
      await expect(controller.getPrice('')).rejects.toThrow('Ticker symbol required');
    });

    it('should convert ticker to uppercase', async () => {
      mockMarketDataService.getStockPrice.mockResolvedValue({
        ticker: 'AAPL',
        price: 175.5,
        timestamp: new Date(),
        source: 'yfinance',
      });

      await controller.getPrice('aapl');

      expect(service.getStockPrice).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('getPrices', () => {
    it('should return multiple stock prices', async () => {
      const mockPrices = [
        {
          ticker: 'AAPL',
          price: 175.5,
          timestamp: new Date(),
          source: 'yfinance',
        },
        {
          ticker: 'MSFT',
          price: 370.0,
          timestamp: new Date(),
          source: 'yfinance',
        },
      ];

      mockMarketDataService.getMultiplePrices.mockResolvedValue(mockPrices);

      const result = await controller.getPrices('AAPL,MSFT');

      expect(result).toEqual(mockPrices);
      expect(service.getMultiplePrices).toHaveBeenCalledWith(['AAPL', 'MSFT']);
    });

    it('should handle tickers with spaces', async () => {
      mockMarketDataService.getMultiplePrices.mockResolvedValue([]);

      await controller.getPrices('AAPL, MSFT, TSLA');

      expect(service.getMultiplePrices).toHaveBeenCalledWith([
        'AAPL',
        'MSFT',
        'TSLA',
      ]);
    });

    it('should throw error when tickers are missing', async () => {
      await expect(controller.getPrices('')).rejects.toThrow('Ticker symbols required');
    });
  });
});
