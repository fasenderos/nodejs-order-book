import { LimitOrder, StopLimitOrder, StopMarketOrder } from './order'
import type { Side } from './side'

export enum OrderType {
  LIMIT = 'limit',
  MARKET = 'market',
  OCO = 'oco',
  STOP_LIMIT = 'stop_limit',
  STOP_MARKET = 'stop_market',
}

export enum TimeInForce {
  GTC = 'GTC',
  IOC = 'IOC',
  FOK = 'FOK',
}

export type StopOrder = StopLimitOrder | StopMarketOrder
export type Order = LimitOrder | StopOrder

interface BaseOrderOptions {
  id?: string
  side: Side
  size: number
}
interface InternalBaseOrderOptions extends BaseOrderOptions {
  type: OrderType
  time?: number
  origSize?: number
}
/**
 * Specific options for a market order.
 */
export interface MarketOrderOptions extends BaseOrderOptions {}
interface IMarketOrderOptions extends InternalBaseOrderOptions {}
export interface InternalMarketOrderOptions extends IMarketOrderOptions {
  type: OrderType.MARKET
}

/**
 * Specific options for a limit order.
 */
export interface LimitOrderOptions extends MarketOrderOptions {
  id: string
  price: number
  timeInForce?: TimeInForce
}
interface ILimitOrderOptions extends InternalBaseOrderOptions {
  id: string
  price: number
  timeInForce: TimeInForce
  isMaker: boolean
}
export interface InternalLimitOrderOptions extends ILimitOrderOptions {
  type: OrderType.LIMIT
  ocoStopPrice?: number
}

/**
 * Specific options for a stop market order.
 */
export interface StopMarketOrderOptions extends MarketOrderOptions {
  stopPrice: number
}
export interface InternalStopMarketOrderOptions extends IMarketOrderOptions {
  type: OrderType.STOP_MARKET
  stopPrice: number
}

/**
 * Specific options for a stop limit order.
 */
export interface StopLimitOrderOptions extends LimitOrderOptions {
  stopPrice: number
}
export interface InternalStopLimitOrderOptions extends ILimitOrderOptions {
  type: OrderType.STOP_LIMIT
  stopPrice: number
  isOCO?: boolean
}

/**
 * Specific options for oco order.
 */
export interface OCOOrderOptions extends StopLimitOrderOptions {
  stopPrice: number
  stopLimitPrice: number
  stopLimitTimeInForce?: TimeInForce
}

/**
 * Object object representation of a market order returned by the toObject() method.
 */
export interface IMarketOrder {
  id: string
  type: OrderType
  side: Side
  size: number
  origSize: number
  time: number
}

/**
 * Object object representation of a limit order returned by the toObject() method.
 */
export interface ILimitOrder {
  id: string
  type: OrderType
  side: Side
  size: number
  origSize: number
  price: number
  time: number
  timeInForce: TimeInForce
  isMaker: boolean
}

/**
 * Object object representation of a stop market order returned by the toObject() method.
 */
export interface IStopMarketOrder {
  id: string
  type: OrderType
  side: Side
  size: number
  origSize: number
  stopPrice: number
  time: number
}

/**
 * Object object representation of a stop limit order returned by the toObject() method.
 */
export interface IStopLimitOrder {
  id: string
  type: OrderType
  side: Side
  size: number
  origSize: number
  price: number
  stopPrice: number
  timeInForce: TimeInForce
  time: number
  isMaker: boolean
}

/**
 * Represents an order in the order book.
 */
export type OrderOptions =
  | InternalMarketOrderOptions
  | InternalLimitOrderOptions
  | InternalStopLimitOrderOptions
  | InternalStopMarketOrderOptions

export type StopOrderOptions =
  | StopMarketOrderOptions
  | StopLimitOrderOptions
  | OCOOrderOptions
/**
 * Represents the result of processing an order.
 */
export interface IProcessOrder {
  /** Array of fully processed orders. */
  done: Order[]
  /** Array of activated (stop limit or stop market) orders */
  activated: StopOrder[]
  /** The partially processed order, if any. */
  partial: LimitOrder | null
  /** The quantity that has been processed in the partial order. */
  partialQuantityProcessed: number
  /** The remaining quantity that needs to be processed. */
  quantityLeft: number
  /** The error encountered during order processing, if any. */
  err: Error | null
  /** Optional journal log entry related to the order processing. */
  log?: JournalLog
}

export interface ConditionOrderOptions {
  stopPrice: number
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
 * Represents a cancel order operation.
 */
export interface ICancelOrder {
  order: LimitOrder
  stopOrder?: StopOrder
  /** Optional log related to the order cancellation. */
  log?: CancelOrderJournalLog
}

/**
 * Represents a log entry for a market order operation.
 */
export interface MarketOrderJournalLog {
  /** Incremental ID of the operation */
  opId: number
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
  /** Incremental ID of the operation */
  opId: number
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
  /** Incremental ID of the operation */
  opId: number
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
  /** Incremental ID of the operation */
  opId: number
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

export type CreateOrderOptions =
  | ({ type: OrderType.MARKET } & MarketOrderOptions)
  | ({ type: OrderType.LIMIT } & LimitOrderOptions)
  | ({ type: OrderType.STOP_MARKET } & StopMarketOrderOptions)
  | ({ type: OrderType.STOP_LIMIT } & StopLimitOrderOptions)
  | ({ type: OrderType.OCO } & OCOOrderOptions)

/**
 * Options for configuring the order book.
 */
export interface OrderBookOptions {
  /**
   * Orderbook snapshot to restore from. The restoration
   * will be executed before processing any journal logs, if any.
   */
  snapshot?: Snapshot
  /** Flag to enable journaling. */
  enableJournaling?: boolean
  /** Array of journal logs. */
  journal?: JournalLog[]
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

/**
 * Interface to represent a snapshot of the order book
 */
export interface Snapshot {
  /** List of ask orders, each with a price and a list of associated orders */
  asks: Array<{
    /** Price of the ask order */
    price: number
    /** List of orders associated with this price */
    orders: LimitOrder[]
  }>
  /** List of bid orders, each with a price and a list of associated orders */
  bids: Array<{
    /** Price of the bid order */
    price: number
    /** List of orders associated with this price */
    orders: LimitOrder[]
  }>
  /** Unix timestamp representing when the snapshot was taken */
  ts: number
  /** The id of the last operation inserted in the orderbook */
  lastOp: number
}
