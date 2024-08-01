import { test } from 'tap'
import { OrderFactory } from '../src/order'
import { Side } from '../src/side'
import { StopSide } from '../src/stopside'
import { OrderType, TimeInForce } from '../src/types'
import { ERROR } from '../src/errors'

void test('it should append/remove orders from queue on BUY side', ({
  equal,
  end
}) => {
  const os = new StopSide(Side.BUY)
  // @ts-expect-error _prices is private
  equal(Object.keys(os._prices).length, 0)
  // @ts-expect-error _priceTree is private
  equal(os._priceTree.length, 0)
  {
    const order = OrderFactory.createOrder({
      type: OrderType.STOP_LIMIT,
      id: 'order1',
      side: Side.BUY,
      size: 5,
      price: 10,
      timeInForce: TimeInForce.GTC,
      isMaker: true,
      stopPrice: 10
    })
    os.append(order)
    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 1)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 1)
  }

  {
    const order = OrderFactory.createOrder({
      type: OrderType.STOP_LIMIT,
      id: 'order2',
      side: Side.BUY,
      size: 5,
      price: 10,
      timeInForce: TimeInForce.GTC,
      isMaker: true,
      stopPrice: 10 // same stopPrice as before, so same price level
    })
    os.append(order)
    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 1)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 1)
  }

  {
    const order = OrderFactory.createOrder({
      type: OrderType.STOP_MARKET,
      side: Side.BUY,
      size: 5,
      stopPrice: 20,
      timeInForce: TimeInForce.GTC,
      isMaker: true
    })

    os.append(order)
    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 2)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 2)
  }

  // @ts-expect-error _priceTree is private property
  os._priceTree.values.reduce((previousPrice, curr) => {
    // BUY side are in descending order bigger to lower
    // @ts-expect-error _price is private property
    const currPrice = curr._price
    equal(currPrice < previousPrice, true)
    return currPrice
  }, Infinity)

  {
    // Remove the first order
    const response = os.remove('order1', 10)

    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 2)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 2)
    equal(response?.id, 'order1')
  }

  {
    // Try to remove the same order already deleted
    const response = os.remove('order1', 10)
    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 2)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 2)
    equal(response, undefined)
  }

  {
    // Remove the second order order, so the price level is empty
    const response = os.remove('order2', 10)

    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 1)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 1)
    equal(response?.id, 'order2')
  }

  // Test for error when price level not exists
  try {
    // order1 has been replaced whit updateOrder, so trying to update order1 will throw an error of type ErrInvalidPriceLevel
    os.remove('some-id', 100)
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ERROR.ErrInvalidPriceLevel)
    }
  }

  end()
})

