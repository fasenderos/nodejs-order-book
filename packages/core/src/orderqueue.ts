/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
import Denque from "denque";
import type { LimitOrder } from "./order";

export class OrderQueue {
	private readonly _price: number;
	private _volume: number;
	// { orderID: index } index in denque
	private readonly _orders: Denque<LimitOrder>;
	private _ordersMap: { [key: string]: number } = {};

	constructor(price: number) {
		this._price = price;
		this._volume = 0;
		this._orders = new Denque<LimitOrder>();
	}

	// returns the number of orders in queue
	len = (): number => {
		return this._orders.length;
	};

	toArray = (): LimitOrder[] => {
		return this._orders.toArray();
	};

	// returns price level of the queue
	price = (): number => {
		return this._price;
	};

	// returns price level of the queue
	volume = (): number => {
		return this._volume;
	};

	// returns top order in queue
	head = (): LimitOrder | undefined => {
		return this._orders.peekFront();
	};

	// returns bottom order in queue
	tail = (): LimitOrder | undefined => {
		return this._orders.peekBack();
	};

	// adds order to tail of the queue
	append = (order: LimitOrder): LimitOrder => {
		this._volume += order.size;
		this._orders.push(order);
		this._ordersMap[order.id] = this._orders.length - 1;
		return order;
	};

	// sets up new order to list value
	update = (oldOrder: LimitOrder, newOrder: LimitOrder): void => {
		this._volume -= oldOrder.size;
		this._volume += newOrder.size;
		// Remove old order from head
		this._orders.shift();
		delete this._ordersMap[oldOrder.id];
		// Add new order to head
		this._orders.unshift(newOrder);
		this._ordersMap[newOrder.id] = 0;
	};

	// removes order from the queue
	remove = (order: LimitOrder): void => {
		this._volume -= order.size;
		const deletedOrderIndex = this._ordersMap[order.id];
		this._orders.removeOne(deletedOrderIndex);
		delete this._ordersMap[order.id];
		// Update all orders indexes where index is greater than the deleted one
		for (const orderId in this._ordersMap) {
			if (this._ordersMap[orderId] > deletedOrderIndex) {
				this._ordersMap[orderId] -= 1;
			}
		}
	};

	updateOrderSize = (order: LimitOrder, size: number): void => {
		this._volume += size - order.size; // update volume
		order.size = size;
		order.time = Date.now();
	};
	/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
}
