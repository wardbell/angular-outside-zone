import { Injectable, NgZone, OnDestroy } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { Observer }   from 'rxjs/Observer';
import 'rxjs/add/operator/share';

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

  priceChanges: Observable<StockPrice[]> = Observable.create((observer: Observer<StockPrice[]>) => {
      this.priceObserver = observer;
      this.observe();
    })
    .share();

  private options: PriceServiceOptions = new PriceServiceOptions();
  private priceChangesBuffer: StockPrice[] = [];
  private priceObserver: Observer<StockPrice[]>;
  private publishNow = false;
  private publishTimerId: any;

  constructor(private ngZone: NgZone, private priceEngine: PriceEngine) { }

  /**
   * (re)set service and engine options
   */
  reset(options?: PriceServiceOptions): void {
    Object.assign(this.options, options);
    this.options.bufferSize    = minMax(this.options.bufferSize, 1, 100);
    this.options.portfolioSize = minMax(this.options.portfolioSize, 1, portfolioMax);
    this.options.publishWindow = minMax(this.options.publishWindow, 0, 3000);

    this.priceEngine.reset(this.options);
    this.priceChangesBuffer = [];
    this.setPublishTimer();
    this.observe();
  };

  ngOnDestroy() {
    console.log('PriceService disposed');
    clearInterval(this.publishTimerId);
    if (this.priceObserver) {
      this.priceObserver.complete();
      this.priceObserver = undefined;
    }
  }

  ///// private //////

  private getPrices(publish: () => void) {
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
    this.getPrices(() => this.publishPrices());
  }

  private getPricesOutsideZone(observer: Observer<StockPrice[]>) {
    this.ngZone.runOutsideAngular(() => {
      this.getPrices(() => this.ngZone.run(() => this.publishPrices()));
    });
  }

  private observe() {
    if (this.priceObserver) {
      if (this.options.outsideZone) {
        this.getPricesOutsideZone(this.priceObserver);
      } else {
        this.getPricesInsideZone(this.priceObserver);
      }
    }
  }

  private publishPrices() {
    this.priceObserver.next(this.priceChangesBuffer);
    this.priceChangesBuffer = [];
  }

  private setPublishTimer() {
    this.publishNow = false;
    clearInterval(this.publishTimerId);
    if (this.options.publishWindow) {
      this.publishTimerId = setInterval(
        () => this.publishNow = true,
        this.options.publishWindow);
    }
  }
}
