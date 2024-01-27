import { ERROR, CustomError } from './errors'
import {
  Order,
  OrderType,
  OrderUpdatePrice,
  OrderUpdateSize,
  TimeInForce
} from './order'
import { OrderQueue } from './orderqueue'
import { OrderSide } from './orderside'
import { Side } from './side'

/**
 * This interface represents the result of a processed order or an error
 *
 * @param done - An array of orders fully filled by the processed order
 * @param partial - A partially executed order. Is null when the processed order is completelly filled
 * @param partialQuantityProcessed - if `partial` is not null, this field represents the processed quantity of the partial order
 * @param quantityLeft - more than zero if there are not enought orders to process all quantity
 * @param err - Not null if size or price are less or equal zero, or the provided orderId already exists, or something else went wrong.
 */
interface IProcessOrder {
  done: Order[]
  partial: Order | null
  partialQuantityProcessed: number
  quantityLeft: number
  err: Error | null
}

const validTimeInForce = Object.values(TimeInForce)

export class OrderBook {
  private orders: { [key: string]: Order } = {}
  private readonly bids: OrderSide
  private readonly asks: OrderSide
  constructor () {
    this.bids = new OrderSide(Side.BUY)
    this.asks = new OrderSide(Side.SELL)
  }

  /**
   *  Create a trade order
   *  @see {@link IProcessOrder} for the returned data structure
   *
   *  @param type - `limit` or `market`
   *  @param side - `sell` or `buy`
   *  @param size - How much of currency you want to trade in units of base currency
   *  @param price - The price at which the order is to be fullfilled, in units of the quote currency. Param only for limit order
   *  @param orderID - Unique order ID. Param only for limit order
   *  @param timeInForce - Time-in-force supported are: `GTC` (default), `FOK`, `IOC`. Param only for limit order
   *  @returns An object with the result of the processed order or an error.
   */
  public createOrder = (
    // Common for all order types
    type: OrderType,
    side: Side,
    size: number,
    // Specific for limit order type
    price?: number,
    orderID?: string,
    timeInForce: TimeInForce = TimeInForce.GTC
  ): IProcessOrder => {
    switch (type) {
      case OrderType.MARKET:
        return this.market(side, size)
      case OrderType.LIMIT:
        return this.limit(
          side,
          orderID as string,
          size,
          price as number,
          timeInForce
        )
      default:
        return {
          done: [],
          partial: null,
          partialQuantityProcessed: 0,
          quantityLeft: size,
          err: CustomError(ERROR.ErrInvalidOrderType)
        }
    }
  }

  /**
   * Create a market order
   *  @see {@link IProcessOrder} for the returned data structure
   *
   * @param side - `sell` or `buy`
   * @param size - How much of currency you want to trade in units of base currency
   * @returns An object with the result of the processed order or an error
   */
  public market = (side: Side, size: number): IProcessOrder => {
    const response = this.getProcessOrderResponse(size)

    if (![Side.SELL, Side.BUY].includes(side)) {
      response.err = CustomError(ERROR.ErrInvalidSide)
      return response
    }

    if (typeof size !== 'number' || size <= 0) {
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
      // if sideToProcess.len > 0 it is not necessary to verify that bestPrice exists
      const bestPrice = iter()
      const { done, partial, partialQuantityProcessed, quantityLeft } =
        this.processQueue(bestPrice as OrderQueue, size)
      response.done = response.done.concat(done)
      response.partial = partial
      response.partialQuantityProcessed = partialQuantityProcessed
      size = quantityLeft
    }
    response.quantityLeft = size
    return response
  }

  /**
   * Create a limit order
   *  @see {@link IProcessOrder} for the returned data structure
   *
   * @param side - `sell` or `buy`
   * @param orderID - Unique order ID
   * @param size - How much of currency you want to trade in units of base currency
   * @param price - The price at which the order is to be fullfilled, in units of the quote currency
   * @param timeInForce - Time-in-force type supported are: GTC, FOK, IOC
   * @returns An object with the result of the processed order or an error
   */
  public limit = (
    side: Side,
    orderID: string,
    size: number,
    price: number,
    timeInForce: TimeInForce = TimeInForce.GTC
  ): IProcessOrder => {
    const response = this.getProcessOrderResponse(size)

    if (![Side.SELL, Side.BUY].includes(side)) {
      response.err = CustomError(ERROR.ErrInvalidSide)
      return response
    }

    if (this.orders[orderID] !== undefined) {
      response.err = CustomError(ERROR.ErrOrderExists)
      return response
    }

    if (typeof size !== 'number' || size <= 0) {
      response.err = CustomError(ERROR.ErrInvalidQuantity)
      return response
    }

    if (typeof price !== 'number' || price <= 0) {
      response.err = CustomError(ERROR.ErrInvalidPrice)
      return response
    }

    if (!validTimeInForce.includes(timeInForce)) {
      response.err = CustomError(ERROR.ErrInvalidTimeInForce)
      return response
    }

    this.createLimitOrder(response, side, orderID, size, price, timeInForce)

    return response
  }

