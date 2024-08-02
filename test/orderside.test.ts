import { test } from 'tap'
import { OrderFactory } from '../src/order'
import { OrderSide } from '../src/orderside'
import { ErrorCodes, ErrorMessages } from '../src/errors'
import { OrderType, Side, TimeInForce } from '../src/types'

void test('it should append/update/remove orders from queue on BUY side', ({
  equal,
  same,
  end
}) => {
  const os = new OrderSide(Side.BUY)
  const order1 = OrderFactory.createOrder({
    type: OrderType.LIMIT,
    id: 'order1',
    side: Side.BUY,
    size: 5,
    price: 10,
    origSize: 5,
    timeInForce: TimeInForce.GTC,
    makerQty: 5,
    takerQty: 0
  })
  const order2 = OrderFactory.createOrder({
    type: OrderType.LIMIT,
    id: 'order2',
    side: Side.BUY,
    size: 5,
    price: 20,
    origSize: 5,
    timeInForce: TimeInForce.GTC,
    makerQty: 5,
    takerQty: 0
  })

  equal(os.minPriceQueue() === undefined, true)
  equal(os.maxPriceQueue() === undefined, true)

  os.append(order1)
  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.volume(), 5)
  equal(os.total(), order1.price * order1.size)
  equal(os.priceTree().length, 1)

  os.append(order2)
  equal(os.depth(), 2)
  equal(os.volume(), 10)
  equal(os.total(), order1.price * order1.size + order2.price * order2.size)
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

  // Update order size and passing a price
  os.updateOrderSize(order1, {
    size: 10,
    price: order1.price
  })

  equal(os.volume(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  same(os.orders()[0], { ...order1, size: 10 })
  same(os.orders()[1], order2)
  equal(os.toString(), '\n20 -> 5\n10 -> 10')

  // Update order size without passing price, so the old order price will be used
  os.updateOrderSize(order1, { size: 5 })

  equal(os.volume(), 10)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  same(os.orders()[0], { ...order1, size: 5 })
  same(os.orders()[1], order2)
  equal(os.toString(), '\n20 -> 5\n10 -> 5')

  // When price is updated a new order will be created, so we can't match entire object, only properties
  // Update price of order1 < price order2
  let updatedOrder = os.updateOrderPrice(order1, {
    size: 10,
    price: 15
  })
  equal(os.volume(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  let updateOrder1 = os.orders()[0]
  equal(updateOrder1.size, 10)
  equal(updateOrder1.price, 15)
  same(os.orders()[1], order2)
  equal(os.toString(), '\n20 -> 5\n15 -> 10')

  // Test for error when price level not exists
  try {
    // order1 has been replaced whit updateOrder, so trying to update order1 will throw an error of type INVALID_PRICE_LEVEL
    os.updateOrderPrice(order1, {
      size: 10,
      price: 20
    })
  } catch (error) {
    equal(error?.message, ErrorMessages.INVALID_PRICE_LEVEL)
    equal(error?.code, ErrorCodes.INVALID_PRICE_LEVEL)
  }

  // Update price of order1 == price order2, without providind size (the original order size is used)
  // we have to type ignore here because we don't want to pass the size,
  // so the size from the oldOrder will be used instead
  updatedOrder = os.updateOrderPrice(updatedOrder, {
    price: 20
  })
  equal(os.volume(), 15)
  equal(os.depth(), 1)
  equal(os.len(), 2)
  same(os.orders()[0], order2)
  updateOrder1 = os.orders()[1]
  equal(updateOrder1.size, 10)
  equal(updateOrder1.price, 20)
  equal(os.toString(), '\n20 -> 15')

  // Update price of order1 > price order2
  updatedOrder = os.updateOrderPrice(updatedOrder, {
    size: 10,
    price: 25
  })
  equal(os.volume(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  same(os.orders()[0], order2)
  updateOrder1 = os.orders()[1]
  equal(updateOrder1.size, 10)
  equal(updateOrder1.price, 25)
  equal(os.toString(), '\n25 -> 10\n20 -> 5')

  // @ts-expect-error _priceTree is private property
  os._priceTree.values.reduce((previousPrice, curr) => {
    // BUY side are in descending order bigger to lower
    // @ts-expect-error _price is private property
    const currPrice = curr._price
    equal(currPrice < previousPrice, true)
    return currPrice
  }, Infinity)

  // Remove the updated order
  os.remove(updatedOrder)

  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.depth(), 1)
  equal(os.volume(), 5)
  equal(os.len(), 1)
  same(os.orders()[0], order2)

  equal(os.toString(), '\n20 -> 5')

  // Remove the remaining order
  os.remove(order2)

  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.depth(), 0)
  equal(os.volume(), 0)
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
  const order1 = OrderFactory.createOrder({
    type: OrderType.LIMIT,
    id: 'order1',
    side: Side.SELL,
    size: 5,
    price: 10,
    origSize: 5,
    timeInForce: TimeInForce.GTC,
    makerQty: 5,
    takerQty: 0
  })
  const order2 = OrderFactory.createOrder({
    type: OrderType.LIMIT,
    id: 'order2',
    side: Side.SELL,
    size: 5,
    price: 20,
    origSize: 5,
    timeInForce: TimeInForce.GTC,
    makerQty: 5,
    takerQty: 0
  })

  equal(os.minPriceQueue() === undefined, true)
  equal(os.maxPriceQueue() === undefined, true)

  os.append(order1)

  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.volume(), 5)
  equal(os.total(), order1.price * order1.size)
  equal(os.priceTree().length, 1)

  os.append(order2)
  equal(os.depth(), 2)
  equal(os.volume(), 10)
  equal(os.total(), order1.price * order1.size + order2.price * order2.size)
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

  // Update order size and passing a price
  os.updateOrderSize(order1, {
    size: 10,
    price: order1.price
  })

  equal(os.volume(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  same(os.orders()[0], { ...order1, size: 10 })
  same(os.orders()[1], order2)
  equal(os.toString(), '\n20 -> 5\n10 -> 10')

  // When price is updated a new order will be created, so we can't match entire object, only properties
  // Update price of order1 < price order2
  let updatedOrder = os.updateOrderPrice(order1, {
    size: 10,
    price: 15
  })
  equal(os.volume(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  let updateOrder1 = os.orders()[0]
  equal(updateOrder1.size, 10)
  equal(updateOrder1.price, 15)
  same(os.orders()[1], order2)
  equal(os.toString(), '\n20 -> 5\n15 -> 10')

  // Test for error when price level not exists
  try {
    // order1 has been replaced whit updateOrder, so trying to update order1 will throw an error of type INVALID_PRICE_LEVEL
    os.updateOrderPrice(order1, {
      size: 10,
      price: 20
    })
  } catch (error) {
    equal(error?.message, ErrorMessages.INVALID_PRICE_LEVEL)
    equal(error?.code, ErrorCodes.INVALID_PRICE_LEVEL)
  }

  // Update price of order1 == price order2
  // we have to type ignore here because we don't want to pass the size,
  // so the size from the oldOrder will be used instead
  updatedOrder = os.updateOrderPrice(updatedOrder, {
    size: updatedOrder.size,
    price: 20
  })
  equal(os.volume(), 15)
  equal(os.depth(), 1)
  equal(os.len(), 2)
  same(os.orders()[0], order2)
  updateOrder1 = os.orders()[1]
  equal(updateOrder1.size, 10)
  equal(updateOrder1.price, 20)
  equal(os.toString(), '\n20 -> 15')

  // Update price of order1 > price order2
  updatedOrder = os.updateOrderPrice(updatedOrder, {
    size: 10,
    price: 25
  })
  equal(os.volume(), 15)
  equal(os.depth(), 2)
  equal(os.len(), 2)
  same(os.orders()[0], order2)
  updateOrder1 = os.orders()[1]
  equal(updateOrder1.size, 10)
  equal(updateOrder1.price, 25)
  equal(os.toString(), '\n25 -> 10\n20 -> 5')

  // @ts-expect-error _priceTree is private property
  os._priceTree.values.reduce((previousPrice, curr) => {
    // SELL side are in ascending order lower to bigger
    // @ts-expect-error _price is private property
    const currPrice = curr._price
    equal(currPrice > previousPrice, true)
    return currPrice
  }, 0)

  // Remove the updated order
  os.remove(updatedOrder)

  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.depth(), 1)
  equal(os.volume(), 5)
  equal(os.len(), 1)
  same(os.orders()[0], order2)

  equal(os.toString(), '\n20 -> 5')

  // Remove the remaining order
  os.remove(order2)

  equal(os.maxPriceQueue(), os.minPriceQueue())
  equal(os.depth(), 0)
  equal(os.volume(), 0)
  equal(os.len(), 0)
  equal(os.toString(), '')
  end()
})
