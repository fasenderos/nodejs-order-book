/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
import Denque from "denque";
import type { StopOrder } from "./types";

export class StopQueue {
	private readonly _price: number;
	private readonly _orders: Denque<StopOrder>;
	private _ordersMap: { [key: string]: number } = {};

	constructor(price: number) {
		this._price = price;
		this._orders = new Denque<StopOrder>();
	}

	get price(): number {
		return this._price;
	}

	// returns the number of orders in queue
	len = (): number => {
		return this._orders.length;
	};

	// remove order from head of queue
	removeFromHead = (): StopOrder | undefined => {
		// We can't use the shift method here because we need
		// to update index in the map, so we use the remove(id) function
		const order = this._orders.peekFront();
		if (order === undefined) return;
		return this.remove(order.id);
	};

	// adds order to tail of the queue
	append = (order: StopOrder): StopOrder => {
		this._orders.push(order);
		this._ordersMap[order.id] = this._orders.length - 1;
		return order;
	};

	// removes order from the queue
	remove = (id: string): StopOrder | undefined => {
		const deletedOrderIndex = this._ordersMap[id];
		if (deletedOrderIndex === undefined) return;

		const deletedOrder = this._orders.removeOne(deletedOrderIndex);
		delete this._ordersMap[id];
		// Update all orders indexes where index is greater than the deleted one
		for (const orderId in this._ordersMap) {
			if (this._ordersMap[orderId] > deletedOrderIndex) {
				this._ordersMap[orderId] -= 1;
			}
		}
		return deletedOrder;
	};

	toArray = (): StopOrder[] => {
		return this._orders.toArray();
	};
	/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
}