  /**
   * Modify an existing order with given ID. When an order is modified by price or quantity,
   * it will be deemed as a new entry. Under the price-time-priority algorithm, orders are
   * prioritized according to their order price and order time. Hence, the latest orders
   * will be placed at the back of the matching order queue.
   *
   * @param orderID - The ID of the order to be modified
   * @param orderUpdate - An object with the modified size and/or price of an order. The shape of the object is `{size, price}`.
   * @returns An object with the result of the processed order or an error
   */
  public modify = (
    orderID: string,
    orderUpdate: OrderUpdatePrice | OrderUpdateSize
  ): IProcessOrder => {
    const order = this.orders[orderID]
    if (order === undefined) {
      return {
        done: [],
        partial: null,
        partialQuantityProcessed: 0,
        quantityLeft: 0,
        err: CustomError(ERROR.ErrOrderNotFound)
      }
    }
    if (orderUpdate?.price !== undefined || orderUpdate?.size !== undefined) {
      const newPrice = orderUpdate.price ?? order.price
      const newSize = orderUpdate.size ?? order.size
      if (newPrice > 0 && newSize > 0) {
        const response = this.getProcessOrderResponse(newSize)
        this.cancel(order.id)
        this.createLimitOrder(
          response,
          order.side,
          order.id,
          newSize,
          newPrice,
          TimeInForce.GTC
        )
        return response
      }
    }
    // Missing one of price and/or size, or the provided ones are not greater than zero
    return {
      done: [],
      partial: null,
      partialQuantityProcessed: 0,
      quantityLeft: orderUpdate?.size ?? 0,
      err: CustomError(ERROR.ErrInvalidPriceOrQuantity)
    }
  }

  /**
   * Remove an existing order with given ID from the order book
   *
   * @param orderID - The ID of the order to be removed
   * @returns The removed order if exists or `undefined`
   */
  public cancel = (orderID: string): Order | undefined => {
    const order = this.orders[orderID]
    if (order === undefined) return
    /* eslint-disable @typescript-eslint/no-dynamic-delete */
    delete this.orders[orderID]
    if (order.side === Side.BUY) {
      return this.bids.remove(order)
    }
    return this.asks.remove(order)
  }

  /**
   * Get an existing order with the given ID
   *
   * @param orderID - The ID of the order to be returned
   * @returns The order if exists or `undefined`
   */
  public order = (orderID: string): Order | undefined => {
    return this.orders[orderID]
  }

  // Returns price levels and volume at price level
  public depth = (): [Array<[number, number]>, Array<[number, number]>] => {
    const asks: Array<[number, number]> = []
    const bids: Array<[number, number]> = []
    this.asks.priceTree().forEach((levelPrice: number, level: OrderQueue) => {
      asks.push([levelPrice, level.volume()])
    })
    this.bids.priceTree().forEach((levelPrice: number, level: OrderQueue) => {
      bids.push([levelPrice, level.volume()])
    })
    return [asks, bids]
  }

  public toString = (): string => {
    return (
      this.asks.toString() +
      '\r\n------------------------------------' +
      this.bids.toString()
    )
  }

  // Returns total market price for requested quantity
  // if err is not null price returns total price of all levels in side
  public calculateMarketPrice = (
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
      iter = this.bids.lowerThan
    }

