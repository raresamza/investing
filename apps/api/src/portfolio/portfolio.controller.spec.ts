import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

describe('PortfolioController', () => {
  let controller: PortfolioController;
  let service: PortfolioService;

  const mockService = {
    createPortfolio: jest.fn(),
    getPortfolio: jest.fn(),
    getUserPortfolio: jest.fn(),
    getAllPortfolios: jest.fn(),
    deletePortfolio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [
        {
          provide: PortfolioService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PortfolioController>(PortfolioController);
    service = module.get<PortfolioService>(PortfolioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPortfolio', () => {
    it('should create a portfolio', async () => {
      const req = { user: { sub: 'user-123' } };
      const dto = { currency: 'USD' };
      const expected = {
        id: 'portfolio-123',
        userId: 'user-123',
        currency: 'USD',
        investments: [],
      };

      mockService.createPortfolio.mockResolvedValue(expected);

      const result = await controller.createPortfolio(req, dto);

      expect(result).toEqual(expected);
      expect(mockService.createPortfolio).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('getUserPortfolio', () => {
    it('should return user portfolio', async () => {
      const req = { user: { sub: 'user-123' } };
      const expected = {
        id: 'portfolio-123',
        userId: 'user-123',
        currency: 'USD',
      };

      mockService.getUserPortfolio.mockResolvedValue(expected);

      const result = await controller.getUserPortfolio(req);

      expect(result).toEqual(expected);
      expect(mockService.getUserPortfolio).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getAllPortfolios', () => {
    it('should return all user portfolios', async () => {
      const req = { user: { sub: 'user-123' } };
      const expected = [
        { id: 'portfolio-123', userId: 'user-123', currency: 'USD' },
      ];

      mockService.getAllPortfolios.mockResolvedValue(expected);

      const result = await controller.getAllPortfolios(req);

      expect(result).toEqual(expected);
      expect(mockService.getAllPortfolios).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getPortfolio', () => {
    it('should return a specific portfolio', async () => {
      const portfolioId = 'portfolio-123';
      const expected = {
        id: portfolioId,
        userId: 'user-123',
        currency: 'USD',
      };

      mockService.getPortfolio.mockResolvedValue(expected);

      const result = await controller.getPortfolio(portfolioId);

      expect(result).toEqual(expected);
      expect(mockService.getPortfolio).toHaveBeenCalledWith(portfolioId);
    });
  });

  describe('deletePortfolio', () => {
    it('should delete a portfolio', async () => {
      const portfolioId = 'portfolio-123';
      const expected = {
        id: portfolioId,
        userId: 'user-123',
        currency: 'USD',
      };

      mockService.deletePortfolio.mockResolvedValue(expected);

      const result = await controller.deletePortfolio(portfolioId);

      expect(result).toEqual(expected);
      expect(mockService.deletePortfolio).toHaveBeenCalledWith(portfolioId);
    });
  });
});
