import { Order, OrderType, OrderUpdate, TimeInForce } from '../src/order'
import { test } from 'tap'
import { Side } from '../src/side'
import { OrderBook } from '../src/orderbook'
import { ERROR } from '../src/errors'

const addDepth = (ob: OrderBook, prefix: string, quantity: number): void => {
  for (let index = 50; index < 100; index += 10) {
    ob.limit(Side.BUY, `${prefix}buy-${index}`, quantity, index)
  }
  for (let index = 100; index < 150; index += 10) {
    ob.limit(Side.SELL, `${prefix}sell-${index}`, quantity, index)
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
    const { done, partial, partialQuantityProcessed, err } =
      ob.limit(Side.BUY, `buy-${index}`, size, index)
    equal(done.length, 0)
    equal(partial === null, true)
    equal(partialQuantityProcessed, 0)
    equal(err === null, true)
  }

  for (let index = 100; index < 150; index += 10) {
    const { done, partial, partialQuantityProcessed, err } =
      ob.limit(Side.SELL, `sell-${index}`, size, index)
    equal(done.length, 0)
    equal(partial === null, true)
    equal(partialQuantityProcessed, 0)
    equal(err === null, true)
  }

  equal(ob.order('fake') === undefined, true)
  equal(ob.order('sell-100') instanceof Order, true)

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

  const process1 =
    // { done, partial, partialQuantityProcessed, quantityLeft, err }
    ob.limit(Side.BUY, 'order-b100', 1, 100)
  equal(process1.err === null, true)
  equal(process1.done[0].id, 'order-b100')
  equal(process1.partial?.id, 'sell-100')
  equal(process1.partial?.isMaker, true)
  equal(process1.partialQuantityProcessed, 1)

  const process2 =
    // { done, partial, partialQuantityProcessed, quantityLeft, err } =
    ob.limit(Side.BUY, 'order-b150', 10, 150)

  equal(process2.err === null, true)
  equal(process2.done.length, 5)
  equal(process2.partial?.id, 'order-b150')
  equal(process2.partial?.isMaker, true)
  equal(process2.partialQuantityProcessed, 9)

  const process3 = ob.limit(Side.SELL, 'buy-70', 11, 40)
  equal(process3.err?.message, ERROR.ErrOrderExists)

  const process4 = ob.limit(Side.SELL, 'fake-70', 0, 40)
  equal(process4.err?.message, ERROR.ErrInvalidQuantity)

  // @ts-expect-error
  const process5 = ob.limit('unsupported-side', 'order-70', 70, 100)
  equal(process5.err?.message, ERROR.ErrInvalidSide)

  const removed = ob.cancel('order-b100')
  equal(removed === undefined, true)

  // Test also the createOrder method
  const process6 = ob.createOrder(
    OrderType.LIMIT,
    Side.SELL,
    11,
    40,
    'order-s40'
  )
  equal(process6.err === null, true)
  equal(process6.done.length, 7)
  equal(process6.partial === null, true)
  equal(process6.partialQuantityProcessed, 0)

  // @ts-expect-error
  const process7 = ob.limit(Side.SELL, 'fake-wrong-size', '0', 40)
  equal(process7.err?.message, ERROR.ErrInvalidQuantity)

  const process8 = ob.limit(
    Side.SELL,
    'fake-wrong-size',
    // @ts-expect-error
    null,
    40
  )
  equal(process8.err?.message, ERROR.ErrInvalidQuantity)

  const process9 = ob.limit(
    Side.SELL,
    'fake-wrong-price',
    10,
    // @ts-expect-error
    '40'
  )
  equal(process9.err?.message, ERROR.ErrInvalidPrice)

  // @ts-expect-error
  const process10 = ob.limit(Side.SELL, 'fake-wrong-price', 10)
  equal(process10.err?.message, ERROR.ErrInvalidPrice)

  // @ts-expect-error
  const process11 = ob.limit(Side.SELL, 'unsupported-tif', 10, 10, 'FAKE')
  equal(process11.err?.message, ERROR.ErrInvalidTimeInForce)
  end()
})

