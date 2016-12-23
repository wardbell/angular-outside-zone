## Angular Outside The Zone

Demonstrates performance benefit of running a chatty async process outside the Angular zone.

Simulates presentation of a portfolio of Russel 3000 stocks,
updated by an in-memory price engine that pushes imaginary stock price changes to the client.

A price service listens to the stock price changes coming from the price engine.
This service publishes an array of these stock price changes in an observable.

The UI (`AppComponent`) subscribes to the observable and updates its views
which entails presenting the portfolio, updated with price changes 
from the service.

Various switches in the UI control the behavior of the price service and price engine.

* Portfolio size:  How many stocks to track and present. 
The higher the number, the more views on screen to bind.

* Service speed: How fast (in milliseconds) the price engine returns stock price changes.
The lower the number, the faster it goes, 
potentially triggering a round of change detection at the minimum `setTimeout` cycle.
When set to zero, I rather doubt it actually emits a price change 
in less than 1 ms but that's the goal.

* Flag to run outside the `NgZone`. 
The price engine is identical whether run inside or outside the `NgZone`. 
How it works is explained below.

* Publish window: How often to publish price changes into Angular 
when running outside the `NgZone`.

Any change to any of the switches triggers a reset ... as does the "Reset" button.

### Running inside the Zone

When running inside the `NgZone` (the default for normal Angular code), 
the price service updates after every price change,
publishing an array with _one price-change item_.
The `AppComponent` subscribes to that observable and updates its view(s) with that one change.

When the dials are turned up (3000 stocks, 0 ms price engine delay),
it's still remarkably fast but the CPU is cranked and 
the fan is blowing on my box.
Check your machine's performance profile.

### Running outside the Zone

When the flag for running outside the `NgZone` is checked, the behavior changes markedly.

The price engine continues to run at the selected pace.
But the price service runs the engine _outside the Angular zone_.
There is no Angular change detection while it runs outside the zone.

While outside the zone, the price engine changes are buffered in an array.
When the buffer is full (fixed at 100 price changes),
the service returns to the Angular zone and publishes the array in the observable.
The UI updates the screen accordingly.

The service also has an outside-the-zone _publish time window_ 
to ensure that price changes are published regularly even if the buffer is not full.
This is important when the price engine returns price changes at a more leisurely pace.
The adjustable window is set to 2 seconds by default.

When the dials are turned up (3000 stocks, 0 ms price engine delay)
and the publish window is in the 1/2 to 2 second range,
my CPU usage drops dramatically and my box stays reasonably cool.

### Other optimizations

There are none here. A few ideas come to mind. 

The service might be a candidate for running in a web worker, off the UI thread.

I deliberately didn't play with the `ChangeDetectionStrategy.OnPush`
nor with attach and detach because I wanted to focus on the outside-of-the-zone effect. 
I rather doubt that these change detection games will be as effective as moving out of the zone
and off thread. But one cannot know until one tries.

I didn't make the buffer size adjustable nor 
optimize the update of the views from the array.

## Install it

Either clone it or download and unzip it from github.

Install the npm packages described in the `package.json` and verify that it works:

```bash
npm install
npm start
```

The `npm start` command first compiles the application, 
then simultaneously re-compiles and runs the `lite-server`.
Both the compiler and the server watch for file changes.

Shut it down manually with `Ctrl-C`.

## Prerequisites

Node.js and npm are essential to Angular development. 
    
<a href="https://docs.npmjs.com/getting-started/installing-node" target="_blank" title="Installing Node.js and updating npm">
Get it now</a> if it's not already installed on your machine.
 
**Verify that you are running at least node `v4.x.x` and npm `3.x.x`**
by running `node -v` and `npm -v` in a terminal/console window.
Older versions produce errors.

We recommend [nvm](https://github.com/creationix/nvm) for managing multiple versions of node and npm.
