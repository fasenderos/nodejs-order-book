import { test } from 'tap'
import { Side } from '../src/side'
import { OrderBook } from '../src/orderbook'
import { ErrorMessages } from '../src/errors'
import {
  IProcessOrder,
  JournalLog,
  OrderType,
  TimeInForce
} from '../src/types'
import { OrderQueue } from '../src/orderqueue'
import { LimitOrder, StopLimitOrder, StopMarketOrder } from '../src/order'

const addDepth = (
  ob: OrderBook,
  prefix: string,
  quantity: number,
  journal?: JournalLog[]
): void => {
  for (let index = 50; index < 100; index += 10) {
    const response = ob.limit({
      side: Side.BUY,
      id: `${prefix}buy-${index}`,
      size: quantity,
      price: index
    })
    if (journal != null && response.log != null) journal.push(response.log)
  }
  for (let index = 100; index < 150; index += 10) {
    const response = ob.limit({
      side: Side.SELL,
      id: `${prefix}sell-${index}`,
      size: quantity,
      price: index
    })
    if (journal != null && response.log != null) journal.push(response.log)
  }
}

// First test the addDepth function used by all the other test
void test('test addDepth testing function', ({ equal, end }) => {
  const ob = new OrderBook()
  addDepth(ob, '', 10)
  equal(
    ob.toString(),
    '\n140 -> 10\n130 -> 10\n120 -> 10\n110 -> 10\n100 -> 10\r\n------------------------------------\n90 -> 10\n80 -> 10\n70 -> 10\n60 -> 10\n50 -> 10'
  )
  end()
})
void test('test limit place', ({ equal, end }) => {
  const ob = new OrderBook()
  const size = 2
  for (let index = 50; index < 100; index += 10) {
    const { done, partial, partialQuantityProcessed, err } = ob.limit({
      side: Side.BUY,
      id: `buy-${index}`,
      size,
      price: index
    })
    equal(done.length, 0)
    equal(partial === null, true)
    equal(partialQuantityProcessed, 0)
    equal(err === null, true)
  }

  for (let index = 100; index < 150; index += 10) {
    const { done, partial, partialQuantityProcessed, err } = ob.limit({
      side: Side.SELL,
      id: `sell-${index}`,
      size,
      price: index
    })
    equal(done.length, 0)
    equal(partial === null, true)
    equal(partialQuantityProcessed, 0)
    equal(err === null, true)
  }

  equal(ob.order('fake') === undefined, true)
  equal(ob.order('sell-100') instanceof LimitOrder, true)

  const depth = ob.depth()

  depth.forEach((side, index) => {
    side.forEach((level, subIndex) => {
      equal(level[1], 2)
      const price = index === 0 ? 100 + 10 * subIndex : 90 - 10 * subIndex
      equal(level[0], price)
    })
  })
  end()
})

void test('test limit', ({ equal, end }) => {
  const ob = new OrderBook()

  addDepth(ob, '', 2)
  equal(ob.marketPrice, 0)
  const process1 =
    // { done, partial, partialQuantityProcessed, quantityLeft, err }
    ob.limit({ side: Side.BUY, id: 'order-b100', size: 1, price: 100 })

  equal(ob.marketPrice, 100)
  equal(process1.err === null, true)
  equal(process1.done[0].id, 'order-b100')
  equal((process1.done[0] as LimitOrder).makerQty, 0)
  equal((process1.done[0] as LimitOrder).takerQty, 1)
  equal((process1.done[0] as LimitOrder).makerQty + (process1.done[0] as LimitOrder).takerQty, (process1.done[0] as LimitOrder).origSize)

  equal(process1.partial?.id, 'sell-100')
  equal(process1.partial?.origSize, 2)
  equal(process1.partial?.size, 1)
  equal(process1.partial?.takerQty, 0)
  equal(process1.partial?.makerQty, 2)
  equal(process1.partialQuantityProcessed, 1)
  equal(process1.quantityLeft, 0)
  equal(process1.partialQuantityProcessed + process1.quantityLeft, (process1.done[0] as LimitOrder).origSize)

  const process2 =
    // { done, partial, partialQuantityProcessed, quantityLeft, err } =
    ob.limit({ side: Side.BUY, id: 'order-b150', size: 10, price: 150 })
  equal(process2.err === null, true)
  equal(process2.done.length, 5)
  equal(process2.partial?.id, 'order-b150')
  equal((process2.partial as LimitOrder)?.origSize, 10)
  equal((process2.partial as LimitOrder)?.size, 1)
  equal((process2.partial as LimitOrder)?.takerQty, 9)
  equal((process2.partial as LimitOrder)?.makerQty, 1)
  equal(
    (process2.partial as LimitOrder)?.takerQty + (process2.partial as LimitOrder)?.makerQty, (process2.partial as LimitOrder)?.origSize
  )
  equal(process2.partialQuantityProcessed, 9)
  equal(process2.quantityLeft, 1)
  equal(process2.partialQuantityProcessed + process2.quantityLeft, (process2.partial as LimitOrder)?.origSize)

  const process3 = ob.limit({
    side: Side.SELL,
    id: 'buy-70',
    size: 11,
    price: 40
  })
  equal(process3.err?.message, ErrorMessages.ORDER_ALREDY_EXISTS)

  const process4 = ob.limit({
    side: Side.SELL,
    id: 'fake-70',
    size: 0,
    price: 40
  })
  equal(process4.err?.message, ErrorMessages.INVALID_QUANTITY)

  const process5 = ob.limit({
    // @ts-expect-error invalid side
    side: 'unsupported-side',
    id: 'order-70',
    size: 70,
    price: 100
  })
  equal(process5.err?.message, ErrorMessages.INVALID_SIDE)
  const removed = ob.cancel('order-b100')
  equal(removed === undefined, true)
  // Test also the createOrder method
  const process6 = ob.createOrder({
    type: OrderType.LIMIT,
    side: Side.SELL,
    size: 11,
    price: 40,
    id: 'order-s40',
    timeInForce: TimeInForce.GTC
  })
  equal(ob.marketPrice, 50)
  equal(process6.err === null, true)
  equal(process6.done.length, 7)
  equal(process6.partial === null, true)
  equal(process6.partialQuantityProcessed, 0)

  const process7 = ob.limit({
    side: Side.SELL,
    id: 'fake-wrong-size',
    // @ts-expect-error size must be a number
    size: '0',
    price: 40
  })
  equal(process7.err?.message, ErrorMessages.INVALID_QUANTITY)

  const process8 = ob.limit({
    side: Side.SELL,
    id: 'fake-wrong-size',
    // @ts-expect-error size must be a number
    size: null,
    price: 40
  })
  equal(process8.err?.message, ErrorMessages.INVALID_QUANTITY)

  const process9 = ob.limit({
    side: Side.SELL,
    id: 'fake-wrong-price',
    size: 10,
    // @ts-expect-error price must be a number
    price: '40'
  })
  equal(process9.err?.message, ErrorMessages.INVALID_PRICE)

  // @ts-expect-error missing price
  const process10 = ob.limit({
    side: Side.SELL,
    id: 'fake-without-price',
    size: 10
  })
  equal(process10.err?.message, ErrorMessages.INVALID_PRICE)

  const process11 = ob.limit({
    side: Side.SELL,
    id: 'unsupported-tif',
    size: 10,
    price: 10,
    // @ts-expect-error invalid time in force
    timeInForce: 'FAKE'
  })
  equal(process11.err?.message, ErrorMessages.INVALID_TIF)
  end()
})

