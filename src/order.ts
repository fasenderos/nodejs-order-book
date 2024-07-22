import { CustomError, ERROR } from './errors'
import type { Side } from './side'
import {
  ILimitOrder,
  IStopLimitOrder,
  IStopMarketOrder,
  InternalLimitOrderOptions,
  OrderOptions,
  InternalStopLimitOrderOptions,
  InternalStopMarketOrderOptions,
  TimeInForce,
  OrderType
} from './types'

import { randomUUID } from 'node:crypto'

abstract class BaseOrder {
  readonly _id: string
  readonly _side: Side
  _size: number
  readonly _origSize: number
  _time: number
  constructor (options: OrderOptions) {
    this._id = options.id ?? randomUUID()
    this._side = options.side
    this._size = options.size
    this._origSize = options.origSize ?? options.size
    this._time = options.time ?? Date.now()
  }

  // Getter for order ID
  get id (): string {
    return this._id
  }

  // Getter for order side
  get side (): Side {
    return this._side
  }

  // Getter for order size
  get size (): number {
    return this._size
  }

  // Setter for order size
  set size (size: number) {
    this._size = size
  }

  // Getter for the original size of the order
  get origSize (): number {
    return this._origSize
  }

  // Getter for order timestamp
  get time (): number {
    return this._time
  }

  // Setter for order timestamp
  set time (time: number) {
    this._time = time
  }

  // This method returns a string representation of the order
  abstract toString (): void
  // This method returns a JSON string representation of the order
  abstract toJSON (): void
  // This method returns an object representation of the order
  abstract toObject (): void
}
export class LimitOrder extends BaseOrder {
  private readonly _type: OrderType.LIMIT
  private _price: number
  private readonly _timeInForce: TimeInForce
  private readonly _isMaker: boolean
  constructor (options: InternalLimitOrderOptions) {
    super(options)
    this._type = options.type
    this._price = options.price
    this._timeInForce = options.timeInForce
    this._isMaker = options.isMaker
  }

  // Getter for order type
  get type (): OrderType.LIMIT {
    return this._type
  }

  // Getter for order price
  get price (): number {
    return this._price
  }

  // Getter for order price
  set price (price: number) {
    this._price = price
  }

  // Getter for timeInForce price
  get timeInForce (): TimeInForce {
    return this._timeInForce
  }

  // Getter for order isMaker
  get isMaker (): boolean {
    return this._isMaker
  }

  toString = (): string =>
    `${this._id}:
    type: ${this.type}
    side: ${this._side}
    size: ${this._size}
    origSize: ${this._origSize}
    price: ${this._price}
    time: ${this._time}
    timeInForce: ${this._timeInForce}
    isMaker: ${this._isMaker as unknown as string}`

  toJSON = (): string => JSON.stringify(this.toObject())

  toObject = (): ILimitOrder => ({
    id: this._id,
    type: this.type,
    side: this._side,
    size: this._size,
    origSize: this._origSize,
    price: this._price,
    time: this._time,
    timeInForce: this._timeInForce,
    isMaker: this._isMaker
  })
}

export class StopMarketOrder extends BaseOrder {
  private readonly _type: OrderType.STOP_MARKET
  private readonly _stopPrice: number
  constructor (options: InternalStopMarketOrderOptions) {
    super(options)
    this._type = options.type
    this._stopPrice = options.stopPrice
  }

  // Getter for order type
  get type (): OrderType.STOP_MARKET {
    return this._type
  }

  // Getter for order stopPrice
  get stopPrice (): number {
    return this._stopPrice
  }

  toString = (): string =>
    `${this._id}:
    type: ${this.type}
    side: ${this._side}
    size: ${this._size}
    origSize: ${this._origSize}
    stopPrice: ${this._stopPrice}
    time: ${this._time}`

  toJSON = (): string => JSON.stringify(this.toObject())

  toObject = (): IStopMarketOrder => ({
    id: this._id,
    type: this.type,
    side: this._side,
    size: this._size,
    origSize: this._origSize,
    stopPrice: this.stopPrice,
    time: this._time
  })
}

export class StopLimitOrder extends BaseOrder {
  private readonly _type: OrderType.STOP_LIMIT
  private _price: number
  private readonly _stopPrice: number
  private readonly _timeInForce: TimeInForce
  private readonly _isMaker: boolean
  constructor (options: InternalStopLimitOrderOptions) {
    super(options)
    this._type = options.type
    this._price = options.price
    this._stopPrice = options.stopPrice
    this._timeInForce = options.timeInForce
    this._isMaker = options.isMaker
  }

  // Getter for order type
  get type (): OrderType.STOP_LIMIT {
    return this._type
  }

  // Getter for order price
  get price (): number {
    return this._price
  }

  // Getter for order price
  set price (price: number) {
    this._price = price
  }

  // Getter for order stopPrice
  get stopPrice (): number {
    return this._stopPrice
  }

  // Getter for timeInForce price
  get timeInForce (): TimeInForce {
    return this._timeInForce
  }

  // Getter for order isMaker
  get isMaker (): boolean {
    return this._isMaker
  }

  toString = (): string =>
    `${this._id}:
    type: ${this.type}
    side: ${this._side}
    size: ${this._size}
    origSize: ${this._origSize}
    price: ${this._price}
    stopPrice: ${this._stopPrice}
    timeInForce: ${this._timeInForce}
    time: ${this._time}
    isMaker: ${this._isMaker as unknown as string}`

  toJSON = (): string => JSON.stringify(this.toObject())

  toObject = (): IStopLimitOrder => ({
    id: this._id,
    type: this.type,
    side: this._side,
    size: this._size,
    origSize: this._origSize,
    price: this._price,
    stopPrice: this.stopPrice,
    timeInForce: this.timeInForce,
    time: this._time,
    isMaker: this._isMaker
  })
}

export const OrderFactory = {
  createOrder<T extends OrderOptions>(
    options: T
  ): T extends InternalLimitOrderOptions
      ? LimitOrder
      : T extends InternalStopLimitOrderOptions
        ? StopLimitOrder
        : T extends InternalStopMarketOrderOptions
          ? StopMarketOrder
          : never {
    switch (options.type) {
      case OrderType.LIMIT:
        return new LimitOrder(options) as any
      case OrderType.STOP_LIMIT:
        return new StopLimitOrder(options) as any
      case OrderType.STOP_MARKET:
        return new StopMarketOrder(options) as any
      default:
        throw CustomError(ERROR.ErrInvalidOrderType)
    }
  }
}
