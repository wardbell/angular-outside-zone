import { Injectable, NgZone, OnDestroy } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { Observer }   from 'rxjs/Observer';
import { Subject }    from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

import { PriceEngine, PriceEngineOptions, StockPrice } from './price-engine.service';
export { StockPrice }  from './price-engine.service';
import { russell3000 } from './russell3000';

const portfolioMax = Object.keys(russell3000).length;

function minMax(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export class PriceServiceOptions extends PriceEngineOptions {
  bufferSize    = 100;   // price change buffer max; publishes when exceeded
  outsideZone   = false; // true === run outside Angular zone
  portfolioSize = 10;    // number of stocks in portfolio
  publishWindow = 2000;  // max time (ms) to publish outside zone  portfolioSize = 10;
}

@Injectable()
export class PriceService implements OnDestroy {

  private onDestroy: Subject<any>;
  private options: PriceServiceOptions = new PriceServiceOptions();
  private priceChanges: Observable<StockPrice[]>;
  private priceChangesBuffer: StockPrice[] = [];
  private publishNow = false;
  private publishTimerId: any;

  constructor(private ngZone: NgZone, private priceEngine: PriceEngine) { }

  getPriceChanges() {
    return this.priceChanges || this.reset();
  }

  reset(options?: PriceServiceOptions): Observable<StockPrice[]> {
    Object.assign(this.options, options);
    this.options.bufferSize    = minMax(this.options.bufferSize, 1, 100);
    this.options.portfolioSize = minMax(this.options.portfolioSize, 1, portfolioMax);
    this.options.publishWindow = minMax(this.options.publishWindow, 0, 3000);

    // stock engine mix === portfolio size for now
    this.options.stockMixSize = this.options.portfolioSize;

    this.priceEngine.reset(this.options);
    clearInterval(this.publishTimerId);

    if (this.onDestroy) {
      this.onDestroy.complete();
    }
    this.onDestroy = new Subject<any>();

    this.priceChangesBuffer = [];
    this.priceChanges = this.createChanges();
    return this.priceChanges;
  };

  ngOnDestroy() {
    console.log('PriceService disposed');
    clearInterval(this.publishTimerId);
    this.onDestroy.complete();
  }

  ///// private //////

  private createChanges() {
    return Observable.create((observer: Observer<StockPrice[]>) => {
      if (this.options.outsideZone) {
        this.getPricesOutsideZone(observer);
      } else {
        this.getPricesInsideZone(observer);
      }
    })
    .takeUntil(this.onDestroy);
  }

  private getPrices(publish: () => void) {
    clearInterval(this.publishTimerId);
    this.publishTimerId = setInterval(() => this.publishNow = true, this.options.publishWindow);

    this.priceEngine.getPrices(price => {
      this.priceChangesBuffer.push(price);
      if ((this.publishNow && this.priceChangesBuffer.length > 0) ||
           this.priceChangesBuffer.length > this.options.bufferSize ) {
        this.publishNow = false;
        if (this.priceChangesBuffer.length) {
          publish();
        }
      }
    });
  }

  private getPricesInsideZone(observer: Observer<StockPrice[]>) {
    this.getPrices(() => this.publishPrices(observer));
  }

  private getPricesOutsideZone(observer: Observer<StockPrice[]>) {
    this.ngZone.runOutsideAngular(() => {
      this.getPrices(() => this.ngZone.run(() => this.publishPrices(observer)));
    });
  }

  private publishPrices(observer: Observer<StockPrice[]>) {
    observer.next(this.priceChangesBuffer);
    this.priceChangesBuffer = [];
  }
}
