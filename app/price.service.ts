import { Injectable, NgZone, OnDestroy } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { Observer }   from 'rxjs/Observer';
import { Subject }    from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';

import { PriceEngine, StockPrice } from './price-engine.service';
export { StockPrice } from './price-engine.service';

@Injectable()
export class PriceService implements OnDestroy {

  private changes: Observable<StockPrice[]>;
  private onDestroy: Subject<any>;
  private publishWindow = 2000; // max time (ms) to publish outside zone
  private zoneTimerId: any;

  constructor(private ngZone: NgZone, private priceEngine: PriceEngine) { }

  getPriceChanges() {
    if (!this.changes) {
      this.start();
    }
    return this.changes;
  }

  start(portfolioSize = 10, delay = 100, outsideZone = false, publishWindow = 2000): Observable<StockPrice[]> {
    this.priceEngine.reset(portfolioSize, delay);
    this.publishWindow = publishWindow;
    clearInterval(this.zoneTimerId);

    if (this.onDestroy) {
      this.onDestroy.complete();
    }
    this.onDestroy = new Subject<any>();

    this.changes = this.createChanges(outsideZone);
    return this.changes;
  };

  private createChanges(outsideZone: boolean) {
    return Observable.create((observer: Observer<StockPrice[]>) => {
      if (outsideZone) {
        this.getPricesOutsideZone(observer);
      } else {
        this.getPricesInsideZone(observer);
      }
    })
    .takeUntil(this.onDestroy);
  }

  ngOnDestroy() {
    console.log('PriceService disposed');
    clearInterval(this.zoneTimerId);
    this.onDestroy.complete();
  }

  private getPricesInsideZone(observer: Observer<StockPrice[]>) {
    this.priceEngine.getPrices(price => observer.next([price]));
  }

  private getPricesOutsideZone(observer: Observer<StockPrice[]>) {
    const ngZone = this.ngZone;
    let prices: StockPrice[] = [];
    let publishNow = false;

    this.zoneTimerId = setInterval(() => publishNow = true, this.publishWindow);

    ngZone.runOutsideAngular(() => {
      this.priceEngine.getPrices(price => publish(price));
    });

    function publish(price: StockPrice) {
      prices.push(price);

      if ((publishNow && prices.length > 0) ||
           prices.length > 100 ) {
        ngZone.run(() => {
          publishNow = false;
          observer.next(prices);
          prices = [];
        });
      }
    }
  }
}
