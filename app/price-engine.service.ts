import { Injectable, NgZone, OnDestroy } from '@angular/core';

import { priceChanges, russell3000 }     from './russell3000';

export type StockPrice = {ticker: string, price: number};

function minMax(value: number, min: number, max: number) {
  return Math.min(max, value, Math.max(min, value));
}

export class PriceEngineOptions {
  serviceSpeed = 100; // how often the price engine publishes a price change (ms)
  stockMixSize = 10;  // number of different kinds of stocks to emit
}

@Injectable()
/**
  *  Simulate a service pumping in stock price changes
  */
export class PriceEngine implements OnDestroy {

  inAngularZone = true;

  private options = new PriceEngineOptions();

  private priceChangeIx = 0;
  private priceChangesMax = priceChanges.length;
  private priceChangeTimerId: any;

  private serviceSpeed = 100;
  private stockMixSize = 10;

  private tickers = Object.keys(russell3000);
  private tickersLen = this.tickers.length;
  private tickerIx = 0;

  getPrices(processPrice: (price: StockPrice) => void) {

    this.inAngularZone = NgZone.isInAngularZone();
    console.log(`Price engine running in Angular zone: ${this.inAngularZone}`);

    clearInterval(this.priceChangeTimerId);
    if (processPrice) {
      this.priceChangeTimerId = setInterval(() => {
        processPrice(this.nextPrice());
      }, this.serviceSpeed);
    }
  }

  nextPrice(): StockPrice {
    this.tickerIx += 1;
    if (this.tickerIx === this.stockMixSize ) { this.tickerIx = 0; }

    this.priceChangeIx += 1;
    if (this.priceChangeIx === this.priceChangesMax ) { this.priceChangeIx = 0; }

    const ticker = this.tickers[this.tickerIx];
    return {
      ticker: ticker,
      price: russell3000[ticker] + priceChanges[this.priceChangeIx]
    };
  }

  ngOnDestroy() {
    clearInterval(this.priceChangeTimerId);
  }

  reset(options?: PriceEngineOptions) {
    Object.assign(this.options, options);
    this.serviceSpeed = minMax(this.options.serviceSpeed, 0, 1000);
    this.priceChangeIx = 0;
    this.stockMixSize = minMax(this.options.stockMixSize, 1, this.tickersLen);
    this.tickerIx = 0;
  }
}
