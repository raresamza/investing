import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let prisma: PrismaService;

  const mockPrisma = {
    portfolio: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPortfolio', () => {
    it('should create a portfolio', async () => {
      const userId = 'user-123';
      const dto = { currency: 'USD' };
      const expected = {
        id: 'portfolio-123',
        userId,
        currency: 'USD',
        investments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.portfolio.create.mockResolvedValue(expected);

      const result = await service.createPortfolio(userId, dto);

      expect(result).toEqual(expected);
      expect(mockPrisma.portfolio.create).toHaveBeenCalledWith({
        data: { userId, currency: dto.currency },
        include: { investments: true },
      });
    });
  });

  describe('getPortfolio', () => {
    it('should return a portfolio with investments and transactions', async () => {
      const portfolioId = 'portfolio-123';
      const expected = {
        id: portfolioId,
        userId: 'user-123',
        currency: 'USD',
        investments: [],
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.portfolio.findUnique.mockResolvedValue(expected);

      const result = await service.getPortfolio(portfolioId);

      expect(result).toEqual(expected);
      expect(mockPrisma.portfolio.findUnique).toHaveBeenCalledWith({
        where: { id: portfolioId },
        include: {
          investments: { orderBy: { createdAt: 'desc' } },
          transactions: { orderBy: { transactionDate: 'desc' } },
        },
      });
    });
  });

  describe('getUserPortfolio', () => {
    it('should return the first portfolio for a user', async () => {
      const userId = 'user-123';
      const expected = {
        id: 'portfolio-123',
        userId,
        currency: 'USD',
        investments: [],
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.portfolio.findFirst.mockResolvedValue(expected);

      const result = await service.getUserPortfolio(userId);

      expect(result).toEqual(expected);
      expect(mockPrisma.portfolio.findFirst).toHaveBeenCalledWith({
        where: { userId },
        include: {
          investments: { orderBy: { createdAt: 'desc' } },
          transactions: { orderBy: { transactionDate: 'desc' } },
        },
      });
    });
  });

  describe('getAllPortfolios', () => {
    it('should return all portfolios for a user', async () => {
      const userId = 'user-123';
      const expected = [
        {
          id: 'portfolio-123',
          userId,
          currency: 'USD',
          investments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.portfolio.findMany.mockResolvedValue(expected);

      const result = await service.getAllPortfolios(userId);

      expect(result).toEqual(expected);
      expect(mockPrisma.portfolio.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { investments: true },
      });
    });
  });

  describe('deletePortfolio', () => {
    it('should delete a portfolio', async () => {
      const portfolioId = 'portfolio-123';
      const expected = {
        id: portfolioId,
        userId: 'user-123',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.portfolio.delete.mockResolvedValue(expected);

      const result = await service.deletePortfolio(portfolioId);

      expect(result).toEqual(expected);
      expect(mockPrisma.portfolio.delete).toHaveBeenCalledWith({
        where: { id: portfolioId },
      });
    });
  });
});
