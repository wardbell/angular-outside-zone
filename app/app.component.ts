import { Component, OnInit, OnDestroy } from '@angular/core';

import { PriceEngine } from './price-engine.service';
import { PriceService, PriceServiceOptions, StockPrice } from './price.service';
import { russell3000 } from './russell3000';

import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

@Component({
  selector: 'my-app',
  template: `
    <h1>NgZone Stock Ticker</h1>
    <div>
      <button type="reset" (click)="reset()">Reset</button><br>
      Portfolio size:
      <select [(ngModel)]="options.portfolioSize" (change)="reset()">
        <option *ngFor="let size of portfolioSizes">{{size}}</option>
      </select><br>
      Service speed (ms):
      <select [(ngModel)]="options.serviceSpeed"  (change)="reset()">
        <option *ngFor="let speed of serviceSpeeds">{{speed}}</option>
      </select><br>
      publish window:
      <select [(ngModel)]="options.publishWindow"  (change)="reset()">
        <option *ngFor="let window of publishWindows">{{window}}</option>
      </select><br>
      Buffer size:
      <select [(ngModel)]="options.bufferSize"  (change)="reset()">
        <option *ngFor="let buffer of bufferSizes">{{buffer}}</option>
      </select><br>
      <input type="checkbox" [(ngModel)]="options.outsideZone"  (change)="reset()"/> run outside zone
    </div>
    <p *ngIf="lastStockPrice">
      Last price:{{lastStockPrice.ticker}} - {{lastStockPrice.price}}
    </p>
    <div *ngFor="let stock of stocks">
      <strong>{{stock.ticker}}</strong>: {{stock.price}}
    </div>
  `,
  providers: [ PriceEngine, PriceService ]
})
export class AppComponent implements OnInit, OnDestroy {

  private onDestroy = new Subject<any>();

  lastStockPrice: StockPrice;
  bufferSizes    = [100, 50, 1];
  portfolioSizes = [10, 50, 100, 400, 800, 2000, 2500, 3000];
  publishWindows = [2000, 1000, 500, 0];
  serviceSpeeds  = [100, 50, 10, 0];
  stocks: StockPrice[];
  stockMap: { [key: string]: number };

  private options: PriceServiceOptions =
    Object.assign(new PriceServiceOptions, {
      bufferSize: this.bufferSizes[0],
      outsideZone: false,
      portfolioSize: this.portfolioSizes[0],
      publishWindow: this.publishWindows[0],
      serviceSpeed:  this.serviceSpeeds[0],
    });

  tickers: string[] = [];

  constructor(private priceService: PriceService) {  }

  ngOnInit() {
    this.reset();
  }

  ngOnDestroy() {
    this.onDestroy.complete();
  }

  reset() {
    this.stockMap = {};
    this.stocks   = [];

    const tickers = Object.keys(russell3000).slice(0, this.options.portfolioSize);
    tickers.forEach( (ticker, i) => {
      this.stockMap[ticker] = i;
      this.stocks.push( {ticker, price: russell3000[ticker] });
    });

    this.priceService.start(this.options)
      .takeUntil(this.onDestroy)
      .subscribe(prices => {
        prices.forEach(price => {
          const ix = this.stockMap[price.ticker];
          if (ix !== undefined) {
            this.stocks[ix].price = price.price;
          }
        });
        const last = prices.length - 1;
        if (last >= 0) { this.lastStockPrice = prices[last]; }
      });
  }
}
