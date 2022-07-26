import LinkedList, { Node, NodeData } from 'dbly-linked-list'
import { Order } from './order'

export class OrderQueue {
  private _price: number
  private _volume: number
  private orders: LinkedList
  private ordersMap: { [key: string]: number } = {}

  constructor(price: number) {
    this._price = price
    this._volume = 0
    this.orders = new LinkedList()
  }

  // returns the number of orders in queue
  len = (): number => {
    return this.orders.getSize()
  }

  toArray = (): NodeData[] => {
    return this.orders.toArray()
  }

  // returns price level of the queue
  price = (): number => {
    return this._price
  }

  // returns price level of the queue
  volume = (): number => {
    return this._volume
  }

  // returns top order in queue
  head = () => {
    return this.orders.getHeadNode()
  }

  // returns bottom order in queue
  tail = () => {
    return this.orders.getTailNode()
  }

  // adds order to tail of the queue
  append = (order: Order): Order => {
    this._volume += order.size
    this.orders.insert(order)
    this.ordersMap[order.id] = this.orders.getSize() - 1
    return order
  }

  // sets up new order to list value
  update = (node: Node, nodeData: Order, order: Order) => {
    this._volume -= nodeData.size
    this._volume += order.size
    node.data = order
  }

  // removes order from the queue
  remove = (order: Order) => {
    this._volume -= order.size
    this.orders.removeAt(this.ordersMap[order.id])
    delete this.ordersMap[order.id]
  }
}
