import { test } from 'tap'
import { OrderFactory, StopLimitOrder } from '../src/order'
import { Side } from '../src/side'
import { StopQueue } from '../src/stopqueue'
import { OrderType, TimeInForce } from '../src/types'

void test('it should append/remove orders from queue', ({
  equal,
  same,
  end
}) => {
  const price = 100
  const stopPrice = 90
  const oq = new StopQueue(price)
  // Test edge case where head is undefined (queue is empty)
  equal(oq.removeFromHead(), undefined)

  const order1 = OrderFactory.createOrder({
    type: OrderType.STOP_LIMIT,
    id: 'order1',
    side: Side.SELL,
    size: 5,
    price,
    stopPrice,
    timeInForce: TimeInForce.GTC,
    isMaker: true
  })
  const order2 = OrderFactory.createOrder({
    type: OrderType.STOP_LIMIT,
    id: 'order2',
    side: Side.SELL,
    size: 5,
    price,
    stopPrice,
    timeInForce: TimeInForce.GTC,
    isMaker: true
  })

  const head = oq.append(order1)
  const tail = oq.append(order2)

  equal(head instanceof StopLimitOrder, true)
  equal(tail instanceof StopLimitOrder, true)
  same(head, order1)
  same(tail, order2)
  equal(oq.len(), 2)

  const order3 = OrderFactory.createOrder({
    type: OrderType.STOP_LIMIT,
    id: 'order3',
    side: Side.SELL,
    size: 10,
    price,
    stopPrice,
    timeInForce: TimeInForce.GTC,
    isMaker: true
  })
  oq.append(order3)
  equal(oq.len(), 3)

  const order4 = OrderFactory.createOrder({
    type: OrderType.STOP_LIMIT,
    id: 'order4',
    side: Side.SELL,
    size: 10,
    price,
    stopPrice,
    timeInForce: TimeInForce.GTC,
    isMaker: true
  })
  oq.append(order4)
  equal(oq.len(), 4)

  same(oq.removeFromHead(), order1)
  same(oq.remove(order4.id), order4)
  equal(oq.len(), 2)

  same(oq.removeFromHead(), order2)
  equal(oq.len(), 1)

  equal(oq.remove('fake-id'), undefined)
  equal(oq.len(), 1)

  same(oq.remove(order3.id), order3)
  equal(oq.len(), 0)

  end()
})
