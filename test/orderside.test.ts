import { Order } from '../src/order'
import { Side } from '../src/side'
import { OrderSide } from '../src/orderside'
import { ERROR } from '../src/errors'

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
    expect(os.total()).toBe(order1.price * order1.size)
    expect(os.priceTree().length).toBe(1)

    os.append(order2)
    expect(os.depth()).toBe(2)
    expect(os.volume()).toBe(10)
    expect(os.total()).toBe(
      order1.price * order1.size + order2.price * order2.size
    )
    expect(os.len()).toBe(2)
    expect(os.priceTree().length).toBe(2)
    expect(os.orders()[0]).toMatchObject(order1)
    expect(os.orders()[1]).toMatchObject(order2)

    expect(os.lowerThan(21)?.price()).toBe(20)
    expect(os.lowerThan(19)?.price()).toBe(10)
    expect(os.lowerThan(9)).toBeUndefined()

    expect(os.greaterThan(9)?.price()).toBe(10)
    expect(os.greaterThan(19)?.price()).toBe(20)
    expect(os.greaterThan(21)).toBeUndefined()

    expect(os.toString()).toBe(`\n20 -> 5\n10 -> 5`)

    os.update(order1, { side: order1.side, size: 10, price: order1.price })

    expect(os.volume()).toBe(15)
    expect(os.depth()).toBe(2)
    expect(os.len()).toBe(2)
    expect(os.orders()[0]).toMatchObject({ ...order1, size: 10 })
    expect(os.orders()[1]).toMatchObject(order2)
    expect(os.toString()).toBe(`\n20 -> 5\n10 -> 10`)

    // When price is updated a new order will be created so we can't match object, but the properties
    // Update price of order1 < price order2
    let updatedOrder = os.update(order1, {
      side: order1.side,
      size: 10,
      price: 15,
    })
    expect(os.volume()).toBe(15)
    expect(os.depth()).toBe(2)
    expect(os.len()).toBe(2)
    let updateOrder1 = os.orders()[0]
    expect(updateOrder1.size).toBe(10)
    expect(updateOrder1.price).toBe(15)
    expect(os.orders()[1]).toMatchObject(order2)
    expect(os.toString()).toBe(`\n20 -> 5\n15 -> 10`)

    // Test for error when price level not exists
    try {
      // order1 has ben replaced whit updateOrder, so trying to update order1 will throw an error of type ErrInvalidPriceLevel
      os.update(order1, {
        side: order1.side,
        size: 10,
        price: 20,
      })
    } catch (error) {
      if (error instanceof Error) {
        // TypeScript knows err is Error
        expect(error?.message).toBe(ERROR.ErrInvalidPriceLevel)
      }
    }

    // Update price of order1 == price order2
    // we have to type ignore here because we don't want to pass the size,
    // so the size from the oldOrder will be used instead
    // @ts-ignore
    updatedOrder = os.update(updatedOrder as Order, {
      side: order1.side,
      // size: 10,
      price: 20,
    })
    expect(os.volume()).toBe(15)
    expect(os.depth()).toBe(1)
    expect(os.len()).toBe(2)
    expect(os.orders()[0]).toMatchObject(order2)
    updateOrder1 = os.orders()[1]
    expect(updateOrder1.size).toBe(10)
    expect(updateOrder1.price).toBe(20)
    expect(os.toString()).toBe(`\n20 -> 15`)

    // Update price of order1 > price order2
    updatedOrder = os.update(updatedOrder as Order, {
      side: order1.side,
      size: 10,
      price: 25,
    })
    expect(os.volume()).toBe(15)
    expect(os.depth()).toBe(2)
    expect(os.len()).toBe(2)
    expect(os.orders()[0]).toMatchObject(order2)
    updateOrder1 = os.orders()[1]
    expect(updateOrder1.size).toBe(10)
    expect(updateOrder1.price).toBe(25)
    expect(os.toString()).toBe(`\n25 -> 10\n20 -> 5`)

    // Remove the updated order
    os.remove(updatedOrder as Order)

    expect(os.maxPriceQueue()).toBe(os.minPriceQueue())
    expect(os.depth()).toBe(1)
    expect(os.volume()).toBe(5)
    expect(os.len()).toBe(1)
    expect(os.orders()[0]).toMatchObject(order2)

    expect(os.toString()).toBe(`\n20 -> 5`)

    // Remove the remaining order
    os.remove(order2)

    expect(os.maxPriceQueue()).toBe(os.minPriceQueue())
    expect(os.depth()).toBe(0)
    expect(os.volume()).toBe(0)
    expect(os.len()).toBe(0)
    expect(os.toString()).toBe('')
  })
})
