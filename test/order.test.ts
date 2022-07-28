import { Order } from '../src/order'
import { Side } from '../src/side'

describe('Order', () => {
  test('it should create order object', () => {
    const id = 'fakeId'
    const side = Side.BUY
    const size = 5
    const price = 100
    const time = Date.now()
    const order = new Order(id, side, size, price, time)

    expect(order).toBeInstanceOf(Order)
    expect(order.id).toBe(id)
    expect(order.side).toBe(side)
    expect(order.size).toBe(size)
    expect(order.price).toBe(price)
    expect(order.time).toBe(time)
    expect(order.toObject()).toMatchObject({ id, side, size, price, time })
    expect(order.toString()).toBe(
      `${id}:
    side: ${side}
    size: ${side}
    price: ${price}
    time: ${time}`
    )
    expect(order.toJSON()).toBe(JSON.stringify({ id, side, size, price, time }))
  })

  test('it should create order without passing a date', () => {
    const fakeTimestamp = 1487076708000
    const id = 'fakeId'
    const side = Side.BUY
    const size = 5
    const price = 100
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => fakeTimestamp)
    const order = new Order(id, side, size, price)

    expect(order).toBeInstanceOf(Order)
    expect(order.id).toBe(id)
    expect(order.side).toBe(side)
    expect(order.size).toBe(size)
    expect(order.price).toBe(price)
    expect(order.time).toBe(fakeTimestamp)
    expect(order.toObject()).toMatchObject({
      id,
      side,
      size,
      price,
      time: fakeTimestamp,
    })
    expect(order.toString()).toBe(
      `${id}:
    side: ${side}
    size: ${side}
    price: ${price}
    time: ${fakeTimestamp}`
    )

    expect(order.toJSON()).toBe(
      JSON.stringify({ id, side, size, price, time: fakeTimestamp })
    )
  })
})
