import { ErrInsufficientQuantity } from './errors'
import { Order } from './order'
import { OrderQueue } from './orderqueue'
import { Side } from './side'
interface ProcessOrder {
  done: any | null
  partial: number | null
  partialQuantityProcessed: number | null
  quantityLeft: number | null
  err: Error | null
}
export declare class OrderBook {
  private orders
  private bids
  private asks
  constructor()
  processMarketOrder: (side: Side, size: number) => ProcessOrder
  processLimitOrder: (
    side: Side,
    orderID: string,
    size: number,
    price: number
  ) => any
  greaterThanOrEqual: (a: number, b: number) => boolean
  lessThanOrEqual: (a: number, b: number) => boolean
  processQueue: (orderQueue: OrderQueue, quantityToTrade: number) => any
  order: (orderID: string) => Order | null
  depth: () => number[][][]
  cancelOrder: (orderID: string) => Order | null
  calculateMarketPrice: (
    side: Side,
    size: number
  ) => {
    price: number
    err: ErrInsufficientQuantity | undefined
  }
  toString(): string
}
export {}
