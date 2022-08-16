import { ERROR, CustomError } from './errors'
import { Order, OrderUpdate } from './order'
import { OrderQueue } from './orderqueue'
import { OrderSide } from './orderside'
import { Side } from './side'

interface ProcessOrder {
  done: Order[]
  partial: Order | null
  partialQuantityProcessed: number | null
  quantityLeft: number | null
  err: Error | null
}

export class OrderBook {
  private orders: { [key: string]: Order } = {}
  private bids: OrderSide
  private asks: OrderSide
  constructor() {
    this.bids = new OrderSide()
    this.asks = new OrderSide()
  }

  // ProcessMarketOrder immediately gets definite quantity from the order book with market price
  // Arguments:
  //      side     - what do you want to do (ob.Sell or ob.Buy)
  //      quantity - how much quantity you want to sell or buy
  //      * to create new decimal number you should use decimal.New() func
  //        read more at https://github.com/shopspring/decimal
  // Return:
  //      error        - not nil if price is less or equal 0
  //      done         - not nil if your market order produces ends of anoter orders, this order will add to
  //                     the "done" slice
  //      partial      - not nil if your order has done but top order is not fully done
  //      partialQuantityProcessed - if partial order is not nil this result contains processed quatity from partial order
  //      quantityLeft - more than zero if it is not enought orders to process all quantity
  processMarketOrder = (side: Side, size: number) => {
    const response: ProcessOrder = {
      done: [],
      partial: null,
      partialQuantityProcessed: null,
      quantityLeft: null,
      err: null,
    }
    if (!size || typeof size !== 'number' || size <= 0) {
      response.err = CustomError(ERROR.ErrInsufficientQuantity)
      return response
    }

    let iter
    let sideToProcess: OrderSide
    if (side === Side.BUY) {
      iter = this.asks.minPriceQueue
      sideToProcess = this.asks
    } else {
      iter = this.bids.maxPriceQueue
      sideToProcess = this.bids
    }

    while (size > 0 && sideToProcess.len() > 0) {
      const bestPrice = iter()
      if (!bestPrice) break
      const { done, partial, partialQuantityProcessed, quantityLeft } =
        this.processQueue(bestPrice, size)
      response.done = response.done.concat(done)
      response.partial = partial
      response.partialQuantityProcessed = partialQuantityProcessed
      size = quantityLeft || 0
    }
    response.quantityLeft = size
    return response
  }

  // ProcessLimitOrder places new order to the OrderBook
  // Arguments:
  //      side     - what do you want to do (ob.Sell or ob.Buy)
  //      orderID  - unique order ID in depth
  //      quantity - how much quantity you want to sell or buy
  //      price    - no more expensive (or cheaper) this price
  //      * to create new decimal number you should use decimal.New() func
  //        read more at https://github.com/shopspring/decimal
  // Return:
  //      error   - not nil if quantity (or price) is less or equal 0. Or if order with given ID is exists
  //      done    - not nil if your order produces ends of anoter order, this order will add to
  //                the "done" slice. If your order have done too, it will be places to this array too
  //      partial - not nil if your order has done but top order is not fully done. Or if your order is
  //                partial done and placed to the orderbook without full quantity - partial will contain
  //                your order with quantity to left
  //      partialQuantityProcessed - if partial order is not nil this result contains processed quatity from partial order
  processLimitOrder = (
    side: Side,
    orderID: string,
    size: number,
    price: number
  ) => {
    const response: ProcessOrder = {
      done: [],
      partial: null,
      partialQuantityProcessed: null,
      quantityLeft: null,
      err: null,
    }

    const order = this.orders[orderID]
    if (order) {
      response.err = CustomError(ERROR.ErrOrderExists)
      return response
    }

    if (!size || typeof size !== 'number' || size <= 0) {
      response.err = CustomError(ERROR.ErrInvalidQuantity)
      return response
    }

    if (!price || typeof price !== 'number' || price <= 0) {
      response.err = CustomError(ERROR.ErrInvalidPrice)
      return response
    }

    let quantityToTrade = size
    let sideToProcess: OrderSide
    let sideToAdd: OrderSide
    let comparator
    let iter

    if (side === Side.BUY) {
      sideToAdd = this.bids
      sideToProcess = this.asks
      comparator = this.greaterThanOrEqual
      iter = this.asks.minPriceQueue
    } else {
      sideToAdd = this.asks
      sideToProcess = this.bids
      comparator = this.lessThanOrEqual
      iter = this.bids.maxPriceQueue
    }

    let bestPrice = iter()
    while (
      quantityToTrade > 0 &&
      sideToProcess.len() > 0 &&
      bestPrice &&
      comparator(price, bestPrice.price())
    ) {
      const { done, partial, partialQuantityProcessed, quantityLeft } =
        this.processQueue(bestPrice, quantityToTrade)
      response.done = response.done.concat(done)
      response.partial = partial
      response.partialQuantityProcessed = partialQuantityProcessed
      quantityToTrade = quantityLeft || 0
      bestPrice = iter()
    }

    if (quantityToTrade > 0) {
      const order = new Order(orderID, side, quantityToTrade, price, Date.now())
      if (response.done.length > 0) {
        response.partialQuantityProcessed = size - quantityToTrade
        response.partial = order
      }
      this.orders[orderID] = sideToAdd.append(order)
    } else {
      let totalQuantity = 0
      let totalPrice = 0

      response.done.forEach((order: Order) => {
        totalQuantity += order.size
        totalPrice += order.price * order.size
      })
      if (response.partialQuantityProcessed && response.partial) {
        if (response.partialQuantityProcessed > 0) {
          totalQuantity += response.partialQuantityProcessed
          totalPrice +=
            response.partial.price * response.partialQuantityProcessed
        }
      }

      response.done.push(
        new Order(orderID, side, size, totalPrice / totalQuantity, Date.now())
      )
    }
    return response
  }

