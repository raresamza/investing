import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as portfolioApi from './portfolio.api';

// Mock axios
vi.mock('./axios-instance', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import axiosInstance from './axios-instance';

describe('Portfolio API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPortfolio', () => {
    it('should create a portfolio with default USD currency', async () => {
      const expected = {
        id: 'portfolio-123',
        userId: 'user-123',
        currency: 'USD',
        investments: [],
        createdAt: '2026-09-16T00:00:00Z',
        updatedAt: '2026-09-16T00:00:00Z',
      };

      (axiosInstance.post as any).mockResolvedValue({ data: expected });

      const result = await portfolioApi.createPortfolio();

      expect(result).toEqual(expected);
      expect(axiosInstance.post).toHaveBeenCalledWith('/portfolio', {
        currency: 'USD',
      });
    });

    it('should create a portfolio with custom currency', async () => {
      const expected = {
        id: 'portfolio-123',
        userId: 'user-123',
        currency: 'EUR',
        investments: [],
        createdAt: '2026-09-16T00:00:00Z',
        updatedAt: '2026-09-16T00:00:00Z',
      };

      (axiosInstance.post as any).mockResolvedValue({ data: expected });

      const result = await portfolioApi.createPortfolio('EUR');

      expect(result).toEqual(expected);
      expect(axiosInstance.post).toHaveBeenCalledWith('/portfolio', {
        currency: 'EUR',
      });
    });
  });

  describe('getCurrentPortfolio', () => {
    it('should fetch current portfolio', async () => {
      const expected = {
        id: 'portfolio-123',
        userId: 'user-123',
        currency: 'USD',
        investments: [],
        createdAt: '2026-09-16T00:00:00Z',
        updatedAt: '2026-09-16T00:00:00Z',
      };

      (axiosInstance.get as any).mockResolvedValue({ data: expected });

      const result = await portfolioApi.getCurrentPortfolio();

      expect(result).toEqual(expected);
      expect(axiosInstance.get).toHaveBeenCalledWith('/portfolio/current');
    });
  });

  describe('getAllPortfolios', () => {
    it('should fetch all portfolios', async () => {
      const expected = [
        {
          id: 'portfolio-123',
          userId: 'user-123',
          currency: 'USD',
          investments: [],
          createdAt: '2026-09-16T00:00:00Z',
          updatedAt: '2026-09-16T00:00:00Z',
        },
      ];

      (axiosInstance.get as any).mockResolvedValue({ data: expected });

      const result = await portfolioApi.getAllPortfolios();

      expect(result).toEqual(expected);
      expect(axiosInstance.get).toHaveBeenCalledWith('/portfolio');
    });
  });

  describe('createInvestment', () => {
    it('should create an investment', async () => {
      const portfolioId = 'portfolio-123';
      const data = {
        symbol: 'AAPL',
        name: 'Apple',
        shares: 10,
        avgCost: 150,
        color: '#0071e3',
      };

      const expected = {
        id: 'inv-123',
        portfolioId,
        ...data,
        currentValue: 1500,
        totalInvested: 1500,
        pnl: 0,
        pnlPercentage: 0,
        createdAt: '2026-09-16T00:00:00Z',
        updatedAt: '2026-09-16T00:00:00Z',
      };

      (axiosInstance.post as any).mockResolvedValue({ data: expected });

      const result = await portfolioApi.createInvestment(portfolioId, data);

      expect(result).toEqual(expected);
      expect(axiosInstance.post).toHaveBeenCalledWith(
        `/portfolio/${portfolioId}/investments`,
        data
      );
    });
  });

  describe('getPortfolioInvestments', () => {
    it('should fetch portfolio investments', async () => {
      const portfolioId = 'portfolio-123';
      const expected = [
        {
          id: 'inv-123',
          portfolioId,
          symbol: 'AAPL',
          name: 'Apple',
          shares: 10,
          avgCost: 150,
          currentValue: 1500,
          totalInvested: 1500,
          pnl: 0,
          pnlPercentage: 0,
          createdAt: '2026-09-16T00:00:00Z',
          updatedAt: '2026-09-16T00:00:00Z',
        },
      ];

      (axiosInstance.get as any).mockResolvedValue({ data: expected });

      const result = await portfolioApi.getPortfolioInvestments(portfolioId);

      expect(result).toEqual(expected);
      expect(axiosInstance.get).toHaveBeenCalledWith(
        `/portfolio/${portfolioId}/investments`
      );
    });
  });

  describe('addTransaction', () => {
    it('should add a buy transaction', async () => {
      const portfolioId = 'portfolio-123';
      const data = {
        investmentId: 'inv-123',
        type: 'BUY' as const,
        quantity: 5,
        pricePerShare: 200,
      };

      const expected = {
        id: 'trans-123',
        portfolioId,
        ...data,
        totalAmount: 1000,
        transactionDate: '2026-09-16T00:00:00Z',
        createdAt: '2026-09-16T00:00:00Z',
      };

      (axiosInstance.post as any).mockResolvedValue({ data: expected });

      const result = await portfolioApi.addTransaction(portfolioId, data);

      expect(result).toEqual(expected);
      expect(axiosInstance.post).toHaveBeenCalledWith(
        `/portfolio/${portfolioId}/investments/transactions`,
        data
      );
    });
  });

  describe('getPortfolioTransactions', () => {
    it('should fetch portfolio transactions', async () => {
      const portfolioId = 'portfolio-123';
      const expected = [
        {
          id: 'trans-123',
          portfolioId,
          investmentId: 'inv-123',
          type: 'BUY' as const,
          quantity: 5,
          pricePerShare: 200,
          totalAmount: 1000,
          transactionDate: '2026-09-16T00:00:00Z',
          createdAt: '2026-09-16T00:00:00Z',
        },
      ];

      (axiosInstance.get as any).mockResolvedValue({ data: expected });

      const result = await portfolioApi.getPortfolioTransactions(portfolioId);

      expect(result).toEqual(expected);
      expect(axiosInstance.get).toHaveBeenCalledWith(
        `/portfolio/${portfolioId}/investments/transactions/list`
      );
    });
  });

  describe('updateInvestmentValue', () => {
    it('should update investment current value', async () => {
      const portfolioId = 'portfolio-123';
      const investmentId = 'inv-123';
      const currentValue = 2000;

      const expected = {
        id: investmentId,
        portfolioId,
        symbol: 'AAPL',
        name: 'Apple',
        shares: 10,
        avgCost: 150,
        currentValue,
        totalInvested: 1500,
        pnl: 500,
        pnlPercentage: 33.33,
        createdAt: '2026-09-16T00:00:00Z',
        updatedAt: '2026-09-16T00:00:00Z',
      };

      (axiosInstance.put as any).mockResolvedValue({ data: expected });

      const result = await portfolioApi.updateInvestmentValue(
        portfolioId,
        investmentId,
        currentValue
      );

      expect(result).toEqual(expected);
      expect(axiosInstance.put).toHaveBeenCalledWith(
        `/portfolio/${portfolioId}/investments/${investmentId}/value`,
        { currentValue }
      );
    });
  });

  describe('deleteInvestment', () => {
    it('should delete an investment', async () => {
      const portfolioId = 'portfolio-123';
      const investmentId = 'inv-123';

      (axiosInstance.delete as any).mockResolvedValue({});

      await portfolioApi.deleteInvestment(portfolioId, investmentId);

      expect(axiosInstance.delete).toHaveBeenCalledWith(
        `/portfolio/${portfolioId}/investments/${investmentId}`
      );
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction', async () => {
      const portfolioId = 'portfolio-123';
      const transactionId = 'trans-123';

      (axiosInstance.delete as any).mockResolvedValue({});

      await portfolioApi.deleteTransaction(portfolioId, transactionId);

      expect(axiosInstance.delete).toHaveBeenCalledWith(
        `/portfolio/${portfolioId}/investments/transactions/${transactionId}`
      );
    });
  });
});