void test('test limit FOK and IOC', ({ equal, end }) => {
  const ob = new OrderBook()
  addDepth(ob, '', 2)
  const process1 = ob.limit(Side.BUY, 'order-fok-b100', 3, 100, TimeInForce.FOK)
  equal(process1.err?.message, ERROR.ErrLimitFOKNotFillable)

  const process2 = ob.limit(Side.SELL, 'order-fok-s90', 3, 90, TimeInForce.FOK)
  equal(process2.err?.message, ERROR.ErrLimitFOKNotFillable)

  const process3 = ob.limit(
    Side.BUY,
    'buy-order-size-greather-than-order-side-volume',
    30,
    100,
    TimeInForce.FOK
  )
  equal(process3.err?.message, ERROR.ErrLimitFOKNotFillable)

  const process4 = ob.limit(
    Side.SELL,
    'sell-order-size-greather-than-order-side-volume',
    30,
    90,
    TimeInForce.FOK
  )
  equal(process4.err?.message, ERROR.ErrLimitFOKNotFillable)

  ob.limit(Side.BUY, 'order-ioc-b100', 3, 100, TimeInForce.IOC)
  equal(ob.order('order-ioc-b100') === undefined, true)

  const processIOC = ob.limit(
    Side.SELL,
    'order-ioc-s90',
    3,
    90,
    TimeInForce.IOC
  )
  equal(ob.order('order-ioc-s90') === undefined, true)
  equal(processIOC.partial?.id, 'order-ioc-s90')

  const processFOKBuy = ob.limit(
    Side.BUY,
    'order-fok-b110',
    2,
    120,
    TimeInForce.FOK
  )

  equal(processFOKBuy.err === null, true)
  equal(processFOKBuy.quantityLeft, 0)

  const processFOKSell = ob.limit(
    Side.SELL,
    'order-fok-sell-4-70',
    4,
    70,
    TimeInForce.FOK
  )
  equal(processFOKSell.err === null, true)
  equal(processFOKSell.quantityLeft, 0)
  end()
})

void test('test market', ({ equal, end }) => {
  const ob = new OrderBook()

  addDepth(ob, '', 2)

  const process1 =
    // { done, partial, partialQuantityProcessed, quantityLeft, err }
    ob.market(Side.BUY, 3)

  equal(process1.err === null, true)
  equal(process1.quantityLeft, 0)
  equal(process1.partialQuantityProcessed, 1)

  // Test also the createOrder method
  const process3 =
    // { done, partial, partialQuantityProcessed, quantityLeft, err } =
    ob.createOrder(OrderType.MARKET, Side.SELL, 12)

  equal(process3.done.length, 5)
  equal(process3.err === null, true)
  equal(process3.partial === null, true)
  equal(process3.partialQuantityProcessed, 0)
  equal(process3.quantityLeft, 2)

  // @ts-expect-error
  const process4 = ob.market(Side.SELL, '0')
  equal(process4.err?.message, ERROR.ErrInsufficientQuantity)

  // @ts-expect-error
  const process5 = ob.market(Side.SELL)
  equal(process5.err?.message, ERROR.ErrInsufficientQuantity)

  // @ts-expect-error
  const process6 = ob.market('unsupported-side', 100)
  equal(process6.err?.message, ERROR.ErrInvalidSide)
  end()
})

void test('createOrder error', ({ equal, end }) => {
  const ob = new OrderBook()
  addDepth(ob, '', 2)
  // @ts-expect-error
  const result = ob.createOrder('wrong-market-type', Side.SELL, 10)
  equal(result.err?.message, ERROR.ErrInvalidOrderType)
  end()
})

void test('test modify', ({ equal, end }) => {
  const ob = new OrderBook()

  addDepth(ob, '', 2)

  ob.limit(Side.BUY, 'first-order', 1000, 52)
  ob.limit(Side.SELL, 'second-order', 1000, 200)

  // Test BUY side
  const orderUpdateSize1 = {
    side: Side.BUY,
    size: 990,
    price: 52
  }
  // Response is the updated order or undefined if no order exist
  const response1 = ob.modify('first-order', orderUpdateSize1)
  equal(response1?.size.toNumber(), orderUpdateSize1.size)

  const orderUpdatePrice1: OrderUpdate = {
    side: Side.BUY,
    size: 990,
    price: 82
  }

  // Test SELL side
  const orderUpdateSize2: OrderUpdate = {
    side: Side.SELL,
    size: 990,
    price: 200
  }
  // Response is the updated order or undefined if no order exist
  const response3 = ob.modify('second-order', orderUpdateSize2)
  equal(response3?.size.toNumber(), orderUpdateSize2.size)

  const orderUpdatePrice2: OrderUpdate = {
    side: Side.SELL,
    size: 990,
    price: 250
  }
  // Response is the updated order or undefined if no order exist
  const response4 = ob.modify('second-order', orderUpdatePrice2)
  equal(response4?.price, orderUpdatePrice2.price)

  // Test throw error when the side is not of type 'Side'
  try {
    const errorUpdate: OrderUpdate = {
      // @ts-expect-error
      side: 'fake-side',
      size: 990,
      price: 250
    }
    ob.modify('second-order', errorUpdate)
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ERROR.ErrInvalidSide)
    }
  }

  // Test modify a non-existent order
  const resp = ob.modify('non-existent-order', orderUpdatePrice1)
  equal(resp === undefined, true)
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

  equal(calc2.err?.message, ERROR.ErrInsufficientQuantity)
  equal(calc2.price, 18000)

  const calc3 = ob.calculateMarketPrice(Side.SELL, 115)

  equal(calc3.err === null, true)
  equal(calc3.price, 8700)

  const calc4 = ob.calculateMarketPrice(Side.SELL, 200)

  equal(calc4.err?.message, ERROR.ErrInsufficientQuantity)
  equal(calc4.price, 10500)
  end()
})
