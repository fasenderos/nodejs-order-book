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

Ultra-fast matching engine written in TypeScript

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
import { OrderBook } from 'hft-limit-order-book';

const lob = new OrderBook();
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
createOrder('limit', side: 'buy' | 'sell', size: number, price: number, orderID: string, timeInForce?: 'GTC' | 'FOK' | 'IOC');

// Create a market order
createOrder('market', side: 'buy' | 'sell', size: number);
```

### Create Limit Order

```js
/**
 * Create a limit order
 *
 * @param side - `sell` or `buy`
 * @param orderID - Unique order ID
 * @param size - How much of currency you want to trade in units of base currency
 * @param price - The price at which the order is to be fullfilled, in units of the quote currency
 * @param timeInForce - Time-in-force type supported are: GTC, FOK, IOC
 * @returns An object with the result of the processed order or an error
 */
limit(side: 'buy' | 'sell', orderID: string, size: number, price: number, timeInForce?: 'GTC' | 'FOK' | 'IOC');
```

For example:

```
limit("sell", "uniqueID", 55, 100);

asks: 110 -> 5      110 -> 5
      100 -> 1      100 -> 56
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done    - null
partial - null
```

```
limit("buy", "uniqueID", 7, 120);

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
limit("buy", "uniqueID", 3, 120);

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
 * Create a market order
 *
 * @param side - `sell` or `buy`
 * @param size - How much of currency you want to trade in units of base currency
 * @returns An object with the result of the processed order or an error
 */
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
modify(orderID: string, { size: number, price: number });
```

For example:

```
limit("sell", "uniqueID", 55, 100);

asks: 110 -> 5      110 -> 5
      100 -> 1      100 -> 56
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

// Modify the size from 55 to 65
modify("uniqueID", { size: 65 })

asks: 110 -> 5      110 -> 5
      100 -> 56     100 -> 66
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1


// Modify the price from 100 to 110
modify("uniqueID", { price: 110 })

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

## Options

The orderbook can be initialized with the following options by passing them to the constructor:

### Snapshot
A `snapshot` represents the state of the order book at a specific point in time. It includes the following properties:

 - `asks`: An array of ask orders, where each order contains a price and a list of orders associated with that price.
 - `bids`: An array of bid orders, where each order contains a price and a list of orders associated with that price.
 - `ts`: A timestamp indicating when the snapshot was taken, in Unix timestamp format.
 - `lastOp`: The id of the last operation included in the snapshot

Snapshots are crucial for restoring the order book to a previous state. The system can restore from a snapshot before processing any journal logs, ensuring consistency and accuracy.
After taking the snapshot, you can safely remove all logs preceding the `lastOp` id.

```js
const lob = new OrderBook({ enableJournaling: true});

// after every order save the log to the database
const order = lob.limit("sell", "uniqueID", 55, 100)
await saveLog(order.log)

// ... after some time take a snapshot of the order book and save it on the database

const snapshot = lob.snapshot();
await saveSnapshot(snapshot)

// If you want you can safely remove all logs preceding the `lastOp` id of the snapshot, and continue to save each subsequent log to the database
await removePreviousLogs(snapshot.lastOp)

// On server restart get the snapshot from the database and initialize the order book
const logs = await getLogs()
const lob = new OrderBook({ snapshot, journal: log enableJournaling: true });
```

### Journal Logs
The `journal` feature allows for the logging of changes and activities within the orderbook and contains all the orders operations. This is useful for recovering the state of orderbook after unexpected events.
```js
// Assuming 'logs' is an array of log entries retrieved from the database

const logs = await getLogs();
const lob = new OrderBook({ journal: logs, enableJournalLog: true });
```
By combining snapshots with journaling, the system can effectively restore and audit the state of the order book, ensuring data integrity and providing a reliable mechanism for state recovery.

### Enable Journaling
`enabledJournaling` is a configuration setting that determines whether journaling is enabled or disabled. When enabled, all changes to the order book and related activities are logged into a journal. This helps in tracking and auditing the state of the order book over time.
```js
const lob = new OrderBook({ enableJournaling: true }); // false by default

// after every order save the log to the database
const order = lob.limit("sell", "uniqueID", 55, 100)
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
