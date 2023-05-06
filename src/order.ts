import { Side } from './side'

export interface OrderUpdate {
  size: number
  price: number
  side: Side
}

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
  private _id: string
  private _side: Side
  private _size: number
  private _price: number
  private _time: number
  private _isMaker: boolean
  constructor(
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
    this._time = time || Date.now()
    this._isMaker = isMaker || false
  }

  // returns orderId of the order
  get id(): string {
    return this._id
  }
  // returns side of the order
  get side(): Side {
    return this._side
  }
  // returns price of the order
  get price(): number {
    return this._price
  }
  // returns size of the order
  get size(): number {
    return this._size
  }
  set size(size: number) {
    this._size = size
  }
  // returns timestamp of the order
  get time(): number {
    return this._time
  }
  set time(time: number) {
    this._time = time
  }
  get isMaker(): boolean {
    return this._isMaker
  }
  // returns string representation of the order
  toString = (): string => {
    return `${this._id}:
    side: ${this._side}
    size: ${this._side}
    price: ${this._price}
    time: ${this._time}
    isMaker: ${this.isMaker}`
  }
  // returns JSON string of the order
  toJSON = (): string => {
    return JSON.stringify({
      id: this._id,
      side: this._side,
      size: this._size,
      price: this._price,
      time: this._time,
      isMaker: this.isMaker,
    })
  }
  // returns an object with each property name and value
  toObject = () => {
    return {
      id: this._id,
      side: this._side,
      size: this._size,
      price: this._price,
      time: this._time,
      isMaker: this.isMaker,
    }
  }
}
