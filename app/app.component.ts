import { Component, OnInit, OnDestroy } from '@angular/core';

import { PriceEngine }              from './price-engine.service';
import { PriceService, StockPrice } from './price.service';
import { russell3000 }              from './russell3000';

import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

@Component({
  selector: 'my-app',
  template: `
    <h1>Stock Ticker</h1>
    <div>
      <button type="reset" (click)="reset()">Reset</button>
      Portfolio size:
      <select [(ngModel)]="portfolioSize" (change)="reset()">
        <option *ngFor="let size of portfolioSizes">{{size}}</option>
      </select>
      Service speed (ms):
      <select [(ngModel)]="serviceSpeed"  (change)="reset()">
        <option *ngFor="let speed of serviceSpeeds">{{speed}}</option>
      </select>
      <br>
      <input type="checkbox" [(ngModel)]="outsideZone"  (change)="reset()"/>
      run outside zone; publish window:
      <select [(ngModel)]="publishWindow"  (change)="reset()">
        <option *ngFor="let window of publishWindows">{{window}}</option>
      </select>
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

  outsideZone = false;

  portfolioSizes = [10, 50, 100, 400, 800, 2000, 2500, 3000];
  portfolioSize = this.portfolioSizes[0];

  publishWindows = [2000, 1000, 500, 0];
  publishWindow = this.publishWindows[0];

  serviceSpeeds = [100, 50, 10, 0];
  serviceSpeed = this.serviceSpeeds[0];

  stocks: StockPrice[];
  stockMap: { [key: string]: number };

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

    const tickers = Object.keys(russell3000).slice(0, this.portfolioSize);
    tickers.forEach( (ticker, i) => {
      this.stockMap[ticker] = i;
      this.stocks.push( {ticker, price: russell3000[ticker] });
    });

    this.priceService.start(
      this.portfolioSize,
      this.serviceSpeed,
      this.outsideZone,
      this.publishWindow)

      .takeUntil(this.onDestroy)
      .subscribe(prices => {
        prices.forEach(price => {
          this.stocks[this.stockMap[price.ticker]].price = price.price;
        });
        const last = prices.length - 1;
        if (last >= 0) { this.lastStockPrice = prices[last]; }
      });
  }
}
