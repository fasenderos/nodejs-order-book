import BigNumber from 'bignumber.js'
import { test } from 'tap'
import { Order } from '../src/order'
import { Side } from '../src/side'
import { OrderSide } from '../src/orderside'
import { ERROR } from '../src/errors'

void test('it should append/update/remove orders from queue on BUY side', ({
  equal,
  same,
  end
}) => {
  const os = new OrderSide(Side.BUY)
  const order1 = new Order('order1', Side.BUY, new BigNumber(5), 10)
  const order2 = new Order('order2', Side.BUY, new BigNumber(5), 20)

  equal(os.minPriceQueue() === undefined, true)
  equal(os.maxPriceQueue() === undefined, true)

  os.append(order1)
  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.volume().toNumber(), 5)
  equal(os.total().toNumber(), order1.price * order1.size.toNumber())
  equal(os.priceTree().length, 1)

  os.append(order2)
  equal(os.depth(), 2)
  equal(os.volume().toNumber(), 10)
  equal(os.total().toNumber(), order1.price * order1.size.toNumber() + order2.price * order2.size.toNumber())
  equal(os.len(), 2)
  equal(os.priceTree().length, 2)
  same(os.orders()[0], order1)
  same(os.orders()[1], order2)

  equal(os.lowerThan(21)?.price(), 20)
  equal(os.lowerThan(19)?.price(), 10)
  equal(os.lowerThan(9) === undefined, true)

  equal(os.greaterThan(9)?.price(), 10)
  equal(os.greaterThan(19)?.price(), 20)
  equal(os.greaterThan(21) === undefined, true)

  equal(os.toString(), '\n20 -> 5\n10 -> 5')

  os.update(order1, { side: order1.side, size: 10, price: order1.price })

  equal(os.volume().toNumber(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  same(os.orders()[0], { ...order1, size: 10 })
  same(os.orders()[1], order2)
  equal(os.toString(), '\n20 -> 5\n10 -> 10')

  // When price is updated a new order will be created, so we can't match entire object, only properties
  // Update price of order1 < price order2
  let updatedOrder = os.update(order1, {
    side: order1.side,
    size: 10,
    price: 15
  })
  equal(os.volume().toNumber(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  let updateOrder1 = os.orders()[0]
  equal(updateOrder1.size.toNumber(), 10)
  equal(updateOrder1.price, 15)
  same(os.orders()[1], order2)
  equal(os.toString(), '\n20 -> 5\n15 -> 10')

  // Test for error when price level not exists
  try {
    // order1 has been replaced whit updateOrder, so trying to update order1 will throw an error of type ErrInvalidPriceLevel
    os.update(order1, {
      side: order1.side,
      size: 10,
      price: 20
    })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ERROR.ErrInvalidPriceLevel)
    }
  }

  // Update price of order1 == price order2
  // we have to type ignore here because we don't want to pass the size,
  // so the size from the oldOrder will be used instead
  // @ts-expect-error
  updatedOrder = os.update(updatedOrder as Order, {
    side: order1.side,
    // size: 10,
    price: 20
  })
  equal(os.volume().toNumber(), 15)
  equal(os.depth(), 1)
  equal(os.len(), 2)
  same(os.orders()[0], order2)
  updateOrder1 = os.orders()[1]
  equal(updateOrder1.size.toNumber(), 10)
  equal(updateOrder1.price, 20)
  equal(os.toString(), '\n20 -> 15')

  // Update price of order1 > price order2
  updatedOrder = os.update(updatedOrder as Order, {
    side: order1.side,
    size: 10,
    price: 25
  })
  equal(os.volume().toNumber(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  same(os.orders()[0], order2)
  updateOrder1 = os.orders()[1]
  equal(updateOrder1.size.toNumber(), 10)
  equal(updateOrder1.price, 25)
  equal(os.toString(), '\n25 -> 10\n20 -> 5')

  // Remove the updated order
  os.remove(updatedOrder as Order)

  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.depth(), 1)
  equal(os.volume().toNumber(), 5)
  equal(os.len(), 1)
  same(os.orders()[0], order2)

  equal(os.toString(), '\n20 -> 5')

  // Remove the remaining order
  os.remove(order2)

  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.depth(), 0)
  equal(os.volume().toNumber(), 0)
  equal(os.len(), 0)
  equal(os.toString(), '')

  end()
})
void test('it should append/update/remove orders from queue on SELL side', ({
  equal,
  same,
  end
}) => {
  const os = new OrderSide(Side.SELL)
  const order1 = new Order('order1', Side.SELL, new BigNumber(5), 10)
  const order2 = new Order('order2', Side.SELL, new BigNumber(5), 20)

  equal(os.minPriceQueue() === undefined, true)
  equal(os.maxPriceQueue() === undefined, true)

  os.append(order1)

  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.volume().toNumber(), 5)
  equal(os.total().toNumber(), order1.price * order1.size.toNumber())
  equal(os.priceTree().length, 1)

  os.append(order2)
  equal(os.depth(), 2)
  equal(os.volume().toNumber(), 10)
  equal(os.total().toNumber(), order1.price * order1.size.toNumber() + order2.price * order2.size.toNumber())
  equal(os.len(), 2)
  equal(os.priceTree().length, 2)
  same(os.orders()[0], order1)
  same(os.orders()[1], order2)

  equal(os.lowerThan(21)?.price(), 20)
  equal(os.lowerThan(19)?.price(), 10)
  equal(os.lowerThan(9) === undefined, true)

  equal(os.greaterThan(9)?.price(), 10)
  equal(os.greaterThan(19)?.price(), 20)
  equal(os.greaterThan(21) === undefined, true)

  equal(os.toString(), '\n20 -> 5\n10 -> 5')

  os.update(order1, { side: order1.side, size: 10, price: order1.price })

  equal(os.volume().toNumber(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  same(os.orders()[0], { ...order1, size: 10 })
  same(os.orders()[1], order2)
  equal(os.toString(), '\n20 -> 5\n10 -> 10')

  // When price is updated a new order will be created, so we can't match entire object, only properties
  // Update price of order1 < price order2
  let updatedOrder = os.update(order1, {
    side: order1.side,
    size: 10,
    price: 15
  })
  equal(os.volume().toNumber(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  let updateOrder1 = os.orders()[0]
  equal(updateOrder1.size.toNumber(), 10)
  equal(updateOrder1.price, 15)
  same(os.orders()[1], order2)
  equal(os.toString(), '\n20 -> 5\n15 -> 10')

  // Test for error when price level not exists
  try {
    // order1 has been replaced whit updateOrder, so trying to update order1 will throw an error of type ErrInvalidPriceLevel
    os.update(order1, {
      side: order1.side,
      size: 10,
      price: 20
    })
  } catch (error) {
    if (error instanceof Error) {
      // TypeScript knows err is Error
      equal(error?.message, ERROR.ErrInvalidPriceLevel)
    }
  }

  // Update price of order1 == price order2
  // we have to type ignore here because we don't want to pass the size,
  // so the size from the oldOrder will be used instead
  // @ts-expect-error
  updatedOrder = os.update(updatedOrder as Order, {
    side: order1.side,
    // size: 10,
    price: 20
  })
  equal(os.volume().toNumber(), 15)
  equal(os.depth(), 1)
  equal(os.len(), 2)
  same(os.orders()[0], order2)
  updateOrder1 = os.orders()[1]
  equal(updateOrder1.size.toNumber(), 10)
  equal(updateOrder1.price, 20)
  equal(os.toString(), '\n20 -> 15')

  // Update price of order1 > price order2
  updatedOrder = os.update(updatedOrder as Order, {
    side: order1.side,
    size: 10,
    price: 25
  })
  equal(os.volume().toNumber(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  same(os.orders()[0], order2)
  updateOrder1 = os.orders()[1]
  equal(updateOrder1.size.toNumber(), 10)
  equal(updateOrder1.price, 25)
  equal(os.toString(), '\n25 -> 10\n20 -> 5')

  // Remove the updated order
  os.remove(updatedOrder as Order)

  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.depth(), 1)
  equal(os.volume().toNumber(), 5)
  equal(os.len(), 1)
  same(os.orders()[0], order2)

  equal(os.toString(), '\n20 -> 5')

  // Remove the remaining order
  os.remove(order2)

  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.depth(), 0)
  equal(os.volume().toNumber(), 0)
  equal(os.len(), 0)
  equal(os.toString(), '')
  end()
})