void test('test limit with postOnly', ({ equal, end }) => {
  const ob = new OrderBook()

  addDepth(ob, '', 2)
  equal(ob.marketPrice, 0)
  const process1 = ob.limit({ side: Side.BUY, id: 'order-b90', size: 2, price: 90, postOnly: true })
  equal(process1.err, null)
  equal(process1.quantityLeft, 2)

  const process2 = ob.limit({ side: Side.BUY, id: 'order-b100', size: 3, price: 100, postOnly: true })
  equal(process2.err?.message, ErrorMessages.LIMIT_ORDER_POST_ONLY)
  equal(process2.quantityLeft, 3)

  end()
})

void test('test limit FOK and IOC', ({ equal, end }) => {
  const ob = new OrderBook()
  addDepth(ob, '', 2)
  const process1 = ob.limit({
    side: Side.BUY,
    id: 'order-fok-b100',
    size: 3,
    price: 100,
    timeInForce: TimeInForce.FOK
  })
  equal(process1.err?.message, ErrorMessages.LIMIT_ORDER_FOK_NOT_FILLABLE)

  const process2 = ob.limit({
    side: Side.SELL,
    id: 'order-fok-s90',
    size: 3,
    price: 90,
    timeInForce: TimeInForce.FOK
  })
  equal(process2.err?.message, ErrorMessages.LIMIT_ORDER_FOK_NOT_FILLABLE)

  const process3 = ob.limit({
    side: Side.BUY,
    id: 'buy-order-size-greather-than-order-side-volume',
    size: 30,
    price: 100,
    timeInForce: TimeInForce.FOK
  })
  equal(process3.err?.message, ErrorMessages.LIMIT_ORDER_FOK_NOT_FILLABLE)

  const process4 = ob.limit({
    side: Side.SELL,
    id: 'sell-order-size-greather-than-order-side-volume',
    size: 30,
    price: 90,
    timeInForce: TimeInForce.FOK
  })
  equal(process4.err?.message, ErrorMessages.LIMIT_ORDER_FOK_NOT_FILLABLE)

  ob.limit({
    side: Side.BUY,
    id: 'order-ioc-b100',
    size: 3,
    price: 100,
    timeInForce: TimeInForce.IOC
  })
  equal(ob.order('order-ioc-b100') === undefined, true)

  const processIOC = ob.limit({
    side: Side.SELL,
    id: 'order-ioc-s90',
    size: 3,
    price: 90,
    timeInForce: TimeInForce.IOC
  })
  equal(ob.order('order-ioc-s90') === undefined, true)
  equal(processIOC.partial?.id, 'order-ioc-s90')

  const processFOKBuy = ob.limit({
    side: Side.BUY,
    id: 'order-fok-b110',
    size: 2,
    price: 120,
    timeInForce: TimeInForce.FOK
  })

  equal(processFOKBuy.err === null, true)
  equal(processFOKBuy.quantityLeft, 0)

  const processFOKSell = ob.limit({
    side: Side.SELL,
    id: 'order-fok-sell-4-70',
    size: 4,
    price: 70,
    timeInForce: TimeInForce.FOK
  })
  equal(processFOKSell.err === null, true)
  equal(processFOKSell.quantityLeft, 0)
  end()
})

