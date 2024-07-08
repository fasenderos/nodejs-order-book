import { ERROR, CustomError } from './errors'
import { Order, OrderType, TimeInForce } from './order'
import { OrderQueue } from './orderqueue'
import { OrderSide } from './orderside'
import { Side } from './side'
import type {
  ICancelOrder,
  IProcessOrder,
  JournalLog,
  LimitOrderOptions,
  MarketOrderOptions,
  OrderBookOptions,
  OrderUpdatePrice,
  OrderUpdateSize,
  Snapshot
} from './types'

const validTimeInForce = Object.values(TimeInForce)

export class OrderBook {
  private orders: { [key: string]: Order } = {}
  private _lastOp: number = 0
  private _marketPrice: number = 0
  private readonly bids: OrderSide
  private readonly asks: OrderSide
  private readonly enableJournaling: boolean
  /**
   * Creates an instance of OrderBook.
   * @param {OrderBookOptions} [options={}] - Options for configuring the order book.
   * @param {JournalLog} [options.snapshot] - The orderbook snapshot will be restored before processing any journal logs, if any.
   * @param {JournalLog} [options.journal] - Array of journal logs (optional).
   * @param {boolean} [options.enableJournaling=false] - Flag to enable journaling. Default to false
   */
  constructor ({
    snapshot,
    journal,
    enableJournaling = false
  }: OrderBookOptions = {}) {
    this.bids = new OrderSide(Side.BUY)
    this.asks = new OrderSide(Side.SELL)
    this.enableJournaling = enableJournaling
    // First restore from orderbook snapshot
    if (snapshot != null) {
      this.restoreSnapshot(snapshot)
    }
    // Than replay from journal log
    if (journal != null) {
      if (!Array.isArray(journal)) throw CustomError(ERROR.ErrJournalLog)
      // If a snapshot is available be sure to remove logs before the last restored operation
      if (snapshot != null && snapshot.lastOp > 0) {
        journal = journal.filter((log) => log.opId > snapshot.lastOp)
      }
      this.replayJournal(journal)
    }
  }

  // Getter for the market price
  get marketPrice (): number {
    return this._marketPrice
  }

