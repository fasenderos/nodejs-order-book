import BigNumber from 'bignumber.js'
import createRBTree from 'functional-red-black-tree'
import { CustomError, ERROR } from './errors'
import { Order, OrderUpdate } from './order'
import { OrderQueue } from './orderqueue'
import { Side } from './side'

export class OrderSide {
  private _priceTree: createRBTree.Tree<number, OrderQueue>
  private _prices: { [key: string]: OrderQueue } = {}
  private _volume = new BigNumber(0)
  private _total = new BigNumber(0)
  private _numOrders = 0
  private _depthSide = 0
  private readonly _side: Side = Side.SELL

  constructor (side: Side) {
    const compare =
      side === Side.SELL
        ? (a: number, b: number) => a - b
        : (a: number, b: number) => b - a
    this._priceTree = createRBTree<number, OrderQueue>(compare)
    this._side = side
  }

  // returns amount of orders
  len = (): number => {
    return this._numOrders
  }

  // returns depth of market
  depth = (): number => {
    return this._depthSide
  }

  // returns total amount of quantity in side
  volume = (): BigNumber => {
    return this._volume
  }

  // returns the total (size * price of each price level) in side
  total = (): BigNumber => {
    return this._total
  }

  // returns the price tree in side
  priceTree = (): createRBTree.Tree<number, OrderQueue> => {
    return this._priceTree
  }

  // appends order to definite price level
  append = (order: Order): Order => {
    const price = order.price
    const strPrice = price.toString()
    if (this._prices[strPrice] === undefined) {
      const priceQueue = new OrderQueue(price)
      this._prices[strPrice] = priceQueue
      this._priceTree = this._priceTree.insert(price, priceQueue)
      this._depthSide += 1
    }
    this._numOrders += 1
    this._volume = this._volume.plus(order.size)
    this._total = this._total.plus(order.size.multipliedBy(order.price))
    return this._prices[strPrice].append(order)
  }

  // removes order from definite price level
  remove = (order: Order): Order => {
    const price = order.price
    const strPrice = price.toString()
    if (this._prices[strPrice] === undefined) throw CustomError(ERROR.ErrInvalidPriceLevel)
    this._prices[strPrice].remove(order)
    if (this._prices[strPrice].len() === 0) {
      /* eslint-disable @typescript-eslint/no-dynamic-delete */
      delete this._prices[strPrice]
      this._priceTree = this._priceTree.remove(price)
      this._depthSide -= 1
    }

    this._numOrders -= 1
    this._volume = this._volume.minus(order.size)
    this._total = this._total.minus(order.size.multipliedBy(order.price))
    return order
  }

  update = (oldOrder: Order, orderUpdate: OrderUpdate): Order | undefined => {
    if (
      orderUpdate.price !== undefined &&
      orderUpdate.price !== oldOrder.price
    ) {
      // Price changed. Remove order and update tree.
      this.remove(oldOrder)
      const newOrder = new Order(
        oldOrder.id,
        oldOrder.side,
        orderUpdate.size !== undefined ? new BigNumber(orderUpdate.size) : oldOrder.size,
        orderUpdate.price,
        Date.now(),
        oldOrder.isMaker
      )
      this.append(newOrder)
      return newOrder
    } else if (
      orderUpdate.size !== undefined &&
      orderUpdate.size !== oldOrder.size.toNumber()
    ) {
      // Quantity changed. Price is the same.
      const oldOrderSize: number = oldOrder.size.toNumber()
      const strPrice = oldOrder.price.toString()
      this._volume = this._volume.plus(orderUpdate.size - oldOrderSize)
      this._total = this._total.plus(
        orderUpdate.size * orderUpdate.price - oldOrderSize * oldOrder.price
      )
      this._prices[strPrice].updateOrderSize(oldOrder, orderUpdate.size)
      return oldOrder
    }
  }

  // returns max level of price
  maxPriceQueue = (): OrderQueue | undefined => {
    if (this._depthSide > 0) {
      const max =
        this._side === Side.SELL ? this._priceTree.end : this._priceTree.begin
      return max.value
    }
  }

  // returns min level of price
  minPriceQueue = (): OrderQueue | undefined => {
    if (this._depthSide > 0) {
      const min =
        this._side === Side.SELL ? this._priceTree.begin : this._priceTree.end
      return min.value
    }
  }

  // returns nearest OrderQueue with price less than given
  lowerThan = (price: number): OrderQueue | undefined => {
    const node =
      this._side === Side.SELL
        ? this._priceTree.lt(price)
        : this._priceTree.gt(price)
    return node.value
  }

  // returns nearest OrderQueue with price greater than given
  greaterThan = (price: number): OrderQueue | undefined => {
    const node =
      this._side === Side.SELL
        ? this._priceTree.gt(price)
        : this._priceTree.lt(price)
    return node.value
  }

  // returns all orders
  orders = (): Order[] => {
    let orders: Order[] = []
    for (const price in this._prices) {
      if (Object.prototype.hasOwnProperty.call(this._prices, price)) {
        const allOrders = this._prices[price].toArray()
        orders = orders.concat(allOrders)
      }
    }
    return orders
  }

  toString = (): string => {
    let s = ''
    let level = this.maxPriceQueue()
    while (level !== undefined) {
      const volume: string = level.volume().toString()
      s += `\n${level.price()} -> ${volume}`
      level = this.lowerThan(level.price())
    }
    return s
  }
}