void test('test market', ({ equal, end }) => {
  const ob = new OrderBook()

  addDepth(ob, '', 2)

  const process1 =
    // { done, partial, partialQuantityProcessed, quantityLeft, err }
    ob.market({ side: Side.BUY, size: 3 })

  equal(process1.err === null, true)
  equal(process1.quantityLeft, 0)
  equal(process1.partialQuantityProcessed, 1)

  // Test also the createOrder method
  const process3 =
    // { done, partial, partialQuantityProcessed, quantityLeft, err } =
    ob.createOrder({ type: OrderType.MARKET, side: Side.SELL, size: 12 })

  equal(process3.done.length, 5)
  equal(process3.err === null, true)
  equal(process3.partial === null, true)
  equal(process3.partialQuantityProcessed, 0)
  equal(process3.quantityLeft, 2)

  // @ts-expect-error size must be a number
  const process4 = ob.market({ side: Side.SELL, size: '0' })
  equal(process4.err?.message, ErrorMessages.INSUFFICIENT_QUANTITY)

  // @ts-expect-error missing size
  const process5 = ob.market({ side: Side.SELL })
  equal(process5.err?.message, ErrorMessages.INSUFFICIENT_QUANTITY)

  // @ts-expect-error invalid side
  const process6 = ob.market({ side: 'unsupported-side', size: 100 })
  equal(process6.err?.message, ErrorMessages.INVALID_SIDE)
  end()
})

void test('createOrder error', ({ equal, end }) => {
  const ob = new OrderBook()
  addDepth(ob, '', 2)
  const result = ob.createOrder({
    // @ts-expect-error invalid order type
    type: 'wrong-market-type',
    side: Side.SELL,
    size: 10
  })
  equal(result.err?.message, ErrorMessages.INVALID_ORDER_TYPE)

  // Added for testing with default timeOnForce when not provided
  const process1 = ob.createOrder({
    type: OrderType.LIMIT,
    id: 'buy-1-at-90',
    side: Side.BUY,
    size: 1,
    price: 90
  })
  equal(process1.done.length, 0)
  equal(process1.partial, null)
  equal(process1.partialQuantityProcessed, 0)
  equal(process1.quantityLeft, 1)
  equal(process1.err, null)
  end()
})

/**
 * Stop-Market Order:
 *    Buy: marketPrice < stopPrice
 *    Sell: marketPrice > stopPrice
 */
void test('test stop_market order', ({ equal, end }) => {
  const ob = new OrderBook({ experimentalConditionalOrders: true })

  addDepth(ob, '', 2)
  // We need to create at least on maket order in order to set
  // the market price
  ob.market({ side: Side.BUY, size: 3 })
  equal(ob.marketPrice, 110)

  {
    // Test stop market BUY wrong stopPrice
    const wrongStopPrice = ob.stopMarket({
      side: Side.BUY,
      size: 1,
      stopPrice: ob.marketPrice - 10
    }) // Below market price
    equal(wrongStopPrice.err?.message, ErrorMessages.INVALID_CONDITIONAL_ORDER)
    const wrongStopPrice2 = ob.stopMarket({
      side: Side.BUY,
      size: 1,
      stopPrice: ob.marketPrice
    }) // Same as market price
    equal(wrongStopPrice2.err?.message, ErrorMessages.INVALID_CONDITIONAL_ORDER)
    const wrongOtherOrderOption1 = ob.stopMarket({
      // @ts-expect-error invalid side
      side: 'wrong-side',
      size: 1
    })
    equal(wrongOtherOrderOption1.err != null, true)

    // @ts-expect-error size must be greather than 0
    const wrongOtherOrderOption2 = ob.stopMarket({ side: Side.BUY, size: 0 })
    equal(wrongOtherOrderOption2.err != null, true)

    // Add a stop market BUY order
    const beforeMarketPrice = ob.marketPrice
    const stopPrice = 120
    const size = 1
    const stopMarketBuy = ob.stopMarket({ side: Side.BUY, size, stopPrice })

    // Market price should be the same as before
    equal(ob.marketPrice, beforeMarketPrice)
    equal(stopMarketBuy.done[0] instanceof StopMarketOrder, true)
    equal(stopMarketBuy.quantityLeft, size)
    equal(stopMarketBuy.err, null)
    const stopOrder = stopMarketBuy.done[0].toObject() as StopMarketOrder
    equal(stopOrder.stopPrice, stopPrice)

    // Create a market order that activate the stop order
    const resp = ob.market({ side: Side.BUY, size: 2 })
    equal(resp.activated[0] instanceof StopMarketOrder, true)
    equal(resp.activated[0].id, stopOrder.id)
    equal(resp.done.length, 2)
    equal(resp.partial, null)
    equal(resp.err, null)
  }

  {
    // Add a stop market SELL order
    // Test stop market BUY wrong stopPrice
    const wrongStopPrice = ob.stopMarket({
      side: Side.SELL,
      size: 1,
      stopPrice: ob.marketPrice + 10
    }) // Above market price
    equal(wrongStopPrice.err?.message, ErrorMessages.INVALID_CONDITIONAL_ORDER)
    const wrongStopPrice2 = ob.stopMarket({
      side: Side.SELL,
      size: 1,
      stopPrice: ob.marketPrice
    }) // Same as market price
    equal(wrongStopPrice2.err?.message, ErrorMessages.INVALID_CONDITIONAL_ORDER)

    // Add a stop market SELL order
    const beforeMarketPrice = ob.marketPrice
    const stopPrice = 100
    const size = 2
    const stopMarketSell = ob.stopMarket({
      side: Side.SELL,
      size,
      stopPrice
    })

    // Market price should be the same as before
    equal(ob.marketPrice, beforeMarketPrice)
    equal(stopMarketSell.done[0] instanceof StopMarketOrder, true)
    equal(stopMarketSell.quantityLeft, size)
    equal(stopMarketSell.err, null)
    const stopOrder = stopMarketSell.done[0].toObject() as StopMarketOrder
    equal(stopOrder.stopPrice, stopPrice)

    // Create a market order that activate the stop order
    const resp = ob.market({ side: Side.SELL, size: 2 })
    equal(resp.activated[0] instanceof StopMarketOrder, true)
    equal(resp.activated[0].id, stopOrder.id)
    equal(resp.done.length, 2)
    equal(resp.partial, null)
    equal(resp.err, null)
  }

  {
    // Use the createOrder method to create a stop order
    const stopOrder = ob.createOrder({
      type: OrderType.STOP_MARKET,
      side: Side.SELL,
      size: 2,
      stopPrice: ob.marketPrice - 10
    })
    equal(stopOrder.done[0] instanceof StopMarketOrder, true)
    equal(stopOrder.err, null)
    equal(stopOrder.quantityLeft, 2)
  }

  end()
})

