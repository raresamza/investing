import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentController } from './investment.controller';
import { InvestmentService } from './investment.service';

describe('InvestmentController', () => {
  let controller: InvestmentController;
  let service: InvestmentService;

  const mockService = {
    createInvestment: jest.fn(),
    getInvestment: jest.fn(),
    getPortfolioInvestments: jest.fn(),
    updateInvestment: jest.fn(),
    updateInvestmentValue: jest.fn(),
    deleteInvestment: jest.fn(),
    addTransaction: jest.fn(),
    getPortfolioTransactions: jest.fn(),
    deleteTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestmentController],
      providers: [
        {
          provide: InvestmentService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<InvestmentController>(InvestmentController);
    service = module.get<InvestmentService>(InvestmentService);
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
      };
      const expected = {
        id: 'inv-123',
        portfolioId,
        ...dto,
        totalInvested: 1500,
        currentValue: 1500,
        pnl: 0,
        pnlPercentage: 0,
      };

      mockService.createInvestment.mockResolvedValue(expected);

      const result = await controller.createInvestment(portfolioId, dto);

      expect(result).toEqual(expected);
      expect(mockService.createInvestment).toHaveBeenCalledWith(
        portfolioId,
        dto,
      );
    });
  });

  describe('getInvestments', () => {
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
        },
      ];

      mockService.getPortfolioInvestments.mockResolvedValue(expected);

      const result = await controller.getInvestments(portfolioId);

      expect(result).toEqual(expected);
      expect(mockService.getPortfolioInvestments).toHaveBeenCalledWith(
        portfolioId,
      );
    });
  });

  describe('getInvestment', () => {
    it('should return a specific investment', async () => {
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
      };

      mockService.getInvestment.mockResolvedValue(expected);

      const result = await controller.getInvestment(investmentId);

      expect(result).toEqual(expected);
      expect(mockService.getInvestment).toHaveBeenCalledWith(investmentId);
    });
  });

  describe('updateInvestment', () => {
    it('should update an investment', async () => {
      const investmentId = 'inv-123';
      const dto = { shares: 15 };
      const expected = {
        id: investmentId,
        portfolioId: 'portfolio-123',
        symbol: 'AAPL',
        name: 'Apple',
        shares: 15,
        avgCost: 150,
        currentValue: 2250,
        totalInvested: 2250,
        pnl: 0,
        pnlPercentage: 0,
      };

      mockService.updateInvestment.mockResolvedValue(expected);

      const result = await controller.updateInvestment(investmentId, dto);

      expect(result).toEqual(expected);
      expect(mockService.updateInvestment).toHaveBeenCalledWith(
        investmentId,
        dto,
      );
    });
  });

  describe('updateInvestmentValue', () => {
    it('should update investment current value', async () => {
      const investmentId = 'inv-123';
      const currentValue = 2000;
      const expected = {
        id: investmentId,
        portfolioId: 'portfolio-123',
        symbol: 'AAPL',
        currentValue,
        pnl: 500,
        pnlPercentage: 33.33,
      };

      mockService.updateInvestmentValue.mockResolvedValue(expected);

      const result = await controller.updateInvestmentValue(
        investmentId,
        currentValue,
      );

      expect(result).toEqual(expected);
      expect(mockService.updateInvestmentValue).toHaveBeenCalledWith(
        investmentId,
        currentValue,
      );
    });
  });

  describe('deleteInvestment', () => {
    it('should delete an investment', async () => {
      const investmentId = 'inv-123';
      const expected = { id: investmentId };

      mockService.deleteInvestment.mockResolvedValue(expected);

      const result = await controller.deleteInvestment(investmentId);

      expect(result).toEqual(expected);
      expect(mockService.deleteInvestment).toHaveBeenCalledWith(investmentId);
    });
  });

  describe('addTransaction', () => {
    it('should add a transaction', async () => {
      const portfolioId = 'portfolio-123';
      const dto = {
        investmentId: 'inv-123',
        type: 'BUY' as const,
        quantity: 5,
        pricePerShare: 200,
      };
      const expected = {
        id: 'trans-123',
        portfolioId,
        ...dto,
        totalAmount: 1000,
        transactionDate: new Date(),
      };

      mockService.addTransaction.mockResolvedValue(expected);

      const result = await controller.addTransaction(portfolioId, dto);

      expect(result).toEqual(expected);
      expect(mockService.addTransaction).toHaveBeenCalledWith(portfolioId, dto);
    });
  });

  describe('getTransactions', () => {
    it('should return all transactions for a portfolio', async () => {
      const portfolioId = 'portfolio-123';
      const expected = [
        {
          id: 'trans-123',
          portfolioId,
          investmentId: 'inv-123',
          type: 'BUY',
          quantity: 5,
          pricePerShare: 200,
          totalAmount: 1000,
          transactionDate: new Date(),
        },
      ];

      mockService.getPortfolioTransactions.mockResolvedValue(expected);

      const result = await controller.getTransactions(portfolioId);

      expect(result).toEqual(expected);
      expect(mockService.getPortfolioTransactions).toHaveBeenCalledWith(
        portfolioId,
      );
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction', async () => {
      const portfolioId = 'portfolio-123';
      const transactionId = 'trans-123';
      const expected = { id: transactionId };

      mockService.deleteTransaction.mockResolvedValue(expected);

      const result = await controller.deleteTransaction(
        portfolioId,
        transactionId,
      );

      expect(result).toEqual(expected);
      expect(mockService.deleteTransaction).toHaveBeenCalledWith(
        transactionId,
        portfolioId,
      );
    });
  });
});
