import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { JwtAuthGuard } from '../auth/guards/jtw-auth.guard';

@Controller('market-data')
@UseGuards(JwtAuthGuard)
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('price')
  async getPrice(@Query('ticker') ticker: string) {
    if (!ticker) {
      throw new Error('Ticker symbol required');
    }
    return this.marketDataService.getStockPrice(ticker.toUpperCase());
  }

  @Get('prices')
  async getPrices(@Query('tickers') tickers: string) {
    if (!tickers) {
      throw new Error('Ticker symbols required');
    }
    const tickerList = tickers.split(',').map((t) => t.trim().toUpperCase());
    return this.marketDataService.getMultiplePrices(tickerList);
  }
}
