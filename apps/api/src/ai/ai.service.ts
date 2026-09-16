import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface HoldingInput {
  ticker: string;
  shares: number;
  avg_cost: number;
  previously_sold?: boolean;
}

export interface PortfolioAnalysisRequest {
  holdings: HoldingInput[];
  strategy?: 'rules' | 'ml' | 'ensemble';
}

export interface DiscoveryRequest {
  universe?: string;
  top_n?: number;
  exclude_tickers?: string[];
  strategy?: 'rules' | 'ml' | 'ensemble';
}

@Injectable()
export class AiService {
  private aiApiUrl: string;

  constructor() {
    this.aiApiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  }

  async analyzePortfolio(request: PortfolioAnalysisRequest) {
    try {
      const response = await axios.post(
        `${this.aiApiUrl}/analyze/portfolio`,
        request,
      );
      return response.data;
    } catch (error) {
      console.error('AI service portfolio analysis failed:', error);
      throw error;
    }
  }

  async discoverCandidates(request: DiscoveryRequest) {
    try {
      const response = await axios.post(
        `${this.aiApiUrl}/analyze/discover`,
        request,
      );
      return response.data;
    } catch (error) {
      console.error('AI service discovery failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.aiApiUrl}/health`);
      return response.data;
    } catch (error) {
      console.error('AI service health check failed:', error);
      return { status: 'unavailable' };
    }
  }
}