/**
 * Stop-Limit Order:
 *    Buy: marketPrice < stopPrice <= price
 *    Sell: marketPrice > stopPrice >= price
 */
void test('test stop_limit order', ({ equal, end }) => {
  const ob = new OrderBook({ experimentalConditionalOrders: true })

  addDepth(ob, '', 2)
  // We need to create at least on maket order in order to set
  // the market price
  ob.market({ side: Side.BUY, size: 3 })
  equal(ob.marketPrice, 110)

  {
    // Test stop limit BUY wrong stopPrice
    const wrongStopPrice = ob.stopLimit({
      id: 'fake-id',
      side: Side.BUY,
      size: 1,
      stopPrice: ob.marketPrice - 10, // Below market price
      price: ob.marketPrice
    })
    equal(wrongStopPrice.err?.message, ErrorMessages.INVALID_CONDITIONAL_ORDER)
    const wrongStopPrice2 = ob.stopLimit({
      id: 'fake-id',
      side: Side.BUY,
      size: 1,
      stopPrice: ob.marketPrice,
      price: ob.marketPrice
    }) // Same as market price
    equal(wrongStopPrice2.err?.message, ErrorMessages.INVALID_CONDITIONAL_ORDER)
    const wrongOtherOrderOption1 = ob.stopLimit({
      // @ts-expect-error invalid side
      side: 'wrong-side',
      size: 1,
      price: 10
    })
    equal(wrongOtherOrderOption1.err != null, true)

    // @ts-expect-error size must be greather than 0
    const wrongOtherOrderOption2 = ob.stopLimit({
      side: Side.BUY,
      size: 0,
      price: 10
    })
    equal(wrongOtherOrderOption2.err != null, true)

    // @ts-expect-error price must be greather than 0
    const wrongOtherOrderOption3 = ob.stopLimit({
      side: Side.BUY,
      size: 1,
      price: 0
    })
    equal(wrongOtherOrderOption3.err != null, true)

    // Add a stop limit BUY order
    const beforeMarketPrice = ob.marketPrice
    const stopPrice = 120
    const price = 130
    const size = 1
    const stopLimitBuy = ob.stopLimit({
      id: 'stop-limit-buy-1',
      side: Side.BUY,
      size,
      stopPrice,
      price,
      timeInForce: TimeInForce.IOC
    })

    // Market price should be the same as before
    equal(ob.marketPrice, beforeMarketPrice)
    equal(stopLimitBuy.done[0] instanceof StopLimitOrder, true)
    equal(stopLimitBuy.quantityLeft, size)
    equal(stopLimitBuy.err, null)
    const stopOrder = stopLimitBuy.done[0].toObject() as StopLimitOrder
    equal(stopOrder.stopPrice, stopPrice)
    equal(stopOrder.price, price)
    equal(stopOrder.timeInForce, TimeInForce.IOC)

    // Create a market order that activate the stop order
    const resp = ob.market({ side: Side.BUY, size: 6 })
    equal(resp.activated[0] instanceof StopLimitOrder, true)
    equal(resp.activated[0].id, stopOrder.id)
    equal(resp.done.length, 3)
    // The stop order becomes a LimitOrder
    equal(resp.partial instanceof LimitOrder, true)
    equal(resp.partial?.id, stopOrder.id)
    equal(resp.err, null)
  }

  // addDepth(ob, 'second-run-', 2)
  ob.market({ side: Side.SELL, size: 1 })

  {
    // Test stop limit SELL wrong stopPrice
    const wrongStopPrice = ob.stopLimit({
      id: 'fake-id',
      side: Side.SELL,
      size: 1,
      stopPrice: ob.marketPrice + 10, // Above market price
      price: ob.marketPrice
    })
    equal(wrongStopPrice.err?.message, ErrorMessages.INVALID_CONDITIONAL_ORDER)
    const wrongStopPrice2 = ob.stopLimit({
      id: 'fake-id',
      side: Side.SELL,
      size: 1,
      stopPrice: ob.marketPrice,
      price: ob.marketPrice
    }) // Same as market price
    equal(wrongStopPrice2.err?.message, ErrorMessages.INVALID_CONDITIONAL_ORDER)

    // Add a stop limit BUY order
    const beforeMarketPrice = ob.marketPrice
    const stopPrice = 80
    const price = 70
    const size = 1
    const stopLimitSell = ob.stopLimit({
      id: 'stop-limit-sell-1',
      side: Side.SELL,
      size,
      stopPrice,
      price
    })

    // Market price should be the same as before
    equal(ob.marketPrice, beforeMarketPrice)
    equal(stopLimitSell.done[0] instanceof StopLimitOrder, true)
    equal(stopLimitSell.quantityLeft, size)
    equal(stopLimitSell.err, null)
    const stopOrder = stopLimitSell.done[0].toObject() as StopLimitOrder
    equal(stopOrder.stopPrice, stopPrice)
    equal(stopOrder.price, price)
    equal(stopOrder.timeInForce, TimeInForce.GTC)

    // Create a market order that activate the stop order
    const resp = ob.market({ side: Side.SELL, size: 6 })
    equal(resp.activated[0] instanceof StopLimitOrder, true)
    equal(resp.activated[0].id, stopOrder.id)
    equal(resp.done.length, 3)
    // The stop order becomes a LimitOrder
    equal(resp.partial instanceof LimitOrder, true)
    equal(resp.partial?.id, stopOrder.id)
    equal(resp.err, null)
  }

  {
    // Use the createOrder method to create a stop order
    const stopOrder = ob.createOrder({
      type: OrderType.STOP_LIMIT,
      id: 'some-order-id',
      side: Side.SELL,
      size: 2,
      stopPrice: ob.marketPrice - 10,
      price: ob.marketPrice - 10
    })
    equal(stopOrder.done[0] instanceof StopLimitOrder, true)
    equal(stopOrder.err, null)
    equal(stopOrder.quantityLeft, 2)
  }

  end()
})

