import type { Order, TimeInForce } from './order'
import type { Side } from './side'

/**
 * Represents the result of processing an order.
 */
export interface IProcessOrder {
  /** Array of fully processed orders. */
  done: Order[]
  /** The partially processed order, if any. */
  partial: Order | null
  /** The quantity that has been processed in the partial order. */
  partialQuantityProcessed: number
  /** The remaining quantity that needs to be processed. */
  quantityLeft: number
  /** The error encountered during order processing, if any. */
  err: Error | null
  /** Optional journal log entry related to the order processing. */
  log?: JournalLog
}

/**
 * Represents a cancel order operation.
 */
export interface ICancelOrder {
  order: Order
  /** Optional log related to the order cancellation. */
  log?: CancelOrderJournalLog
}

/**
 * Represents a log entry for a market order operation.
 */
export interface MarketOrderJournalLog {
  /** Timestamp of the operation. */
  ts: number
  /** Operation type: 'm' for market order. */
  op: 'm'
  /** Specific options for the market order. */
  o: MarketOrderOptions
}

/**
 * Represents a log entry for a limit order operation.
 */
export interface LimitOrderJournalLog {
  /** Timestamp of the operation. */
  ts: number
  /** Operation type: 'l' for limit order. */
  op: 'l'
  /** Specific options for the limit order. */
  o: LimitOrderOptions
}

/**
 * Represents a log entry for an order modification operation.
 */
export interface ModifyOrderJournalLog {
  /** Timestamp of the operation. */
  ts: number
  /** Operation type: 'u' for update order. */
  op: 'u'
  /** Specific options for modifying the order. */
  o: ModifyOrderOptions
}

/**
 * Represents a log entry for an order cancellation operation.
 */
export interface CancelOrderJournalLog {
  /** Timestamp of the operation. */
  ts: number
  /** Operation type: 'd' for delete order. */
  op: 'd'
  /** Specific options for canceling the order. */
  o: CancelOrderOptions
}

/**
 * Discriminated union of all journaling log types.
 */
export type JournalLog =
  | MarketOrderJournalLog
  | LimitOrderJournalLog
  | ModifyOrderJournalLog
  | CancelOrderJournalLog

/**
 * Specific options for a market order.
 */
export interface MarketOrderOptions {
  /** Side of the order (buy/sell). */
  side: Side
  /** Size of the order. */
  size: number
}

/**
 * Specific options for a limit order.
 */
export interface LimitOrderOptions {
  /** Side of the order (buy/sell). */
  side: Side
  /** Unique identifier of the order. */
  orderID: string
  /** Size of the order. */
  size: number
  /** Price of the order. */
  price: number
  /** Time in force policy for the order. */
  timeInForce: TimeInForce
}

/**
 * Specific options for modifying an order.
 */
export interface ModifyOrderOptions {
  /** Unique identifier of the order. */
  orderID: string
  /** Details of the order update (price or size). */
  orderUpdate: OrderUpdatePrice | OrderUpdateSize
}

/**
 * Specific options for canceling an order.
 */
export interface CancelOrderOptions {
  /** Unique identifier of the order. */
  orderID: string
}

/**
 * Options for configuring the order book.
 */
export interface OrderBookOptions {
  /** Flag to enable journaling. */
  enableJournaling?: boolean
  /** Array of journal logs. */
  journal?: JournalLog[]
}

/**
 * Represents an order in the order book.
 */
export interface IOrder {
  /** Unique identifier of the order. */
  id: string
  /** Side of the order (buy/sell). */
  side: Side
  /** Size of the order. */
  size: number
  /** Price of the order. */
  price: number
  /** Timestamp of the order. */
  time: number
  /** Flag to indicate if the order is a maker order. */
  isMaker: boolean
}

/**
 * Represents an update to the price of an order.
 */
export interface OrderUpdatePrice {
  /** New price of the order. */
  price: number
  /** New size of the order (optional). */
  size?: number
}

/**
 * Represents an update to the size of an order.
 */
export interface OrderUpdateSize {
  /** New price of the order (optional). */
  price?: number
  /** New size of the order. */
  size: number
}
