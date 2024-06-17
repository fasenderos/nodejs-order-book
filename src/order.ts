import { Side } from './side'
import { IOrder } from './types'

export enum OrderType {
  LIMIT = 'limit',
  MARKET = 'market',
}

export enum TimeInForce {
  GTC = 'GTC',
  IOC = 'IOC',
  FOK = 'FOK',
}

export class Order {
  private readonly _id: string
  private readonly _side: Side
  private _size: number
  private _price: number
  private _time: number
  private readonly _isMaker: boolean
  constructor (
    orderId: string,
    side: Side,
    size: number,
    price: number,
    time?: number,
    isMaker?: boolean
  ) {
    this._id = orderId
    this._side = side
    this._price = price
    this._size = size
    this._time = time ?? Date.now()
    this._isMaker = isMaker ?? false
  }

  // Getter for order ID
  get id (): string {
    return this._id
  }

  // Getter for order side
  get side (): Side {
    return this._side
  }

  // Getter for order price
  get price (): number {
    return this._price
  }

  // Getter for order price
  set price (price: number) {
    this._price = price
  }

  // Getter for order size
  get size (): number {
    return this._size
  }

  // Setter for order size
  set size (size: number) {
    this._size = size
  }

  // Getter for order timestamp
  get time (): number {
    return this._time
  }

  // Setter for order timestamp
  set time (time: number) {
    this._time = time
  }

  // Getter for order isMaker
  get isMaker (): boolean {
    return this._isMaker
  }

  // This method returns a string representation of the order
  toString = (): string =>
    `${this._id}:
    side: ${this._side}
    size: ${this._size.toString()}
    price: ${this._price}
    time: ${this._time}
    isMaker: ${this._isMaker as unknown as string}`

  // This method returns a JSON string representation of the order
  toJSON = (): string =>
    JSON.stringify({
      id: this._id,
      side: this._side,
      size: this._size,
      price: this._price,
      time: this._time,
      isMaker: this._isMaker
    })

  // This method returns an object representation of the order
  toObject = (): IOrder => ({
    id: this._id,
    side: this._side,
    size: this._size,
    price: this._price,
    time: this._time,
    isMaker: this._isMaker
  })
}
