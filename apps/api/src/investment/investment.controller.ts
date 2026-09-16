import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UsePipes,
  Request,
} from '@nestjs/common';
import { InvestmentService } from './investment.service';
import { CreateInvestmentSchema, UpdateInvestmentSchema } from './dto/investment.dto';
import type { CreateInvestmentDto, UpdateInvestmentDto } from './dto/investment.dto';
import { CreateTransactionSchema } from './dto/transaction.dto';
import type { CreateTransactionDto } from './dto/transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jtw-auth.guard';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe';

@Controller('portfolio/:portfolioId/investments')
@UseGuards(JwtAuthGuard)
export class InvestmentController {
  constructor(private readonly investmentService: InvestmentService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateInvestmentSchema))
  async createInvestment(
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreateInvestmentDto,
  ) {
    return this.investmentService.createInvestment(portfolioId, dto);
  }

  @Get()
  async getInvestments(@Param('portfolioId') portfolioId: string) {
    return this.investmentService.getPortfolioInvestments(portfolioId);
  }

  @Get(':investmentId')
  async getInvestment(@Param('investmentId') investmentId: string) {
    return this.investmentService.getInvestment(investmentId);
  }

  @Put(':investmentId')
  @UsePipes(new ZodValidationPipe(UpdateInvestmentSchema))
  async updateInvestment(
    @Param('investmentId') investmentId: string,
    @Body() dto: UpdateInvestmentDto,
  ) {
    return this.investmentService.updateInvestment(investmentId, dto);
  }

  @Put(':investmentId/value')
  async updateInvestmentValue(
    @Param('investmentId') investmentId: string,
    @Body('currentValue') currentValue: number,
  ) {
    return this.investmentService.updateInvestmentValue(investmentId, currentValue);
  }

  @Delete(':investmentId')
  async deleteInvestment(@Param('investmentId') investmentId: string) {
    return this.investmentService.deleteInvestment(investmentId);
  }

  @Post('transactions')
  @UsePipes(new ZodValidationPipe(CreateTransactionSchema))
  async addTransaction(
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.investmentService.addTransaction(portfolioId, dto);
  }

  @Get('transactions/list')
  async getTransactions(@Param('portfolioId') portfolioId: string) {
    return this.investmentService.getPortfolioTransactions(portfolioId);
  }

  @Delete('transactions/:transactionId')
  async deleteTransaction(
    @Param('portfolioId') portfolioId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.investmentService.deleteTransaction(transactionId, portfolioId);
  }
}
