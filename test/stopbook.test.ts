import { test } from 'tap'
import { OrderFactory } from '../src/order'
import { OrderType, StopOrder, TimeInForce } from '../src/types'
import { Side } from '../src/side'
import { StopBook } from '../src/stopbook'

void test('it should add/remove/get order to stop book', ({ equal, same, end }) => {
  const ob = new StopBook()
  // @ts-expect-error asks is private
  equal(ob.asks._priceTree.length, 0)
  // @ts-expect-error bids is private
  equal(ob.bids._priceTree.length, 0)

  const addOrder = (side: Side, orderId: string, stopPrice: number): void => {
    const order = OrderFactory.createOrder({
      id: orderId,
      type: OrderType.STOP_LIMIT,
      side,
      size: 5,
      price: stopPrice,
      stopPrice,
      timeInForce: TimeInForce.GTC
    })
    ob.add(order)
  }

  //  Start with SELL side
  addOrder(Side.SELL, 'sell-1', 110)
  // @ts-expect-error asks is private
  equal(ob.asks._priceTree.length, 1)
  // @ts-expect-error bids is private
  equal(ob.bids._priceTree.length, 0)

  addOrder(Side.SELL, 'sell-2', 110) // Same price as before
  addOrder(Side.SELL, 'sell-3', 120)
  addOrder(Side.SELL, 'sell-4', 130)
  addOrder(Side.SELL, 'sell-5', 140)

  // @ts-expect-error asks is private
  equal(ob.asks._priceTree.length, 4)
  // @ts-expect-error bids is private
  equal(ob.bids._priceTree.length, 0)

  // Test BUY side
  addOrder(Side.BUY, 'buy-1', 100)
  // @ts-expect-error asks is private
  equal(ob.asks._priceTree.length, 4)
  // @ts-expect-error bids is private
  equal(ob.bids._priceTree.length, 1)

  addOrder(Side.BUY, 'buy-2', 100) // Same price as before
  addOrder(Side.BUY, 'buy-3', 90)
  addOrder(Side.BUY, 'buy-4', 80)
  addOrder(Side.BUY, 'buy-5', 70)

  // @ts-expect-error asks is private
  equal(ob.asks._priceTree.length, 4)
  // @ts-expect-error bids is private
  equal(ob.bids._priceTree.length, 4)

  { // Before removing orders, test getConditionalOrders
    const response = ob.getConditionalOrders(Side.SELL, 110, 130)
    let totalOrder = 0
    response.forEach((stopQueue) => {
      totalOrder += stopQueue.len()
      // @ts-expect-error _price is private
      equal(stopQueue._price >= 110 && stopQueue._price <= 130, true)
    })
    equal(totalOrder, 4)
  }

  { // Before removing orders, test getConditionalOrders
    const response = ob.getConditionalOrders(Side.BUY, 70, 130)
    let totalOrder = 0
    response.forEach((stopQueue) => {
      totalOrder += stopQueue.len()
      // @ts-expect-error _price is private
      equal(stopQueue._price >= 70 && stopQueue._price <= 100, true)
    })
    equal(totalOrder, 5)
  }

  same(ob.remove(Side.SELL, 'sell-3', 120)?.id, 'sell-3')
  // @ts-expect-error asks is private
  equal(ob.asks._priceTree.length, 3)

  // Lenght non changed because there were two orders at price level 100
  same(ob.remove(Side.BUY, 'buy-2', 100)?.id, 'buy-2')
  // @ts-expect-error asks is private
  equal(ob.bids._priceTree.length, 4)

  // Try to remove non existing order
  equal(ob.remove(Side.SELL, 'fake-id', 130), undefined)

  end()
})

void test('it should validate conditional order', ({ equal, end }) => {
  const ob = new StopBook()

  const validate = (
    orderType: OrderType.STOP_LIMIT | OrderType.STOP_MARKET,
    side: Side,
    price: number | null = null,
    stopPrice: number,
    expect: boolean,
    marketPrice: number
  ): void => {
    // @ts-expect-error price is available only for STOP_LIMIT
    const order = OrderFactory.createOrder({
      id: 'foo',
      type: orderType,
      side,
      size: 5,
      ...(price !== null ? { price } : {}),
      stopPrice,
      timeInForce: TimeInForce.GTC
    }) as StopOrder
    equal(ob.validConditionalOrder(marketPrice, order), expect)
  }

  // Stop LIMIT BUY
  validate(OrderType.STOP_LIMIT, Side.BUY, 100, 90, true, 80)
  validate(OrderType.STOP_LIMIT, Side.BUY, 100, 90, false, 90)
  validate(OrderType.STOP_LIMIT, Side.BUY, 100, 90, false, 110)
  validate(OrderType.STOP_LIMIT, Side.BUY, 90, 90, true, 80)
  validate(OrderType.STOP_LIMIT, Side.BUY, 90, 90, true, 80)
  validate(OrderType.STOP_LIMIT, Side.BUY, 90, 100, false, 80)

  // Stop LIMIT SELL
  validate(OrderType.STOP_LIMIT, Side.SELL, 90, 100, true, 110)
  validate(OrderType.STOP_LIMIT, Side.SELL, 90, 100, false, 100)
  validate(OrderType.STOP_LIMIT, Side.SELL, 90, 90, true, 110)
  validate(OrderType.STOP_LIMIT, Side.SELL, 90, 80, false, 110)

  // Stop MARKET BUY
  validate(OrderType.STOP_MARKET, Side.BUY, null, 90, true, 80)
  validate(OrderType.STOP_MARKET, Side.BUY, null, 90, false, 90)
  validate(OrderType.STOP_MARKET, Side.BUY, null, 90, false, 110)

  // Stop MARKET SELL
  validate(OrderType.STOP_MARKET, Side.SELL, null, 90, true, 100)
  validate(OrderType.STOP_MARKET, Side.SELL, null, 90, false, 90)
  validate(OrderType.STOP_MARKET, Side.SELL, null, 90, false, 80)

  end()
})
