import { test } from 'tap'
import { Order } from '../src/order'
import { Side } from '../src/side'

void test('it should create order object', ({ equal, same, end }) => {
  const id = 'fakeId'
  const side = Side.BUY
  const size = 5
  const price = 100
  const time = Date.now()
  const order = new Order(id, side, size, price, time)

  equal(order instanceof Order, true)
  equal(order.id, id)
  equal(order.side, side)
  equal(order.size, size)
  equal(order.price, price)
  equal(order.time, time)
  equal(order.isMaker, false)
  same(order.toObject(), {
    id,
    side,
    size,
    price,
    time,
    isMaker: order.isMaker
  })
  equal(
    order.toString(),
    `${id}:
    side: ${side}
    size: ${size}
    price: ${price}
    time: ${time}
    isMaker: ${false as unknown as string}`
  )
  equal(
    order.toJSON(),
    JSON.stringify({ id, side, size, price, time, isMaker: false })
  )
  end()
})

void test('it should create order without passing a date', ({
  equal,
  end,
  teardown,
  same
}) => {
  const fakeTimestamp = 1487076708000
  const { now } = Date
  teardown(() => (Date.now = now))
  Date.now = (...m) => fakeTimestamp

  const id = 'fakeId'
  const side = Side.BUY
  const size = 5
  const price = 100
  const order = new Order(id, side, size, price)
  equal(order instanceof Order, true)
  equal(order.id, id)
  equal(order.side, side)
  equal(order.size, size)
  equal(order.price, price)
  equal(order.time, fakeTimestamp)
  equal(order.isMaker, false)
  same(order.toObject(), {
    id,
    side,
    size,
    price,
    time: fakeTimestamp,
    isMaker: false
  })
  equal(
    order.toString(),
    `${id}:
    side: ${side}
    size: ${size}
    price: ${price}
    time: ${fakeTimestamp}
    isMaker: ${false as unknown as string}`
  )

  equal(
    order.toJSON(),
    JSON.stringify({
      id,
      side,
      size,
      price,
      time: fakeTimestamp,
      isMaker: false
    })
  )
  end()
})

void test('test orders setters', (t) => {
  const id = 'fakeId'
  const side = Side.BUY
  const size = 5
  const price = 100
  const time = Date.now()
  const order = new Order(id, side, size, price, time)

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

  t.end()
})
