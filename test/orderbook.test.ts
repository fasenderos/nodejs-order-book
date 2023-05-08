import { Order, OrderType, OrderUpdate, TimeInForce } from '../src/order'
import { Side } from '../src/side'
import { OrderBook } from '../src/orderbook'
import { ERROR } from '../src/errors'

const addDepth = (ob: OrderBook, prefix: string, quantity: number) => {
  for (let index = 50; index < 100; index += 10) {
    ob.limit(Side.BUY, `${prefix}buy-${index}`, quantity, index)
  }

  for (let index = 100; index < 150; index += 10) {
    ob.limit(Side.SELL, `${prefix}sell-${index}`, quantity, index)
  }

  return
}

describe('OrderBook', () => {
  test('test limit place', () => {
    const ob = new OrderBook()
    const size = 2
    for (let index = 50; index < 100; index += 10) {
      const { done, partial, partialQuantityProcessed, quantityLeft, err } =
        ob.limit(Side.BUY, `buy-${index}`, size, index)
      expect(done.length).toBe(0)
      expect(partial).toBeNull()
      expect(partialQuantityProcessed).toBe(0)
      expect(err).toBeNull()
    }

    for (let index = 100; index < 150; index += 10) {
      const { done, partial, partialQuantityProcessed, quantityLeft, err } =
        ob.limit(Side.SELL, `sell-${index}`, size, index)
      expect(done.length).toBe(0)
      expect(partial).toBeNull()
      expect(partialQuantityProcessed).toBe(0)
      expect(err).toBeNull()
    }

    expect(ob.order('fake')).toBeUndefined()
    expect(ob.order('sell-100')).toBeInstanceOf(Order)

    const depth = ob.depth()

    depth.forEach((side, index) => {
      side.forEach((level, subIndex) => {
        expect(level[1]).toBe(2)
        let price = index === 0 ? 140 - 10 * subIndex : 90 - 10 * subIndex
        expect(level[0]).toBe(price)
      })
    })
  })

  test('test limit', () => {
    const ob = new OrderBook()

    addDepth(ob, '', 2)

    const process1 =
      // { done, partial, partialQuantityProcessed, quantityLeft, err }
      ob.limit(Side.BUY, 'order-b100', 1, 100)
    expect(process1.err).toBeNull()
    expect(process1.done[0].id).toBe('order-b100')
    expect(process1.partial?.id).toBe('sell-100')
    expect(process1.partial?.isMaker).toBe(true)
    expect(process1.partialQuantityProcessed).toBe(1)

    const process2 =
      // { done, partial, partialQuantityProcessed, quantityLeft, err } =
      ob.limit(Side.BUY, `order-b150`, 10, 150)

    expect(process2.err).toBeNull()
    expect(process2.done.length).toBe(5)
    expect(process2.partial?.id).toBe('order-b150')
    expect(process2.partial?.isMaker).toBe(true)
    expect(process2.partialQuantityProcessed).toBe(9)

    const process3 = ob.limit(Side.SELL, `buy-70`, 11, 40)
    expect(process3.err?.message).toBe(ERROR.ErrOrderExists)

    const process4 = ob.limit(Side.SELL, `fake-70`, 0, 40)
    expect(process4.err?.message).toBe(ERROR.ErrInvalidQuantity)

    // @ts-ignore
    const process5 = ob.limit('unsupported-side', `order-70`, 70, 100)
    expect(process5.err?.message).toBe(ERROR.ErrInvalidSide)

    const removed = ob.cancel('order-b100')
    expect(removed).toBeUndefined()

    // Test also the createOrder method
    const process6 = ob.createOrder(
      OrderType.LIMIT,
      Side.SELL,
      11,
      40,
      'order-s40'
    )
    expect(process6.err).toBeNull()
    expect(process6.done.length).toBe(7)
    expect(process6.partial).toBeNull()
    expect(process6.partialQuantityProcessed).toBe(0)

    // @ts-ignore
    const process7 = ob.limit(Side.SELL, `fake-wrong-size`, '0', 40)
    expect(process7.err?.message).toBe(ERROR.ErrInvalidQuantity)

    const process8 = ob.limit(
      Side.SELL,
      `fake-wrong-size`,
      // @ts-ignore
      null,
      40
    )
    expect(process8.err?.message).toBe(ERROR.ErrInvalidQuantity)

    const process9 = ob.limit(
      Side.SELL,
      `fake-wrong-price`,
      10,
      // @ts-ignore
      '40'
    )
    expect(process9.err?.message).toBe(ERROR.ErrInvalidPrice)

    // @ts-ignore
    const process10 = ob.limit(Side.SELL, `fake-wrong-price`, 10)
    expect(process10.err?.message).toBe(ERROR.ErrInvalidPrice)

    // @ts-ignore
    const process11 = ob.limit(Side.SELL, `unsupported-tif`, 10, 10, 'FAKE')
    expect(process11.err?.message).toBe(ERROR.ErrInvalidTimeInForce)
  })

  test('test limit FOK and IOC', () => {
    const ob = new OrderBook()
    addDepth(ob, '', 2)
    const process1 = ob.limit(
      Side.BUY,
      'order-fok-b100',
      3,
      100,
      TimeInForce.FOK
    )
    expect(process1.err?.message).toBe(ERROR.ErrLimitFOKNotFillable)

    const process2 = ob.limit(
      Side.SELL,
      'order-fok-s90',
      3,
      90,
      TimeInForce.FOK
    )
    expect(process2.err?.message).toBe(ERROR.ErrLimitFOKNotFillable)

    const process3 = ob.limit(
      Side.BUY,
      'buy-order-size-greather-than-order-side-volume',
      30,
      100,
      TimeInForce.FOK
    )
    expect(process3.err?.message).toBe(ERROR.ErrLimitFOKNotFillable)

    const process4 = ob.limit(
      Side.SELL,
      'sell-order-size-greather-than-order-side-volume',
      30,
      90,
      TimeInForce.FOK
    )
    expect(process4.err?.message).toBe(ERROR.ErrLimitFOKNotFillable)

    ob.limit(Side.BUY, 'order-ioc-b100', 3, 100, TimeInForce.IOC)
    expect(ob.order('order-ioc-b100')).toBeUndefined()

    const processIOC = ob.limit(
      Side.SELL,
      'order-ioc-s90',
      3,
      90,
      TimeInForce.IOC
    )
    expect(ob.order('order-ioc-s90')).toBeUndefined()
    expect(processIOC.partial?.id).toBe('order-ioc-s90')

    const processFOKBuy = ob.limit(
      Side.BUY,
      'order-fok-b110',
      2,
      120,
      TimeInForce.FOK
    )

    expect(processFOKBuy.err).toBeNull()
    expect(processFOKBuy.quantityLeft).toBe(0)

    const processFOKSell = ob.limit(
      Side.SELL,
      'order-fok-s80',
      4,
      70,
      TimeInForce.FOK
    )
    expect(processFOKSell.err).toBeNull()
    expect(processFOKSell.quantityLeft).toBe(0)
  })

  test('test market', () => {
    const ob = new OrderBook()

    addDepth(ob, '', 2)

    const process1 =
      // { done, partial, partialQuantityProcessed, quantityLeft, err }
      ob.market(Side.BUY, 3)

    expect(process1.err).toBeNull()
    expect(process1.quantityLeft).toBe(0)
    expect(process1.partialQuantityProcessed).toBe(1)

    // Test also the createOrder method
    const process3 =
      // { done, partial, partialQuantityProcessed, quantityLeft, err } =
      ob.createOrder(OrderType.MARKET, Side.SELL, 12)

    expect(process3.done.length).toBe(5)
    expect(process3.err).toBeNull()
    expect(process3.partial).toBeNull()
    expect(process3.partialQuantityProcessed).toBe(0)
    expect(process3.quantityLeft).toBe(2)

    // @ts-ignore
    const process4 = ob.market(Side.SELL, '0')
    expect(process4.err?.message).toBe(ERROR.ErrInsufficientQuantity)

    // @ts-ignore
    const process5 = ob.market(Side.SELL)
    expect(process5.err?.message).toBe(ERROR.ErrInsufficientQuantity)

    // @ts-ignore
    const process6 = ob.market('unsupported-side', 100)
    expect(process6.err?.message).toBe(ERROR.ErrInvalidSide)
  })

  test('createOrder error', () => {
    const ob = new OrderBook()
    addDepth(ob, '', 2)
    // @ts-ignore
    const result = ob.createOrder('wrong-market-type', Side.SELL, 10)
    expect(result.err?.message).toBe(ERROR.ErrInvalidOrderType)
  })

  test('test modify', () => {
    const ob = new OrderBook()

    addDepth(ob, '', 2)

    ob.limit(Side.BUY, 'first-order', 1000, 52)
    ob.limit(Side.SELL, 'second-order', 1000, 200)

    // Test BUY side
    const orderUpdateSize1: OrderUpdate = {
      side: Side.BUY,
      size: 990,
      price: 52,
    }
    // Response is the updated order or undefined if no order exist
    const response1 = ob.modify('first-order', orderUpdateSize1)
    expect(response1?.size).toBe(orderUpdateSize1.size)

    const orderUpdatePrice1: OrderUpdate = {
      side: Side.BUY,
      size: 990,
      price: 82,
    }

    // Test SELL side
    const orderUpdateSize2: OrderUpdate = {
      side: Side.SELL,
      size: 990,
      price: 200,
    }
    // Response is the updated order or undefined if no order exist
    const response3 = ob.modify('second-order', orderUpdateSize2)
    expect(response3?.size).toBe(orderUpdateSize2.size)

    const orderUpdatePrice2: OrderUpdate = {
      side: Side.SELL,
      size: 990,
      price: 250,
    }
    // Response is the updated order or undefined if no order exist
    const response4 = ob.modify('second-order', orderUpdatePrice2)
    expect(response4?.price).toBe(orderUpdatePrice2.price)

    // Test throw error when the side is not of type 'Side'
    try {
      const errorUpdate: OrderUpdate = {
        // @ts-ignore
        side: 'fake-side',
        size: 990,
        price: 250,
      }
      ob.modify('second-order', errorUpdate)
    } catch (error) {
      if (error instanceof Error) {
        // TypeScript knows err is Error
        expect(error?.message).toBe(ERROR.ErrInvalidSide)
      }
    }

    // Test modify a non-existent order
    const resp = ob.modify('non-existent-order', orderUpdatePrice1)
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
