import { test } from 'tap'
import { randomUUID } from 'node:crypto'
import {
  LimitOrder,
  OrderFactory,
  StopLimitOrder,
  StopMarketOrder
} from '../src/order'
import { OrderType, Side, TimeInForce } from '../src/types'
import { ErrorCodes, ErrorMessages } from '../src/errors'

void test('it should create LimitOrder', ({ equal, same, end }) => {
  const id = 'fakeId'
  const side = Side.BUY
  const type = OrderType.LIMIT
  const size = 5
  const price = 100
  const time = Date.now()
  const timeInForce = TimeInForce.IOC

  {
    const order = OrderFactory.createOrder({
      id,
      type,
      side,
      size,
      price,
      origSize: size,
      time,
      timeInForce,
      makerQty: size,
      takerQty: 0
    })

    equal(order instanceof LimitOrder, true)
    equal(order.id, id)
    equal(order.type, type)
    equal(order.side, side)
    equal(order.size, size)
    equal(order.origSize, size)
    equal(order.price, price)
    equal(order.time, time)
    equal(order.timeInForce, timeInForce)
    equal(order.makerQty, size)
    equal(order.takerQty, 0)
    equal(order.ocoStopPrice, undefined)
    same(order.toObject(), {
      id,
      type,
      side,
      size,
      origSize: size,
      price,
      time,
      timeInForce,
      makerQty: size,
      takerQty: 0
    })
    equal(
      order.toString(),
      `${id}:
    type: ${type}
    side: ${side}
    size: ${size}
    origSize: ${size}
    price: ${price}
    time: ${time}
    timeInForce: ${timeInForce}
    makerQty: ${size}
    takerQty: 0`
    )
    equal(
      order.toJSON(),
      JSON.stringify({
        id,
        type,
        side,
        size,
        origSize: size,
        price,
        time,
        timeInForce,
        makerQty: size,
        takerQty: 0
      })
    )
  }

  {
    // Limit Order with ocoStopPrice
    const ocoStopPrice = 10
    const order = OrderFactory.createOrder({
      id,
      type,
      side,
      size,
      price,
      origSize: size,
      time,
      timeInForce,
      makerQty: size,
      takerQty: 0,
      ocoStopPrice
    })
    equal(order instanceof LimitOrder, true)
    equal(order.id, id)
    equal(order.type, type)
    equal(order.side, side)
    equal(order.size, size)
    equal(order.origSize, size)
    equal(order.price, price)
    equal(order.time, time)
    equal(order.timeInForce, timeInForce)
    equal(order.makerQty, size)
    equal(order.takerQty, 0)
    equal(order.ocoStopPrice, ocoStopPrice)
    same(order.toObject(), {
      id,
      type,
      side,
      size,
      origSize: size,
      price,
      time,
      timeInForce,
      makerQty: size,
      takerQty: 0
    })
    equal(
      order.toString(),
      `${id}:
    type: ${type}
    side: ${side}
    size: ${size}
    origSize: ${size}
    price: ${price}
    time: ${time}
    timeInForce: ${timeInForce}
    makerQty: ${size}
    takerQty: 0`
    )
    equal(
      order.toJSON(),
      JSON.stringify({
        id,
        type,
        side,
        size,
        origSize: size,
        price,
        time,
        timeInForce,
        makerQty: size,
        takerQty: 0
      })
    )
  }
  end()
})

void test('it should create StopMarketOrder', ({ equal, same, end }) => {
  const id = 'fakeId'
  const side = Side.BUY
  const type = OrderType.STOP_MARKET
  const size = 5
  const stopPrice = 4
  const time = Date.now()
  const order = OrderFactory.createOrder({
    id,
    type,
    side,
    size,
    time,
    stopPrice
  })

  equal(order instanceof StopMarketOrder, true)
  equal(order.id, id)
  equal(order.type, type)
  equal(order.side, side)
  equal(order.size, size)
  equal(order.stopPrice, stopPrice)
  equal(order.time, time)
  same(order.toObject(), {
    id,
    type,
    side,
    size,
    stopPrice,
    time
  })
  equal(
    order.toString(),
    `${id}:
    type: ${type}
    side: ${side}
    size: ${size}
    stopPrice: ${stopPrice}
    time: ${time}`
  )
  equal(
    order.toJSON(),
    JSON.stringify({
      id,
      type,
      side,
      size,
      stopPrice,
      time
    })
  )
  end()
})

