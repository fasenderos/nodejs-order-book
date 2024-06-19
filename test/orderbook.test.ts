import { Order, OrderType, TimeInForce } from '../src/order'
import { test } from 'tap'
import { Side } from '../src/side'
import { OrderBook } from '../src/orderbook'
import { ERROR } from '../src/errors'
import { JournalLog } from '../src/types'
import { OrderQueue } from '../src/orderqueue'

const addDepth = (
  ob: OrderBook,
  prefix: string,
  quantity: number,
  journal?: JournalLog[]
): void => {
  for (let index = 50; index < 100; index += 10) {
    const response = ob.limit(
      Side.BUY,
      `${prefix}buy-${index}`,
      quantity,
      index
    )
    if (journal != null && response.log != null) journal.push(response.log)
  }
  for (let index = 100; index < 150; index += 10) {
    const response = ob.limit(
      Side.SELL,
      `${prefix}sell-${index}`,
      quantity,
      index
    )
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
    const { done, partial, partialQuantityProcessed, err } = ob.limit(
      Side.BUY,
      `buy-${index}`,
      size,
      index
    )
    equal(done.length, 0)
    equal(partial === null, true)
    equal(partialQuantityProcessed, 0)
    equal(err === null, true)
  }

  for (let index = 100; index < 150; index += 10) {
    const { done, partial, partialQuantityProcessed, err } = ob.limit(
      Side.SELL,
      `sell-${index}`,
      size,
      index
    )
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
    'order-s40',
    TimeInForce.GTC
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
  const process10 = ob.limit(Side.SELL, 'fake-without-price', 10)
  equal(process10.err?.message, ERROR.ErrInvalidPrice)

  // @ts-expect-error
  const process11 = ob.limit(Side.SELL, 'unsupported-tif', 10, 10, 'FAKE')
  equal(process11.err?.message, ERROR.ErrInvalidTimeInForce)
  end()
})

void test('test limit FOK and IOC', ({ equal, end }) => {
  const ob = new OrderBook()
  addDepth(ob, '', 2)
  const process1 = ob.limit(
    Side.BUY,
    'order-fok-b100',
    3,
    100,
    TimeInForce.FOK
  )
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

  const initialPrice1 = 52
  const initialSize1 = 1000
  const initialPrice2 = 200
  const initialSize2 = 1000
  ob.limit(Side.BUY, 'first-order', initialSize1, initialPrice1)
  ob.limit(Side.SELL, 'second-order', initialSize2, initialPrice2)

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
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

    // Test passing an invalid size
    response = ob.modify('first-order', { size: -1 })
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

    // Test passing an invalid size and price
    response = ob.modify('first-order', { size: -1, price: 0 })
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

    // Test passing an invalid price
    response = ob.modify('first-order', { price: 0 })
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

    // Test passing an invalid size
    response = ob.modify('first-order', { size: -1 })
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

    // Test modify without passing size and price
    // @ts-expect-error
    response = ob.modify('first-order')
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

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
        queue.toArray().reduce((acc: number, curr: Order) => acc + curr.size, 0)
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
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

    // Test passing an invalid size
    response = ob.modify('second-order', { size: -1 })
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

    // Test passing an invalid size and price
    response = ob.modify('second-order', { size: -1, price: 0 })
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

    // Test passing an invalid price
    response = ob.modify('second-order', { price: 0 })
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

    // Test passing an invalid size
    response = ob.modify('second-order', { size: -1 })
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

    // Test modify without passing size and price
    // @ts-expect-error
    response = ob.modify('second-order')
    equal(response?.err?.message, ERROR.ErrInvalidPriceOrQuantity)

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
        queue.toArray().reduce((acc: number, curr: Order) => acc + curr.size, 0)
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
  equal(resp.err?.message, ERROR.ErrOrderNotFound)
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

void test('orderbook enableJournaling option', ({ equal, end, same }) => {
  const ob = new OrderBook({ enableJournaling: true })

  {
    const response = ob.limit(Side.BUY, 'first-order', 50, 100)
    equal(response.log?.opId, 1)
    equal(typeof response.log?.ts, 'number')
    equal(response.log?.op, 'l')
    same(response.log?.o, {
      side: Side.BUY,
      orderID: 'first-order',
      size: 50,
      price: 100,
      timeInForce: TimeInForce.GTC
    })
  }

  {
    const response = ob.market(Side.BUY, 50)
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
    const response = ob.market(Side.BUY, 3)
    if (response.log != null) journal.push(response.log)
  }

  {
    // Add Limit Order, modify and delete the order
    const response = ob.limit(Side.BUY, 'limit-order-b100', 1, 100)
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
      equal(error?.message, ERROR.ErrJournalLog)
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
    // @ts-expect-error wrong "op" provided
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: wrongOp })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ERROR.ErrJournalLog)
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
    // @ts-expect-error wrong market order "o" prop in journal log
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: wrongOp })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ERROR.ErrJournalLog)
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
    // @ts-expect-error wrong limit order "o" prop in journal log
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: wrongOp })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ERROR.ErrJournalLog)
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
    // @ts-expect-error wrong update order "o" prop in journal log
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: wrongOp })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ERROR.ErrJournalLog)
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
    // @ts-expect-error wrong delete order "o" prop in journal log
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ob = new OrderBook({ journal: wrongOp })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ERROR.ErrJournalLog)
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
      equal(order instanceof Order, true)
    })
  })

  snapshot.bids.forEach((level) => {
    equal(typeof level.price, 'number')
    equal(Array.isArray(level.orders), true)
    level.orders.forEach((order) => {
      equal(order instanceof Order, true)
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

void test('orderbook test unreachable lines', ({ equal, same, end }) => {
  const ob = new OrderBook({ enableJournaling: true })
  addDepth(ob, '', 10)

  // test SELL side remove order with journal enabled
  const deleted = ob.cancel('sell-100')
  equal(ob.lastOp, deleted?.log?.opId)

  end()
})
