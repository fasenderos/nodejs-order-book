import { Node } from 'dbly-linked-list'
import { Order } from './order'
export declare class OrderQueue {
  private _price
  private _volume
  private orders
  private ordersMap
  constructor(price: number)
  len: () => number
  toArray: () => any[]
  price: () => number
  volume: () => number
  head: () => Node | null
  tail: () => Node | null
  append: (order: Order) => Order
  update: (node: Node, nodeData: Order, order: Order) => void
  remove: (order: Order) => void
}
