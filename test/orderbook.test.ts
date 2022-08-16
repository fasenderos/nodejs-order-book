import { Order, OrderUpdate } from '../src/order'
import { Side } from '../src/side'
import { OrderBook } from '../src/orderbook'
import { ERROR } from '../src/errors'

const addDepth = (ob: OrderBook, prefix: string, quantity: number) => {
  for (let index = 50; index < 100; index += 10) {
    ob.processLimitOrder(Side.BUY, `${prefix}buy-${index}`, quantity, index)
  }

  for (let index = 100; index < 150; index += 10) {
    ob.processLimitOrder(Side.SELL, `${prefix}sell-${index}`, quantity, index)
  }

  return
}

describe('OrderBook', () => {
  test('test limit place', () => {
    const ob = new OrderBook()
    const size = 2
    for (let index = 50; index < 100; index += 10) {
      const { done, partial, partialQuantityProcessed, quantityLeft, err } =
        ob.processLimitOrder(Side.BUY, `buy-${index}`, size, index)
      expect(done.length).toBe(0)
      expect(partial).toBeNull()
      expect(partialQuantityProcessed).toBeNull()
      expect(err).toBeNull()
    }

    for (let index = 100; index < 150; index += 10) {
      const { done, partial, partialQuantityProcessed, quantityLeft, err } =
        ob.processLimitOrder(Side.SELL, `sell-${index}`, size, index)
      expect(done.length).toBe(0)
      expect(partial).toBeNull()
      expect(partialQuantityProcessed).toBeNull()
      expect(err).toBeNull()
    }

    expect(ob.order('fake')).toBeUndefined()
    expect(ob.order('sell-100')).toBeInstanceOf(Order)

    const depth = ob.depth()

    depth.forEach((side, index) => {
      side.forEach((level, subindex) => {
        expect(level[1]).toBe(2)
        let price = index === 0 ? 140 - 10 * subindex : 90 - 10 * subindex
        expect(level[0]).toBe(price)
      })
    })
  })

  test('test processLimitOrder', () => {
    const ob = new OrderBook()

    addDepth(ob, '', 2)

    const process1 =
      // { done, partial, partialQuantityProcessed, quantityLeft, err }
      ob.processLimitOrder(Side.BUY, 'order-b100', 1, 100)
    expect(process1.err).toBeNull()
    expect(process1.done[0].id).toBe('order-b100')
    expect(process1.partial?.id).toBe('sell-100')
    expect(process1.partialQuantityProcessed).toBe(1)

    const process2 =
      // { done, partial, partialQuantityProcessed, quantityLeft, err } =
      ob.processLimitOrder(Side.BUY, `order-b150`, 10, 150)

    expect(process2.err).toBeNull()
    expect(process2.done.length).toBe(5)
    expect(process2.partial?.id).toBe('order-b150')
    expect(process2.partialQuantityProcessed).toBe(9)

    const process3 = ob.processLimitOrder(Side.SELL, `buy-70`, 11, 40)
    expect(process3.err?.message).toBe(ERROR.ErrOrderExists)

    const process4 = ob.processLimitOrder(Side.SELL, `fake-70`, 0, 40)
    expect(process4.err?.message).toBe(ERROR.ErrInvalidQuantity)

    const process5 = ob.processLimitOrder(Side.SELL, `fake-70`, 10, 0)
    expect(process5.err?.message).toBe(ERROR.ErrInvalidPrice)

    const removed = ob.cancelOrder('order-b100')
    expect(removed).toBeUndefined()

    const process6 = ob.processLimitOrder(Side.SELL, 'order-s40', 11, 40)
    expect(process6.err).toBeNull()
    expect(process6.done.length).toBe(7)
    expect(process6.partial).toBeNull()
    expect(process6.partialQuantityProcessed).toBeNull()

    // @ts-ignore
    const process7 = ob.processLimitOrder(Side.SELL, `fake-wrong-size`, '0', 40)
    expect(process7.err?.message).toBe(ERROR.ErrInvalidQuantity)

    const process8 = ob.processLimitOrder(
      Side.SELL,
      `fake-wrong-size`,
      // @ts-ignore
      null,
      40
    )
    expect(process8.err?.message).toBe(ERROR.ErrInvalidQuantity)

    const process9 = ob.processLimitOrder(
      Side.SELL,
      `fake-wrong-price`,
      10,
      // @ts-ignore
      '40'
    )
    expect(process9.err?.message).toBe(ERROR.ErrInvalidPrice)

    // @ts-ignore
    const process10 = ob.processLimitOrder(Side.SELL, `fake-wrong-price`, 10)
    expect(process10.err?.message).toBe(ERROR.ErrInvalidPrice)
  })

  test('test processMarketOrder', () => {
    const ob = new OrderBook()

    addDepth(ob, '', 2)

    const process1 =
      // { done, partial, partialQuantityProcessed, quantityLeft, err }
      ob.processMarketOrder(Side.BUY, 3)

    expect(process1.err).toBeNull()
    expect(process1.quantityLeft).toBe(0)
    expect(process1.partialQuantityProcessed).toBe(1)

    const process2 = ob.processMarketOrder(Side.BUY, 0)
    expect(process2.err?.message).toBe(ERROR.ErrInsufficientQuantity)

    const process3 =
      // { done, partial, partialQuantityProcessed, quantityLeft, err } =
      ob.processMarketOrder(Side.SELL, 12)

    expect(process3.done.length).toBe(5)
    expect(process3.err).toBeNull()
    expect(process3.partial).toBeNull()
    expect(process3.partialQuantityProcessed).toBeNull()
    expect(process3.quantityLeft).toBe(2)

    // @ts-ignore
    const process4 = ob.processMarketOrder(Side.SELL, '0')
    expect(process4.err?.message).toBe(ERROR.ErrInsufficientQuantity)

    // @ts-ignore
    const process5 = ob.processMarketOrder(Side.SELL)
    expect(process5.err?.message).toBe(ERROR.ErrInsufficientQuantity)
  })

  test('test modifyOrder', () => {
    const ob = new OrderBook()

    addDepth(ob, '', 2)

    ob.processLimitOrder(Side.BUY, 'first-order', 1000, 52)
    ob.processLimitOrder(Side.SELL, 'second-order', 1000, 200)

    // Test BUY side
    const orderUpdateSize1: OrderUpdate = {
      side: Side.BUY,
      size: 990,
      price: 52,
    }
    // Response is the updated order or undefined if no order exist
    const response1 = ob.modifyOrder('first-order', orderUpdateSize1)
    expect(response1?.size).toBe(orderUpdateSize1.size)

    const orderUpdatePrice1: OrderUpdate = {
      side: Side.BUY,
      size: 990,
      price: 82,
    }
    // Response is the updated order or undefined if no order exist
    const response2 = ob.modifyOrder('first-order', orderUpdatePrice1)
    expect(response2?.price).toBe(orderUpdatePrice1.price)

    // Test SELL side
    const orderUpdateSize2: OrderUpdate = {
      side: Side.SELL,
      size: 990,
      price: 200,
    }
    // Response is the updated order or undefined if no order exist
    const response3 = ob.modifyOrder('second-order', orderUpdateSize2)
    expect(response3?.size).toBe(orderUpdateSize2.size)

    const orderUpdatePrice2: OrderUpdate = {
      side: Side.SELL,
      size: 990,
      price: 250,
    }
    // Response is the updated order or undefined if no order exist
    const response4 = ob.modifyOrder('second-order', orderUpdatePrice2)
    expect(response4?.price).toBe(orderUpdatePrice2.price)

    // Test throw error when the side is not of type 'Side'
    try {
      const errorUpdate: OrderUpdate = {
        // @ts-ignore
        side: 'fake-side',
        size: 990,
        price: 250,
      }
      ob.modifyOrder('second-order', errorUpdate)
    } catch (error) {
      if (error instanceof Error) {
        // TypeScript knows err is Error
        expect(error?.message).toBe(ERROR.ErrInvalidSide)
      }
    }

    // Test modify an unexisting order
    const resp = ob.modifyOrder('unexisting-order', orderUpdatePrice1)
    expect(resp).toBeUndefined()
  })

  test('test priceCalculation', () => {
    const ob = new OrderBook()

    addDepth(ob, '05-', 10)
    addDepth(ob, '10-', 10)
    addDepth(ob, '15-', 10)

    const calc1 = ob.calculateMarketPrice(Side.BUY, 115)

    expect(calc1.err).toBeNull()
    expect(calc1.price).toBe(13150)

    const calc2 = ob.calculateMarketPrice(Side.BUY, 200)

    expect(calc2.err?.message).toBe(ERROR.ErrInsufficientQuantity)
    expect(calc2.price).toBe(18000)

    const calc3 = ob.calculateMarketPrice(Side.SELL, 115)

    expect(calc3.err).toBeNull()
    expect(calc3.price).toBe(8700)

    const calc4 = ob.calculateMarketPrice(Side.SELL, 200)

    expect(calc4.err?.message).toBe(ERROR.ErrInsufficientQuantity)
    expect(calc4.price).toBe(10500)
  })
  test('test priceCalculation', () => {
    const ob = new OrderBook()
    addDepth(ob, '', 10)
    expect(ob.toString()).toBe(
      `\n140 -> 10\n130 -> 10\n120 -> 10\n110 -> 10\n100 -> 10\r\n------------------------------------\n90 -> 10\n80 -> 10\n70 -> 10\n60 -> 10\n50 -> 10`
    )
  })
})
