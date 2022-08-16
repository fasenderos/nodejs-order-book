import { Order } from '../src/order'
import { Side } from '../src/side'
import { OrderQueue } from '../src/orderqueue'

describe('OrderQueue', () => {
  test('it should append/update/remove orders from queue', () => {
    const price = 100
    const oq = new OrderQueue(price)
    const order1 = new Order('order1', Side.SELL, 5, price)
    const order2 = new Order('order2', Side.SELL, 5, price)

    const head = oq.append(order1)
    const tail = oq.append(order2)

    expect(head).toBeInstanceOf(Order)
    expect(tail).toBeInstanceOf(Order)
    expect(head).toMatchObject(order1)
    expect(tail).toMatchObject(order2)
    expect(oq.volume()).toBe(10)
    expect(oq.len()).toBe(2)
    expect(oq.price()).toBe(price)
    expect(oq.toArray()[0]).toMatchObject(order1.toObject())
    expect(oq.toArray()[1]).toMatchObject(order2.toObject())

    const order3 = new Order('order3', Side.SELL, 10, price)

    // Test update. Number of orders is always 2
    oq.update(head, order3)

    expect(oq.volume()).toBe(15)
    expect(oq.len()).toBe(2)

    const head2 = oq.head()
    const tail2 = oq.tail()
    expect(head2).toMatchObject(order3)
    expect(tail2).toMatchObject(order2)

    oq.remove(order3)

    // order2 is head and tail
    const head3 = oq.head()
    const tail3 = oq.tail()
    expect(oq.len()).toBe(1)
    expect(oq.volume()).toBe(5)
    expect(head3).toMatchObject(order2)
    expect(tail3).toMatchObject(order2)
  })

  test('it should update order size and the volume', () => {
    const price = 100
    const oq = new OrderQueue(price)
    const order1 = new Order('order1', Side.SELL, 5, price)
    const order2 = new Order('order2', Side.SELL, 5, price)

    oq.append(order1)
    oq.append(order2)

    expect(oq.volume()).toBe(10)

    const newSize = 10
    oq.updateOrderSize(order1, newSize)

    expect(oq.volume()).toBe(15)
    expect(order1.size).toBe(newSize)
  })
})
