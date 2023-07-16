import { Order } from '../src/order'
import { Side } from '../src/side'
import { test } from 'tap'

test('it should create order object', ({ equal, same, end }) => {
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
    isMaker: order.isMaker,
  })
  equal(
    order.toString(),
    `${id}:
    side: ${side}
    size: ${side}
    price: ${price}
    time: ${time}
    isMaker: ${false}`
  )
  equal(
    order.toJSON(),
    JSON.stringify({ id, side, size, price, time, isMaker: false })
  )
  end()
})

test('it should create order without passing a date', ({
  equal,
  end,
  teardown,
  same,
}) => {
  const fakeTimestamp = 1487076708000
  const { now } = Date
  // @ts-ignore
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
    isMaker: false,
  })
  equal(
    order.toString(),
    `${id}:
    side: ${side}
    size: ${side}
    price: ${price}
    time: ${fakeTimestamp}
    isMaker: ${false}`
  )

  equal(
    order.toJSON(),
    JSON.stringify({
      id,
      side,
      size,
      price,
      time: fakeTimestamp,
      isMaker: false,
    })
  )
  end()
})
