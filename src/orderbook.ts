import BigNumber from 'bignumber.js'
import { ERROR, CustomError } from './errors'
import { Order, OrderType, OrderUpdate, TimeInForce } from './order'
import { OrderQueue } from './orderqueue'
import { OrderSide } from './orderside'
import { Side } from './side'

/**
 * This interface represents the result of a processed order or an error
 *
 * @param done - An array of orders fully filled by the processed order
 * @param partial - A partially executed order. It can be null when the processed order
 * @param partialQuantityProcessed - if `partial` is not null, this field represents the processed quantity of the partial order
 * @param quantityLeft - more than zero if there are not enought orders to process all quantity
 * @param err - Not null if size or price are less or equal zero, or the provided orderId already exists, or something else went wrong.
 */
interface IProcessOrder {
  done: Order[]
  partial: Order | null
  marketQtyProcessed?: number
  partialQuantityProcessed: number
  quantityLeft: number
  err: Error | null
}

interface IAlternateMarketOrder {
  err: Error | null
  isAllowed: boolean
  maxQtyToProvide: number
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
    const response: IProcessOrder = {
      done: [],
      partial: null,
      partialQuantityProcessed: 0,
      quantityLeft: size,
      err: null
    }

    if (side !== Side.SELL && side !== Side.BUY) {
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

  public getOrderBookPricesSorted = (side: Side, sideToProcess: OrderSide) => {
    const prices = [];
    for (let price in sideToProcess.prices()) {
      let priceQ: OrderQueue = sideToProcess.prices()[price]
      prices.push(priceQ.price())
    }
    if(side === Side.BUY) {
      prices.sort((a, b) => a - b);
    } else {
      prices.sort((a, b) => b - a);
    }
    return prices
  }
  /**
   * 
   * @param side - what do you want to do (`ob.Sell` or `ob.Buy`)
   * @param sideToProcess - what side is being processed (`asks` or `bids`)
   * @param amount - how much in fiat you want to transact
   * @returns 
   *    err - error in case isAllowed is false
   *    isAllowed - false, if market depth is empty, else true
   *    maxQtyToProvide - maximum token that can be provided by orderbook for a total of amount.
   *    
   */
  public getAlternateMarketOrderQty = (side: Side, sideToProcess: OrderSide, amount: number): IAlternateMarketOrder => {
    const response: IAlternateMarketOrder = {
      isAllowed: false,
      maxQtyToProvide: 0,
      err: null,
    }

    if (sideToProcess.depth() === 0) {
      response.err = new Error('Orderbook depth is empty, market order cannot be fulfilled')
      return response;
    }

    // first get the sorted price levels.
    // try to fetch the best average price within the total price limit.
    //
    // buy: { 100: 2, 90: 2, 80: 2, 70: 2 }
    // sell: { 140: 2, 130: 2, 120: 2, 110: 2 }
    let zeroPrice = new BigNumber('0')
    let totalPrice = zeroPrice
    let totalQty = zeroPrice
    let totalVol = zeroPrice
    let priceToQtyMap: {[key: string]: BigNumber} = {}

    let totalAmountRemaining = new BigNumber(amount)
    let sortedPrices = this.getOrderBookPricesSorted(side, sideToProcess)

    let totalVolProcessed = zeroPrice
    let amountProcessed = zeroPrice

    let totalOrderbookAmount = zeroPrice

    for(let key of sortedPrices) {
      let priceQ = sideToProcess.prices()[key]
      let vol = priceQ.volume()
      let pricePerUnitBaseQty = priceQ.price()
      totalOrderbookAmount = totalOrderbookAmount.plus(vol.multipliedBy(pricePerUnitBaseQty))
      totalVol = totalVol.plus(vol)
    }

    console.log(`Total Orderbook Vol: ${totalOrderbookAmount}`)

    // if orderbook has less liquidity than the current order
    // fulfil the order
    if (totalOrderbookAmount.isLessThanOrEqualTo(amount)) {
      response.isAllowed = true
      response.maxQtyToProvide = totalVol.toNumber()
      return response
    }
    
    main:
    for(let key of sortedPrices) {
      let priceQ = sideToProcess.prices()[key]
      //   price -> qty
      //	 180000 -> 5000
      //
      // required, 1000 INR.
      //
      // Orderbook Depth Redis:
      // 	limitPrice: 180000
      // 	token: 0.05 (precision is 100000)
      //
      // Orderbook Depth ME:
      // 	limitPrice: 180000
      // 	token: 0.05 * 100000

      // While checking here, divide limit price with basePrecision as well.
      // this will return the price in INR of 1 single unit (0.000001) of max precision we can provide. (1.8 INR per 0.000001 units)
      //
      // limitPrice: 180000 / 1L =  1.8
      // token: 5000

      let [vol, price] = [priceQ.volume(), priceQ.price()]

      let [levelVolProcessed, pricePerUnitBaseQty] = [zeroPrice, price]
      
      console.log(`pricePerUnitBaseQty.Mul(vol) = ${vol.multipliedBy(pricePerUnitBaseQty)}`)

      if (amountProcessed.isLessThanOrEqualTo(totalAmountRemaining) && vol.multipliedBy(pricePerUnitBaseQty).isGreaterThanOrEqualTo(totalAmountRemaining.minus(amountProcessed))) {
        // skipValue should be controlled by the matching engine, it's used for cases
        // where we store a token as a multiple of 10s or more
        const skipValue = "1"
        // loop until you get the volume at which it is lower or similar to your amount.
        while (amountProcessed.isLessThanOrEqualTo(totalAmountRemaining)) {
          levelVolProcessed = levelVolProcessed.plus(new BigNumber(skipValue))
          totalVolProcessed = totalVolProcessed.plus(new BigNumber(skipValue))
          // multiplying with skipValue, as only 1 volume is consumed at each iter.
          amountProcessed = amountProcessed.plus(new BigNumber(skipValue).multipliedBy(pricePerUnitBaseQty))
  
          if (amountProcessed.isGreaterThan(totalAmountRemaining)) {
            levelVolProcessed = levelVolProcessed.minus(new BigNumber(skipValue))
            totalVolProcessed = totalVolProcessed.minus(new BigNumber(skipValue))
  
            amountProcessed = amountProcessed.minus(new BigNumber(skipValue).multipliedBy(pricePerUnitBaseQty))
            // break the loop

            priceToQtyMap[pricePerUnitBaseQty] = levelVolProcessed
            // totalAmountRemaining = totalAmountRemaining.minus(price.Mul(levelVolProcessed))
            console.log(`\nProcessed Amount: ${amountProcessed}, prices: ${priceQ.price()}, totalAmountRemaining: ${totalAmountRemaining.toString()} \n`)
            break main
          }
        }
      } else {
        // user's asked amount is higher than volume.
        levelVolProcessed = levelVolProcessed.plus(priceQ.volume())
        totalVolProcessed = totalVolProcessed.plus(priceQ.volume())
        amountProcessed = amountProcessed.plus(priceQ.volume().multipliedBy(pricePerUnitBaseQty))
        priceToQtyMap[priceQ.price()] = priceQ.volume()
      }

      console.log(`\nProcessed Amount: ${amountProcessed}, price: ${priceQ.price()}, totalAmountRemaining: ${totalAmountRemaining.toString()} \n`)

      for (let price in priceToQtyMap) {
        let qty = priceToQtyMap[price]
        let priceDecimal = new BigNumber(price)
        totalPrice = totalPrice.plus(priceDecimal.multipliedBy(qty))
        totalQty = totalQty.plus(qty)
      }
    }

    // Let's say, orderbook's minimum best price (limit) is 100 inr
    // And we don't allow users to trade fraction
    // Now, if user puts an order worth of any amount less than 100, 
    // that order will never go through as orderbook's best price is higher
    // than maximum asked by the user.
    if (sortedPrices[0] > amount) {
      response.isAllowed = false
      response.maxQtyToProvide = 0
      response.err = CustomError(ERROR.ErrInvalidMinMarketAlternate)
      return response
    }


    response.isAllowed = true
    response.maxQtyToProvide = totalVolProcessed.toNumber()

    return response;
  }

  /**
   * Create a marketAlternate order - you provide the quote quantity
   *  @see {@link IProcessOrder} for the returned data structure
   *
   * @param side - `sell` or `buy`
   * @param size - How much of currency you want to trade in units of quote currency
   * @returns An object with the result of the processed order or an error
   */
  public marketAlternate = (side: Side, size: number): IProcessOrder => {
    const response: IProcessOrder = {
      done: [],
      partial: null,
      partialQuantityProcessed: 0,
      quantityLeft: size,
      err: null
    }

     // only buy side orders are supported for alternate market orders
     if (side !== Side.BUY) {
      response.err = CustomError(ERROR.ErrInvalidAlternateMarketOrderSide)
      return response
    }

    if (typeof size !== 'number' || size <= 0) {
      response.err = CustomError(ERROR.ErrInsufficientQuantity)
      return response
    }

    let iter
    let sideToProcess: OrderSide
    
    iter = this.asks.minPriceQueue
    sideToProcess = this.asks
    
    // calculate the size that has to be sent to matching engine as here we receive inr only
    const alternateMarketOrder = this.getAlternateMarketOrderQty(side, sideToProcess, size)
    console.log("Alt is: ", alternateMarketOrder)
    
    if (!alternateMarketOrder.isAllowed) {
      response.err = alternateMarketOrder.err ? alternateMarketOrder.err : CustomError(`market order is not allowed. error: ${alternateMarketOrder.err}`)
      response.marketQtyProcessed = 0
      return response
    }

    if (!alternateMarketOrder.maxQtyToProvide) {
      response.marketQtyProcessed = 0
      response.err = CustomError(`market order is not allowed. error: market depth is empty for Sell side.`)
      return response
    }
    
    size = alternateMarketOrder.maxQtyToProvide;
    
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
    response.marketQtyProcessed = alternateMarketOrder.maxQtyToProvide
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
    const response: IProcessOrder = {
      done: [],
      partial: null,
      partialQuantityProcessed: 0,
      quantityLeft: size,
      err: null
    }

    if (side !== Side.SELL && side !== Side.BUY) {
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
        return response
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
        new BigNumber(quantityToTrade),
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
        const ordrSize: number = order.size.toNumber()
        totalQuantity += ordrSize
        totalPrice += order.price * ordrSize
      })
      if (response.partialQuantityProcessed > 0 && response.partial !== null) {
        totalQuantity += response.partialQuantityProcessed
        totalPrice +=
          response.partial.price * response.partialQuantityProcessed
      }

      response.done.push(
        new Order(orderID, side, new BigNumber(size), totalPrice / totalQuantity, Date.now())
      )
    }