    while (size > 0 && level !== undefined) {
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

  private readonly getProcessOrderResponse = (size: number): IProcessOrder => {
    return {
      done: [],
      partial: null,
      partialQuantityProcessed: 0,
      quantityLeft: size,
      err: null
    }
  }

  private readonly createLimitOrder = (
    response: IProcessOrder,
    side: Side,
    orderID: string,
    size: number,
    price: number,
    timeInForce: TimeInForce
  ): void => {
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
      comparator = this.lowerThanOrEqual
      iter = this.bids.maxPriceQueue
    }

    if (timeInForce === TimeInForce.FOK) {
      const fillable = this.canFillOrder(sideToProcess, side, size, price)
      if (!fillable) {
        response.err = CustomError(ERROR.ErrLimitFOKNotFillable)
        return
      }
    }

    let bestPrice = iter()
    while (
      quantityToTrade > 0 &&
      sideToProcess.len() > 0 &&
      bestPrice !== undefined &&
      comparator(price, bestPrice.price())
    ) {
      const { done, partial, partialQuantityProcessed, quantityLeft } =
        this.processQueue(bestPrice, quantityToTrade)
      response.done = response.done.concat(done)
      response.partial = partial
      response.partialQuantityProcessed = partialQuantityProcessed
      quantityToTrade = quantityLeft
      response.quantityLeft = quantityToTrade
      bestPrice = iter()
    }

    if (quantityToTrade > 0) {
      const order = new Order(
        orderID,
        side,
        quantityToTrade,
        price,
        Date.now(),
        true
      )
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

      if (response.partialQuantityProcessed > 0 && response.partial !== null) {
        totalQuantity += response.partialQuantityProcessed
        totalPrice +=
          response.partial.price * response.partialQuantityProcessed
      }

      response.done.push(
        new Order(
          orderID,
          side,
          size,
          totalPrice / totalQuantity,
          Date.now()
        )
      )
    }

    // If IOC order was not matched completely remove from the order book
    if (timeInForce === TimeInForce.IOC && response.quantityLeft > 0) {
      this.cancel(orderID)
    }
  }

  private readonly greaterThanOrEqual = (a: number, b: number): boolean => {
    return a >= b
  }

  private readonly lowerThanOrEqual = (a: number, b: number): boolean => {
    return a <= b
  }

  private readonly processQueue = (
    orderQueue: OrderQueue,
    quantityToTrade: number
  ): IProcessOrder => {
    const response: IProcessOrder = {
      done: [],
      partial: null,
      partialQuantityProcessed: 0,
      quantityLeft: quantityToTrade,
      err: null
    }
    if (response.quantityLeft > 0) {
      while (orderQueue.len() > 0 && response.quantityLeft > 0) {
        const headOrder = orderQueue.head()
        if (headOrder !== undefined) {
          if (response.quantityLeft < headOrder.size) {
            response.partial = new Order(
              headOrder.id,
              headOrder.side,
              headOrder.size - response.quantityLeft,
              headOrder.price,
              headOrder.time,
              true
            )
            this.orders[headOrder.id] = response.partial
            response.partialQuantityProcessed = response.quantityLeft
            orderQueue.update(headOrder, response.partial)
            response.quantityLeft = 0
          } else {
            response.quantityLeft = response.quantityLeft - headOrder.size
            const canceledOrder = this.cancel(headOrder.id)
            if (canceledOrder !== undefined) response.done.push(canceledOrder)
          }
        }
      }
    }
    return response
  }

  private readonly canFillOrder = (
    orderSide: OrderSide,
    side: Side,
    size: number,
    price: number
  ): boolean => {
    return side === Side.BUY
      ? this.buyOrderCanBeFilled(orderSide, size, price)
      : this.sellOrderCanBeFilled(orderSide, size, price)
  }

  private readonly buyOrderCanBeFilled = (
    orderSide: OrderSide,
    size: number,
    price: number
  ): boolean => {
    if (orderSide.volume() < size) {
      return false
    }

    let cumulativeSize = 0
    orderSide.priceTree().forEach((_: number, level: OrderQueue) => {
      if (price >= level.price() && cumulativeSize < size) {
        cumulativeSize += level.volume()
      } else {
        return true // break the loop
      }
    })
    return cumulativeSize >= size
  }

  private readonly sellOrderCanBeFilled = (
    orderSide: OrderSide,
    size: number,
    price: number
  ): boolean => {
    if (orderSide.volume() < size) {
      return false
    }

    let cumulativeSize = 0
    orderSide.priceTree().forEach((_: number, level: OrderQueue) => {
      if (price <= level.price() && cumulativeSize < size) {
        cumulativeSize += level.volume()
      } else {
        return true // break the loop
      }
    })
    return cumulativeSize >= size
  }
}
