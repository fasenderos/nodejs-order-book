import { Order } from './order'
import { OrderQueue } from './orderqueue'
export declare class OrderSide {
  private priceTree
  private prices
  private _volume
  private numOrders
  private depthSide
  constructor()
  len: () => number
  depth: () => number
  volume: () => number
  append: (order: Order) => Order
  remove: (order: Order) => Order
  maxPriceQueue: () => OrderQueue | null
  minPriceQueue: () => OrderQueue | null
  lessThan: (price: number) => OrderQueue | null
  greaterThan: (price: number) => OrderQueue | null
  orders: () => any
  toString: () => string
}
