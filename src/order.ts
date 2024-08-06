/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
import { randomUUID } from "node:crypto";
import { CustomError, ERROR } from "./errors";
import {
	type ILimitOrder,
	type IStopLimitOrder,
	type IStopMarketOrder,
	type InternalLimitOrderOptions,
	type InternalStopLimitOrderOptions,
	type InternalStopMarketOrderOptions,
	type OrderOptions,
	OrderType,
	type Side,
	type TimeInForce,
} from "./types";

abstract class BaseOrder {
	readonly _id: string;
	readonly _side: Side;
	_size: number;
	_time: number;
	constructor(options: OrderOptions) {
		this._id = options.id ?? randomUUID();
		this._side = options.side;
		this._size = options.size;
		this._time = options.time ?? Date.now();
	}

	// Getter for order ID
	get id(): string {
		return this._id;
	}

	// Getter for order side
	get side(): Side {
		return this._side;
	}

	// Getter for order size
	get size(): number {
		return this._size;
	}

	// Setter for order size
	set size(size: number) {
		this._size = size;
	}

	// Getter for order timestamp
	get time(): number {
		return this._time;
	}

	// Setter for order timestamp
	set time(time: number) {
		this._time = time;
	}

	// This method returns a string representation of the order
	abstract toString(): void;
	// This method returns a JSON string representation of the order
	abstract toJSON(): void;
	// This method returns an object representation of the order
	abstract toObject(): void;
}
export class LimitOrder extends BaseOrder {
	private readonly _type: OrderType.LIMIT;
	readonly _origSize: number;
	private _price: number;
	private readonly _timeInForce: TimeInForce;
	private readonly _makerQty: number;
	private readonly _takerQty: number;
	private readonly _postOnly: boolean;
	// Refers to the linked Stop Limit order stopPrice
	private readonly _ocoStopPrice?: number;
	constructor(options: InternalLimitOrderOptions) {
		super(options);
		this._type = options.type;
		this._origSize = options.origSize;
		this._price = options.price;
		this._timeInForce = options.timeInForce;
		this._makerQty = options.makerQty;
		this._takerQty = options.takerQty;
		this._postOnly = options.postOnly ?? false;
		this._ocoStopPrice = options.ocoStopPrice;
	}

	// Getter for order type
	get type(): OrderType.LIMIT {
		return this._type;
	}

	// Getter for order price
	get price(): number {
		return this._price;
	}

	// Getter for order price
	set price(price: number) {
		this._price = price;
	}

	// Getter for timeInForce price
	get timeInForce(): TimeInForce {
		return this._timeInForce;
	}

	// Getter for order postOnly
	get postOnly(): boolean {
		return this._postOnly;
	}

	// Getter for the original size of the order
	get origSize(): number {
		return this._origSize;
	}

	// Getter for order makerQty
	get makerQty(): number {
		return this._makerQty;
	}

	// Getter for order takerQty
	get takerQty(): number {
		return this._takerQty;
	}

	get ocoStopPrice(): number | undefined {
		return this._ocoStopPrice;
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
    makerQty: ${this._makerQty}
    takerQty: ${this._takerQty}`;

	toJSON = (): string => JSON.stringify(this.toObject());

	toObject = (): ILimitOrder => ({
		id: this._id,
		type: this.type,
		side: this._side,
		size: this._size,
		origSize: this._origSize,
		price: this._price,
		time: this._time,
		timeInForce: this._timeInForce,
		makerQty: this._makerQty,
		takerQty: this._takerQty,
	});
}

export class StopMarketOrder extends BaseOrder {
	private readonly _type: OrderType.STOP_MARKET;
	private readonly _stopPrice: number;
	constructor(options: InternalStopMarketOrderOptions) {
		super(options);
		this._type = options.type;
		this._stopPrice = options.stopPrice;
	}

	// Getter for order type
	get type(): OrderType.STOP_MARKET {
		return this._type;
	}

	// Getter for order stopPrice
	get stopPrice(): number {
		return this._stopPrice;
	}

	toString = (): string =>
		`${this._id}:
    type: ${this.type}
    side: ${this._side}
    size: ${this._size}
    stopPrice: ${this._stopPrice}
    time: ${this._time}`;

	toJSON = (): string => JSON.stringify(this.toObject());

	toObject = (): IStopMarketOrder => ({
		id: this._id,
		type: this.type,
		side: this._side,
		size: this._size,
		stopPrice: this._stopPrice,
		time: this._time,
	});
}

export class StopLimitOrder extends BaseOrder {
	private readonly _type: OrderType.STOP_LIMIT;
	private _price: number;
	private readonly _stopPrice: number;
	private readonly _timeInForce: TimeInForce;
	// It's true when there is a linked Limit Order
	private readonly _isOCO: boolean;
	constructor(options: InternalStopLimitOrderOptions) {
		super(options);
		this._type = options.type;
		this._price = options.price;
		this._stopPrice = options.stopPrice;
		this._timeInForce = options.timeInForce;
		this._isOCO = options.isOCO ?? false;
	}

	// Getter for order type
	get type(): OrderType.STOP_LIMIT {
		return this._type;
	}

	// Getter for order price
	get price(): number {
		return this._price;
	}

	// Getter for order price
	set price(price: number) {
		this._price = price;
	}

	// Getter for order stopPrice
	get stopPrice(): number {
		return this._stopPrice;
	}

	// Getter for timeInForce price
	get timeInForce(): TimeInForce {
		return this._timeInForce;
	}

	// Getter for order isOCO
	get isOCO(): boolean {
		return this._isOCO;
	}

	toString = (): string =>
		`${this._id}:
    type: ${this.type}
    side: ${this._side}
    size: ${this._size}
    price: ${this._price}
    stopPrice: ${this._stopPrice}
    timeInForce: ${this._timeInForce}
    time: ${this._time}`;

	toJSON = (): string => JSON.stringify(this.toObject());

	toObject = (): IStopLimitOrder => ({
		id: this._id,
		type: this.type,
		side: this._side,
		size: this._size,
		price: this._price,
		stopPrice: this._stopPrice,
		timeInForce: this._timeInForce,
		time: this._time,
	});
}

export const OrderFactory = {
	createOrder<T extends OrderOptions>(
		options: T,
	): T extends InternalLimitOrderOptions
		? LimitOrder
		: T extends InternalStopLimitOrderOptions
			? StopLimitOrder
			: T extends InternalStopMarketOrderOptions
				? StopMarketOrder
				: never {
		switch (options.type) {
			case OrderType.LIMIT:
				// biome-ignore lint: don't know how to typing this return
				return new LimitOrder(options) as any;
			case OrderType.STOP_LIMIT:
				// biome-ignore lint: don't know how to typing this return
				return new StopLimitOrder(options) as any;
			case OrderType.STOP_MARKET:
				// biome-ignore lint: don't know how to typing this return
				return new StopMarketOrder(options) as any;
			default:
				throw CustomError(ERROR.INVALID_ORDER_TYPE);
		}
	},
	/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
};
