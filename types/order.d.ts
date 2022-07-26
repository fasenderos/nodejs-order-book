import { Side } from './side'
export declare class Order {
  private _id
  private _side
  private _size
  private _price
  private _time
  constructor(
    orderId: string,
    side: Side,
    size: number,
    price: number,
    time?: number
  )
  get id(): string
  get side(): Side
  get price(): number
  get size(): number
  get time(): number
  toString: () => string
  toJSON: () => string
  toObject: () => {
    id: string
    side: Side
    size: number
    price: number
    time: number
  }
}
