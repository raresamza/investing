import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentService } from './investment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('InvestmentService', () => {
  let service: InvestmentService;
  let prisma: PrismaService;

  const mockPrisma = {
    portfolio: {
      findUnique: jest.fn(),
    },
    investment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestmentService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<InvestmentService>(InvestmentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvestment', () => {
    it('should create an investment', async () => {
      const portfolioId = 'portfolio-123';
      const dto = {
        symbol: 'AAPL',
        name: 'Apple',
        shares: 10,
        avgCost: 150,
        color: '#0071e3',
      };

      mockPrisma.portfolio.findUnique.mockResolvedValue({ id: portfolioId });
      mockPrisma.investment.findUnique.mockResolvedValue(null);

      const expected = {
        id: 'inv-123',
        portfolioId,
        ...dto,
        totalInvested: 1500,
        currentValue: 1500,
        pnl: 0,
        pnlPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.investment.create.mockResolvedValue(expected);

      const result = await service.createInvestment(portfolioId, dto);

      expect(result).toEqual(expected);
      expect(mockPrisma.investment.create).toHaveBeenCalled();
    });

    it('should throw if portfolio not found', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvestment('non-existent', {
          symbol: 'AAPL',
          name: 'Apple',
          shares: 10,
          avgCost: 150,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if investment symbol already exists', async () => {
      const portfolioId = 'portfolio-123';
      mockPrisma.portfolio.findUnique.mockResolvedValue({ id: portfolioId });
      mockPrisma.investment.findUnique.mockResolvedValue({
        id: 'inv-123',
      });

      await expect(
        service.createInvestment(portfolioId, {
          symbol: 'AAPL',
          name: 'Apple',
          shares: 10,
          avgCost: 150,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInvestment', () => {
    it('should return an investment with transactions', async () => {
      const investmentId = 'inv-123';
      const expected = {
        id: investmentId,
        portfolioId: 'portfolio-123',
        symbol: 'AAPL',
        name: 'Apple',
        shares: 10,
        avgCost: 150,
        currentValue: 1500,
        totalInvested: 1500,
        pnl: 0,
        pnlPercentage: 0,
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.investment.findUnique.mockResolvedValue(expected);

      const result = await service.getInvestment(investmentId);

      expect(result).toEqual(expected);
    });

    it('should throw if investment not found', async () => {
      mockPrisma.investment.findUnique.mockResolvedValue(null);

      await expect(service.getInvestment('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPortfolioInvestments', () => {
    it('should return all investments for a portfolio', async () => {
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
          transactions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.investment.findMany.mockResolvedValue(expected);

      const result = await service.getPortfolioInvestments(portfolioId);

      expect(result).toEqual(expected);
      expect(mockPrisma.investment.findMany).toHaveBeenCalledWith({
        where: { portfolioId },
        include: { transactions: { orderBy: { transactionDate: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateInvestmentValue', () => {
    it('should update investment value and calculate P&L', async () => {
      const investmentId = 'inv-123';
      const investment = {
        id: investmentId,
        portfolioId: 'portfolio-123',
        symbol: 'AAPL',
        name: 'Apple',
        shares: 10,
        avgCost: 150,
        totalInvested: 1500,
        currentValue: 1500,
        pnl: 0,
        pnlPercentage: 0,
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.investment.findUnique.mockResolvedValue(investment);

      const newValue = 2000;
      const expected = {
        ...investment,
        currentValue: newValue,
        pnl: 500,
        pnlPercentage: 33.33,
      };

      mockPrisma.investment.update.mockResolvedValue(expected);

      const result = await service.updateInvestmentValue(investmentId, newValue);

      expect(result.currentValue).toBe(newValue);
    });
  });

  describe('addTransaction', () => {
    it('should add a BUY transaction and update investment', async () => {
      const portfolioId = 'portfolio-123';
      const dto = {
        investmentId: 'inv-123',
        type: 'BUY' as const,
        quantity: 5,
        pricePerShare: 200,
      };

      const investment = {
        id: 'inv-123',
        portfolioId,
        symbol: 'AAPL',
        shares: 10,
        avgCost: 150,
        totalInvested: 1500,
        currentValue: 1500,
        pnl: 0,
        pnlPercentage: 0,
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.investment.findUnique.mockResolvedValue(investment);

      const expectedTransaction = {
        id: 'trans-123',
        portfolioId,
        investmentId: 'inv-123',
        type: 'BUY',
        quantity: 5,
        pricePerShare: 200,
        totalAmount: 1000,
        transactionDate: expect.any(Date),
        createdAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValue(expectedTransaction);
      mockPrisma.investment.update.mockResolvedValue({
        ...investment,
        shares: 15,
        totalInvested: 2500,
        avgCost: 166.67,
      });

      const result = await service.addTransaction(portfolioId, dto);

      expect(result).toEqual(expectedTransaction);
      expect(mockPrisma.transaction.create).toHaveBeenCalled();
      expect(mockPrisma.investment.update).toHaveBeenCalled();
    });

    it('should add a SELL transaction and update investment', async () => {
      const portfolioId = 'portfolio-123';
      const dto = {
        investmentId: 'inv-123',
        type: 'SELL' as const,
        quantity: 3,
        pricePerShare: 250,
      };

      const investment = {
        id: 'inv-123',
        portfolioId,
        symbol: 'AAPL',
        shares: 10,
        avgCost: 150,
        totalInvested: 1500,
        currentValue: 2500,
        pnl: 1000,
        pnlPercentage: 66.67,
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.investment.findUnique.mockResolvedValue(investment);

      const expectedTransaction = {
        id: 'trans-124',
        portfolioId,
        investmentId: 'inv-123',
        type: 'SELL',
        quantity: 3,
        pricePerShare: 250,
        totalAmount: 750,
        transactionDate: expect.any(Date),
        createdAt: new Date(),
      };

      mockPrisma.transaction.create.mockResolvedValue(expectedTransaction);
      mockPrisma.investment.update.mockResolvedValue({
        ...investment,
        shares: 7,
        totalInvested: 1050,
        avgCost: 150,
      });

      const result = await service.addTransaction(portfolioId, dto);

      expect(result).toEqual(expectedTransaction);
    });

    it('should throw if not enough shares to sell', async () => {
      const portfolioId = 'portfolio-123';
      const dto = {
        investmentId: 'inv-123',
        type: 'SELL' as const,
        quantity: 20,
        pricePerShare: 250,
      };

      const investment = {
        id: 'inv-123',
        portfolioId,
        symbol: 'AAPL',
        shares: 10,
        avgCost: 150,
        totalInvested: 1500,
        currentValue: 2500,
        pnl: 1000,
        pnlPercentage: 66.67,
      };

      mockPrisma.investment.findUnique.mockResolvedValue(investment);
      mockPrisma.transaction.create.mockResolvedValue({ id: 'trans' });

      await expect(
        service.addTransaction(portfolioId, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction and reverse its effect on investment (BUY)', async () => {
      const portfolioId = 'portfolio-123';
      const transactionId = 'trans-123';

      const transaction = {
        id: transactionId,
        portfolioId,
        investmentId: 'inv-123',
        type: 'BUY',
        quantity: 5,
        pricePerShare: 200,
        totalAmount: 1000,
        transactionDate: new Date(),
        createdAt: new Date(),
      };

      const investment = {
        id: 'inv-123',
        portfolioId,
        symbol: 'AAPL',
        shares: 15,
        avgCost: 166.67,
        totalInvested: 2500,
        currentValue: 3750,
        pnl: 1250,
        pnlPercentage: 50,
      };

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockPrisma.investment.findUnique.mockResolvedValue(investment);
      mockPrisma.investment.update.mockResolvedValue({
        ...investment,
        shares: 10,
        totalInvested: 1500,
        avgCost: 150,
      });
      mockPrisma.transaction.delete.mockResolvedValue(transaction);

      const result = await service.deleteTransaction(transactionId, portfolioId);

      expect(result).toEqual(transaction);
      expect(mockPrisma.investment.update).toHaveBeenCalled();
      expect(mockPrisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
    });

    it('should throw if transaction not found', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteTransaction('non-existent', 'portfolio-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
