import { Injectable, OnDestroy } from '@angular/core';

import { priceChanges, russell3000 } from './russell3000';

export type StockPrice = {ticker: string, price: number};

@Injectable()
/**
  *  Simulate a service pumping in stock prices
  */
export class PriceEngine implements OnDestroy {

  private delay = 100; // ms delay before next price pushed

  private priceChangeIx = 0;
  private priceChangesMax = priceChanges.length - 1;
  private priceChangeTimerId: any;

  private tickers = Object.keys(russell3000);
  private tickersLen = this.tickers.length;
  private tickerIx = 0;
  private tickerIxMax = this.tickersLen - 1;

  getPrices(processPrice: (price: StockPrice) => void) {
    clearInterval(this.priceChangeTimerId);
    if (processPrice) {
      this.priceChangeTimerId = setInterval(() => {
        processPrice(this.nextPrice());
      }, this.delay);
    }
  }

  nextPrice(): StockPrice {
    this.tickerIx = this.tickerIx++ === this.tickerIxMax ? 0 : this.tickerIx;
    this.priceChangeIx = this.priceChangeIx++ === this.priceChangesMax ? 0 : this.priceChangeIx;

    const ticker = this.tickers[this.tickerIx];
    return {
      ticker: ticker,
      price: russell3000[ticker] + priceChanges[this.priceChangeIx]
    };
  }

  ngOnDestroy() {
    clearInterval(this.priceChangeTimerId);
  }

  reset(portfolioSize = 10, delay = 100) {
    this.delay = Math.min(1000, delay, Math.max(0, delay));
    this.priceChangeIx = 0;
    this.tickerIx = 0;
    this.tickerIxMax = Math.min(this.tickersLen, portfolioSize, Math.max(1, portfolioSize)) - 1;
  }
}
