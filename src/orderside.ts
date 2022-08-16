import createRBTree from 'functional-red-black-tree'
import { CustomError, ERROR } from './errors'
import { Order, OrderUpdate } from './order'
import { OrderQueue } from './orderqueue'

export class OrderSide {
  private priceTree: createRBTree.Tree<number, OrderQueue>
  private prices: { [key: string]: OrderQueue } = {}

  private _volume = 0
  private numOrders = 0
  private depthSide = 0

  constructor() {
    this.priceTree = createRBTree()
  }

  // returns amount of orders
  len = (): number => {
    return this.numOrders
  }

  // returns depth of market
  depth = (): number => {
    return this.depthSide
  }

  // returns total amount of quantity in side
  volume = (): number => {
    return this._volume
  }

  // appends order to definite price level
  append = (order: Order): Order => {
    const price = order.price
    const strPrice = price.toString()
    if (!this.prices[strPrice]) {
      const priceQueue = new OrderQueue(price)
      this.prices[strPrice] = priceQueue
      this.priceTree = this.priceTree.insert(price, priceQueue)
      this.depthSide += 1
    }
    this.numOrders += 1
    this._volume += order.size
    return this.prices[strPrice].append(order)
  }

  // removes order from definite price level
  remove = (order: Order): Order => {
    const price = order.price
    const strPrice = price.toString()
    if (!this.prices[strPrice]) throw CustomError(ERROR.ErrInvalidPriceLevel)
    this.prices[strPrice].remove(order)
    if (this.prices[strPrice].len() === 0) {
      delete this.prices[strPrice]
      this.priceTree = this.priceTree.remove(price)
      this.depthSide -= 1
    }

    this.numOrders -= 1
    this._volume -= order.size
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
        orderUpdate.size || oldOrder.size,
        orderUpdate.price
      )
      this.append(newOrder)
      return newOrder
    } else if (
      orderUpdate.size !== undefined &&
      orderUpdate.size !== oldOrder.size
    ) {
      // Quantity changed. Price is the same.
      const strPrice = oldOrder.price.toString()
      this._volume += orderUpdate.size - oldOrder.size
      this.prices[strPrice].updateOrderSize(oldOrder, orderUpdate.size)
      return oldOrder
    }
  }

  // returns maximal level of price
  maxPriceQueue = (): OrderQueue | undefined => {
    if (this.depthSide > 0) {
      const max = this.priceTree.end
      return max.value
    }
  }

  // returns maximal level of price
  minPriceQueue = (): OrderQueue | undefined => {
    if (this.depthSide > 0) {
      const min = this.priceTree.begin
      return min.value
    }
  }

  // returns nearest OrderQueue with price less than given
  lessThan = (price: number): OrderQueue | undefined => {
    const node = this.priceTree.lt(price)
    return node.value
  }

  // returns nearest OrderQueue with price greater than given
  greaterThan = (price: number): OrderQueue | undefined => {
    const node = this.priceTree.gt(price)
    return node.value
  }

  // returns all orders
  orders = (): Order[] => {
    let orders: Order[] = []
    for (const price in this.prices) {
      if (Object.prototype.hasOwnProperty.call(this.prices, price)) {
        const allOrders = this.prices[price].toArray()
        orders = orders.concat(allOrders)
      }
    }
    return orders
  }

  toString = (): string => {
    let s = ''
    let level = this.maxPriceQueue()
    while (level) {
      s += `\n${level.price()} -> ${level.volume()}`
      level = this.lessThan(level.price())
    }
    return s
  }
}
