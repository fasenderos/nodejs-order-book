<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.0 | Updated: 2026-06-27 -->

# Technical Domain

**Purpose**: Tech stack, architecture, and development patterns for the Node.js Limit Order Book.
**Last Updated**: 2026-06-27

## Quick Reference
**Update Triggers**: Tech stack changes | New order types | Matching algorithm changes
**Audience**: Developers, AI agents contributing to this library

## Primary Stack
| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Language | TypeScript | ^5.0 | Type safety for complex financial logic |
| Runtime | Node.js | (latest) | Non-blocking I/O, ecosystem |
| Data Structures | Denque + functional-red-black-tree | 2.1.0 / 1.0.1 | O(1) queue ops + O(log n) price tree |
| Linting/Formatting | Biome | ^2.1 | Fast, unified toolchain |
| Testing | Native Node test runner + c8 | ^10.1 | Built-in, coverage reports |
| Build | tsc (CJS + ESM + Types) | — | Multi-module output |
| CI/CD | CircleCI + Codecov + release-it | — | Automated release pipeline |
| Git Hooks | husky + commitlint | — | Conventional commits enforcement |

## Architecture Pattern
```
Type: Library (NPM package)
Pattern: Class-based with factory pattern for order creation
Data flow: CreateOrder → validate → process (match/cancel/add) → return response
```

### Core Class Hierarchy
```
OrderBook              ← Main entry point (public API)
├── OrderSide (×2)     ← Bids & asks, backed by red-black tree
│   └── OrderQueue     ← Price level queue (Denque)
├── StopBook           ← Stop orders management
│   └── OrderQueue     ← Per-price-level queues
├── OrderFactory       ← Creates LimitOrder/StopLimitOrder/StopMarketOrder
└── BaseOrder          ← Abstract base for all order types
```

## Code Patterns

### Library API (OrderBook)
```typescript
const ob = new OrderBook({ enableJournaling: true })

const result = ob.createOrder({
  type: OrderType.LIMIT,
  side: Side.BUY,
  id: "order-001",
  size: 1000,
  price: 150.25,
  timeInForce: TimeInForce.GTC,
})
// Returns: { done: IOrder[], partial: null | IOrder, err: null | OrderBookError, ... }

const [asks, bids] = ob.depth()
const snapshot = ob.snapshot()
const order = ob.order("order-001")
ob.modify("order-001", { size: 2000 })
ob.cancel("order-001")
```

### Component (Class Structure)
```typescript
export class OrderBook {
  private readonly bids: OrderSide
  private readonly asks: OrderSide

  constructor(options: OrderBookOptions = {}) { /* ... */ }

  public createOrder(options: CreateOrderOptions): IProcessOrder {
    switch (options.type) {
      case OrderType.LIMIT:       return this._limit(options)
      case OrderType.MARKET:      return this._market(options)
      case OrderType.STOP_LIMIT:  return this._stopLimit(options)
      case OrderType.STOP_MARKET: return this._stopMarket(options)
      case OrderType.OCO:         return this._oco(options)
    }
  }

  public cancel(orderID: string): ICancelOrder | undefined { /* ... */ }
  public depth(): [Array<[number, number]>, Array<[number, number]>] { /* ... */ }
  public snapshot(): Snapshot { /* ... */ }
}
```

### Error Handling
```typescript
import { CustomError, ERROR } from "./errors"

// All public methods validate inputs and return structured errors
if (!validSide) {
  return { ...response, err: CustomError(ERROR.INVALID_SIDE) }
}
// err is never thrown — always returned in the response object
```

## Naming Conventions
| Type | Convention | Example |
|------|-----------|---------|
| Files | camelCase | `orderbook.ts`, `orderqueue.ts` |
| Classes | PascalCase | `OrderBook`, `OrderQueue`, `OrderFactory` |
| Methods | camelCase | `createOrder()`, `snapshot()`, `toObject()` |
| Enums | PascalCase, SCREAMING_SNAKE values | `OrderType.LIMIT`, `Side.BUY` |
| Interfaces | PascalCase with `I` prefix | `IOrder`, `ILimitOrder`, `IProcessOrder` |
| Private fields | `_` prefix + camelCase | `_id`, `_side`, `_marketPrice` |
| Private methods | `_` prefix + camelCase | `_market()`, `_cancelOrder()` |
| Error keys | SCREAMING_SNAKE | `ERROR.ORDER_NOT_FOUND` |

## Code Standards
- TypeScript strict mode with interfaces and generics
- Biome for linting and formatting (`biome check ./src ./test`)
- 100% test coverage enforced via c8
- JSDoc on all public methods (params, returns, inline examples)
- Class-based modules with private fields for encapsulation
- Price-time-priority matching algorithm
- Factory pattern (`OrderFactory`) for consistent order creation
- Conventional commits (commitlint + husky + release-it)
- Multi-module output: CJS + ESM + Type declarations

## Security Requirements
- Validate all inputs on public API methods (side, size, price, timeInForce, order ID uniqueness)
- Return structured errors via `CustomError()` — never raw throws on expected failures
- No side effects in constructors — explicit initialization
- Journaling for state recovery without data loss
- Post-only protection prevents unwanted taker fills

## 📂 Codebase References
**Core**: `src/orderbook.ts` — Main OrderBook, matching engine, order lifecycle
**Orders**: `src/order.ts` — Order classes (Limit, Market, Stop) + OrderFactory
**Queues**: `src/orderqueue.ts` — Price-level queue (Denque-backed)
**Sides**: `src/orderside.ts` — Bid/ask side (red-black tree)
**Stop Orders**: `src/stopbook.ts` — Stop order management
**Errors**: `src/errors.ts` — Custom error system with numeric codes
**Types**: `src/types.ts` — All interfaces, enums, type aliases
**Utils**: `src/utils.ts` — Utility functions (safeStringify)
**Config**: `package.json`, `tsconfig.json`, `config/`, `biome.json`

## Related Files
- `decisions-log.md` — Architecture decisions and rationale
- `business-domain.md` — Why this library exists
