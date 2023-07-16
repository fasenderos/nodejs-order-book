import BigNumber from 'bignumber.js'
import { test } from 'tap'
import { Order } from '../src/order'
import { Side } from '../src/side'
import { OrderQueue } from '../src/orderqueue'

void test('it should append/update/remove orders from queue', ({
  equal,
  same,
  end
}) => {
  const price = 100
  const oq = new OrderQueue(price)
  const order1 = new Order('order1', Side.SELL, new BigNumber(5), price)
  const order2 = new Order('order2', Side.SELL, new BigNumber(5), price)

  const head = oq.append(order1)
  const tail = oq.append(order2)

  equal(head instanceof Order, true)
  equal(tail instanceof Order, true)
  same(head, order1)
  same(tail, order2)
  equal(oq.volume().toNumber(), 10)
  equal(oq.len(), 2)
  equal(oq.price(), price)
  const orders = oq.toArray()
  same(orders[0].toObject(), order1.toObject())
  same(orders[1].toObject(), order2.toObject())

  const order3 = new Order('order3', Side.SELL, new BigNumber(10), price)

  // Test update. Number of orders is always 2
  oq.update(head, order3)

  equal(oq.volume().toNumber(), 15)
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
  equal(oq.volume().toNumber(), 5)
  same(head3, order2)
  same(tail3, order2)
  end()
})

void test('it should update order size and the volume', ({ equal, end }) => {
  const price = 100
  const oq = new OrderQueue(price)
  const order1 = new Order('order1', Side.SELL, new BigNumber(5), price)
  const order2 = new Order('order2', Side.SELL, new BigNumber(5), price)

  oq.append(order1)
  oq.append(order2)

  equal(oq.volume().toNumber(), 10)

  const newSize = 10
  oq.updateOrderSize(order1, newSize)

  equal(oq.volume().toNumber(), 15)
  equal(order1.size.toNumber(), newSize)
  end()
})
