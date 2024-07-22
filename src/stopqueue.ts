import Denque from 'denque'
import { StopOrder } from './types'

export class StopQueue {
  private readonly _price: number
  private readonly _orders: Denque<StopOrder>
  private _ordersMap: { [key: string]: number } = {}

  constructor (price: number) {
    this._price = price
    this._orders = new Denque<StopOrder>()
  }

  // returns the number of orders in queue
  len = (): number => {
    return this._orders.length
  }

  // remove order from head of queue
  removeFromHead = (): StopOrder | undefined => {
    return this._orders.shift()
  }

  // adds order to tail of the queue
  append = (order: StopOrder): StopOrder => {
    this._orders.push(order)
    this._ordersMap[order.id] = this._orders.length - 1
    return order
  }
}
