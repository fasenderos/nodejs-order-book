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
A fast, feature-complete limit order book engine for Node.js, written in TypeScript. </br>
Designed for trading systems, exchanges, and HFT simulations. </br></br>
:star: Star me on GitHub — it motivates me a lot!
</p>

**Why this library?** Originally ported from a [Go orderbook](https://github.com/i25959341/orderbook), this engine has been extended with conditional orders, Self-Trade Prevention (STP), snapshot/journaling for crash recovery, and full TypeScript support — while maintaining high throughput.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Conditional Orders](#conditional-orders)
- [Primary Functions](#primary-functions)
  - [createOrder()](#createorder)
  - [limit()](#limit)
  - [market()](#market)
  - [stopLimit()](#stoplimit)
  - [stopMarket()](#stopmarket)
  - [oco()](#oco)
  - [modify()](#modify)
  - [cancel()](#cancel)
- [Understanding Order Results](#understanding-order-results)
- [Self-Trade Prevention (STP)](#self-trade-prevention-stp)
- [Order Book Options](#order-book-options)
  - [Snapshot](#snapshot)
  - [Journal Logs](#journal-logs)
  - [Enable Journaling](#enable-journaling)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Donation](#donation)

## Features

- Standard price-time priority matching
- Market, limit, and post-only limit orders
- Conditional orders: Stop Limit, Stop Market, and OCO (One-Cancels-the-Other)
- Time-in-force: GTC (Good-Til-Cancelled), FOK (Fill-Or-Kill), IOC (Immediate-Or-Cancel)
- Self-Trade Prevention (STP) with 4 modes (NONE, EXPIRE_MAKER, EXPIRE_TAKER, EXPIRE_BOTH)
- Order cancellation
- Order price and/or size modification
- Snapshot and journaling for order book state persistence and recovery
- **High throughput** — benchmarked at 300k+ trades per second
- Full TypeScript support with dual ESM/CJS exports

## Quick Start

```ts
import { OrderBook, Side } from 'nodejs-order-book'

const ob = new OrderBook()

// Place a sell limit order
ob.limit({ side: Side.SELL, id: 'order-1', size: 55, price: 100 })

// Place a buy market order
const result = ob.market({ side: Side.BUY, size: 10 })

console.log(result.done)     // Filled orders
console.log(result.partial)  // Partial fill, if any
```

## Requirements

- **Node.js** 18+ (ES2022 target)
- **npm**, **yarn**, or **pnpm**

## Installation

Install with npm:

```
npm install nodejs-order-book
```

Install with yarn:

```
yarn add nodejs-order-book
```

Install with pnpm:

```
pnpm add nodejs-order-book
```

## Usage

The package supports both **ESM** and **CommonJS**:

```ts
// ESM (recommended)
import { OrderBook, Side, OrderType, SelfTradePreventionMode } from 'nodejs-order-book'

// CommonJS
const { OrderBook, Side, OrderType, SelfTradePreventionMode } = require('nodejs-order-book')
```

To start using the order book you need to import `OrderBook` and create a new instance:

```ts
import { OrderBook } from 'nodejs-order-book'

const ob = new OrderBook()
```

Then you'll be able to use the following primary functions:

```ts
ob.createOrder({
      type: 'limit' | 'market',
      side: 'buy' | 'sell',
      size: number,
      price?: number,
      id?: string,
      postOnly?: boolean,
      timeInForce?: 'GTC' | 'FOK' | 'IOC'
})

ob.limit({
      id: string,
      side: 'buy' | 'sell',
      size: number,
      price: number,
      postOnly?: boolean,
      timeInForce?: 'GTC' | 'FOK' | 'IOC'
})

ob.market({ side: 'buy' | 'sell', size: number })

ob.modify(orderID: string, {
      side: 'buy' | 'sell',
      size: number,
      price: number
})

ob.cancel(orderID: string)
```

### Conditional Orders

`Stop Market`, `Stop Limit` and `OCO` orders are supported.

```ts
import { OrderBook } from 'nodejs-order-book'

const ob = new OrderBook()

ob.createOrder({
      type: 'stop_limit' | 'stop_market' | 'oco',
      side: 'buy' | 'sell',
      size: number,
      price?: number,
      id?: string,
      stopPrice?: number,
      timeInForce?: 'GTC' | 'FOK' | 'IOC',
      stopLimitTimeInForce?: 'GTC' | 'FOK' | 'IOC'
})

ob.stopLimit({
      id: string,
      side: 'buy' | 'sell',
      size: number,
      price: number,
      stopPrice: number,
      timeInForce?: 'GTC' | 'FOK' | 'IOC'
})

ob.stopMarket({
      side: 'buy' | 'sell',
      size: number,
      stopPrice: number
})

ob.oco({
      id: string,
      side: 'buy' | 'sell',
      size: number,
      price: number,
      stopPrice: number,
      stopLimitPrice: number,
      timeInForce?: 'GTC' | 'FOK' | 'IOC',
      stopLimitTimeInForce?: 'GTC' | 'FOK' | 'IOC'
})
```

## Primary Functions

To add an order to the order book you can call the general `createOrder()` function or use the underlying `limit()`, `market()`, `stopLimit()`, `stopMarket()` or `oco()` directly.

### createOrder()

A unified entry point that accepts a `type` field to dispatch to the correct handler:

```ts
// Limit order
ob.createOrder({
      type: 'limit',
      side: 'buy' | 'sell',
      size: number,
      price: number,
      id: string,
      postOnly?: boolean,
      timeInForce?: 'GTC' | 'FOK' | 'IOC'
})

// Market order
ob.createOrder({
      type: 'market',
      side: 'buy' | 'sell',
      size: number
})

// Stop limit order
ob.createOrder({
      type: 'stop_limit',
      side: 'buy' | 'sell',
      size: number,
      price: number,
      id: string,
      stopPrice: number,
      timeInForce?: 'GTC' | 'FOK' | 'IOC'
})

// Stop market order
ob.createOrder({
      type: 'stop_market',
      side: 'buy' | 'sell',
      size: number,
      stopPrice: number
})

// OCO order
ob.createOrder({
      type: 'oco',
      side: 'buy' | 'sell',
      size: number,
      stopPrice: number,
      stopLimitPrice: number,
      timeInForce?: 'GTC' | 'FOK' | 'IOC',
      stopLimitTimeInForce?: 'GTC' | 'FOK' | 'IOC'
})
```

### limit()

Create a limit order. See {@link LimitOrderOptions} for details.

```ts
/**
 * @param options.side - `sell` or `buy`
 * @param options.id - Unique order ID
 * @param options.size - How much of currency you want to trade in units of base currency
 * @param options.price - The price at which the order is to be fulfilled, in units of the quote currency
 * @param options.postOnly - When `true` the order is rejected if it immediately matches as a taker. Default is `false`
 * @param options.timeInForce - GTC, FOK, or IOC. Default is GTC
 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder}
 */
ob.limit({
      side: 'buy' | 'sell',
      id: string,
      size: number,
      price: number,
      postOnly?: boolean,
      timeInForce?: 'GTC' | 'FOK' | 'IOC'
})
```

For example:

```ts
ob.limit({ side: "sell", id: "uniqueID", size: 55, price: 100 })

asks: 110 -> 5      110 -> 5
      100 -> 1      100 -> 56
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done    - null
partial - null
```

```ts
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

```ts
ob.limit({ side: "buy", id: "uniqueID", size: 3, price: 120 })

asks: 110 -> 5
      100 -> 1      110 -> 3
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1

done    - 1 order with 100 price, (may be also few orders with 110 price) + uniqueID order
partial - 1 order with price 110
```

### market()

Create a market order. See {@link MarketOrderOptions} for details.

```ts
/**
 * @param options.side - `sell` or `buy`
 * @param options.size - How much of currency you want to trade in units of base currency
 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder}
 */
ob.market({ side: 'buy' | 'sell', size: number })
```

For example:

```ts
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

```ts
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

### stopLimit()

Create a stop limit order. See {@link StopLimitOrderOptions} for details.

```ts
/**
 * @param options.side - `sell` or `buy`
 * @param options.id - Unique order ID
 * @param options.size - How much of currency you want to trade in units of base currency
 * @param options.price - The price at which the order is to be fulfilled, in units of the quote currency
 * @param options.stopPrice - The price at which the order is triggered
 * @param options.timeInForce - GTC, FOK, or IOC. Default is GTC
 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder}
 */
ob.stopLimit({
      side: 'buy' | 'sell',
      id: string,
      size: number,
      price: number,
      stopPrice: number,
      timeInForce?: 'GTC' | 'FOK' | 'IOC'
})
```

### stopMarket()

Create a stop market order. See {@link StopMarketOrderOptions} for details.

```ts
/**
 * @param options.side - `sell` or `buy`
 * @param options.size - How much of currency you want to trade in units of base currency
 * @param options.stopPrice - The price at which the order is triggered
 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder}
 */
ob.stopMarket({
      side: 'buy' | 'sell',
      size: number,
      stopPrice: number
})
```

### oco()

Create an OCO (One-Cancels-the-Other) order. An OCO combines a `stop_limit` and a `limit` order: when one is triggered or filled, the other is automatically canceled. Both orders share the same `side` and `size`. If you cancel one, the entire OCO pair is canceled.

For BUY orders: `stopPrice` must be above the current price, `price` below.
For SELL orders: `stopPrice` must be below the current price, `price` above.

See {@link OCOOrderOptions} for details.

```ts
/**
 * @param options.side - `sell` or `buy`
 * @param options.id - Unique order ID
 * @param options.size - How much of currency you want to trade in units of base currency
 * @param options.price - The limit order price, in units of the quote currency
 * @param options.stopPrice - The stop trigger price
 * @param options.stopLimitPrice - The stop_limit order price, in units of the quote currency
 * @param options.timeInForce - Time-in-force of the limit order. GTC, FOK, IOC. Default is GTC
 * @param options.stopLimitTimeInForce - Time-in-force of the stop_limit order. GTC, FOK, IOC. Default is GTC
 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder}
 */
ob.oco({
      side: 'buy' | 'sell',
      id: string,
      size: number,
      price: number,
      stopPrice: number,
      stopLimitPrice: number,
      timeInForce?: 'GTC' | 'FOK' | 'IOC',
      stopLimitTimeInForce?: 'GTC' | 'FOK' | 'IOC'
})
```

### modify()

Modify an existing order by ID. When an order is modified (price or quantity), it is treated as a new entry: under price-time-priority, it moves to the back of the matching queue.

```ts
/**
 * @param orderID - The ID of the order to modify
 * @param orderUpdate - An object with `{size, price}`. Only provided fields are updated
 * @returns An object with the result or an error
 */
ob.modify(orderID: string, { size: number, price: number })
```

For example:

```ts
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

### cancel()

Remove an existing order by ID from the order book.

```ts
/**
 * @param orderID - The ID of the order to remove
 * @returns The removed order if found, or `undefined`
 */
ob.cancel(orderID: string)
```

For example:

```ts
ob.cancel("myUniqueID-Sell-1-with-100")

asks: 110 -> 5
      100 -> 1      110 -> 5
--------------  ->  --------------
bids: 90  -> 5      90  -> 5
      80  -> 1      80  -> 1
```

## Understanding Order Results

When creating an order, the library returns an `IProcessOrder` object:

```ts
interface IProcessOrder {
  done: IOrder[];                    // Fully consumed orders
  activated: IStopOrder[];           // Triggered stop orders (stop limit, stop market, OCO)
  partial: ILimitOrder | null;       // Partially consumed limit order (if any)
  quantityLeft: number;              // Unfilled quantity of the taker order
  partialQuantityProcessed: number;  // Quantity consumed from the order in 'partial'
  err: OrderBookError | null;
  log?: JournalLog;                  // Journal entry (only when enableJournaling is true)
  stpExpired?: IOrder[];             // Orders expired due to Self-Trade Prevention
}
```

### When Does the Taker Appear in Results?

**The taker order does NOT always appear in the result arrays.**

| Order Type | Fill Status | Taker in `done[]` | Taker in `partial` | `quantityLeft` |
|------------|-------------|-------------------|--------------------|----------------|
| LIMIT | Fully filled | ✅ YES | ❌ NO | `0` |
| LIMIT | Partially filled | ❌ NO | ✅ YES | `> 0` |
| MARKET | Fully or partially filled | ❌ NO | ❌ NO | `>= 0` |

**Key facts:**
- **Market orders never appear in `done[]` or `partial`** - only the matched maker orders appear
- **Limit orders fully filled**: Taker appears in `done[]` alongside matched makers
- **Limit orders partially filled**: Taker appears in `partial`, matched makers appear in `done[]`
- **`quantityLeft`**: Always represents unfilled quantity of the taker, regardless of where it appears

> **Note on `activated[]`**: When a stop limit, stop market, or OCO order is triggered, the triggered order(s) appear in the `activated` array. These are orders that were resting in the stop book and have now been activated for matching.
>
> **Note on `stpExpired[]`**: When Self-Trade Prevention is configured and triggered, expired orders are listed in `stpExpired`. See [Self-Trade Prevention (STP)](#self-trade-prevention-stp) for details.

### What is `partialQuantityProcessed`?

This represents **how much of the order in `partial` was processed**, not how much is left.

- If `partial` contains the **taker** (partially filled limit order): represents amount of taker that was filled
- If `partial` contains a **maker** (partially consumed resting order): represents amount of maker that was consumed

**Example 1 - Taker in partial:**
```ts
// 10-unit buy order, only 5 available
{
  done: [{ id: 'maker-1', size: 5 }],       // Fully consumed maker
  partial: { id: 'taker', size: 5 },        // Taker (5 still unfilled)
  quantityLeft: 5,                          // 5 units of taker unfilled
  partialQuantityProcessed: 5               // 5 units of taker were filled
}
```

**Example 2 - Maker in partial:**
```ts
// 8-unit buy order, 20 available from one maker
{
  done: [{ id: 'taker', size: 8 }],         // Fully filled taker
  partial: { id: 'maker-1', size: 12 },     // Maker: 12 still unfilled (20 - 8)
  quantityLeft: 0,                          // Taker fully filled
  partialQuantityProcessed: 8               // 8 units of maker were consumed
}
```

> `partial.size` always represents the **remaining** quantity of that order, not what was consumed. In this example, the maker started with size 20, had 8 consumed, so `partial.size` is 12 (what's left on the book).

### Example: Market Order (Fully Filled)

```ts
// Market order for 10 units (10 available)
book.createOrder({ type: 'market', id: 'buy-1', size: 10, side: 'buy' })

// Result:
{
  done: [{ id: 'sell-1', side: 'sell', size: 10 }],  // Matched maker only
  partial: null,                                      // Taker NOT here
  quantityLeft: 0,                                    // Fully filled
  partialQuantityProcessed: 0
}
```

### Example: Limit Order (Fully Filled)

```ts
// Limit order for 10 units (10 available)
book.createOrder({ type: 'limit', id: 'buy-1', price: 100, size: 10, side: 'buy' })

// Result:
{
  done: [
    { id: 'sell-1', side: 'sell', size: 10 },  // Matched maker
    { id: 'buy-1', side: 'buy', size: 10 }     // Taker ✅
  ],
  partial: null,
  quantityLeft: 0,
  partialQuantityProcessed: 0
}
```

### Example: Limit Order (Partially Filled)

```ts
// Limit order for 10 units (only 5 available)
book.createOrder({ type: 'limit', id: 'buy-1', price: 100, size: 10, side: 'buy' })

// Result:
{
  done: [{ id: 'sell-1', side: 'sell', size: 5 }],  // Fully consumed maker
  partial: { id: 'buy-1', side: 'buy', size: 5 },   // Taker ✅ (5 unfilled)
  quantityLeft: 5,                                  // 5 units unfilled
  partialQuantityProcessed: 5                       // 5 units filled
}
```

## Self-Trade Prevention (STP)

> Inspired by [Binance's Self-Trade Prevention](https://developers.binance.com/docs/derivatives/usds-margined-futures/faq/stp-faq) — prevents orders from the same account from matching against each other.

### How it works

Each order can carry an `accountId` and a `stpMode`. When a taker order enters the book and would match against a maker order with the same `accountId`, the STP mode of the **taker order** determines what happens:

| Mode | Effect |
|------|--------|
| `NONE` | No prevention — orders match normally |
| `EXPIRE_MAKER` | The resting maker order(s) expire; the taker order continues |
| `EXPIRE_TAKER` | The taker order is rejected; the resting maker order(s) stay on the book |
| `EXPIRE_BOTH` | Both the taker and the matching maker order(s) expire |

The STP mode of the **taker** order always takes precedence — the mode stored on a resting maker order is ignored for STP purposes.

### API reference

Add `accountId` and `stpMode` to any order:

```ts
import { OrderBook, SelfTradePreventionMode, Side } from 'nodejs-order-book'

const ob = new OrderBook()

// Place a resting limit order from account "alice"
ob.limit({
  side: Side.BUY,
  id: 'maker-order',
  size: 5,
  price: 100,
  accountId: 'alice',
})

// Taker from the same account with STP enabled
const result = ob.limit({
  side: Side.SELL,
  id: 'taker-order',
  size: 3,
  price: 90,
  accountId: 'alice',
  stpMode: SelfTradePreventionMode.EXPIRE_MAKER,
})

// Check which orders expired due to STP
console.log(result.stpExpired) // [{ id: 'maker-order', ... }]
```

### Response fields

When STP is triggered, the response (`IProcessOrder`) includes:

| Field | Type | Description |
|-------|------|-------------|
| `stpExpired` | `IOrder[] \| undefined` | Orders removed from the book due to STP |
| `err` | `OrderBookError \| null` | Error with `code: 1202` and `message: "Self-trade prevention triggered"` for `EXPIRE_TAKER` / `EXPIRE_BOTH` |

### Error code

STP rejections return error code `1202`:

```ts
import { ErrorCodes } from 'nodejs-order-book'

assert.equal(result.err?.code, ErrorCodes.STP_TRIGGERED)
// → 1202
assert.equal(result.err?.message, 'Self-trade prevention triggered')
```

### Scenarios

#### A) EXPIRE_MAKER — maker expires, taker continues

```
Maker BUY  @ 100  qty: 5  account: "alice"
Maker BUY  @  90  qty: 5  account: "alice"
Taker SELL @  90  qty: 3  account: "alice"  mode: EXPIRE_MAKER
```

The two resting buy orders share the same account as the taker. With `EXPIRE_MAKER`, they are removed from the book and reported in `stpExpired[]`. The taker order (size 3) is placed on the book as a new maker.

```
stpExpired → [maker-buy-100, maker-buy-90]
err        → null
```

#### B) EXPIRE_TAKER — taker expires, maker stays

```
Maker BUY @ 100  qty: 5  account: "alice"
Taker SELL @ 90  qty: 3  account: "alice"  mode: EXPIRE_TAKER
```

The taker order is rejected immediately. The resting maker order remains untouched on the book.

```
stpExpired → undefined
err        → { code: 1202, message: "Self-trade prevention triggered" }
```

#### C) EXPIRE_BOTH — both orders expire

```
Maker BUY @ 100  qty: 5  account: "alice"
Taker SELL @ 90  qty: 3  account: "alice"  mode: EXPIRE_BOTH
```

The maker is removed from the book and the taker is rejected. Both sides expire.

```
stpExpired → [maker-buy-100]
err        → { code: 1202, message: "Self-trade prevention triggered" }
```

#### D) Different accounts — normal matching (no STP)

```
Maker BUY @ 100  qty: 5  account: "alice"
Taker SELL @ 90  qty: 3  account: "bob"  mode: EXPIRE_MAKER
```

The accounts differ, so STP does **not** trigger. The orders match normally.

```
done   → [filled trade summary]
stpExpired → undefined
```

#### E) Mode NONE — no prevention

```
Maker BUY @ 100  qty: 5  account: "alice"
Taker SELL @ 90  qty: 3  account: "alice"  mode: NONE
```

Even though both orders are from the same account, `NONE` mode allows the match.

```
done   → [filled trade summary]
stpExpired → undefined
```

#### F) Market order with EXPIRE_MAKER

```
Maker BUY @ 100  qty: 5  account: "alice"
Taker SELL (market)  qty: 3  account: "alice"  mode: EXPIRE_MAKER
```

The resting maker is expired via STP. The market order has no remaining liquidity, so it also expires.

```
stpExpired → [maker-buy-100]
err        → null
```

#### G) Mixed accounts at the same price level

```
Maker "alice" BUY @ 100  qty: 5
Maker "bob"   BUY @ 100  qty: 5
Taker "alice" SELL @ 90  qty: 8  mode: EXPIRE_MAKER
```

At price level 100, alice's maker is expired (`stpExpired`), while bob's maker matches normally (`done`). The remaining taker quantity (3) rests on the book.

```
stpExpired → [maker-alice-100]
done       → [maker-bob-100]
```

#### H) STP carries through triggered stop orders

Stop orders preserve the `stpMode` they were created with. When a stop order is triggered and becomes a taker, its STP mode is applied at match time.

```ts
ob.createOrder({
  type: OrderType.STOP_LIMIT,
  side: Side.BUY,
  size: 3,
  price: 110,
  stopPrice: 108,
  accountId: 'alice',
  stpMode: SelfTradePreventionMode.EXPIRE_MAKER,
})
```

### Important notes

- STP is evaluated using the **taker order's** mode, regardless of what mode the resting maker orders carry.
- If no `accountId` is specified on either side, STP is **not** triggered (backward compatible).
- If no `stpMode` is specified, it defaults to `NONE` (no prevention).
- Stop market and stop limit orders preserve the `stpMode` and apply it when triggered.
- Modify operations reset `stpMode` to `NONE`.

## Order Book Options

The order book can be initialized with the following options by passing them to the constructor:

### Snapshot

A `snapshot` represents the state of the order book at a specific point in time. It includes:

- `asks`: List of ask orders, each with a `price` and a list of associated `orders`.
- `bids`: List of bid orders, each with a `price` and a list of associated `orders`.
- `stopBook`: An object with `bids` and `asks` properties related to every `StopOrder` in the order book.
- `ts`: A Unix timestamp of when the snapshot was taken.
- `lastOp`: The ID of the last operation included in the snapshot.

Snapshots are crucial for restoring the order book to a previous state. The order book can restore from a snapshot before processing any journal logs, ensuring consistency and accuracy. After taking a snapshot, you can safely remove all logs preceding the `lastOp` id.

**Note**: The snapshot returns an object containing arrays of `bids` and `asks`. If the snapshot is saved to the database as a string, use `JSON.parse` to restore it when initializing the order book.

```ts
const ob = new OrderBook({ enableJournaling: true })

// After every order, save the log to the database
const order = ob.limit({ side: "sell", id: "uniqueID", size: 55, price: 100 })
await saveLog(order.log)

// ... after some time, take a snapshot and save it
const snapshot = ob.snapshot()
await saveSnapshot(JSON.stringify(snapshot))

// Safe to remove logs before the snapshot's lastOp
await removePreviousLogs(snapshot.lastOp)

// On server restart, restore from snapshot + logs
const logs = await getLogs()
const snapshot = await getSnapshot()

const ob = new OrderBook({
  snapshot: JSON.parse(snapshot),
  journal: logs,
  enableJournaling: true,
})
```

### Journal Logs

The `journal` option accepts an array of journal logs (obtained by setting `enableJournaling` to `true`). When provided, the order book replays all operations, restoring its state to match the last log.

```ts
const logs = await getLogs()
const ob = new OrderBook({ journal: logs, enableJournalLog: true })
```

Combining snapshots with journaling gives you full state persistence and auditability.

### Enable Journaling

When `enableJournaling` is `true`, the property `log` is attached to every operation response. These logs should be persisted and can be used to restore the order book on restart.

```ts
const ob = new OrderBook({ enableJournaling: true }) // false by default

// After every operation, save the log
const order = ob.limit({ side: "sell", id: "uniqueID", size: 55, price: 100 })
await saveLog(order.log)
```

## Development

### Prerequisites

- Node.js 18+
- npm (or yarn / pnpm)

### Setup

```bash
# Install dependencies
npm install

# Build all distributions (CJS, ESM, types)
npm run build

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Run benchmarks (build first)
npm run bench
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build CJS, ESM, and type declarations |
| `npm run test` | Run unit tests |
| `npm run test:dev` | Run tests in watch mode |
| `npm run test:cov` | Run tests with lcov coverage report |
| `npm run bench` | Run performance benchmarks |
| `npm run lint` | Check code style with Biome |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run clean` | Clean build output |
| `npm run package` | Build and pack for local testing |

## Contributing

Contributions are welcome! Please read the [Contributing Guidelines](CONTRIBUTING.md) before getting started.

1. Fork the repository
2. Create your feature branch (`git checkout -b my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin my-feature`)
5. Open a Pull Request

Please also refer to the [Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md).

## License

Copyright [Andrea Fassina](https://github.com/fasenderos), Licensed under [MIT](LICENSE).

## Donation

If this project saves you time or helps your business, consider buying me a coffee.

- **USDT (TRC20):** `TXArNxsq2Ee8Jvsk45PudVio52Joiq1yEe`
- **BTC:** `1GYDVSAQNgG7MFhV5bk15XJy3qoE4NFenp`
- **BTC (BEP20):** `0xf673ee099be8129ec05e2f549d96ebea24ac5d97`
- **ETH (ERC20):** `0xf673ee099be8129ec05e2f549d96ebea24ac5d97`
- **BNB (BEP20):** `0xf673ee099be8129ec05e2f549d96ebea24ac5d97`
