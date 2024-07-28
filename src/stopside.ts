import createRBTree from 'functional-red-black-tree'
import { Side } from './side'
import { StopQueue } from './stopqueue'
import { StopOrder } from './types'
import { CustomError, ERROR } from './errors'

export class StopSide {
  private _priceTree: createRBTree.Tree<number, StopQueue>
  private _prices: { [key: string]: StopQueue } = {}
  private readonly _side: Side

  constructor (side: Side) {
    const compare =
      side === Side.SELL
        ? (a: number, b: number) => a - b
        : (a: number, b: number) => b - a
    this._priceTree = createRBTree<number, StopQueue>(compare)
    this._side = side
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

  // removes order from definite price level
  remove = (id: string, stopPrice: number): StopOrder | undefined => {
    const strPrice = stopPrice.toString()
    if (this._prices[strPrice] === undefined) {
      throw CustomError(ERROR.ErrInvalidPriceLevel)
    }
    const deletedOrder = this._prices[strPrice].remove(id)
    if (this._prices[strPrice].len() === 0) {
      /* eslint-disable @typescript-eslint/no-dynamic-delete */
      delete this._prices[strPrice]
      this._priceTree = this._priceTree.remove(stopPrice)
    }
    return deletedOrder
  }

  removePriceLevel = (priceLevel: number): void => {
    /* eslint-disable @typescript-eslint/no-dynamic-delete */
    delete this._prices[priceLevel.toString()]
    this._priceTree = this._priceTree.remove(priceLevel)
  }

  // Get orders queue between two price levels
  between = (priceBefore: number, marketPrice: number): StopQueue[] => {
    const queues: StopQueue[] = []
    let lowerBound = priceBefore
    let upperBound = marketPrice
    const highest = Math.max(priceBefore, marketPrice)
    const lowest = Math.min(priceBefore, marketPrice)
    if (this._side === Side.BUY) {
      lowerBound = highest
      upperBound = lowest - 1
    } else {
      lowerBound = lowest
      upperBound = highest + 1
    }
    this._priceTree.forEach(
      (price, queue) => {
        if (
          (this._side === Side.BUY && price >= lowest) ||
          (this._side === Side.SELL && price <= highest)
        ) {
          queues.push(queue)
        }
      },
      lowerBound, // Inclusive
      upperBound // Exclusive (so we add +-1 depending on the side)
    )
    return queues
  }
}