/**
 * OCO Order:
 *    Buy: price < marketPrice < stopPrice
 *    Sell: price > marketPrice > stopPrice
 */
void test('test oco order', ({ equal, end }) => {
  const ob = new OrderBook({ experimentalConditionalOrders: true })

  addDepth(ob, '', 2)
  // We need to create at least on maket order in order to set
  // the market price
  ob.market({ side: Side.BUY, size: 3, id: 'some-fake-order' })
  equal(ob.marketPrice, 110)

  const validate = (
    orderId: string,
    side: Side,
    price: number,
    stopPrice: number,
    stopLimitPrice: number,
    expect: boolean | string | ((response: IProcessOrder) => void)
  ): void => {
    const order = ob.oco({
      id: orderId,
      side,
      size: 1,
      price,
      stopPrice,
      stopLimitPrice,
      stopLimitTimeInForce: TimeInForce.GTC
    })
    if (typeof expect === 'function') {
      expect(order)
    } else {
      const toValidate =
        typeof expect === 'boolean' ? order : order.err?.message
      equal(toValidate, expect)
    }
  }

  // Test OCO Buy
  // wrong stopPrice
  validate(
    'fake-id',
    Side.BUY,
    ob.marketPrice - 10,
    ob.marketPrice - 10,
    ob.marketPrice,
    ErrorMessages.INVALID_CONDITIONAL_ORDER
  )
  // wrong price
  validate(
    'fake-id',
    Side.BUY,
    ob.marketPrice + 10,
    ob.marketPrice + 10,
    ob.marketPrice,
    ErrorMessages.INVALID_CONDITIONAL_ORDER
  )

  // Here marketPrice is 110, lowest sell is 110 and highest buy is 90
  // valid OCO with limit to 100 and stopLimit to 120
  validate('oco-buy-1', Side.BUY, 100, 120, 121, (response) => {
    const order = response.done[0] as StopLimitOrder
    equal(order instanceof StopLimitOrder, true)
    equal(order.stopPrice === 120, true)
    equal(order.price === 121, true)
    equal(order.isOCO, true)
    // The limit oco must be the only one inserted in the price level 100
    // @ts-expect-error bids is private
    equal(ob.bids.maxPriceQueue()?.price(), 100)
    // @ts-expect-error bids is private
    equal(ob.bids.maxPriceQueue()?.tail()?.id, 'oco-buy-1')
  })

  // Here marketPrice is 110, lowest sell is 110 and highest buy is 90
  // valid OCO with limit to 100 and stopLimit to 120
  validate('oco-buy-2', Side.BUY, 100, 120, 121, (response) => {
    const order = response.done[0] as StopLimitOrder
    equal(order instanceof StopLimitOrder, true)
    equal(order.stopPrice === 120, true)
    equal(order.price === 121, true)
    equal(order.isOCO, true)
    // The limit oco must be the only one inserted in the price level 100
    // @ts-expect-error bids is private
    equal(ob.bids.maxPriceQueue()?.price(), 100)
    // @ts-expect-error bids is private
    equal(ob.bids.maxPriceQueue()?.tail()?.id, 'oco-buy-2')
  })

  // Test OCO Sell
  // wrong stopPrice
  validate(
    'fake-id',
    Side.SELL,
    ob.marketPrice + 10,
    ob.marketPrice + 10,
    ob.marketPrice,
    ErrorMessages.INVALID_CONDITIONAL_ORDER
  )
  // wrong price
  validate(
    'fake-id',
    Side.SELL,
    ob.marketPrice - 10,
    ob.marketPrice - 10,
    ob.marketPrice,
    ErrorMessages.INVALID_CONDITIONAL_ORDER
  )

  // Here marketPrice is 110, lowest sell is 110 and highest buy is 100
  // valid OCO with limit to 120 and stopLimit to 100
  validate('oco-sell-1', Side.SELL, 120, 100, 99, (response) => {
    const order = response.done[0] as StopLimitOrder
    equal(order instanceof StopLimitOrder, true)
    equal(order.stopPrice === 100, true)
    equal(order.price === 99, true)
    equal(order.isOCO, true)
    // The limit oco must be in the tail of the price level 120
    // @ts-expect-error bids is private
    equal(ob.asks._prices[120].tail()?.id === 'oco-sell-1', true)
  })

  //  Here marketPrice is 110, lowest sell is 110 and highest buy is 90
  //  valid OCO with limit to 120 and stopLimit to 100
  validate('oco-sell-2', Side.SELL, 120, 100, 99, (response) => {
    const order = response.done[0] as StopLimitOrder
    equal(order instanceof StopLimitOrder, true)
    equal(order.stopPrice === 100, true)
    equal(order.price === 99, true)
    equal(order.isOCO, true)
    // The limit oco must be in the tail of the price level 120
    // @ts-expect-error bids is private
    equal(ob.asks._prices[120].tail()?.id === 'oco-sell-2', true)
  })

  // Removing the limit order should remove also the stop limit
  const response = ob.cancel('oco-sell-2')
  equal(response?.order.id, 'oco-sell-2')
  equal(response?.stopOrder?.id, 'oco-sell-2')

  // Recreate the same OCO with the createOrder method
  {
    const response = ob.createOrder({
      id: 'oco-sell-2',
      type: OrderType.OCO,
      size: 1,
      side: Side.SELL,
      price: 120,
      stopPrice: 100,
      stopLimitPrice: 99
    })
    const order = response.done[0] as StopLimitOrder
    equal(order instanceof StopLimitOrder, true)
    equal(order.stopPrice === 100, true)
    equal(order.price === 99, true)
    equal(order.isOCO, true)
    // The limit oco must be in the tail of the price level 120
    // @ts-expect-error bids is private
    equal(ob.asks._prices[120].tail()?.id === 'oco-sell-2', true)
  }

  {
    const response = ob.market({ side: Side.SELL, size: 1 })
    // market order match against the limit order oco-buy-1 and activate the two stop limit
    // orders of the oco sell.
    equal(response.done[0]?.id === 'oco-buy-1', true)
    equal(response.activated[0]?.id === 'oco-sell-1', true)
    equal(response.activated[1]?.id === 'oco-sell-2', true)

    // The first stop limit oco-sell-1 match against the limit oco-buy-2
    equal(response.done[1]?.id === 'oco-buy-2', true)
    equal(response.done[2]?.id === 'oco-sell-1', true)

    // While the second stop limit oco-sell-2 go to the order book
    equal(response.partial?._id === 'oco-sell-2', true)
    equal(response.partialQuantityProcessed, 0)

    // Both the side of the stop book must be empty
    // @ts-expect-error stopBook is private
    equal(ob.stopBook.asks._priceTree.length, 0)
    // @ts-expect-error stopBook is private
    equal(ob.stopBook.bids._priceTree.length, 0)
  }
  end()
})

