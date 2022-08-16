import { Side } from './side'

export interface OrderUpdate {
  size: number
  price: number
  side: Side
}

export class Order {
  private _id: string
  private _side: Side
  private _size: number
  private _price: number
  private _time: number
  constructor(
    orderId: string,
    side: Side,
    size: number,
    price: number,
    time?: number
  ) {
    this._id = orderId
    this._side = side
    this._price = price
    this._size = size
    this._time = time || Date.now()
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
  // returns string rappresentation of the order
  toString = (): string => {
    return `${this._id}:
    side: ${this._side}
    size: ${this._side}
    price: ${this._price}
    time: ${this._time}`
  }
  // returns JSON string of the order
  toJSON = (): string => {
    return JSON.stringify({
      id: this._id,
      side: this._side,
      size: this._size,
      price: this._price,
      time: this._time,
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
    }
  }
}
