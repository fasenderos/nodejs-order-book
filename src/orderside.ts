import createRBTree from 'functional-red-black-tree'
import { Order } from './order'
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

  // returns maximal level of price
  maxPriceQueue = (): OrderQueue | null => {
    if (this.depthSide > 0) {
      const max = this.priceTree.end
      if (max) return max.value || null
    }
    return null
  }

  // returns maximal level of price
  minPriceQueue = () => {
    if (this.depthSide > 0) {
      const min = this.priceTree.begin
      if (min) return min.value || null
    }
    return null
  }

  // returns nearest OrderQueue with price less than given
  lessThan = (price: number) => {
    const node = this.priceTree.lt(price)
    return node?.value || null
  }

  // returns nearest OrderQueue with price greater than given
  greaterThan = (price: number) => {
    const node = this.priceTree.gt(price)
    return node?.value || null
  }

  // returns all orders
  orders = () => {
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
    while (level !== null) {
      s += `\n${level.price()} -> ${level.volume()}`
      level = this.lessThan(level.price())
    }
    return s
  }
}