    // If IOC order was not matched completely remove from the order book
    if (timeInForce === TimeInForce.IOC && response.quantityLeft > 0) {
      this.cancel(orderID)
    }

    return response
  }

  /**
   * Modify an existing order with given ID
   *
   * @param orderID - The ID of the order to be modified
   * @param orderUpdate - An object with the modified size and/or price of an order. To be note that the `side` can't be modified. The shape of the object is `{side, size, price}`.
   * @returns The modified order if exists or `undefined`
   */
  public modify = (
    orderID: string,
    orderUpdate: OrderUpdate
  ): Order | undefined => {
    const order = this.orders[orderID]
    if (order === undefined) return
    const side = orderUpdate.side
    if (side === Side.BUY) {
      return this.bids.update(order, orderUpdate)
    } else if (side === Side.SELL) {
      return this.asks.update(order, orderUpdate)
    } else {
      throw CustomError(ERROR.ErrInvalidSide)
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
    this.asks.priceTree().forEach((levelPrice, level) => {
      asks.push([levelPrice, level.volume().toNumber()])
    })
    this.bids.priceTree().forEach((levelPrice, level) => {
      bids.push([levelPrice, level.volume().toNumber()])
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
      const levelVolume = level.volume().toNumber()
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
          const headSize = headOrder.size.toNumber()
          if (response.quantityLeft < headSize) {
            response.partial = new Order(
              headOrder.id,
              headOrder.side,
              new BigNumber(headSize - response.quantityLeft),
              headOrder.price,
              headOrder.time,
              true
            )
            this.orders[headOrder.id] = response.partial
            response.partialQuantityProcessed = response.quantityLeft
            orderQueue.update(headOrder, response.partial)
            response.quantityLeft = 0
          } else {
            response.quantityLeft = response.quantityLeft - headSize
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
    const insufficientSideVolume: boolean = orderSide.volume().lt(size)
    if (insufficientSideVolume) {
      return false
    }

    let cumulativeSize = 0
    orderSide.priceTree().forEach((_key, priceLevel) => {
      if (price >= priceLevel.price() && cumulativeSize < size) {
        const volume: number = priceLevel.volume().toNumber()
        cumulativeSize += volume
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
    const insufficientSideVolume: boolean = orderSide.volume().lt(size)
    if (insufficientSideVolume) {
      return false
    }

    let cumulativeSize = 0
    orderSide.priceTree().forEach((_key, priceLevel) => {
      if (price <= priceLevel.price() && cumulativeSize < size) {
        const volume: number = priceLevel.volume().toNumber()
        cumulativeSize += volume
      } else {
        return true // break the loop
      }
    })
    return cumulativeSize >= size
  }
}
