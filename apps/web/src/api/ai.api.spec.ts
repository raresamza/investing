import { describe, it, expect, beforeEach, vi } from 'vitest';
import aiApi from './ai.api';
import axiosInstance from './axios-instance';

vi.mock('./axios-instance');

describe('aiApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should call GET /ai/health', async () => {
      const mockResponse = { status: 'ok', version: '0.1.0' };
      vi.mocked(axiosInstance.get).mockResolvedValue(mockResponse);

      const result = await aiApi.healthCheck();

      expect(axiosInstance.get).toHaveBeenCalledWith('/ai/health');
      expect(result).toEqual(mockResponse);
    });

    it('should handle health check failure', async () => {
      const error = new Error('Service unavailable');
      vi.mocked(axiosInstance.get).mockRejectedValue(error);

      await expect(aiApi.healthCheck()).rejects.toThrow('Service unavailable');
    });
  });

  describe('analyzePortfolio', () => {
    it('should send portfolio analysis request', async () => {
      const holdings = [
        { ticker: 'AAPL', shares: 50, avg_cost: 142.5 },
      ];

      const mockResponse = {
        holdings: [
          {
            ticker: 'AAPL',
            name: 'Apple',
            sector: 'Technology',
            current_price: 180.5,
            composite_score: 75.5,
            action: 'HOLD',
            conviction: 'MODERATE',
            rationale: 'Good fundamentals',
            fundamental: { score: 70 },
            technical: { score: 75 },
            quality: { score: 80 },
            macro: { score: 70 },
          },
        ],
        portfolio_score: 75.5,
        summary: 'Good portfolio',
      };

      vi.mocked(axiosInstance.post).mockResolvedValue(mockResponse);

      const result = await aiApi.analyzePortfolio(holdings, 'rules');

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/ai/analyze/portfolio',
        { holdings, strategy: 'rules' }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should analyze portfolio without strategy', async () => {
      const holdings = [
        { ticker: 'MSFT', shares: 30, avg_cost: 310.0 },
      ];

      vi.mocked(axiosInstance.post).mockResolvedValue({
        holdings: [],
        portfolio_score: 0,
        summary: '',
      });

      await aiApi.analyzePortfolio(holdings);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/ai/analyze/portfolio',
        { holdings, strategy: undefined }
      );
    });

    it('should handle portfolio analysis with multiple holdings', async () => {
      const holdings = [
        { ticker: 'AAPL', shares: 50, avg_cost: 142.5 },
        { ticker: 'MSFT', shares: 30, avg_cost: 310.0 },
        { ticker: 'GOOGL', shares: 20, avg_cost: 140.0 },
      ];

      const mockResponse = {
        holdings: [
          {
            ticker: 'AAPL',
            name: 'Apple',
            sector: 'Technology',
            current_price: 180.5,
            composite_score: 75.5,
            action: 'HOLD',
            conviction: 'MODERATE',
            rationale: '',
            fundamental: { score: 70 },
            technical: { score: 75 },
            quality: { score: 80 },
            macro: { score: 70 },
          },
          {
            ticker: 'MSFT',
            name: 'Microsoft',
            sector: 'Technology',
            current_price: 420.0,
            composite_score: 82.0,
            action: 'BUY',
            conviction: 'MODERATE',
            rationale: '',
            fundamental: { score: 80 },
            technical: { score: 85 },
            quality: { score: 80 },
            macro: { score: 80 },
          },
          {
            ticker: 'GOOGL',
            name: 'Alphabet',
            sector: 'Technology',
            current_price: 160.0,
            composite_score: 68.0,
            action: 'HOLD',
            conviction: 'WEAK',
            rationale: '',
            fundamental: { score: 70 },
            technical: { score: 65 },
            quality: { score: 70 },
            macro: { score: 65 },
          },
        ],
        portfolio_score: 75.2,
        summary: 'Balanced portfolio',
      };

      vi.mocked(axiosInstance.post).mockResolvedValue(mockResponse);

      const result = await aiApi.analyzePortfolio(holdings, 'ensemble');

      expect(result.holdings).toHaveLength(3);
    });

    it('should include previously_sold flag', async () => {
      const holdings = [
        { ticker: 'TSLA', shares: 10, avg_cost: 250.0, previously_sold: true },
      ];

      vi.mocked(axiosInstance.post).mockResolvedValue({
        holdings: [],
        portfolio_score: 0,
        summary: '',
      });

      await aiApi.analyzePortfolio(holdings);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/ai/analyze/portfolio',
        {
          holdings: expect.arrayContaining([
            expect.objectContaining({ previously_sold: true }),
          ]),
          strategy: undefined,
        }
      );
    });
  });

  describe('discoverCandidates', () => {
    it('should discover candidates with defaults', async () => {
      const mockResponse = {
        candidates: [
          {
            ticker: 'MSFT',
            name: 'Microsoft',
            sector: 'Technology',
            current_price: 420.0,
            composite_score: 85.0,
            action: 'BUY',
            conviction: 'STRONG',
            rationale: 'Strong growth',
            fundamental: { score: 85 },
            technical: { score: 85 },
            quality: { score: 85 },
            macro: { score: 85 },
          },
        ],
        universe_scanned: 500,
        summary: 'Top picks',
      };

      vi.mocked(axiosInstance.post).mockResolvedValue(mockResponse);

      const result = await aiApi.discoverCandidates();

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/ai/analyze/discover',
        {
          universe: 'sp500',
          top_n: 10,
          exclude_tickers: [],
          strategy: undefined,
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should discover from specific universe', async () => {
      const mockResponse = {
        candidates: [],
        universe_scanned: 100,
        summary: '',
      };

      vi.mocked(axiosInstance.post).mockResolvedValue(mockResponse);

      await aiApi.discoverCandidates('nasdaq100', 5);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/ai/analyze/discover',
        {
          universe: 'nasdaq100',
          top_n: 5,
          exclude_tickers: [],
          strategy: undefined,
        }
      );
    });

    it('should exclude specified tickers', async () => {
      const exclude = ['AAPL', 'MSFT', 'GOOGL'];

      vi.mocked(axiosInstance.post).mockResolvedValue({
        candidates: [],
        universe_scanned: 500,
        summary: '',
      });

      await aiApi.discoverCandidates('sp500', 10, exclude);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/ai/analyze/discover',
        {
          universe: 'sp500',
          top_n: 10,
          exclude_tickers: exclude,
          strategy: undefined,
        }
      );
    });

    it('should use ML strategy for discovery', async () => {
      const mockResponse = {
        candidates: [
          {
            ticker: 'NVDA',
            name: 'NVIDIA',
            sector: 'Technology',
            current_price: 875.0,
            composite_score: 82.0,
            action: 'BUY',
            conviction: 'MODERATE',
            rationale: 'ML optimized',
            fundamental: { score: 80 },
            technical: { score: 82 },
            quality: { score: 80 },
            macro: { score: 82 },
          },
        ],
        universe_scanned: 500,
        summary: 'ML discoveries',
      };

      vi.mocked(axiosInstance.post).mockResolvedValue(mockResponse);

      const result = await aiApi.discoverCandidates('sp500', 5, [], 'ml');

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/ai/analyze/discover',
        {
          universe: 'sp500',
          top_n: 5,
          exclude_tickers: [],
          strategy: 'ml',
        }
      );
      expect(result.candidates[0].ticker).toBe('NVDA');
    });

    it('should handle discovery failure', async () => {
      const error = new Error('Discovery failed');
      vi.mocked(axiosInstance.post).mockRejectedValue(error);

      await expect(aiApi.discoverCandidates()).rejects.toThrow(
        'Discovery failed'
      );
    });
  });
});