void test('test modify', ({ equal, end }) => {
  const ob = new OrderBook()

  addDepth(ob, '', 2)

  const initialPrice1 = 52
  const initialSize1 = 1000
  const initialPrice2 = 200
  const initialSize2 = 1000
  ob.limit({
    side: Side.BUY,
    id: 'first-order',
    size: initialSize1,
    price: initialPrice1
  })
  ob.limit({
    side: Side.SELL,
    id: 'second-order',
    size: initialSize2,
    price: initialPrice2
  })

  {
    // SIDE BUY
    const newSize = 990
    // Test update size
    let response = ob.modify('first-order', { size: newSize })
    equal(response?.done.length, 0)
    equal(response?.err, null)
    equal(response?.quantityLeft, newSize)

    // Test passing an invalid price
    response = ob.modify('first-order', { price: 0 })
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test passing an invalid size
    response = ob.modify('first-order', { size: -1 })
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test passing an invalid size and price
    response = ob.modify('first-order', { size: -1, price: 0 })
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test passing an invalid price
    response = ob.modify('first-order', { price: 0 })
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test passing an invalid size
    response = ob.modify('first-order', { size: -1 })
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test modify without passing size and price
    // @ts-expect-error missing size and/or price
    response = ob.modify('first-order')
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test update price
    const newPrice = 82
    response = ob.modify('first-order', { price: newPrice, size: newSize })
    equal(response?.done.length, 0)
    equal(response?.err, null)
    equal(response?.quantityLeft, newSize)
    equal(ob.order('first-order')?.price, newPrice)

    // @ts-expect-error properties bids and _priceTree are private
    const bookOrdersSize = ob.asks._priceTree.values
      .filter((queue) => queue.price() <= 130)
      .map((queue) =>
        queue
          .toArray()
          .reduce((acc: number, curr: LimitOrder) => acc + curr.size, 0)
      )
      .reduce((acc: number, curr: number) => acc + curr, 0)

    // Test modify price order that cross the market price and don't fill completely
    response = ob.modify('first-order', { price: 130 })
    const completedOrders = response?.done.map((order) => order.id)
    equal(
      completedOrders?.join(),
      ['sell-100', 'sell-110', 'sell-120', 'sell-130'].join()
    )
    equal(response?.partial?.id, 'first-order')
    equal(response?.partial?.size, newSize - bookOrdersSize)
    equal(response?.partialQuantityProcessed, bookOrdersSize)
    equal(response?.quantityLeft, newSize - bookOrdersSize)
  }

  {
    // SIDE SELL
    const newSize = 990
    // Test update size
    let response = ob.modify('second-order', { size: newSize })
    equal(response?.done.length, 0)
    equal(response?.err, null)
    equal(response?.quantityLeft, newSize)

    // Test passing an invalid price
    response = ob.modify('second-order', { price: 0 })
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test passing an invalid size
    response = ob.modify('second-order', { size: -1 })
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test passing an invalid size and price
    response = ob.modify('second-order', { size: -1, price: 0 })
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test passing an invalid price
    response = ob.modify('second-order', { price: 0 })
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test passing an invalid size
    response = ob.modify('second-order', { size: -1 })
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test modify without passing size and price
    // @ts-expect-error missing size and/or price
    response = ob.modify('second-order')
    equal(response?.err?.message, ErrorMessages.INVALID_PRICE_OR_QUANTITY)

    // Test update price
    const newPrice = 250
    response = ob.modify('second-order', { price: newPrice, size: newSize })
    equal(response?.done.length, 0)
    equal(response?.err, null)
    equal(response?.quantityLeft, newSize)
    equal(ob.order('second-order')?.price, newPrice)

    // @ts-expect-error properties bids and _priceTree are private
    const bookOrdersSize = ob.bids._priceTree.values
      .filter((queue) => queue.price() >= 80)
      .map((queue) =>
        queue
          .toArray()
          .reduce((acc: number, curr: LimitOrder) => acc + curr.size, 0)
      )
      .reduce((acc: number, curr: number) => acc + curr, 0)

    // Test modify price order that cross the market price
    response = ob.modify('second-order', { price: 80 })
    const completedOrders = response?.done.map((order) => order.id)
    equal(completedOrders?.join(), ['first-order', 'buy-90', 'buy-80'].join())
    equal(response?.partial?.id, 'second-order')
    equal(response?.partial?.size, newSize - bookOrdersSize)
    equal(response?.partialQuantityProcessed, bookOrdersSize)
    equal(response?.quantityLeft, newSize - bookOrdersSize)
  }

  // Test modify a non-existent order without passing size
  const resp = ob.modify('non-existent-order', { price: 123 })
  equal(resp.err?.message, ErrorMessages.ORDER_NOT_FOUND)
  equal(resp.quantityLeft, 0)
  end()
})

