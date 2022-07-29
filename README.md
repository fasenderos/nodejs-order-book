<p align="center">
    <a href="https://www.npmjs.com/package/hft-limit-order-book" target="_blank"><img src="https://img.shields.io/npm/v/hft-limit-order-book?color=blue" alt="NPM Version"></a>
    <a href="https://github.com/fasenderos/hft-limit-order-book/blob/main/LICENSE" target="_blank"><img src="https://img.shields.io/npm/l/hft-limit-order-book" alt="Package License"></a>
    <a href="https://www.npmjs.com/package/hft-limit-order-book" target="_blank"><img src="https://img.shields.io/npm/dm/hft-limit-order-book" alt="NPM Downloads"></a>
    <a href="https://circleci.com/gh/fasenderos/hft-limit-order-book" target="_blank"><img src="https://img.shields.io/circleci/build/github/fasenderos/hft-limit-order-book/main" alt="CircleCI" ></a>
    <a href="https://codecov.io/github/fasenderos/hft-limit-order-book" target="_blank"><img src="https://img.shields.io/codecov/c/github/fasenderos/hft-limit-order-book" alt="Codecov"></a>
    <a href="https://github.com/fasenderos/hft-limit-order-book"><img src="https://badgen.net/badge/icon/typescript?icon=typescript&label" alt="Built with TypeScript"></a>
</p>

> Ported from [Go orderbook](https://github.com/i25959341/orderbook)

# hft-limit-order-book

:star: Star me on GitHub — it motivates me a lot!

Ultra-fast matching engine written in Javascript

## Features

- Standard price-time priority
- Supports both market and limit orders
- Supports order cancelling
- **High performance (above 300k trades per second)**

**Machine:** ASUS ExpertBook, 11th Gen Intel(R) Core(TM) i7-1165G7, 2.80Ghz, 16GB RAM, Node.js v18.4.0.

<img src="https://user-images.githubusercontent.com/1219087/181792292-8619ee25-bf75-4871-a06c-bd6c82157f33.png" alt="hft-limit-order-book-benchmark" title="hft-limit-order-book benchmark" />

## Installation

Install with npm:

```sh
npm install hft-limit-order-book --save
```

Install with yarn:

```sh
yarn add hft-limit-order-book
```

## Usage

To start using order book you need to import `OrderBook` and create new instance:

```js
import { OrderBook } from 'hft-limit-order-book'

const lob = new OrderBook()
```

Then you be able to use next primary functions:

```js
lob.processLimitOrder(side: 'buy' | 'sell', orderID: string, size: number, price: number);

lob.processMarketOrder(side 'buy' | 'sell', size: number);

lob.cancelOrder(orderID: string);
```

## About primary functions

### ProcessLimitOrder

```js
// processLimitOrder places new order to the OrderBook
// Arguments:
//      side     - what do you want to do (ob.Sell or ob.Buy)
//      orderID  - unique order ID in depth
//      quantity - how much quantity you want to sell or buy
//      price    - no more expensive (or cheaper) this price
//      * to create new decimal number you should use decimal.New() func
//        read more at https://github.com/shopspring/decimal
// Return:
//      error   - not nil if quantity (or price) is less or equal 0. Or if order with given ID is exists
//      done    - not nil if your order produces ends of anoter order, this order will add to
//                the "done" slice. If your order have done too, it will be places to this array too
//      partial - not nil if your order has done but top order is not fully done. Or if your order is
//                partial done and placed to the orderbook without full quantity - partial will contain
//                your order with quantity to left
//      partialQuantityProcessed - if partial order is not nil this result contains processed quatity from partial order
processLimitOrder(side: 'buy' | 'sell', orderID: string, size: number, price: number);
```

For example:

```
processLimitOrder("sell", "uinqueID", 55, 100);

asks: 110 -> 5      110 -> 5
      100 -> 1      100 -> 56
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done    - nil
partial - nil

```

```
processLimitOrder("buy", "uinqueID", 7, 120);

asks: 110 -> 5
      100 -> 1
--------------  ->  --------------
bids: 90  -> 5      120 -> 1
      80  -> 1      90  -> 5
                    80  -> 1

done    - 2 (or more orders)
partial - uinqueID order

```

```
processLimitOrder("buy", "uinqueID", 3, 120);

asks: 110 -> 5
      100 -> 1      110 -> 3
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done    - 1 order with 100 price, (may be also few orders with 110 price) + uinqueID order
partial - 1 order with price 110

```

### ProcessMarketOrder

```js
// processMarketOrder immediately gets definite quantity from the order book with market price
// Arguments:
//      side     - what do you want to do (ob.Sell or ob.Buy)
//      quantity - how much quantity you want to sell or buy
//      * to create new decimal number you should use decimal.New() func
//        read more at https://github.com/shopspring/decimal
// Return:
//      error        - not nil if price is less or equal 0
//      done         - not nil if your market order produces ends of anoter orders, this order will add to
//                     the "done" slice
//      partial      - not nil if your order has done but top order is not fully done
//      partialQuantityProcessed - if partial order is not nil this result contains processed quatity from partial order
//      quantityLeft - more than zero if it is not enought orders to process all quantity
processMarketOrder(side: 'buy' | 'sell', size: number);
```

For example:

```
processMarketOrder('sell', 6);

asks: 110 -> 5      110 -> 5
      100 -> 1      100 -> 1
--------------  ->  --------------
bids: 90  -> 5      80 -> 1
      80  -> 2

done         - 2 (or more orders)
partial      - 1 order with price 80
quantityLeft - 0

```

```
processMarketOrder('buy', 10);

asks: 110 -> 5
      100 -> 1
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done         - 2 (or more orders)
partial      - nil
quantityLeft - 4

```

### CancelOrder

```js
// cancelOrder removes order with given ID from the order book
cancelOrder(orderID: string);
```

```
cancelOrder("myUinqueID-Sell-1-with-100")

asks: 110 -> 5
      100 -> 1      110 -> 5
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done         - 2 (or more orders)
partial      - nil
quantityLeft - 4

```

## Development

### Build

Build production (distribution) files in your dist folder:

```sh
npm run build
```

### Testing

To run all the unit-test

```sh
npm run test
```

### Coverage

Run testing coverage

```sh
npm run test:cov
```

### Benchmarking

Before running benchmark, make sure to have builded the source code with `npm run build` first

```sh
npm run bench
```

## Contributing

I would greatly appreciate any contributions to make this project better. Please make sure to follow the below guidelines before getting your hands dirty.

1. Fork the repository
2. Create your branch (git checkout -b my-branch)
3. Commit any changes to your branch
4. Push your changes to your remote branch
5. Open a pull request

## License

Copyright [Andrea Fassina](https://github.com/fasenderos), Licensed under [MIT](LICENSE).
