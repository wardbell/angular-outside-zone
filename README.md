## Angular Outside The Zone

Demonstrates running a chatty async process inside and outside the Angular zone.

Simulates presentation of a portfolio of Russel 3000 stocks,
updated by an in-memory price engine that pushes imaginary stock price changes to the client.

A price service listens to the stock price changes coming from the price engine.
This service publishes an array of these stock price changes in an observable.

The UI (`AppComponent`) subscribes to the observable and updates its views
which entails presenting the portfolio, updated with price changes 
from the service.

## tl;dr

Running inside/outside the zone makes a significant difference
although not as much as buffering.

## Discussion

I'm measuring consequences by eyeballing my machine's CPU usage
when the app runs in Chrome and I'm not doing anything but staring at the screen.

It's pretty fast anyway you run it on my box.

To maximize the strain on Angular, max the portfolio size (3000) and 
put the engine at top speed ("0ms" delay ... as close as `setInterval` allows).

What matters most is how often you update the observable which updates the views.
Adjusting the buffer size and publish frequency most effects CPU usage and
presumably the responsiveness. 
I can peg my machine when the buffer size is 1 and/or the publish window is 0.

Running the engine outside the Angular zone _really does help_.
With `bufferSize=100` and `publishWindow=2000` (2 seconds), my total CPU utilization hovers 
around **16% _outside_ the zone**, 
around **40% _inside_ the Angular zone**.

The CPU utilization devoted to chrome hovers 
around **2% _outside_ the zone**, 
around **28% _inside_ the Angular zone**.

Remember ... these are imprecise numbers on my box. Your mileage may vary.

### Options

Various switches in the UI control the behavior of the price service and price engine.

* Buffer size:  How many price changes accumulate before publishing to the observable
which triggers binding updates.

* Portfolio size:  How many stocks to track and present. 
The higher the number, the more views on screen to bind.

* Publish window: How often to publish price changes, regardless of buffer. 
0 === off; only publish when buffer is full.

* Service speed: How fast (in milliseconds) the price engine returns stock price changes.
The lower the number, the faster it goes, 
potentially triggering a round of change detection at the minimum `setTimeout` cycle.
When set to zero, I rather doubt it actually emits a price change 
in less than 1 ms but that's the goal.

* Outside-zone-flag: whether to run the price engine outside the Angular zone. 

Any change to any of the switches triggers a service-and-engine reset.

The price engine and the pricing service publication mechanisms are identical
whether running inside or outside the zone.

The presentation in `AppComponent` is the same inside and outside.
The `PriceService` is where it toggles inside/outside.


### Other optimizations

There are none here. A few ideas come to mind. 

The service might be a candidate for running in a web worker, off the UI thread.

I deliberately didn't play with the `ChangeDetectionStrategy.OnPush`
nor with attach and detach because I wanted to focus on the outside-of-the-zone effect. 
I rather doubt that these change detection games will be as effective as moving out of the zone
and off thread. But one cannot know until one tries.

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