void test('test priceCalculation', ({ equal, end }) => {
  const ob = new OrderBook()

  addDepth(ob, '05-', 10)
  addDepth(ob, '10-', 10)
  addDepth(ob, '15-', 10)

  const calc1 = ob.calculateMarketPrice(Side.BUY, 115)

  equal(calc1.err === null, true)
  equal(calc1.price, 13150)

  const calc2 = ob.calculateMarketPrice(Side.BUY, 200)

  equal(calc2.err?.message, ErrorMessages.INSUFFICIENT_QUANTITY)
  equal(calc2.price, 18000)

  const calc3 = ob.calculateMarketPrice(Side.SELL, 115)

  equal(calc3.err === null, true)
  equal(calc3.price, 8700)

  const calc4 = ob.calculateMarketPrice(Side.SELL, 200)

  equal(calc4.err?.message, ErrorMessages.INSUFFICIENT_QUANTITY)
  equal(calc4.price, 10500)
  end()
})

void test('orderbook enableJournaling option', ({ equal, end, same }) => {
  const ob = new OrderBook({ enableJournaling: true })

  {
    const response = ob.limit({
      side: Side.BUY,
      id: 'first-order',
      size: 50,
      price: 100
    })
    equal(response.log?.opId, 1)
    equal(typeof response.log?.ts, 'number')
    equal(response.log?.op, 'l')
    same(response.log?.o, {
      side: Side.BUY,
      id: 'first-order',
      size: 50,
      price: 100,
      timeInForce: TimeInForce.GTC
    })
  }

  {
    const response = ob.market({ side: Side.BUY, size: 50 })
    equal(response.log?.opId, 2)
    equal(typeof response.log?.ts, 'number')
    equal(response.log?.op, 'm')
    same(response.log?.o, {
      side: Side.BUY,
      size: 50
    })
  }

  {
    const response = ob.modify('first-order', { size: 55 })
    equal(response.log?.opId, 3)
    equal(typeof response.log?.ts, 'number')
    equal(response.log?.op, 'u')
    same(response.log?.o, {
      orderID: 'first-order',
      orderUpdate: { size: 55 }
    })
  }

  {
    const response = ob.cancel('first-order')
    equal(response?.log?.opId, 4)
    equal(typeof response?.log?.ts, 'number')
    equal(response?.log?.op, 'd')
    same(response?.log?.o, {
      orderID: 'first-order'
    })
  }

  end()
})

void test('orderbook replayJournal', ({ equal, end }) => {
  const ob = new OrderBook({ enableJournaling: true })

  const journal: JournalLog[] = []

  addDepth(ob, '', 2, journal)

  {
    // Add Market Order
    const response = ob.market({ side: Side.BUY, size: 3 })
    if (response.log != null) journal.push(response.log)
  }

  {
    // Add Limit Order, modify and delete the order
    const response = ob.limit({
      side: Side.BUY,
      id: 'limit-order-b100',
      size: 1,
      price: 100
    })
    if (response.log != null) journal.push(response.log)
    const modifyOrder = ob.modify('limit-order-b100', { size: 2 })
    if (modifyOrder.log != null) journal.push(modifyOrder.log)
    const deleteOrder = ob.cancel('limit-order-b100')
    if (deleteOrder?.log != null) journal.push(deleteOrder.log)
  }

  const ob2 = new OrderBook({ journal })

  equal(ob.toString(), ob2.toString())

  end()
})