void test('it should create StopLimitOrder', ({ equal, same, end }) => {
  const id = 'fakeId'
  const side = Side.BUY
  const type = OrderType.STOP_LIMIT
  const size = 5
  const price = 100
  const stopPrice = 4
  const time = Date.now()
  const timeInForce = TimeInForce.IOC
  {
    const order = OrderFactory.createOrder({
      id,
      type,
      side,
      size,
      price,
      time,
      stopPrice,
      timeInForce
    })

    equal(order instanceof StopLimitOrder, true)
    equal(order.id, id)
    equal(order.type, type)
    equal(order.side, side)
    equal(order.size, size)
    equal(order.price, price)
    equal(order.stopPrice, stopPrice)
    equal(order.timeInForce, timeInForce)
    equal(order.time, time)
    equal(order.isOCO, false)
    same(order.toObject(), {
      id,
      type,
      side,
      size,
      price,
      stopPrice,
      timeInForce,
      time
    })
    equal(
      order.toString(),
      `${id}:
    type: ${type}
    side: ${side}
    size: ${size}
    price: ${price}
    stopPrice: ${stopPrice}
    timeInForce: ${timeInForce}
    time: ${time}`
    )
    equal(
      order.toJSON(),
      JSON.stringify({
        id,
        type,
        side,
        size,
        price,
        stopPrice,
        timeInForce,
        time
      })
    )
    // Price setter
    const newPrice = 120
    order.price = newPrice
    equal(order.price, newPrice)
  }

  {
    // Stop Limit Order created by OCO order
    const order = OrderFactory.createOrder({
      id,
      type,
      side,
      size,
      price,
      time,
      stopPrice,
      timeInForce,
      isOCO: true
    })

    equal(order instanceof StopLimitOrder, true)
    equal(order.id, id)
    equal(order.type, type)
    equal(order.side, side)
    equal(order.size, size)
    equal(order.price, price)
    equal(order.stopPrice, stopPrice)
    equal(order.timeInForce, timeInForce)
    equal(order.time, time)
    equal(order.isOCO, true)
    same(order.toObject(), {
      id,
      type,
      side,
      size,
      price,
      stopPrice,
      timeInForce,
      time
    })
    equal(
      order.toString(),
      `${id}:
    type: ${type}
    side: ${side}
    size: ${size}
    price: ${price}
    stopPrice: ${stopPrice}
    timeInForce: ${timeInForce}
    time: ${time}`
    )
    equal(
      order.toJSON(),
      JSON.stringify({
        id,
        type,
        side,
        size,
        price,
        stopPrice,
        timeInForce,
        time
      })
    )
    // Price setter
    const newPrice = 120
    order.price = newPrice
    equal(order.price, newPrice)
  }
  end()
})

void test('it should create order without passing a date or id', ({
  equal,
  end,
  teardown,
  same
}) => {
  const fakeTimestamp = 1487076708000
  const fakeId = 'some-uuid'
  const { now } = Date
  const originalRandomUUID = randomUUID

  teardown(() => (Date.now = now))
  // @ts-expect-error cannot assign because is readonly
  // eslint-disable-next-line
  teardown(() => (randomUUID = originalRandomUUID));

  Date.now = (...m) => fakeTimestamp
  // @ts-expect-error cannot assign because is readonly
  // eslint-disable-next-line
  randomUUID = () => fakeId;

  const type = OrderType.STOP_MARKET
  const side = Side.BUY
  const size = 5
  const stopPrice = 4
  const order = OrderFactory.createOrder({
    type,
    side,
    size,
    stopPrice
  })
  equal(order.id, fakeId)
  equal(order.time, fakeTimestamp)
  same(order.toObject(), {
    id: fakeId,
    type,
    side,
    size,
    stopPrice,
    time: fakeTimestamp
  })
  equal(
    order.toString(),
    `${fakeId}:
    type: ${type}
    side: ${side}
    size: ${size}
    stopPrice: ${stopPrice}
    time: ${fakeTimestamp}`
  )

  equal(
    order.toJSON(),
    JSON.stringify({
      id: fakeId,
      type,
      side,
      size,
      stopPrice,
      time: fakeTimestamp
    })
  )
  end()
})

void test('test orders setters', (t) => {
  const type = OrderType.LIMIT
  const id = 'fakeId'
  const side = Side.BUY
  const size = 5
  const price = 100
  const time = Date.now()
  const timeInForce = TimeInForce.GTC
  const order = OrderFactory.createOrder({
    type,
    id,
    side,
    size,
    price,
    origSize: size,
    time,
    timeInForce,
    makerQty: size,
    takerQty: 0
  })

  // Price setter
  const newPrice = 300
  order.price = newPrice
  t.equal(order.price, newPrice)

  // Size setter
  const newSize = 40
  order.size = newSize
  t.equal(order.size, newSize)

  // Time setter
  const newTime = Date.now()
  order.time = newTime
  t.equal(order.time, newTime)

  // Original size should not be changed
  t.equal(order.origSize, size)

  t.end()
})

void test('test invalid order type', (t) => {
  try {
    const id = 'fakeId'
    const side = Side.BUY
    const type = 'invalidOrderType'
    const size = 5
    const price = 100
    const time = Date.now()
    const timeInForce = TimeInForce.IOC
    OrderFactory.createOrder({
      id,
      // @ts-expect-error order type invalid
      type,
      side,
      size,
      price,
      time,
      timeInForce
    })
  } catch (error) {
    t.equal(error?.message, ErrorMessages.INVALID_ORDER_TYPE)
    t.equal(error?.code, ErrorCodes.INVALID_ORDER_TYPE)
  }
  t.end()
})
