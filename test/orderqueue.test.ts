import { test } from 'tap'
import { LimitOrder, OrderFactory } from '../src/order'
import { OrderQueue } from '../src/orderqueue'
import { OrderType, Side, TimeInForce } from '../src/types'

void test('it should append/update/remove orders from queue', ({
  equal,
  same,
  end
}) => {
  const price = 100
  const oq = new OrderQueue(price)
  const order1 = OrderFactory.createOrder({
    type: OrderType.LIMIT,
    id: 'order1',
    side: Side.SELL,
    size: 5,
    price,
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
    price,
    origSize: 5,
    timeInForce: TimeInForce.GTC,
    makerQty: 5,
    takerQty: 0
  })

  const head = oq.append(order1)
  const tail = oq.append(order2)

  equal(head instanceof LimitOrder, true)
  equal(tail instanceof LimitOrder, true)
  same(head, order1)
  same(tail, order2)
  equal(oq.volume(), 10)
  equal(oq.len(), 2)
  equal(oq.price(), price)
  const orders = oq.toArray()
  same(orders[0].toObject(), order1.toObject())
  same(orders[1].toObject(), order2.toObject())

  const order3 = OrderFactory.createOrder({
    type: OrderType.LIMIT,
    id: 'order3',
    side: Side.SELL,
    size: 10,
    price,
    origSize: 10,
    timeInForce: TimeInForce.GTC,
    makerQty: 10,
    takerQty: 0
  })

  // Test update. Number of orders is always 2
  oq.update(head, order3)

  equal(oq.volume(), 15)
  equal(oq.len(), 2)

  const head2 = oq.head()
  const tail2 = oq.tail()
  same(head2, order3)
  same(tail2, order2)

  oq.remove(order3)

  // order2 is head and tail
  const head3 = oq.head()
  const tail3 = oq.tail()
  equal(oq.len(), 1)
  equal(oq.volume(), 5)
  same(head3, order2)
  same(tail3, order2)
  end()
})

void test('it should update order size and the volume', ({ equal, end }) => {
  const price = 100
  const oq = new OrderQueue(price)
  const order1 = OrderFactory.createOrder({
    type: OrderType.LIMIT,
    id: 'order1',
    side: Side.SELL,
    size: 5,
    price,
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
    price,
    origSize: 5,
    timeInForce: TimeInForce.GTC,
    makerQty: 5,
    takerQty: 0
  })

  oq.append(order1)
  oq.append(order2)

  equal(oq.volume(), 10)

  const newSize = 10
  oq.updateOrderSize(order1, newSize)

  equal(oq.volume(), 15)
  equal(order1.size, newSize)
  // Original size should not be changed
  equal(order1.origSize, 5)
  end()
})