  // Getter for the lastOp
  get lastOp (): number {
    return this._lastOp
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
        return this.market({ side, size })
      case OrderType.LIMIT:
        return this.limit(
          {
            side,
            orderID,
            size,
            price,
            timeInForce
          }
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
  public market = ({ side, size }: MarketOrderOptions): IProcessOrder => {
    let quantityToTrade = size
    const response = this.getProcessOrderResponse(quantityToTrade)

    if (![Side.SELL, Side.BUY].includes(side)) {
      response.err = CustomError(ERROR.ErrInvalidSide)
      return response
    }

    if (typeof quantityToTrade !== 'number' || quantityToTrade <= 0) {
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

    while (quantityToTrade > 0 && sideToProcess.len() > 0) {
      // if sideToProcess.len > 0 it is not necessary to verify that bestPrice exists
      const bestPrice = iter() as OrderQueue
      const { done, partial, partialQuantityProcessed, quantityLeft } =
        this.processQueue(bestPrice, quantityToTrade)
      this._marketPrice = bestPrice?.price()
      response.done = response.done.concat(done)
      response.partial = partial
      response.partialQuantityProcessed = partialQuantityProcessed
      quantityToTrade = quantityLeft
    }
    response.quantityLeft = quantityToTrade
    if (this.enableJournaling) {
      response.log = {
        opId: ++this._lastOp,
        ts: Date.now(),
        op: 'm',
        o: { side, size }
      }
    }
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
    {
      side,
      orderID,
      size,
      price,
      timeInForce = TimeInForce.GTC
    }: LimitOrderOptions
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
    if (this.enableJournaling) {
      response.log = {
        opId: ++this._lastOp,
        ts: Date.now(),
        op: 'l',
        o: { side, orderID, size, price, timeInForce }
      }
    }

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
        this._cancelOrder(order.id, true)
        this.createLimitOrder(
          response,
          order.side,
          order.id,
          newSize,
          newPrice,
          TimeInForce.GTC
        )
        if (this.enableJournaling) {
          response.log = {
            opId: ++this._lastOp,
            ts: Date.now(),
            op: 'u',
            o: { orderID, orderUpdate }
          }
        }
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
  public cancel = (orderID: string): ICancelOrder | undefined => {
    return this._cancelOrder(orderID)
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

  public snapshot = (): Snapshot => {
    const bids: Array<{ price: number, orders: Order[] }> = []
    const asks: Array<{ price: number, orders: Order[] }> = []
    this.bids.priceTree().forEach((price: number, orders: OrderQueue) => {
      bids.push({ price, orders: orders.toArray() })
    })
    this.asks.priceTree().forEach((price: number, orders: OrderQueue) => {
      asks.push({ price, orders: orders.toArray() })
    })
    return { bids, asks, ts: Date.now(), lastOp: this._lastOp }
  }

  private readonly restoreSnapshot = (snapshot: Snapshot): void => {
    this._lastOp = snapshot.lastOp
    for (const level of snapshot.bids) {
      for (const order of level.orders) {
        this.orders[order.id] = order
        this.bids.append(order)
      }
    }

    for (const level of snapshot.asks) {
      for (const order of level.orders) {
        this.orders[order.id] = order
        this.asks.append(order)
      }
    }
  }

  private readonly _cancelOrder = (
    orderID: string,
    skipOpInc: boolean = false
  ): ICancelOrder | undefined => {
    const order = this.orders[orderID]
    if (order === undefined) return
    /* eslint-disable @typescript-eslint/no-dynamic-delete */
    delete this.orders[orderID]
    if (order.side === Side.BUY) {
      const response: ICancelOrder = {
        order: this.bids.remove(order)
      }
      if (this.enableJournaling) {
        response.log = {
          opId: skipOpInc ? this._lastOp : ++this._lastOp,
          ts: Date.now(),
          op: 'd',
          o: { orderID }
        }
      }
      return response
    }

    // Side SELL
    const response: ICancelOrder = {
      order: this.asks.remove(order)
    }
    if (this.enableJournaling) {
      response.log = {
        opId: skipOpInc ? this._lastOp : ++this._lastOp,
        ts: Date.now(),
        op: 'd',
        o: { orderID }
      }
    }
    return response
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
      this._marketPrice = bestPrice.price()
      response.done = response.done.concat(done)
      response.partial = partial
      response.partialQuantityProcessed = partialQuantityProcessed
      quantityToTrade = quantityLeft
      response.quantityLeft = quantityToTrade
      bestPrice = iter()
    }

    if (quantityToTrade > 0) {
      const order = new Order({
        id: orderID,
        side,
        size: quantityToTrade,
        price,
        time: Date.now(),
        isMaker: true
      })
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
        new Order({
          id: orderID,
          side,
          size,
          price: totalPrice / totalQuantity,
          time: Date.now()
        })
      )
    }

    // If IOC order was not matched completely remove from the order book
    if (timeInForce === TimeInForce.IOC && response.quantityLeft > 0) {
      this._cancelOrder(orderID, true)
    }
  }

  private readonly replayJournal = (journal: JournalLog[]): void => {
    for (const log of journal) {
      switch (log.op) {
        case 'm':{
          const { side, size } = log.o
          if (side == null || size == null) {
            throw CustomError(ERROR.ErrJournalLog)
          }
          this.market({ side, size })
          break
        }
        case 'l': {
          const { side, orderID, size, price, timeInForce } = log.o
          if (
            side == null ||
            orderID == null ||
            size == null ||
            price == null
          ) {
            throw CustomError(ERROR.ErrJournalLog)
          }
          this.limit(
            {
              side,
              orderID,
              size,
              price,
              timeInForce
            }
          )
          break
        }
        case 'd':
          if (log.o.orderID == null) throw CustomError(ERROR.ErrJournalLog)
          this.cancel(log.o.orderID)
          break
        case 'u':
          if (log.o.orderID == null || log.o.orderUpdate == null) {
            throw CustomError(ERROR.ErrJournalLog)
          }
          this.modify(log.o.orderID, log.o.orderUpdate)
          break
        default:
          throw CustomError(ERROR.ErrJournalLog)
      }
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
            response.partial = new Order({
              id: headOrder.id,
              side: headOrder.side,
              size: headOrder.size - response.quantityLeft,
              price: headOrder.price,
              time: headOrder.time,
              isMaker: true,
              origSize: headOrder.origSize
            })
            this.orders[headOrder.id] = response.partial
            response.partialQuantityProcessed = response.quantityLeft
            orderQueue.update(headOrder, response.partial)
            response.quantityLeft = 0
          } else {
            response.quantityLeft = response.quantityLeft - headOrder.size
            const canceledOrder = this._cancelOrder(headOrder.id, true)
            /* c8 ignore next unable to test when order is undefined */
            if (canceledOrder?.order !== undefined) {
              response.done.push(canceledOrder.order)
            }
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
