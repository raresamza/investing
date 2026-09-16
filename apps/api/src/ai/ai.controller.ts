import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jtw-auth.guard';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe';
import { z } from 'zod';
import type { PortfolioAnalysisRequest, DiscoveryRequest } from './ai.service';

const PortfolioAnalysisSchema = z.object({
  holdings: z.array(
    z.object({
      ticker: z.string(),
      shares: z.number().positive(),
      avg_cost: z.number().positive(),
      previously_sold: z.boolean().optional(),
    })
  ),
  strategy: z.enum(['rules', 'ml', 'ensemble']).optional(),
});

const DiscoverySchema = z.object({
  universe: z.string().optional().default('sp500'),
  top_n: z.number().min(1).max(50).optional().default(10),
  exclude_tickers: z.array(z.string()).optional().default([]),
  strategy: z.enum(['rules', 'ml', 'ensemble']).optional(),
});

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  async healthCheck() {
    return this.aiService.healthCheck();
  }

  @Post('analyze/portfolio')
  @UsePipes(new ZodValidationPipe(PortfolioAnalysisSchema))
  async analyzePortfolio(@Body() request: PortfolioAnalysisRequest) {
    return this.aiService.analyzePortfolio(request);
  }

  @Post('analyze/discover')
  @UsePipes(new ZodValidationPipe(DiscoverySchema))
  async discoverCandidates(@Body() request: DiscoveryRequest) {
    return this.aiService.discoverCandidates(request);
  }
}
