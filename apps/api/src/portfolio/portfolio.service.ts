import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePortfolioDto } from './dto/create-portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async createPortfolio(userId: string, dto: CreatePortfolioDto) {
    return this.prisma.portfolio.create({
      data: {
        userId,
        currency: dto.currency,
      },
      include: {
        investments: true,
      },
    });
  }

  async getPortfolio(portfolioId: string) {
    return this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        investments: {
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
      },
    });
  }

  async getUserPortfolio(userId: string) {
    return this.prisma.portfolio.findFirst({
      where: { userId },
      include: {
        investments: {
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
      },
    });
  }

  async getAllPortfolios(userId: string) {
    return this.prisma.portfolio.findMany({
      where: { userId },
      include: {
        investments: true,
      },
    });
  }

  async deletePortfolio(portfolioId: string) {
    return this.prisma.portfolio.delete({
      where: { id: portfolioId },
    });
  }
}
