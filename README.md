<p align="center">
    <a href="https://www.npmjs.com/package/nodejs-order-book" target="_blank"><img src="https://img.shields.io/npm/v/nodejs-order-book?color=blue" alt="NPM Version"></a>
    <a href="https://github.com/fasenderos/nodejs-order-book/blob/main/LICENSE" target="_blank"><img src="https://img.shields.io/npm/l/nodejs-order-book" alt="Package License"></a>
    <a href="https://www.npmjs.com/package/nodejs-order-book" target="_blank"><img src="https://img.shields.io/npm/dm/nodejs-order-book" alt="NPM Downloads"></a>
    <a href="https://circleci.com/gh/fasenderos/nodejs-order-book" target="_blank"><img src="https://img.shields.io/circleci/build/github/fasenderos/nodejs-order-book/main" alt="CircleCI" ></a>
    <a href="https://codecov.io/github/fasenderos/nodejs-order-book" target="_blank"><img src="https://img.shields.io/codecov/c/github/fasenderos/nodejs-order-book" alt="Codecov"></a>
    <a href="https://github.com/fasenderos/nodejs-order-book"><img src="https://badgen.net/badge/icon/typescript?icon=typescript&label" alt="Built with TypeScript"></a>
</p>

# Node.js Order Book

<p align="center">
Ultra-fast Node.js Order Book written in TypeScript </br> for high-frequency trading (HFT) :rocket::rocket: </br></br>
:star: Star me on GitHub — it motivates me a lot!
</p>

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Experimental Conditional Orders](#conditional-orders-)
- [About Primary Functions](#about-primary-functions)
  - [Create order `createOrder()`](#create-order)
  - [Create Limit order `limit()`](#create-limit-order)
  - [Create Market order `market()`](#create-market-order)
  - [Create Stop Limit order `stopLimit()`](#create-stop-limit-order)
  - [Create Stop Market order `stopMarket()`](#create-stop-market-order)
  - [Create OCO (One-Cancels-the-Other) order `oco()`](#create-oco-one-cancels-the-other-order)
  - [Modify an existing order `modifiy()`](#modify-an-existing-order)
  - [Cancel order `cancel()`](#cancel-order)
- [Order Book Options](#order-book-options)
  - [Snapshot](#snapshot)
  - [Journal Logs](#journal-logs)
  - [Enable Journaling](#enable-journaling)
- [Development](#development)
  - [Build](#build)
  - [Testing](#testing)
  - [Coverage](#coverage)
  - [Benchmarking](#benchmarking)
- [Contributing](#contributing)
- [Donation](#donation)
- [License](#license)

## Features
> Initially ported from [Go orderbook](https://github.com/i25959341/orderbook), this order book has been enhanced with new features

- Standard price-time priority
- Supports both market and limit orders
- Supports `post-only` limit order <img src="https://img.shields.io/badge/New-green" alt="New">
- Supports conditional orders [**Stop Limit, Stop Market and OCO**](#conditional-orders-) <img src="https://img.shields.io/badge/New-green" alt="New"> <img src="https://img.shields.io/badge/Experimental-blue" alt="Experimental">
- Supports time in force GTC, FOK and IOC <img src="https://img.shields.io/badge/New-green" alt="New">
- Supports order cancelling
- Supports order price and/or size updating <img src="https://img.shields.io/badge/New-green" alt="New">
- Snapshot and journaling functionalities for restoring the order book during server startup <img src="https://img.shields.io/badge/New-green" alt="New">
- **High performance (above 300k trades per second)**

**Machine:** ASUS ExpertBook, 11th Gen Intel(R) Core(TM) i7-1165G7, 2.80Ghz, 16GB RAM, Node.js v18.4.0.

<img src="https://user-images.githubusercontent.com/1219087/181792292-8619ee25-bf75-4871-a06c-bd6c82157f33.png" alt="nodejs-order-book-benchmark" title="nodejs-order-book benchmark" />

## Installation

Install with npm:

```sh
npm install nodejs-order-book
```

Install with yarn:

```sh
yarn add nodejs-order-book
```

Install with pnpm:

```sh
pnpm add nodejs-order-book
```

## Usage

To start using order book you need to import `OrderBook` and create new instance:

```js
import { OrderBook } from 'nodejs-order-book'

const ob = new OrderBook()
```

Then you'll be able to use next primary functions:

```js
ob.createOrder({ type: 'limit' | 'market', side: 'buy' | 'sell', size: number, price?: number, id?: string, postOnly?: boolean, timeInForce?: 'GTC' | 'FOK' | 'IOC' })

ob.limit({ id: string, side: 'buy' | 'sell', size: number, price: number, postOnly?: boolean, timeInForce?: 'GTC' | 'FOK' | 'IOC' })

ob.market({ side: 'buy' | 'sell', size: number })

ob.modify(orderID: string, { side: 'buy' | 'sell', size: number, price: number })

ob.cancel(orderID: string)
```
### Conditional Orders ![Experimental](https://img.shields.io/badge/Experimental-blue)
The version `v6.1.0` introduced support for Conditional Orders `Stop Market`, `Stop Limit` and `OCO`. Even though the test coverage for these new features is at 100%, they are not yet considered stable because they have not been tested with real-world scenarios. For this reason, if you want to use conditional orders, you need to instantiate the order book with the `experimentalConditionalOrders` option set to `true`.
```js
import { OrderBook } from 'nodejs-order-book'

const ob = new OrderBook({ experimentalConditionalOrders: true })

ob.createOrder({ type: 'stop_limit' | 'stop_market' | 'oco', side: 'buy' | 'sell', size: number, price?: number, id?: string, stopPrice?: number, timeInForce?: 'GTC' | 'FOK' | 'IOC', stopLimitTimeInForce?: 'GTC' | 'FOK' | 'IOC' })

ob.stopLimit({ id: string, side: 'buy' | 'sell', size: number, price: number, stopPrice: number, timeInForce?: 'GTC' | 'FOK' | 'IOC' })

ob.stopMarket({ side: 'buy' | 'sell', size: number, stopPrice: number })

ob.oco({ id: string, side: 'buy' | 'sell', size: number, price: number, stopPrice: number, stopLimitPrice: number, timeInForce?: 'GTC' | 'FOK' | 'IOC', stopLimitTimeInForce?: 'GTC' | 'FOK' | 'IOC' })
```

## About primary functions

To add an order to the order book you can call the general `createOrder()` function or calling the underlying `limit()`, `market()`, `stopLimit()`, `stopMarket()` or `oco()` functions

### Create Order

```js
// Create limit order
ob.createOrder({ type: 'limit', side: 'buy' | 'sell', size: number, price: number, id: string, postOnly?: boolean, timeInForce?: 'GTC' | 'FOK' | 'IOC' })

// Create market order
ob.createOrder({ type: 'market', side: 'buy' | 'sell', size: number })

// Create stop limit order
ob.createOrder({ type: 'stop_limit', side: 'buy' | 'sell', size: number, price: number, id: string, stopPrice: number, timeInForce?: 'GTC' | 'FOK' | 'IOC' })

// Create stop market order
ob.createOrder({ type: 'stop_market', side: 'buy' | 'sell', size: number, stopPrice: number })

// Create OCO order
ob.createOrder({ type: 'oco', side: 'buy' | 'sell', size: number, stopPrice: number, stopLimitPrice: number, timeInForce?: 'GTC' | 'FOK' | 'IOC', stopLimitTimeInForce?: 'GTC' | 'FOK' | 'IOC' })
```

### Create Limit Order

```js
/**
 * Create a limit order. See {@link LimitOrderOptions} for details.
 *
 * @param options
 * @param options.side - `sell` or `buy`
 * @param options.id - Unique order ID
 * @param options.size - How much of currency you want to trade in units of base currency
 * @param options.price - The price at which the order is to be fullfilled, in units of the quote currency
 * @param options.postOnly - When `true` the order will be rejected if immediately matches and trades as a taker. Default is `false`
 * @param options.timeInForce - Time-in-force type supported are: GTC, FOK, IOC. Default is GTC
 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
 */
ob.limit({ side: 'buy' | 'sell', id: string, size: number, price: number, postOnly?: boolean, timeInForce?: 'GTC' | 'FOK' | 'IOC' })
```

For example:

```
ob.limit({ side: "sell", id: "uniqueID", size: 55, price: 100 })

asks: 110 -> 5      110 -> 5
      100 -> 1      100 -> 56
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done    - null
partial - null
```

```
ob.limit({ side: "buy", id: "uniqueID", size: 7, price: 120 })

asks: 110 -> 5
      100 -> 1
--------------  ->  --------------
bids: 90  -> 5      120 -> 1
      80  -> 1      90  -> 5
                    80  -> 1

done    - 2 (or more orders)
partial - uniqueID order
```

```
ob.limit({ side: "buy", id: "uniqueID", size: 3, price: 120 })

asks: 110 -> 5
      100 -> 1      110 -> 3
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done    - 1 order with 100 price, (may be also few orders with 110 price) + uniqueID order
partial - 1 order with price 110
```

### Create Market Order

```js
/**
 * Create a market order. See {@link MarketOrderOptions} for details.
 *
 * @param options
 * @param options.side - `sell` or `buy`
 * @param options.size - How much of currency you want to trade in units of base currency
 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
 */
ob.market({ side: 'buy' | 'sell', size: number })
```

For example:

```
ob.market({ side: 'sell', size: 6 })

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
ob.market({ side: 'buy', size: 10 })

asks: 110 -> 5
      100 -> 1
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done         - 2 (or more orders)
partial      - null
quantityLeft - 4
```

### Create Stop Limit Order

```js
/**
 * Create a stop limit order. See {@link StopLimitOrderOptions} for details.
 *
 * @param options
 * @param options.side - `sell` or `buy`
 * @param options.id - Unique order ID
 * @param options.size - How much of currency you want to trade in units of base currency
 * @param options.price - The price at which the order is to be fullfilled, in units of the quote currency
 * @param options.stopPrice - The price at which the order will be triggered.
 * @param options.timeInForce - Time-in-force type supported are: GTC, FOK, IOC. Default is GTC
 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
 */
ob.stopLimit({ side: 'buy' | 'sell', id: string, size: number, price: number, stopPrice: number, timeInForce?: 'GTC' | 'FOK' | 'IOC' })
```

### Create Stop Market Order

```js
/**
 * Create a stop market order. See {@link StopMarketOrderOptions} for details.
 *
 * @param options
 * @param options.side - `sell` or `buy`
 * @param options.size - How much of currency you want to trade in units of base currency
 * @param options.stopPrice - The price at which the order will be triggered.
 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
 */
ob.stopMarket({ side: 'buy' | 'sell', size: number, stopPrice: number })
```

### Create OCO (One-Cancels-the-Other) Order

```js
/**
 * Create an OCO (One-Cancels-the-Other) order.
 * OCO order combines a `stop_limit` order and a `limit` order, where if stop price
 * is triggered or limit order is fully or partially fulfilled, the other is canceled.
 * Both orders have the same `side` and `size`. If you cancel one of the orders, the
 * entire OCO order pair will be canceled.
 *
 * For BUY orders the `stopPrice` must be above the current price and the `price` below the current price
 * For SELL orders the `stopPrice` must be below the current price and the `price` above the current price
 *
 * See {@link OCOOrderOptions} for details.
 *
 * @param options
 * @param options.side - `sell` or `buy`
 * @param options.id - Unique order ID
 * @param options.size - How much of currency you want to trade in units of base currency
 * @param options.price - The price of the `limit` order at which the order is to be fullfilled, in units of the quote currency
 * @param options.stopPrice - The price at which the `stop_limit` order will be triggered.
 * @param options.stopLimitPrice - The price of the `stop_limit` order at which the order is to be fullfilled, in units of the quote currency.
 * @param options.timeInForce - Time-in-force of the `limit` order. Type supported are: GTC, FOK, IOC. Default is GTC
 * @param options.stopLimitTimeInForce - Time-in-force of the `stop_limit` order. Type supported are: GTC, FOK, IOC. Default is GTC
 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
 */
ob.oco({ side: 'buy' | 'sell', id: string, size: number, price: number, stopPrice: number, stopLimitPrice: number, timeInForce?: 'GTC' | 'FOK' | 'IOC', stopLimitTimeInForce?: 'GTC' | 'FOK' | 'IOC' })
```

### Modify an existing order

```js
/**
 * Modify an existing order with given ID. When an order is modified by price or quantity,
 * it will be deemed as a new entry. Under the price-time-priority algorithm, orders are
 * prioritized according to their order price and order time. Hence, the latest orders
 * will be placed at the back of the matching order queue.
 *
 * @param orderID - The ID of the order to be modified
 * @param orderUpdate - An object with the modified size and/or price of an order. The shape of the object is `{size, price}`.
 * @returns An object with the result of the processed order or an error
 */
ob.modify(orderID: string, { size: number, price: number })
```

For example:

```
ob.limit({ side: "sell", id: "uniqueID", size: 55, price: 100 })

asks: 110 -> 5      110 -> 5
      100 -> 1      100 -> 56
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

// Modify the size from 55 to 65
ob.modify("uniqueID", { size: 65 })

asks: 110 -> 5      110 -> 5
      100 -> 56     100 -> 66
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1


// Modify the price from 100 to 110
ob.modify("uniqueID", { price: 110 })

asks: 110 -> 5      110 -> 70
      100 -> 66     100 -> 1
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1
```

### Cancel Order

```js
/**
 * Remove an existing order with given ID from the order book
 *
 * @param orderID - The ID of the order to be removed
 * @returns The removed order if exists or `undefined`
 */
ob.cancel(orderID: string)
```

For example:

```
ob.cancel("myUniqueID-Sell-1-with-100")

asks: 110 -> 5
      100 -> 1      110 -> 5
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1
```

## Order Book Options

The orderbook can be initialized with the following options by passing them to the constructor:

### Snapshot
A `snapshot` represents the state of the order book at a specific point in time. It includes the following properties:

 - `asks`: List of ask orders, each with a `price` and a list of associated `orders`.
 - `bids`: List of bid orders, each with a `price` and a list of associated `orders`.
 - `stopBook`: an object with `bids` and `asks` properties related to every `StopOrder` in the orderbook.
 - `ts`: A timestamp indicating when the snapshot was taken, in Unix timestamp format.
 - `lastOp`: The id of the last operation included in the snapshot

Snapshots are crucial for restoring the order book to a previous state. The orderbook can restore from a snapshot before processing any journal logs, ensuring consistency and accuracy.
After taking the snapshot, you can safely remove all logs preceding the `lastOp` id.

**Note**: The snapshot of the order book returns an object containing an `array` of `bids` and `asks`, which in turn are arrays of order objects. If the snapshot is saved to the database as a `string`, make sure to pass the snapshot in its original format when initializing the order book. For example, you can achieve this by using `JSON.parse` to convert the string back into its original object form.

```js
const ob = new OrderBook({ enableJournaling: true})

// after every order save the log to the database
const order = ob.limit({ side: "sell", id: "uniqueID", size: 55, price: 100 })
await saveLog(order.log)

// ... after some time take a snapshot of the order book and save it on the database

const snapshot = ob.snapshot()
await saveSnapshot(JSON.stringify(snapshot))

// If you want you can safely remove all logs preceding the `lastOp` id of the snapshot, and continue to save each subsequent log to the database
await removePreviousLogs(snapshot.lastOp)

// On server restart get the snapshot and logs from the database and initialize the order book
const logs = await getLogs()
const snapshot = await getSnapshot()

const ob = new OrderBook({ snapshot: JSON.parse(snapshot), journal: log, enableJournaling: true })
```

### Journal Logs
The `journal` option expects an array of journal logs that you can get by setting `enableJournaling` to true. When the journal is provided, the order book will replay all the operations, bringing the order book to the same state as the last log.
```js
// Assuming 'logs' is an array of log entries retrieved from the database

const logs = await getLogs()
const ob = new OrderBook({ journal: logs, enableJournalLog: true })
```
By combining snapshots with journaling, you can effectively restore and audit the state of the order book.

### Enable Journaling
`enabledJournaling` is a configuration setting that determines whether journaling is enabled or disabled. When enabled, the property `log` will be added to the body of the response for each operation. The logs must be saved to the database and can then be used when a new instance of the order book is instantiated.
```js
const ob = new OrderBook({ enableJournaling: true }) // false by default

// after every order save the log to the database
const order = ob.limit({ side: "sell", id: "uniqueID", size: 55, price: 100 })
await saveLog(order.log)
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

- USDT (TRC20): `TXArNxsq2Ee8Jvsk45PudVio52Joiq1yEe`
- BTC: `1GYDVSAQNgG7MFhV5bk15XJy3qoE4NFenp`
- BTC (BEP20): `0xf673ee099be8129ec05e2f549d96ebea24ac5d97`
- ETH (ERC20): `0xf673ee099be8129ec05e2f549d96ebea24ac5d97`
- BNB (BEP20): `0xf673ee099be8129ec05e2f549d96ebea24ac5d97`

## License

Copyright [Andrea Fassina](https://github.com/fasenderos), Licensed under [MIT](LICENSE).
