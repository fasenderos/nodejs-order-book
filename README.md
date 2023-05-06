<p align="center">
    <a href="https://www.npmjs.com/package/hft-limit-order-book" target="_blank"><img src="https://img.shields.io/npm/v/hft-limit-order-book?color=blue" alt="NPM Version"></a>
    <a href="https://github.com/fasenderos/hft-limit-order-book/blob/main/LICENSE" target="_blank"><img src="https://img.shields.io/npm/l/hft-limit-order-book" alt="Package License"></a>
    <a href="https://www.npmjs.com/package/hft-limit-order-book" target="_blank"><img src="https://img.shields.io/npm/dm/hft-limit-order-book" alt="NPM Downloads"></a>
    <a href="https://circleci.com/gh/fasenderos/hft-limit-order-book" target="_blank"><img src="https://img.shields.io/circleci/build/github/fasenderos/hft-limit-order-book/main" alt="CircleCI" ></a>
    <a href="https://codecov.io/github/fasenderos/hft-limit-order-book" target="_blank"><img src="https://img.shields.io/codecov/c/github/fasenderos/hft-limit-order-book" alt="Codecov"></a>
    <a href="https://github.com/fasenderos/hft-limit-order-book"><img src="https://badgen.net/badge/icon/typescript?icon=typescript&label" alt="Built with TypeScript"></a>
</p>

> Initially ported from [Go orderbook](https://github.com/i25959341/orderbook), this order book has been enhanced with new features

# hft-limit-order-book

:star: Star me on GitHub — it motivates me a lot!

Ultra-fast matching engine written in Javascript

## Features

- Standard price-time priority
- Supports both market and limit orders
- Supports time in force GTC, FOK and IOC
- Supports order cancelling
- Supports order price and/or size updating
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

Then you'll be able to use next primary functions:

```js
lob.createOrder(type: 'limit' | 'market', side: 'buy' | 'sell', size: number, price: number, orderID: string)

lob.limit(side: 'buy' | 'sell', orderID: string, size: number, price: number);

lob.market(side: 'buy' | 'sell', size: number);

lob.modify(orderID: string, { side: 'buy' | 'sell', size: number, price: number });

lob.cancel(orderID: string);
```

## About primary functions

To add an order to the order book you can call the general `createOrder()` function or calling the underlying `limit()` or `market()` functions

### Create Order

```js
// Create a limit order
createOrder('limit', side: 'buy' | 'sell', size: number, price: number, orderID: string);

// Create a market order
createOrder('market', side: 'buy' | 'sell', size: number);
```

### Create Limit Order

```js
// Places new limit order to the OrderBook
// Arguments:
//      side     - sell or buy
//      orderID  - unique order ID
//      quantity - how much quantity you want to sell or buy
//      price    - no more expensive (or cheaper) than this price
// Return:
//      error   - not null if quantity or price is less or equal 0. Or if an order with the given ID already exists
//      done    - not null if the limit order produces ends of another order, this order will add to
//                the "done" slice. If your order have done too, it will be placed to this array too
//      partial - not null if your order has done but top order is not fully done. Or if your order is
//                partially done and placed to the orderbook without full quantity - partial will contain
//                your order with quantity left
//      partialQuantityProcessed - if partial order is not null this result contains processed quantity from partial order
limit(side: 'buy' | 'sell', orderID: string, size: number, price: number);
```

For example:

```
limit("sell", "uinqueID", 55, 100);

asks: 110 -> 5      110 -> 5
      100 -> 1      100 -> 56
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done    - null
partial - null
```

```
limit("buy", "uinqueID", 7, 120);

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
limit("buy", "uinqueID", 3, 120);

asks: 110 -> 5
      100 -> 1      110 -> 3
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done    - 1 order with 100 price, (may be also few orders with 110 price) + uinqueID order
partial - 1 order with price 110
```

### Create Market Order

```js
// Places new market order to the OrderBook.
// Arguments:
//      side     - sell or buy
//      quantity - how much quantity you want to sell or buy
// Return:
//      error        - not null if quantity is less or equal 0
//      done         - not null if the market order produces ends of another order, this order will add to
//                     the "done" slice
//      partial      - not null if your order has done but top order is not fully done
//      partialQuantityProcessed - if partial order is not null this result contains processed quantity from partial order
//      quantityLeft - more than zero if there are not enought orders to process all quantity
market(side: 'buy' | 'sell', size: number);
```

For example:

```
market('sell', 6);

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
market('buy', 10);

asks: 110 -> 5
      100 -> 1
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done         - 2 (or more orders)
partial      - null
quantityLeft - 4
```

### Modify an existing order

```js
// Modify an existing order with given ID
modify(orderID: string, { side: 'buy' | 'sell', size: number, price: number });
```

For example:

```
limit("sell", "uinqueID", 55, 100);

asks: 110 -> 5      110 -> 5
      100 -> 1      100 -> 56
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

// Modify the size from 55 to 65
modify("uinqueID", { side: "sell", size: 65, price: 100 })

asks: 110 -> 5      110 -> 5
      100 -> 56     100 -> 66
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1


// Modify the price from 100 to 110
modify("uinqueID", { side: "sell", size: 65, price: 110 })

asks: 110 -> 5
      100 -> 66     110 -> 71
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1
```

### Cancel Order

```js
// Removes order with given ID from the order book
cancel(orderID: string);
```

For example:

```
cancel("myUniqueID-Sell-1-with-100")

asks: 110 -> 5
      100 -> 1      110 -> 5
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1
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

Before running benchmark, make sure to have built the source code with `npm run build` first

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

## Donation

If this project help you reduce time to develop, you can give me a cup of coffee 🍵 :)

ETH: `0xEE45AA08D65352d49344f42d9E0EAf14AA3D812d`

## License

Copyright [Andrea Fassina](https://github.com/fasenderos), Licensed under [MIT](LICENSE).