  greaterThanOrEqual = (a: number, b: number): boolean => {
    return a >= b
  }

  lessThanOrEqual = (a: number, b: number): boolean => {
    return a <= b
  }

  processQueue = (orderQueue: OrderQueue, quantityToTrade: number) => {
    const response: ProcessOrder = {
      done: [],
      partial: null,
      partialQuantityProcessed: null,
      quantityLeft: quantityToTrade,
      err: null,
    }
    if (response.quantityLeft) {
      while (orderQueue.len() > 0 && response.quantityLeft > 0) {
        const headOrder = orderQueue.head()
        if (headOrder) {
          if (response.quantityLeft < headOrder.size) {
            response.partial = new Order(
              headOrder.id,
              headOrder.side,
              headOrder.size - response.quantityLeft,
              headOrder.price,
              headOrder.time
            )

            response.partialQuantityProcessed = response.quantityLeft
            orderQueue.update(headOrder, response.partial)
            response.quantityLeft = 0
          } else {
            response.quantityLeft = response.quantityLeft - headOrder.size
            const canceledOrder = this.cancelOrder(headOrder.id)
            if (canceledOrder) response.done.push(canceledOrder)
          }
        }
      }
    }
    return response
  }

  // returns order by id
  order = (orderID: string): Order | undefined => {
    return this.orders[orderID]
  }

  // Depth returns price levels and volume at price level
  depth = () => {
    let level = this.asks.maxPriceQueue()
    const asks = []
    const bids = []
    while (level) {
      const levelPrice = level.price()
      asks.push([levelPrice, level.volume()])
      level = this.asks.lessThan(levelPrice)
    }

    level = this.bids.maxPriceQueue()
    while (level) {
      const levelPrice = level.price()
      bids.push([levelPrice, level.volume()])
      level = this.bids.lessThan(levelPrice)
    }
    return [asks, bids]
  }

  // Modify an existing order with given ID
  modifyOrder = (
    orderID: string,
    orderUpdate: OrderUpdate
  ): Order | undefined | void => {
    const order = this.orders[orderID]
    if (!order) return
    const side = orderUpdate.side
    if (side === Side.BUY) {
      return this.bids.update(order, orderUpdate)
    } else if (side === Side.SELL) {
      return this.asks.update(order, orderUpdate)
    } else {
      throw CustomError(ERROR.ErrInvalidSide)
    }
  }

  // Removes order with given ID from the order book
  cancelOrder = (orderID: string): Order | undefined => {
    const order = this.orders[orderID]
    if (!order) return
    delete this.orders[orderID]
    if (order.side === Side.BUY) {
      return this.bids.remove(order)
    }
    return this.asks.remove(order)
  }

  // CalculateMarketPrice returns total market price for requested quantity
  // if err is not nil price returns total price of all levels in side
  calculateMarketPrice = (
    side: Side,
    size: number
  ): {
    price: number
    err: null | Error
  } => {
    let price = 0
    let err = null
    let level: OrderQueue | undefined
    let iter: (price: number) => OrderQueue | undefined

    if (side === Side.BUY) {
      level = this.asks.minPriceQueue()
      iter = this.asks.greaterThan
    } else {
      level = this.bids.maxPriceQueue()
      iter = this.bids.lessThan
    }

    while (size > 0 && level) {
      const levelVolume = level.volume()
      const levelPrice = level.price()
      if (this.greaterThanOrEqual(size, levelVolume)) {
        price += levelPrice * levelVolume
        size -= levelVolume
        level = iter(levelPrice)
      } else {
        price += levelPrice * size
        size = 0
      }
    }

    if (size > 0) {
      err = CustomError(ERROR.ErrInsufficientQuantity)
    }

    return { price, err }
  }

  toString(): string {
    return (
      this.asks.toString() +
      '\r\n------------------------------------' +
      this.bids.toString()
    )
  }
}