void test('it should append/remove orders from queue on SELL side', ({
  equal,
  end
}) => {
  const os = new StopSide(Side.SELL)
  // @ts-expect-error _prices is private
  equal(Object.keys(os._prices).length, 0)
  // @ts-expect-error _priceTree is private
  equal(os._priceTree.length, 0)
  {
    const order = OrderFactory.createOrder({
      type: OrderType.STOP_LIMIT,
      id: 'order1',
      side: Side.SELL,
      size: 5,
      price: 10,
      timeInForce: TimeInForce.GTC,
      isMaker: true,
      stopPrice: 10
    })
    os.append(order)
    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 1)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 1)
  }

  {
    const order = OrderFactory.createOrder({
      type: OrderType.STOP_LIMIT,
      id: 'order2',
      side: Side.SELL,
      size: 5,
      price: 10,
      timeInForce: TimeInForce.GTC,
      isMaker: true,
      stopPrice: 10 // same stopPrice as before, so same price level
    })
    os.append(order)
    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 1)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 1)
  }

  {
    const order = OrderFactory.createOrder({
      type: OrderType.STOP_MARKET,
      side: Side.SELL,
      size: 5,
      stopPrice: 20,
      timeInForce: TimeInForce.GTC,
      isMaker: true
    })

    os.append(order)
    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 2)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 2)
  }

  // @ts-expect-error _priceTree is private property
  os._priceTree.values.reduce((previousPrice, curr) => {
    // SELL side are in ascending order lower to bigger
    // @ts-expect-error _price is private property
    const currPrice = curr._price
    equal(currPrice > previousPrice, true)
    return currPrice
  }, 0)

  {
    // Remove the first order
    const response = os.remove('order1', 10)

    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 2)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 2)
    equal(response?.id, 'order1')
  }

  {
    // Try to remove the same order already deleted
    const response = os.remove('order1', 10)
    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 2)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 2)
    equal(response, undefined)
  }

  {
    // Remove the second order order, so the price level is empty
    const response = os.remove('order2', 10)

    // @ts-expect-error _prices is private
    equal(Object.keys(os._prices).length, 1)
    // @ts-expect-error _priceTree is private
    equal(os._priceTree.length, 1)
    equal(response?.id, 'order2')
  }

  // Test for error when price level not exists
  try {
    // order1 has been replaced whit updateOrder, so trying to update order1 will throw an error of type ErrInvalidPriceLevel
    os.remove('some-id', 100)
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ERROR.ErrInvalidPriceLevel)
    }
  }

  end()
})

void test('it should find all queue between upper and lower bound', ({
  equal,
  end
}) => {
  const appenOrder = (orderId: string, stopPrice: number, side, os: StopSide): void => {
    const order = OrderFactory.createOrder({
      type: OrderType.STOP_LIMIT,
      id: orderId,
      side,
      size: 5,
      price: 10,
      timeInForce: TimeInForce.GTC,
      isMaker: true,
      stopPrice
    })
    os.append(order)
  }

  {
    const side = Side.BUY
    const os = new StopSide(side)
    appenOrder('order1', 10, side, os)
    appenOrder('order1-1', 19.5, side, os)
    appenOrder('order2', 20, side, os)
    appenOrder('order2-1', 20, side, os)
    appenOrder('order2-3', 20, side, os)
    appenOrder('order3', 30, side, os)
    appenOrder('order4', 40, side, os)
    appenOrder('order4-1', 40, side, os)
    appenOrder('order4-2', 40.5, side, os)
    appenOrder('order5', 50, side, os)

    {
      const response = os.between(40, 20)

      response.forEach((queue) => {
        // @ts-expect-error _price is private
        equal(queue._price <= 40, true)
        // @ts-expect-error _price is private
        equal(queue._price >= 20, true)
      })
    }

    {
      const response = os.between(20, 40)
      response.forEach((queue) => {
        // @ts-expect-error _price is private
        equal(queue._price <= 40, true)
        // @ts-expect-error _price is private
        equal(queue._price >= 20, true)
      })
    }
  }

  {
    const side = Side.SELL
    const os = new StopSide(side)
    appenOrder('order1', 10, side, os)
    appenOrder('order1-1', 19.5, side, os)
    appenOrder('order2', 20, side, os)
    appenOrder('order2-1', 20, side, os)
    appenOrder('order2-3', 20, side, os)
    appenOrder('order3', 30, side, os)
    appenOrder('order4', 40, side, os)
    appenOrder('order4-1', 40, side, os)
    appenOrder('order4-2', 40.5, side, os)
    appenOrder('order5', 50, side, os)

    {
      const response = os.between(40, 20)

      response.forEach((queue) => {
        // @ts-expect-error _price is private
        equal(queue._price <= 40, true)
        // @ts-expect-error _price is private
        equal(queue._price >= 20, true)
      })
    }

    {
      const response = os.between(20, 40)
      response.forEach((queue) => {
        // @ts-expect-error _price is private
        equal(queue._price <= 40, true)
        // @ts-expect-error _price is private
        equal(queue._price >= 20, true)
      })
    }
  }

  end()
})
