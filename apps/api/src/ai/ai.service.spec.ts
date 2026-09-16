import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return health status from AI service', async () => {
      const mockHealth = { status: 'ok', version: '0.1.0' };
      mockedAxios.get.mockResolvedValue({ data: mockHealth });

      const result = await service.healthCheck();

      expect(result).toEqual(mockHealth);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:8000/health'
      );
    });

    it('should return unavailable when AI service is down', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await service.healthCheck();

      expect(result).toEqual({ status: 'unavailable' });
    });
  });

  describe('analyzePortfolio', () => {
    it('should send portfolio analysis request to AI service', async () => {
      const request = {
        holdings: [
          { ticker: 'AAPL', shares: 50, avg_cost: 142.5 },
        ],
      };

      const mockResponse = {
        holdings: [{ ticker: 'AAPL', composite_score: 75.5 }],
        portfolio_score: 75.5,
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await service.analyzePortfolio(request);

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/analyze/portfolio',
        request
      );
    });

    it('should handle analysis request with multiple holdings', async () => {
      const request = {
        holdings: [
          { ticker: 'AAPL', shares: 50, avg_cost: 142.5 },
          { ticker: 'MSFT', shares: 30, avg_cost: 310.0 },
        ],
      };

      const mockResponse = {
        holdings: [
          { ticker: 'AAPL', composite_score: 75.5 },
          { ticker: 'MSFT', composite_score: 82.0 },
        ],
        portfolio_score: 78.75,
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await service.analyzePortfolio(request);

      expect(result.holdings).toHaveLength(2);
    });

    it('should pass strategy parameter to AI service', async () => {
      const request = {
        holdings: [{ ticker: 'TSLA', shares: 10, avg_cost: 250.0 }],
        strategy: 'ensemble' as const,
      };

      mockedAxios.post.mockResolvedValue({
        data: { holdings: [], portfolio_score: 0 },
      });

      await service.analyzePortfolio(request);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/analyze/portfolio',
        expect.objectContaining({ strategy: 'ensemble' })
      );
    });

    it('should throw error when AI service fails', async () => {
      const request = {
        holdings: [{ ticker: 'AAPL', shares: 50, avg_cost: 142.5 }],
      };

      mockedAxios.post.mockRejectedValue(new Error('Service error'));

      await expect(service.analyzePortfolio(request)).rejects.toThrow(
        'Service error'
      );
    });
  });

  describe('discoverCandidates', () => {
    it('should send discovery request to AI service', async () => {
      const request = {
        universe: 'sp500',
        top_n: 5,
      };

      const mockResponse = {
        candidates: [
          { ticker: 'MSFT', composite_score: 85.0, action: 'BUY' },
          { ticker: 'NVDA', composite_score: 82.0, action: 'BUY' },
        ],
        universe_scanned: 500,
        summary: 'Strong momentum',
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await service.discoverCandidates(request);

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/analyze/discover',
        request
      );
    });

    it('should handle excluded tickers', async () => {
      const request = {
        universe: 'sp500',
        top_n: 10,
        exclude_tickers: ['AAPL', 'MSFT'],
      };

      mockedAxios.post.mockResolvedValue({
        data: { candidates: [], universe_scanned: 500 },
      });

      await service.discoverCandidates(request);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/analyze/discover',
        expect.objectContaining({ exclude_tickers: ['AAPL', 'MSFT'] })
      );
    });

    it('should support different universes', async () => {
      const request = {
        universe: 'nasdaq100',
        top_n: 5,
      };

      mockedAxios.post.mockResolvedValue({
        data: { candidates: [], universe_scanned: 100 },
      });

      await service.discoverCandidates(request);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/analyze/discover',
        expect.objectContaining({ universe: 'nasdaq100' })
      );
    });

    it('should throw error when discovery fails', async () => {
      const request = {
        universe: 'sp500',
        top_n: 5,
      };

      mockedAxios.post.mockRejectedValue(new Error('Discovery failed'));

      await expect(service.discoverCandidates(request)).rejects.toThrow(
        'Discovery failed'
      );
    });
  });

  describe('AI service URL configuration', () => {
    it('should use AI_SERVICE_URL environment variable', () => {
      const originalEnv = process.env.AI_SERVICE_URL;
      process.env.AI_SERVICE_URL = 'http://ai.example.com:8000';

      const testService = new AiService();
      const url = (testService as any).aiApiUrl;

      expect(url).toBe('http://ai.example.com:8000');

      process.env.AI_SERVICE_URL = originalEnv;
    });

    it('should use default localhost when no environment variable set', () => {
      const originalEnv = process.env.AI_SERVICE_URL;
      delete process.env.AI_SERVICE_URL;

      const testService = new AiService();
      const url = (testService as any).aiApiUrl;

      expect(url).toBe('http://localhost:8000');

      if (originalEnv) process.env.AI_SERVICE_URL = originalEnv;
    });
  });
});
