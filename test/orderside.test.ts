import { Order } from '../src/order'
import { Side } from '../src/side'
import { OrderSide } from '../src/orderside'

describe('OrderSide', () => {
  test('it should append/update/remove orders from queue', () => {
    const os = new OrderSide()
    const order1 = new Order('order1', Side.SELL, 5, 10)
    const order2 = new Order('order2', Side.SELL, 5, 20)

    expect(os.minPriceQueue()).toBeUndefined()
    expect(os.maxPriceQueue()).toBeUndefined()

    os.append(order1)

    expect(os.maxPriceQueue()).toBe(os.minPriceQueue())
    expect(os.volume()).toBe(5)

    os.append(order2)

    expect(os.depth()).toBe(2)
    expect(os.volume()).toBe(10)
    expect(os.len()).toBe(2)
    expect(os.orders()[0]).toMatchObject(order1)
    expect(os.orders()[1]).toMatchObject(order2)

    expect(os.lessThan(21)?.price()).toBe(20)
    expect(os.lessThan(19)?.price()).toBe(10)
    expect(os.lessThan(9)).toBeUndefined()

    expect(os.greaterThan(9)?.price()).toBe(10)
    expect(os.greaterThan(19)?.price()).toBe(20)
    expect(os.greaterThan(21)).toBeUndefined()

    expect(os.toString()).toBe(`\n20 -> 5\n10 -> 5`)

    os.remove(order1)

    expect(os.maxPriceQueue()).toBe(os.minPriceQueue())
    expect(os.volume()).toBe(5)
    expect(os.len()).toBe(1)
    expect(os.orders()[0]).toMatchObject(order2)

    expect(os.toString()).toBe(`\n20 -> 5`)
  })
})
