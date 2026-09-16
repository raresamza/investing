import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import type { PortfolioAnalysisRequest, DiscoveryRequest } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let service: AiService;

  const mockAiService = {
    healthCheck: jest.fn(),
    analyzePortfolio: jest.fn(),
    discoverCandidates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const mockResponse = { status: 'ok', version: '0.1.0' };
      mockAiService.healthCheck.mockResolvedValue(mockResponse);

      const result = await controller.healthCheck();

      expect(result).toEqual(mockResponse);
      expect(service.healthCheck).toHaveBeenCalled();
    });

    it('should return unavailable status when AI service is down', async () => {
      const mockResponse = { status: 'unavailable' };
      mockAiService.healthCheck.mockResolvedValue(mockResponse);

      const result = await controller.healthCheck();

      expect(result).toEqual(mockResponse);
    });
  });

  describe('analyzePortfolio', () => {
    it('should analyze portfolio with holdings', async () => {
      const request: PortfolioAnalysisRequest = {
        holdings: [
          {
            ticker: 'AAPL',
            shares: 50,
            avg_cost: 142.5,
            previously_sold: false,
          },
        ],
        strategy: 'rules',
      };

      const mockResponse = {
        holdings: [
          {
            ticker: 'AAPL',
            name: 'Apple Inc.',
            composite_score: 75.5,
            action: 'HOLD',
            conviction: 'MODERATE',
          },
        ],
        portfolio_score: 75.5,
        summary: 'Good portfolio composition',
      };

      mockAiService.analyzePortfolio.mockResolvedValue(mockResponse);

      const result = await controller.analyzePortfolio(request);

      expect(result).toEqual(mockResponse);
      expect(service.analyzePortfolio).toHaveBeenCalledWith(request);
    });

    it('should analyze portfolio with multiple holdings', async () => {
      const request: PortfolioAnalysisRequest = {
        holdings: [
          { ticker: 'AAPL', shares: 50, avg_cost: 142.5 },
          { ticker: 'MSFT', shares: 30, avg_cost: 310.0 },
          { ticker: 'GOOGL', shares: 20, avg_cost: 140.0 },
        ],
      };

      const mockResponse = {
        holdings: [
          { ticker: 'AAPL', composite_score: 75.5, action: 'HOLD' },
          { ticker: 'MSFT', composite_score: 82.0, action: 'BUY' },
          { ticker: 'GOOGL', composite_score: 68.0, action: 'HOLD' },
        ],
        portfolio_score: 75.2,
        summary: 'Balanced portfolio',
      };

      mockAiService.analyzePortfolio.mockResolvedValue(mockResponse);

      const result = await controller.analyzePortfolio(request);

      expect(result.holdings).toHaveLength(3);
      expect(service.analyzePortfolio).toHaveBeenCalledWith(request);
    });

    it('should handle ensemble strategy', async () => {
      const request: PortfolioAnalysisRequest = {
        holdings: [{ ticker: 'TSLA', shares: 10, avg_cost: 250.0 }],
        strategy: 'ensemble',
      };

      mockAiService.analyzePortfolio.mockResolvedValue({
        holdings: [{ ticker: 'TSLA', composite_score: 70.0 }],
        portfolio_score: 70.0,
      });

      await controller.analyzePortfolio(request);

      expect(service.analyzePortfolio).toHaveBeenCalledWith(
        expect.objectContaining({ strategy: 'ensemble' })
      );
    });

    it('should pass through previously_sold flag', async () => {
      const request: PortfolioAnalysisRequest = {
        holdings: [
          { ticker: 'AAPL', shares: 50, avg_cost: 142.5, previously_sold: true },
        ],
      };

      mockAiService.analyzePortfolio.mockResolvedValue({
        holdings: [{ ticker: 'AAPL', action: 'REBUY' }],
        portfolio_score: 80.0,
      });

      await controller.analyzePortfolio(request);

      expect(service.analyzePortfolio).toHaveBeenCalledWith(
        expect.objectContaining({
          holdings: expect.arrayContaining([
            expect.objectContaining({ previously_sold: true }),
          ]),
        })
      );
    });
  });

  describe('discoverCandidates', () => {
    it('should discover top candidates from S&P 500', async () => {
      const request: DiscoveryRequest = {
        universe: 'sp500',
        top_n: 5,
      };

      const mockResponse = {
        candidates: [
          { ticker: 'MSFT', composite_score: 85.0, action: 'BUY' },
          { ticker: 'NVDA', composite_score: 82.0, action: 'BUY' },
          { ticker: 'TSLA', composite_score: 78.0, action: 'WATCH' },
          { ticker: 'META', composite_score: 75.0, action: 'HOLD' },
          { ticker: 'AMZN', composite_score: 72.0, action: 'HOLD' },
        ],
        universe_scanned: 500,
        summary: 'Strong tech momentum with quality fundamentals',
      };

      mockAiService.discoverCandidates.mockResolvedValue(mockResponse);

      const result = await controller.discoverCandidates(request);

      expect(result.candidates).toHaveLength(5);
      expect(service.discoverCandidates).toHaveBeenCalledWith(request);
    });

    it('should exclude specified tickers', async () => {
      const request: DiscoveryRequest = {
        universe: 'sp500',
        top_n: 10,
        exclude_tickers: ['AAPL', 'MSFT'],
      };

      mockAiService.discoverCandidates.mockResolvedValue({
        candidates: [],
        universe_scanned: 500,
      });

      await controller.discoverCandidates(request);

      expect(service.discoverCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ exclude_tickers: ['AAPL', 'MSFT'] })
      );
    });

    it('should use default universe when not specified', async () => {
      const request: DiscoveryRequest = {
        top_n: 5,
      };

      mockAiService.discoverCandidates.mockResolvedValue({
        candidates: [],
        universe_scanned: 500,
      });

      await controller.discoverCandidates(request);

      expect(service.discoverCandidates).toHaveBeenCalled();
    });

    it('should support different universes', async () => {
      const request: DiscoveryRequest = {
        universe: 'nasdaq100',
        top_n: 5,
        strategy: 'ml',
      };

      mockAiService.discoverCandidates.mockResolvedValue({
        candidates: [],
        universe_scanned: 100,
      });

      await controller.discoverCandidates(request);

      expect(service.discoverCandidates).toHaveBeenCalledWith(
        expect.objectContaining({
          universe: 'nasdaq100',
          strategy: 'ml',
        })
      );
    });
  });
});
