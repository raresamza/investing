import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UsePipes,
  Request,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioSchema } from './dto/create-portfolio.dto';
import type { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { JwtAuthGuard } from '../auth/guards/jtw-auth.guard';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePortfolioSchema))
  async createPortfolio(@Request() req: any, @Body() dto: CreatePortfolioDto) {
    return this.portfolioService.createPortfolio(req.user.sub, dto);
  }

  @Get('current')
  async getUserPortfolio(@Request() req: any) {
    return this.portfolioService.getUserPortfolio(req.user.sub);
  }

  @Get()
  async getAllPortfolios(@Request() req: any) {
    return this.portfolioService.getAllPortfolios(req.user.sub);
  }

  @Get(':id')
  async getPortfolio(@Param('id') id: string) {
    return this.portfolioService.getPortfolio(id);
  }

  @Delete(':id')
  async deletePortfolio(@Param('id') id: string) {
    return this.portfolioService.deletePortfolio(id);
  }
}
