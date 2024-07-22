import createRBTree from 'functional-red-black-tree'
import { Side } from './side'
import { StopQueue } from './stopqueue'
import { StopOrder } from './types'

export class StopSide {
  private _priceTree: createRBTree.Tree<number, StopQueue>
  private _prices: { [key: string]: StopQueue } = {}

  constructor (side: Side) {
    const compare =
      side === Side.SELL
        ? (a: number, b: number) => a - b
        : (a: number, b: number) => b - a
    this._priceTree = createRBTree<number, StopQueue>(compare)
  }

  // appends order to definite price level
  append = (order: StopOrder): StopOrder => {
    const price = order.stopPrice
    const strPrice = price.toString()
    if (this._prices[strPrice] === undefined) {
      const priceQueue = new StopQueue(price)
      this._prices[strPrice] = priceQueue
      this._priceTree = this._priceTree.insert(price, priceQueue)
    }
    return this._prices[strPrice].append(order)
  }

  // Get orders queue between upper and lower price levels
  between = (upperBound: number, lowerBound: number): StopQueue[] => {
    const queues: StopQueue[] = []
    this._priceTree.forEach(
      (_, queue) => {
        queues.push(queue)
      },
      lowerBound, // Inclusive
      upperBound + 1 // Exclusive (so we add +1)
    )
    return queues
  }
}