void test('orderbook replayJournal test wrong journal', ({ equal, end }) => {
  // Test valid journal log that is not an array
  try {
    const journalLog: JournalLog = {
      opId: 1,
      ts: Date.now(),
      op: 'd',
      o: { orderID: 'bar' }
    }
    // @ts-expect-error journal log must be an array
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: journalLog })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG)
    }
  }

  // Test wrong op in journal log
  try {
    const wrongOp = [
      {
        ts: Date.now(),
        op: 'x',
        o: { foo: 'bar' }
      }
    ]
    // @ts-expect-error invalid "op" provided
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: wrongOp })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG)
    }
  }

  // Test wrong market order journal log
  try {
    const wrongOp = [
      {
        ts: Date.now(),
        op: 'm',
        o: { foo: 'bar' }
      }
    ]
    // @ts-expect-error invalid market order "o" prop in journal log
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: wrongOp })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG)
    }
  }

  // Test wrong limit order journal log
  try {
    const wrongOp = [
      {
        ts: Date.now(),
        op: 'l',
        o: { foo: 'bar' }
      }
    ]
    // @ts-expect-error invalid limit order "o" prop in journal log
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: wrongOp })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG)
    }
  }

  // Test wrong update order journal log
  try {
    const wrongOp = [
      {
        ts: Date.now(),
        op: 'u',
        o: { foo: 'bar' }
      }
    ]
    // @ts-expect-error invalid update order "o" prop in journal log
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: wrongOp })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG)
    }
  }

  // Test wrong delete order journal log
  try {
    const wrongOp = [
      {
        ts: Date.now(),
        op: 'd',
        o: { foo: 'bar' }
      }
    ]
    // @ts-expect-error invalid delete order "o" prop in journal log
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: wrongOp })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG)
    }
  }
  end()
})

void test('orderbook test snapshot', ({ equal, end }) => {
  const ob = new OrderBook()
  addDepth(ob, '', 10)
  const snapshot = ob.snapshot()

  equal(Array.isArray(snapshot.asks), true)
  equal(Array.isArray(snapshot.bids), true)
  equal(typeof snapshot.ts, 'number')
  snapshot.asks.forEach((level) => {
    equal(typeof level.price, 'number')
    equal(Array.isArray(level.orders), true)
    level.orders.forEach((order) => {
      equal(order instanceof LimitOrder, true)
    })
  })

  snapshot.bids.forEach((level) => {
    equal(typeof level.price, 'number')
    equal(Array.isArray(level.orders), true)
    level.orders.forEach((order) => {
      equal(order instanceof LimitOrder, true)
    })
  })

  end()
})

void test('orderbook restore from snapshot', ({ equal, same, end }) => {
  // Create a new orderbook with 3 orders for price levels and make a snapshot
  const journal: JournalLog[] = []
  const ob = new OrderBook({ enableJournaling: true })
  addDepth(ob, 'first-run-', 10, journal)
  addDepth(ob, 'second-run-', 10, journal)
  addDepth(ob, 'third-run-', 10, journal)

  const snapshot = ob.snapshot()
  {
    // Create a new orderbook from the snapshot and check is the same as before
    const ob2 = new OrderBook({ snapshot, enableJournaling: true })

    equal(ob.toString(), ob2.toString())
    same(ob.depth(), ob2.depth())

    // @ts-expect-error these are private properties
    same(ob.orders, ob2.orders)
    // @ts-expect-error these are private properties
    equal(ob.asks.volume(), ob2.asks.volume())
    // @ts-expect-error these are private properties
    equal(ob.bids.volume(), ob2.bids.volume())

    // @ts-expect-error these are private properties
    equal(ob.asks.total(), ob2.asks.total())
    // @ts-expect-error these are private properties
    equal(ob.bids.total(), ob2.bids.total())

    // @ts-expect-error these are private properties
    equal(ob.asks.len(), ob2.asks.len())
    // @ts-expect-error these are private properties
    equal(ob.bids.len(), ob2.bids.len())

    equal(ob.lastOp, ob2.lastOp)

    const prev = {}
    const restored = {}

    // @ts-expect-error these are private properties
    ob.asks.priceTree().forEach((price: number, level: OrderQueue) => {
      prev[price] = level.toArray()
    })

    // @ts-expect-error these are private properties
    ob.bids.priceTree().forEach((price: number, level: OrderQueue) => {
      prev[price] = level.toArray()
    })

    // @ts-expect-error these are private properties
    ob2.asks.priceTree().forEach((price: number, level: OrderQueue) => {
      restored[price] = level.toArray()
    })

    // @ts-expect-error these are private properties
    ob2.bids.priceTree().forEach((price: number, level: OrderQueue) => {
      restored[price] = level.toArray()
    })

    same(prev, restored)

    // Compare also the snapshot from the original order book and the restored one
    const snapshot2 = ob2.snapshot()
    same(snapshot.asks, snapshot2.asks)
    same(snapshot.bids, snapshot2.bids)
  }

  {
    // Add three additional order to the original orderbook with journal
    const lastOp = ob.lastOp
    addDepth(ob, 'fourth-run-', 10, journal)
    addDepth(ob, 'fifth-run-', 10, journal)
    addDepth(ob, 'sixth-run-', 10, journal)

    const ob2 = new OrderBook({ snapshot, journal, enableJournaling: true })
    equal(ob2.lastOp, lastOp + 30) // every run add 10 additional orders
  }

  end()
})

void test('orderbook test unreachable lines', ({ equal, end }) => {
  const ob = new OrderBook({ enableJournaling: true })
  addDepth(ob, '', 10)

  // test SELL side remove order with journal enabled
  const deleted = ob.cancel('sell-100')
  equal(ob.lastOp, deleted?.log?.opId)

  end()
})
