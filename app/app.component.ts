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
      Portfolio size:
      <select [(ngModel)]="options.portfolioSize" (change)="reset()">
        <option *ngFor="let size of portfolioSizes">{{size}}</option>
      </select><br>
      Service speed (ms):
      <select [(ngModel)]="options.serviceSpeed"  (change)="reset()">
        <option *ngFor="let speed of serviceSpeeds">{{speed}}</option>
      </select><br><br>
      Buffer size:
      <select [(ngModel)]="options.bufferSize"   (change)="reset()">
        <option *ngFor="let buffer of bufferSizes">{{buffer}}</option>
      </select><br>
      Publish window (ms):
      <select [(ngModel)]="options.publishWindow" (change)="reset()">
        <option *ngFor="let window of publishWindows">{{window}}</option>
      </select><br><br>
      <input id="zoneToggle" type="checkbox"
             [(ngModel)]="options.outsideZone" (change)="reset()" />
      <label for="zoneToggle"> Running outside Angular zone</label>
    </div>

    <hr>

    <p *ngIf="lastStockPrice">
      Latest price change:{{lastStockPrice.ticker}} - {{lastStockPrice.price}}
    </p>
    <div *ngFor="let stock of portfolio">
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
  publishWindows = [2000, 1000, 500, 1, 0];
  serviceSpeeds  = [100, 50, 10, 0];

  portfolio: StockPrice[];
  portFolioStockMap: { [key: string]: number };

  private options: PriceServiceOptions =
    Object.assign(new PriceServiceOptions(), {
      bufferSize: this.bufferSizes[0],
      outsideZone: false,
      portfolioSize: this.portfolioSizes[0],
      publishWindow: this.publishWindows[0],
      serviceSpeed:  this.serviceSpeeds[0],
    });

  constructor(private priceService: PriceService) {  }

  ngOnInit() {
    this.reset();

    // listen for stock price changes and update portfolio
    this.priceService.priceChanges
      .takeUntil(this.onDestroy)
      .subscribe(stocks => {

        // update portfolio
        stocks.forEach(stock => {
          const ix = this.portFolioStockMap[stock.ticker];
          if (ix !== undefined) {
            this.portfolio[ix] = stock;
          }
        });

        const last = stocks.length - 1;
        if (last >= 0) { this.lastStockPrice = stocks[last]; }
      });
  }

  ngOnDestroy() {
    this.onDestroy.complete();
  }

  /**
   * (re)set portfolio and price service options
   */
  reset() {
    this.portFolioStockMap = {};
    this.portfolio         = [];

    // initialize portfolio with initial prices
    const tickers = Object.keys(russell3000).slice(0, this.options.portfolioSize);
    tickers.forEach( (ticker, i) => {
      this.portFolioStockMap[ticker] = i;
      this.portfolio.push( {ticker, price: russell3000[ticker] });
    });

    // stock engine mix === portfolio size for now
    this.options.stockMixSize = this.options.portfolioSize;

    this.priceService.reset(this.options);
  }
}
