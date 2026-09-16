import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestmentDto, UpdateInvestmentDto } from './dto/investment.dto';
import { CreateTransactionDto } from './dto/transaction.dto';

@Injectable()
export class InvestmentService {
  constructor(private prisma: PrismaService) {}

  async createInvestment(portfolioId: string, dto: CreateInvestmentDto) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const existing = await this.prisma.investment.findUnique({
      where: {
        portfolioId_symbol: { portfolioId, symbol: dto.symbol },
      },
    });

    if (existing) {
      throw new BadRequestException('Investment with this symbol already exists');
    }

    const totalInvested = dto.shares * dto.avgCost;

    return this.prisma.investment.create({
      data: {
        portfolioId,
        symbol: dto.symbol,
        name: dto.name,
        shares: dto.shares,
        avgCost: dto.avgCost,
        totalInvested,
        currentValue: totalInvested,
        pnl: 0,
        pnlPercentage: 0,
        color: dto.color,
      },
    });
  }

  async getInvestment(investmentId: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    return investment;
  }

  async getPortfolioInvestments(portfolioId: string) {
    return this.prisma.investment.findMany({
      where: { portfolioId },
      include: {
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateInvestmentValue(investmentId: string, currentValue: number) {
    const investment = await this.getInvestment(investmentId);

    const pnl = currentValue - investment.totalInvested;
    const pnlPercentage =
      investment.totalInvested > 0
        ? (pnl / investment.totalInvested) * 100
        : 0;

    return this.prisma.investment.update({
      where: { id: investmentId },
      data: {
        currentValue,
        pnl,
        pnlPercentage,
      },
    });
  }

  async updateInvestment(investmentId: string, dto: UpdateInvestmentDto) {
    const investment = await this.getInvestment(investmentId);

    const shares = dto.shares ?? investment.shares;
    const avgCost = dto.avgCost ?? investment.avgCost;
    const totalInvested = shares * avgCost;

    return this.prisma.investment.update({
      where: { id: investmentId },
      data: {
        symbol: dto.symbol ?? investment.symbol,
        name: dto.name ?? investment.name,
        shares,
        avgCost,
        totalInvested,
        color: dto.color ?? investment.color,
      },
    });
  }

  async deleteInvestment(investmentId: string) {
    return this.prisma.investment.delete({
      where: { id: investmentId },
    });
  }

  async addTransaction(portfolioId: string, dto: CreateTransactionDto) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: dto.investmentId },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    if (investment.portfolioId !== portfolioId) {
      throw new BadRequestException(
        'Investment does not belong to this portfolio',
      );
    }

    const totalAmount = dto.quantity * dto.pricePerShare;
    const transactionDate = dto.transactionDate
      ? new Date(dto.transactionDate)
      : new Date();

    const transaction = await this.prisma.transaction.create({
      data: {
        portfolioId,
        investmentId: dto.investmentId,
        type: dto.type,
        quantity: dto.quantity,
        pricePerShare: dto.pricePerShare,
        totalAmount,
        transactionDate,
      },
    });

    // Update investment shares based on transaction type
    if (dto.type === 'BUY') {
      const newShares = investment.shares + dto.quantity;
      const newTotalInvested =
        investment.totalInvested + totalAmount;
      const newAvgCost = newTotalInvested / newShares;

      await this.prisma.investment.update({
        where: { id: dto.investmentId },
        data: {
          shares: newShares,
          totalInvested: newTotalInvested,
          avgCost: newAvgCost,
        },
      });
    } else if (dto.type === 'SELL') {
      if (investment.shares < dto.quantity) {
        throw new BadRequestException('Not enough shares to sell');
      }

      const newShares = investment.shares - dto.quantity;
      const sharesRemovedValue = dto.quantity * investment.avgCost;
      const newTotalInvested = investment.totalInvested - sharesRemovedValue;

      await this.prisma.investment.update({
        where: { id: dto.investmentId },
        data: {
          shares: newShares,
          totalInvested: newTotalInvested,
        },
      });
    }

    return transaction;
  }

  async getPortfolioTransactions(portfolioId: string) {
    return this.prisma.transaction.findMany({
      where: { portfolioId },
      include: {
        investment: true,
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async deleteTransaction(transactionId: string, portfolioId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.portfolioId !== portfolioId) {
      throw new BadRequestException(
        'Transaction does not belong to this portfolio',
      );
    }

    // Reverse the transaction's effect on the investment
    const investment = await this.prisma.investment.findUnique({
      where: { id: transaction.investmentId },
    });

    if (investment) {
      if (transaction.type === 'BUY') {
        const newShares = investment.shares - transaction.quantity;
        const newTotalInvested =
          investment.totalInvested - transaction.totalAmount;
        const newAvgCost =
          newShares > 0 ? newTotalInvested / newShares : 0;

        await this.prisma.investment.update({
          where: { id: investment.id },
          data: {
            shares: newShares,
            totalInvested: newTotalInvested,
            avgCost: newAvgCost,
          },
        });
      } else if (transaction.type === 'SELL') {
        const newShares = investment.shares + transaction.quantity;
        const newTotalInvested =
          investment.totalInvested + transaction.totalAmount;
        const newAvgCost = newTotalInvested / newShares;

        await this.prisma.investment.update({
          where: { id: investment.id },
          data: {
            shares: newShares,
            totalInvested: newTotalInvested,
            avgCost: newAvgCost,
          },
        });
      }
    }

    return this.prisma.transaction.delete({
      where: { id: transactionId },
    });
  }
}
