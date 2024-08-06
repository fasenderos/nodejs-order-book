/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
import { CustomError, ERROR, type OrderBookError } from "./errors";
import {
	type LimitOrder,
	OrderFactory,
	type StopLimitOrder,
	type StopMarketOrder,
} from "./order";
import type { OrderQueue } from "./orderqueue";
import { OrderSide } from "./orderside";
import { StopBook } from "./stopbook";
import {
	type CreateOrderOptions,
	type ICancelOrder,
	type IProcessOrder,
	type JournalLog,
	type LimitOrderOptions,
	type MarketOrderOptions,
	type OCOOrderOptions,
	type Order,
	type OrderBookOptions,
	OrderType,
	type OrderUpdatePrice,
	type OrderUpdateSize,
	Side,
	type Snapshot,
	type StopLimitOrderOptions,
	type StopMarketOrderOptions,
	type StopOrder,
	TimeInForce,
} from "./types";

const validTimeInForce = Object.values(TimeInForce);

export class OrderBook {
	private orders: { [key: string]: LimitOrder } = {};
	private _lastOp = 0;
	private _marketPrice = 0;
	private readonly bids: OrderSide;
	private readonly asks: OrderSide;
	private readonly enableJournaling: boolean;
	private readonly stopBook: StopBook;
	private readonly experimentalConditionalOrders: boolean;
	/**
	 * Creates an instance of OrderBook.
	 * @param {OrderBookOptions} [options={}] - Options for configuring the order book.
	 * @param {JournalLog} [options.snapshot] - The orderbook snapshot will be restored before processing any journal logs, if any.
	 * @param {JournalLog} [options.journal] - Array of journal logs (optional).
	 * @param {boolean} [options.enableJournaling=false] - Flag to enable journaling. Default to false
	 * @param {boolean} [options.experimentalConditionalOrders=false] - Flag to enable experimental Conditional Order (Stop Market, Stop Limit and OCO orders). Default to false
	 */
	constructor({
		snapshot,
		journal,
		enableJournaling = false,
		experimentalConditionalOrders = false,
	}: OrderBookOptions = {}) {
		this.bids = new OrderSide(Side.BUY);
		this.asks = new OrderSide(Side.SELL);
		this.enableJournaling = enableJournaling;
		this.stopBook = new StopBook();
		this.experimentalConditionalOrders = experimentalConditionalOrders;
		// First restore from orderbook snapshot
		if (snapshot != null) {
			this.restoreSnapshot(snapshot);
		}
		// Than replay from journal log
		if (journal != null) {
			if (!Array.isArray(journal)) throw CustomError(ERROR.INVALID_JOURNAL_LOG);
			// If a snapshot is available be sure to remove logs before the last restored operation
			if (snapshot != null && snapshot.lastOp > 0) {
				journal = journal.filter((log) => log.opId > snapshot.lastOp);
			}
			this.replayJournal(journal);
		}
	}

	// Getter for the market price
	get marketPrice(): number {
		return this._marketPrice;
	}

	// Getter for the lastOp
	get lastOp(): number {
		return this._lastOp;
	}
	/**
	 * Create new order. See {@link CreateOrderOptions} for details.
	 *
	 * @param options
	 * @param options.type - `limit` | `market` | 'stop_limit' | 'stop_market' | 'oco'
	 * @param options.side - `sell` or `buy`
	 * @param options.size - How much of currency you want to trade in units of base currency
	 * @param options.price - The price at which the order is to be fullfilled, in units of the quote currency. Param only for limit order
	 * @param options.orderID - Unique order ID. Param only for limit order
	 * @param options.postOnly - Can be used with 'limit' order and when it's `true` the order will be rejected if immediately matches and trades as a taker. Default is `false`
	 * @param options.stopPrice - The price at which the order will be triggered. Used with `stop_limit` and `stop_market` order.
	 * @param options.stopLimitPrice - The price at which the order will be triggered. Used with `stop_limit` and `stop_market` order.
	 * @param options.timeInForce - Time-in-force supported are: `GTC` (default), `FOK`, `IOC`. Param only for limit order
	 * @param options.stopLimitTimeInForce - Time-in-force supported are: `GTC` (default), `FOK`, `IOC`. Param only for limit order
	 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
	 */
	public createOrder(options: CreateOrderOptions): IProcessOrder;
	/**
	 * @deprecated This implementation has been deprecated and will be removed on v7.0.0.
	 * Use createOrder({ type, side, size, price, id, timeInForce }) instead.
	 *
	 * Create a trade order
	 *
	 * @param type - `limit` | `market` | 'stop_limit' | 'stop_market' | 'oco'
	 * @param side - `sell` or `buy`
	 * @param size - How much of currency you want to trade in units of base currency
	 * @param price - The price at which the order is to be fullfilled, in units of the quote currency. Param only for limit order
	 * @param orderID - Unique order ID. Param only for limit order
	 * @param timeInForce - Time-in-force supported are: `GTC` (default), `FOK`, `IOC`. Param only for limit order
	 * @param stopPrice - The price at which the order will be triggered. Used with `stop_limit` and `stop_market` order.
	 * @param stopLimitPrice - The price at which the order will be triggered. Used with `stop_limit` and `stop_market` order.
	 * @param stopLimitTimeInForce - Time-in-force supported are: `GTC` (default), `FOK`, `IOC`. Param only for limit order
	 * @param postOnly - Can be used with 'limit' order and when it's `true` the order will be rejected if immediately matches and trades as a taker. Default is `false`
	 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
	 */
	public createOrder(
		// Common for all order types
		type: OrderType,
		side: Side,
		size: number,
		// Specific for limit order type
		price?: number,
		orderID?: string,
		timeInForce?: TimeInForce,
		stopPrice?: number,
		stopLimitPrice?: number,
		stopLimitTimeInForce?: TimeInForce,
		postOnly?: boolean,
	): IProcessOrder;

	public createOrder(
		typeOrOptions: CreateOrderOptions | OrderType,
		side?: Side,
		size?: number,
		price?: number,
		orderID?: string,
		timeInForce = TimeInForce.GTC,
		stopPrice?: number,
		stopLimitPrice?: number,
		stopLimitTimeInForce = TimeInForce.GTC,
		postOnly?: boolean,
	): IProcessOrder {
		let options: CreateOrderOptions;
		// We don't want to test the deprecated signature.
		/* node:coverage disable */
		if (
			typeof typeOrOptions === "string" &&
			side !== undefined &&
			size !== undefined
		) {
			options = {
				type: typeOrOptions,
				side,
				size,
				// @ts-expect-error
				price,
				id: orderID,
				timeInForce,
				// @ts-expect-error
				stopPrice,
				// @ts-expect-error
				stopLimitPrice,
				stopLimitTimeInForce,
				postOnly,
			};
			/* node:coverage enable */
		} else if (typeof typeOrOptions === "object") {
			options = typeOrOptions;
			/* node:coverage disable */
		} else {
			throw new Error("Invalid arguments.");
		}
		/* node:coverage enable */

		switch (options.type) {
			case OrderType.MARKET:
				return this.market(options);
			case OrderType.LIMIT:
				return this.limit(options);
			case OrderType.STOP_MARKET:
				return this.stopMarket(options);
			case OrderType.STOP_LIMIT:
				return this.stopLimit(options);
			case OrderType.OCO:
				return this.oco(options);
			default:
				return {
					done: [],
					activated: [],
					partial: null,
					partialQuantityProcessed: 0,
					quantityLeft: 0,
					err: CustomError(ERROR.INVALID_ORDER_TYPE),
				};
		}
	}

	/**
	 * Create a market order. See {@link MarketOrderOptions} for details.
	 *
	 * @param options
	 * @param options.side - `sell` or `buy`
	 * @param options.size - How much of currency you want to trade in units of base currency
	 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
	 */
	public market(options: MarketOrderOptions): IProcessOrder;
	/**
	 * @deprecated This implementation has been deprecated and will be removed on v7.0.0.
	 * Use market({ side, size }) instead.
	 *
	 * Create a market order
	 *
	 * @param side - `sell` or `buy`
	 * @param size - How much of currency you want to trade in units of base currency
	 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
	 */
	public market(side: Side, size: number): IProcessOrder;

	public market(
		sideOrOptions: MarketOrderOptions | Side,
		size?: number,
	): IProcessOrder {
		// We don't want to test the deprecated signature.
		/* node:coverage disable */
		if (typeof sideOrOptions === "string" && size !== undefined) {
			return this._market({ side: sideOrOptions, size });
			/* node:coverage enable */
		}
		if (typeof sideOrOptions === "object") {
			return this._market(sideOrOptions);
			/* node:coverage disable */
		}

		throw new Error("Invalid arguments.");

		/* node:coverage enable */
	}

	/**
	 * Create a stop market order. See {@link StopMarketOrderOptions} for details.
	 *
	 * @param options
	 * @param options.side - `sell` or `buy`
	 * @param options.size - How much of currency you want to trade in units of base currency
	 * @param options.stopPrice - The price at which the order will be triggered.
	 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
	 */
	public stopMarket = (options: StopMarketOrderOptions): IProcessOrder => {
		/* node:coverage ignore next 4 - We don't need test for this */
		if (!this.experimentalConditionalOrders)
			throw new Error(
				"In order to use conditional orders you need to instantiate the order book with the `experimentalConditionalOrders` option set to true",
			);
		return this._stopMarket(options);
	};

	/**
	 * Create a limit order. See {@link LimitOrderOptions} for details.
	 *
	 * @param options
	 * @param options.side - `sell` or `buy`
	 * @param options.id - Unique order ID
	 * @param options.size - How much of currency you want to trade in units of base currency
	 * @param options.price - The price at which the order is to be fullfilled, in units of the quote currency
	 * @param options.postOnly - When `true` the order will be rejected if immediately matches and trades as a taker. Default is `false`
	 * @param options.timeInForce - Time-in-force type supported are: GTC, FOK, IOC. Default is GTC
	 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
	 */
	public limit(options: LimitOrderOptions): IProcessOrder;
	/**
	 * @deprecated This implementation has been deprecated and will be removed on v7.0.0.
	 * Use limit({ id, side, size, price, timeInForce }) instead.
	 *
	 * Create a limit order
	 *
	 * @param side - `sell` or `buy`
	 * @param orderID - Unique order ID
	 * @param size - How much of currency you want to trade in units of base currency
	 * @param price - The price at which the order is to be fullfilled, in units of the quote currency
	 * @param timeInForce - Time-in-force type supported are: GTC, FOK, IOC. Default is GTC
	 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
	 */
	public limit(
		side: Side,
		orderID: string,
		size: number,
		price: number,
		timeInForce?: TimeInForce,
	): IProcessOrder;

	public limit(
		sideOrOptions: LimitOrderOptions | Side,
		orderID?: string,
		size?: number,
		price?: number,
		timeInForce: TimeInForce = TimeInForce.GTC,
	): IProcessOrder {
		// We don't want to test the deprecated signature.
		/* node:coverage disable */
		if (
			typeof sideOrOptions === "string" &&
			orderID !== undefined &&
			size !== undefined &&
			price !== undefined
		) {
			return this._limit({
				id: orderID,
				side: sideOrOptions,
				size,
				price,
				timeInForce,
			});
			/* node:coverage enable */
		}
		if (typeof sideOrOptions === "object") {
			return this._limit(sideOrOptions);
			/* node:coverage disable */
		}

		throw new Error("Invalid arguments.");
		/* node:coverage enable */
	}

	/**
	 * Create a stop limit order. See {@link StopLimitOrderOptions} for details.
	 *
	 * @param options
	 * @param options.side - `sell` or `buy`
	 * @param options.id - Unique order ID
	 * @param options.size - How much of currency you want to trade in units of base currency
	 * @param options.price - The price at which the order is to be fullfilled, in units of the quote currency
	 * @param options.stopPrice - The price at which the order will be triggered.
	 * @param options.timeInForce - Time-in-force type supported are: GTC, FOK, IOC. Default is GTC
	 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
	 */
	public stopLimit = (options: StopLimitOrderOptions): IProcessOrder => {
		/* node:coverage ignore next 4 - We don't need test for this */
		if (!this.experimentalConditionalOrders)
			throw new Error(
				"In order to use conditional orders you need to instantiate the order book with the `experimentalConditionalOrders` option set to true",
			);
		return this._stopLimit(options);
	};

	/**
	 * Create an OCO (One-Cancels-the-Other) order.
	 * OCO order combines a `stop_limit` order and a `limit` order, where if stop price
	 * is triggered or limit order is fully or partially fulfilled, the other is canceled.
	 * Both orders have the same `side` and `size`. If you cancel one of the orders, the
	 * entire OCO order pair will be canceled.
	 *
	 * For BUY orders the `stopPrice` must be above the current price and the `price` below the current price
	 * For SELL orders the `stopPrice` must be below the current price and the `price` above the current price
	 *
	 * See {@link OCOOrderOptions} for details.
	 *
	 * @param options
	 * @param options.side - `sell` or `buy`
	 * @param options.id - Unique order ID
	 * @param options.size - How much of currency you want to trade in units of base currency
	 * @param options.price - The price of the `limit` order at which the order is to be fullfilled, in units of the quote currency
	 * @param options.stopPrice - The price at which the `stop_limit` order will be triggered.
	 * @param options.stopLimitPrice - The price of the `stop_limit` order at which the order is to be fullfilled, in units of the quote currency.
	 * @param options.timeInForce - Time-in-force of the `limit` order. Type supported are: GTC, FOK, IOC. Default is GTC
	 * @param options.stopLimitTimeInForce - Time-in-force of the `stop_limit` order. Type supported are: GTC, FOK, IOC. Default is GTC
	 * @returns An object with the result of the processed order or an error. See {@link IProcessOrder} for the returned data structure
	 */
	public oco = (options: OCOOrderOptions): IProcessOrder => {
		/* node:coverage ignore next 4 - We don't need test for this */
		if (!this.experimentalConditionalOrders)
			throw new Error(
				"In order to use conditional orders you need to instantiate the order book with the `experimentalConditionalOrders` option set to true",
			);
		return this._oco(options);
	};

	/**
	 * Modify an existing order with given ID. When an order is modified by price or quantity,
	 * it will be deemed as a new entry. Under the price-time-priority algorithm, orders are
	 * prioritized according to their order price and order time. Hence, the latest orders
	 * will be placed at the back of the matching order queue.
	 *
	 * @param orderID - The ID of the order to be modified
	 * @param orderUpdate - An object with the modified size and/or price of an order. The shape of the object is `{size, price}`.
	 * @returns An object with the result of the processed order or an error
	 */
	public modify = (
		orderID: string,
		orderUpdate: OrderUpdatePrice | OrderUpdateSize,
	): IProcessOrder => {
		const order = this.orders[orderID];
		if (order === undefined) {
			return {
				done: [],
				activated: [],
				partial: null,
				partialQuantityProcessed: 0,
				quantityLeft: 0,
				err: CustomError(ERROR.ORDER_NOT_FOUND),
			};
		}
		if (orderUpdate?.price !== undefined || orderUpdate?.size !== undefined) {
			const newPrice = orderUpdate.price ?? order.price;
			const newSize = orderUpdate.size ?? order.size;
			if (newPrice > 0 && newSize > 0) {
				const response = this.getProcessOrderResponse(newSize);
				this._cancelOrder(order.id, true);
				this.createLimitOrder(
					response,
					order.side,
					order.id,
					newSize,
					newPrice,
					order.postOnly,
					TimeInForce.GTC,
				);
				if (this.enableJournaling) {
					response.log = {
						opId: ++this._lastOp,
						ts: Date.now(),
						op: "u",
						o: { orderID, orderUpdate },
					};
				}
				return response;
			}
		}
		// Missing one of price and/or size, or the provided ones are not greater than zero
		return {
			done: [],
			activated: [],
			partial: null,
			partialQuantityProcessed: 0,
			quantityLeft: orderUpdate?.size ?? 0,
			err: CustomError(ERROR.INVALID_PRICE_OR_QUANTITY),
		};
	};

	/**
	 * Remove an existing order with given ID from the order book
	 *
	 * @param orderID - The ID of the order to be removed
	 * @returns The removed order if exists or `undefined`
	 */
	public cancel = (orderID: string): ICancelOrder | undefined => {
		return this._cancelOrder(orderID);
	};

	/**
	 * Get an existing order with the given ID
	 *
	 * @param orderID - The ID of the order to be returned
	 * @returns The order if exists or `undefined`
	 */
	public order = (orderID: string): LimitOrder | undefined => {
		return this.orders[orderID];
	};

	// Returns price levels and volume at price level
	public depth = (): [Array<[number, number]>, Array<[number, number]>] => {
		const asks: Array<[number, number]> = [];
		const bids: Array<[number, number]> = [];
		this.asks.priceTree().forEach((levelPrice: number, level: OrderQueue) => {
			asks.push([levelPrice, level.volume()]);
		});
		this.bids.priceTree().forEach((levelPrice: number, level: OrderQueue) => {
			bids.push([levelPrice, level.volume()]);
		});
		return [asks, bids];
	};

	public toString = (): string => {
		/* node:coverage ignore next - Don't know what is the uncovered branch here */
		return `${this.asks.toString()}\r\n------------------------------------${this.bids.toString()}`;
	};

	// Returns total market price for requested quantity
	// if err is not null price returns total price of all levels in side
	public calculateMarketPrice = (
		side: Side,
		size: number,
	): {
		price: number;
		err: null | OrderBookError;
	} => {
		let price = 0;
		let err = null;
		let level: OrderQueue | undefined;
		let iter: (price: number) => OrderQueue | undefined;
		let quantity = size;

		if (side === Side.BUY) {
			level = this.asks.minPriceQueue();
			iter = this.asks.greaterThan;
		} else {
			level = this.bids.maxPriceQueue();
			iter = this.bids.lowerThan;
		}

		while (quantity > 0 && level !== undefined) {
			const levelVolume = level.volume();
			const levelPrice = level.price();
			if (this.greaterThanOrEqual(quantity, levelVolume)) {
				price += levelPrice * levelVolume;
				quantity -= levelVolume;
				level = iter(levelPrice);
			} else {
				price += levelPrice * quantity;
				quantity = 0;
			}
		}

		if (quantity > 0) {
			err = CustomError(ERROR.INSUFFICIENT_QUANTITY);
		}

		return { price, err };
	};

	public snapshot = (): Snapshot => {
		const bids: Array<{ price: number; orders: LimitOrder[] }> = [];
		const asks: Array<{ price: number; orders: LimitOrder[] }> = [];
		this.bids.priceTree().forEach((price: number, orders: OrderQueue) => {
			bids.push({ price, orders: orders.toArray() });
		});
		this.asks.priceTree().forEach((price: number, orders: OrderQueue) => {
			asks.push({ price, orders: orders.toArray() });
		});
		return { bids, asks, ts: Date.now(), lastOp: this._lastOp };
	};

	private readonly _market = (
		options: MarketOrderOptions,
		incomingResponse?: IProcessOrder,
	): IProcessOrder => {
		const response = incomingResponse ?? this.validateMarketOrder(options);
		if (response.err != null) return response;

		let quantityToTrade = options.size;
		let iter: () => OrderQueue | undefined;
		let sideToProcess: OrderSide;
		if (options.side === Side.BUY) {
			iter = this.asks.minPriceQueue;
			sideToProcess = this.asks;
		} else {
			iter = this.bids.maxPriceQueue;
			sideToProcess = this.bids;
		}
		const priceBefore = this._marketPrice;
		while (quantityToTrade > 0 && sideToProcess.len() > 0) {
			// if sideToProcess.len > 0 it is not necessary to verify that bestPrice exists
			const bestPrice = iter() as OrderQueue;
			const { done, partial, partialQuantityProcessed, quantityLeft } =
				this.processQueue(bestPrice, quantityToTrade);
			response.done = response.done.concat(done);
			response.partial = partial;
			response.partialQuantityProcessed = partialQuantityProcessed;
			quantityToTrade = quantityLeft;
		}
		response.quantityLeft = quantityToTrade;

		this.executeConditionalOrder(options.side, priceBefore, response);

		if (this.enableJournaling) {
			response.log = {
				opId: ++this._lastOp,
				ts: Date.now(),
				op: "m",
				o: { side: options.side, size: options.size },
			};
		}
		return response;
	};

	private readonly _limit = (
		options: LimitOrderOptions & { ocoStopPrice?: number },
		incomingResponse?: IProcessOrder,
	): IProcessOrder => {
		const response = incomingResponse ?? this.validateLimitOrder(options);
		if (response.err != null) return response;
		const order = this.createLimitOrder(
			response,
			options.side,
			options.id,
			options.size,
			options.price,
			options.postOnly ?? false,
			options.timeInForce ?? TimeInForce.GTC,
			options.ocoStopPrice,
		);
		if (this.enableJournaling && order != null) {
			response.log = {
				opId: ++this._lastOp,
				ts: Date.now(),
				op: "l",
				o: {
					side: order.side,
					id: order.id,
					size: order.size,
					price: order.price,
					timeInForce: order.timeInForce,
				},
			};
		}
		return response;
	};

	private readonly _stopMarket = (
		options: StopMarketOrderOptions,
	): IProcessOrder => {
		const response = this.validateMarketOrder(options);
		if (response.err != null) return response;
		const stopMarket = OrderFactory.createOrder({
			...options,
			type: OrderType.STOP_MARKET,
		});
		return this._stopOrder(stopMarket, response);
	};

	private readonly _stopLimit = (
		options: StopLimitOrderOptions,
	): IProcessOrder => {
		const response = this.validateLimitOrder(options);
		if (response.err != null) return response;
		const stopLimit = OrderFactory.createOrder({
			...options,
			type: OrderType.STOP_LIMIT,
			timeInForce: options.timeInForce ?? TimeInForce.GTC,
		});
		return this._stopOrder(stopLimit, response);
	};

	private readonly _oco = (options: OCOOrderOptions): IProcessOrder => {
		const response = this.validateLimitOrder(options);
		/* node:coverage ignore next - Already validated with limit test */
		if (response.err != null) return response;
		if (this.validateOCOOrder(options)) {
			// We use the same ID for Stop Limit and Limit Order, since
			// we check only on limit order for duplicated ids
			this._limit(
				{
					id: options.id,
					side: options.side,
					size: options.size,
					price: options.price,
					timeInForce: options.timeInForce,
					ocoStopPrice: options.stopPrice,
				},
				response,
			);
			/* node:coverage ignore next - Already validated with limit test */
			if (response.err != null) return response;

			const stopLimit = OrderFactory.createOrder({
				type: OrderType.STOP_LIMIT,
				id: options.id,
				side: options.side,
				size: options.size,
				price: options.stopLimitPrice,
				stopPrice: options.stopPrice,
				timeInForce: options.stopLimitTimeInForce ?? TimeInForce.GTC,
				isOCO: true,
			});
			this.stopBook.add(stopLimit);
			response.done.push(stopLimit);
		} else {
			response.err = CustomError(ERROR.INVALID_CONDITIONAL_ORDER);
		}
		return response;
	};

	private readonly _stopOrder = (
		stopOrder: StopMarketOrder | StopLimitOrder,
		response: IProcessOrder,
	): IProcessOrder => {
		if (this.stopBook.validConditionalOrder(this._marketPrice, stopOrder)) {
			this.stopBook.add(stopOrder);
			response.done.push(stopOrder);
		} else {
			response.err = CustomError(ERROR.INVALID_CONDITIONAL_ORDER);
		}
		return response;
	};

	private readonly restoreSnapshot = (snapshot: Snapshot): void => {
		this._lastOp = snapshot.lastOp;
		for (const level of snapshot.bids) {
			for (const order of level.orders) {
				this.orders[order.id] = order;
				this.bids.append(order);
			}
		}

		for (const level of snapshot.asks) {
			for (const order of level.orders) {
				this.orders[order.id] = order;
				this.asks.append(order);
			}
		}
	};

	/**
	 * Remove an existing order with given ID from the order book
	 * @param orderID The id of the order to be deleted
	 * @param internalDeletion Set to true when the delete comes from internal operations
	 * @returns The removed order if exists or `undefined`
	 */
	private readonly _cancelOrder = (
		orderID: string,
		internalDeletion = false,
	): ICancelOrder | undefined => {
		const order = this.orders[orderID];
		if (order === undefined) return;
		delete this.orders[orderID];
		const side = order.side === Side.BUY ? this.bids : this.asks;
		const response: ICancelOrder = {
			order: side.remove(order),
		};

		// Delete OCO Order only when the delete request comes from user
		if (!internalDeletion && order.ocoStopPrice !== undefined) {
			response.stopOrder = this.stopBook.remove(
				order.side,
				orderID,
				order.ocoStopPrice,
			);
		}

		if (this.enableJournaling) {
			response.log = {
				opId: internalDeletion ? this._lastOp : ++this._lastOp,
				ts: Date.now(),
				op: "d",
				o: { orderID },
			};
		}
		return response;
	};

	private readonly getProcessOrderResponse = (size: number): IProcessOrder => {
		return {
			done: [],
			activated: [],
			partial: null,
			partialQuantityProcessed: 0,
			quantityLeft: size,
			err: null,
		};
	};

	private readonly createLimitOrder = (
		response: IProcessOrder,
		side: Side,
		orderID: string,
		size: number,
		price: number,
		postOnly: boolean,
		timeInForce: TimeInForce,
		ocoStopPrice?: number,
	): LimitOrder | undefined => {
		let quantityToTrade = size;
		let sideToProcess: OrderSide;
		let sideToAdd: OrderSide;
		let comparator: (a: number, b: number) => boolean;
		let iter: () => OrderQueue | undefined;
		if (side === Side.BUY) {
			sideToAdd = this.bids;
			sideToProcess = this.asks;
			comparator = this.greaterThanOrEqual;
			iter = this.asks.minPriceQueue;
		} else {
			sideToAdd = this.asks;
			sideToProcess = this.bids;
			comparator = this.lowerThanOrEqual;
			iter = this.bids.maxPriceQueue;
		}

		if (timeInForce === TimeInForce.FOK) {
			const fillable = this.canFillOrder(sideToProcess, side, size, price);
			if (!fillable) {
				response.err = CustomError(ERROR.LIMIT_ORDER_FOK_NOT_FILLABLE);
				return;
			}
		}
		let bestPrice = iter();
		const priceBefore = this._marketPrice;
		while (
			quantityToTrade > 0 &&
			sideToProcess.len() > 0 &&
			bestPrice !== undefined &&
			comparator(price, bestPrice.price())
		) {
			if (postOnly) {
				response.err = CustomError(ERROR.LIMIT_ORDER_POST_ONLY);
				return;
			}
			const { done, partial, partialQuantityProcessed, quantityLeft } =
				this.processQueue(bestPrice, quantityToTrade);
			response.done = response.done.concat(done);
			response.partial = partial;
			response.partialQuantityProcessed = partialQuantityProcessed;
			quantityToTrade = quantityLeft;
			response.quantityLeft = quantityToTrade;
			bestPrice = iter();
		}

		this.executeConditionalOrder(side, priceBefore, response);

		let order: LimitOrder;
		const takerQty = size - quantityToTrade;
		const makerQty = quantityToTrade;
		if (quantityToTrade > 0) {
			order = OrderFactory.createOrder({
				type: OrderType.LIMIT,
				id: orderID,
				side,
				size: quantityToTrade,
				origSize: size,
				price,
				time: Date.now(),
				timeInForce,
				postOnly,
				takerQty,
				makerQty,
				...(ocoStopPrice !== undefined ? { ocoStopPrice } : {}),
			});
			if (response.done.length > 0) {
				response.partialQuantityProcessed = size - quantityToTrade;
				response.partial = order;
			}
			this.orders[orderID] = sideToAdd.append(order);
		} else {
			let totalQuantity = 0;
			let totalPrice = 0;

			response.done.forEach((order: Order) => {
				totalQuantity += order.size;
				totalPrice += (order as LimitOrder).price * order.size;
			});

			if (response.partialQuantityProcessed > 0 && response.partial !== null) {
				totalQuantity += response.partialQuantityProcessed;
				totalPrice +=
					response.partial.price * response.partialQuantityProcessed;
			}
			order = OrderFactory.createOrder({
				id: orderID,
				type: OrderType.LIMIT,
				side,
				size,
				origSize: size,
				price: totalPrice / totalQuantity,
				time: Date.now(),
				timeInForce,
				postOnly,
				takerQty,
				makerQty,
			});
			response.done.push(order);
		}

		// If IOC order was not matched completely remove from the order book
		if (timeInForce === TimeInForce.IOC && response.quantityLeft > 0) {
			this._cancelOrder(orderID, true);
		}
		return order;
	};

	private readonly executeConditionalOrder = (
		side: Side,
		priceBefore: number,
		response: IProcessOrder,
	): void => {
		if (!this.experimentalConditionalOrders) return;
		const pendingOrders = this.stopBook.getConditionalOrders(
			side,
			priceBefore,
			this._marketPrice,
		);
		if (pendingOrders.length > 0) {
			const toBeExecuted: StopOrder[] = [];
			// Before get all orders to be executed and clean up the stop queue
			// in order to avoid that an executed limit/market order run against
			// the same stop order queue
			pendingOrders.forEach((queue) => {
				while (queue.len() > 0) {
					const headOrder = queue.removeFromHead();
					if (headOrder !== undefined) toBeExecuted.push(headOrder);
				}
				// Queue is empty now so remove the priceLevel
				this.stopBook.removePriceLevel(side, queue.price);
			});
			toBeExecuted.forEach((stopOrder) => {
				if (stopOrder.type === OrderType.STOP_MARKET) {
					this._market(
						{
							id: stopOrder.id,
							side: stopOrder.side,
							size: stopOrder.size,
						},
						response,
					);
				} else {
					if (stopOrder.isOCO) {
						this._cancelOrder(stopOrder.id, true);
					}
					this._limit(
						{
							id: stopOrder.id,
							side: stopOrder.side,
							size: stopOrder.size,
							price: stopOrder.price,
							timeInForce: stopOrder.timeInForce,
						},
						response,
					);
				}
				response.activated.push(stopOrder);
			});
		}
	};

	private readonly replayJournal = (journal: JournalLog[]): void => {
		for (const log of journal) {
			switch (log.op) {
				case "m": {
					const { side, size } = log.o;
					if (side == null || size == null) {
						throw CustomError(ERROR.INVALID_JOURNAL_LOG);
					}
					this.market({ side, size });
					break;
				}
				case "l": {
					const { side, id, size, price, timeInForce } = log.o;
					if (side == null || id == null || size == null || price == null) {
						throw CustomError(ERROR.INVALID_JOURNAL_LOG);
					}
					this.limit({
						side,
						id,
						size,
						price,
						timeInForce,
					});
					break;
				}
				case "d":
					if (log.o.orderID == null)
						throw CustomError(ERROR.INVALID_JOURNAL_LOG);
					this.cancel(log.o.orderID);
					break;
				case "u":
					if (log.o.orderID == null || log.o.orderUpdate == null) {
						throw CustomError(ERROR.INVALID_JOURNAL_LOG);
					}
					this.modify(log.o.orderID, log.o.orderUpdate);
					break;
				default:
					throw CustomError(ERROR.INVALID_JOURNAL_LOG);
			}
		}
	};

	/**
	 * OCO Order:
	 *    Buy: price < marketPrice < stopPrice
	 *    Sell: price > marketPrice > stopPrice
	 */
	private readonly validateOCOOrder = (options: OCOOrderOptions): boolean => {
		let response = false;
		if (
			options.side === Side.BUY &&
			options.price < this._marketPrice &&
			this._marketPrice < options.stopPrice
		) {
			response = true;
		}
		if (
			options.side === Side.SELL &&
			options.price > this._marketPrice &&
			this._marketPrice > options.stopPrice
		) {
			response = true;
		}
		return response;
	};

	private readonly greaterThanOrEqual = (a: number, b: number): boolean => {
		return a >= b;
	};

	private readonly lowerThanOrEqual = (a: number, b: number): boolean => {
		return a <= b;
	};

	private readonly processQueue = (
		orderQueue: OrderQueue,
		quantityToTrade: number,
	): IProcessOrder => {
		const response: IProcessOrder = {
			done: [],
			activated: [],
			partial: null,
			partialQuantityProcessed: 0,
			quantityLeft: quantityToTrade,
			err: null,
		};
		if (response.quantityLeft > 0) {
			while (orderQueue.len() > 0 && response.quantityLeft > 0) {
				const headOrder = orderQueue.head();
				if (headOrder !== undefined) {
					if (response.quantityLeft < headOrder.size) {
						response.partial = OrderFactory.createOrder({
							...headOrder.toObject(),
							size: headOrder.size - response.quantityLeft,
						});
						this.orders[headOrder.id] = response.partial;
						response.partialQuantityProcessed = response.quantityLeft;
						orderQueue.update(headOrder, response.partial);
						response.quantityLeft = 0;
					} else {
						response.quantityLeft = response.quantityLeft - headOrder.size;
						const canceledOrder = this._cancelOrder(headOrder.id, true);
						/* node:coverage ignore next - Unable to test when order is undefined */
						if (canceledOrder?.order !== undefined) {
							response.done.push(canceledOrder.order);
						}
					}
					// Remove linked OCO Stop Order if any
					if (
						this.experimentalConditionalOrders &&
						headOrder.ocoStopPrice !== undefined
					) {
						this.stopBook.remove(
							headOrder.side,
							headOrder.id,
							headOrder.ocoStopPrice,
						);
					}
					this._marketPrice = headOrder.price;
				}
			}
		}
		return response;
	};

	private readonly canFillOrder = (
		orderSide: OrderSide,
		side: Side,
		size: number,
		price: number,
	): boolean => {
		return side === Side.BUY
			? this.buyOrderCanBeFilled(orderSide, size, price)
			: this.sellOrderCanBeFilled(orderSide, size, price);
	};

	private readonly buyOrderCanBeFilled = (
		orderSide: OrderSide,
		size: number,
		price: number,
	): boolean => {
		if (orderSide.volume() < size) {
			return false;
		}

		let cumulativeSize = 0;
		orderSide.priceTree().forEach((_: number, level: OrderQueue) => {
			if (price >= level.price() && cumulativeSize < size) {
				cumulativeSize += level.volume();
			} else {
				return true; // break the loop
			}
		});
		return cumulativeSize >= size;
	};

	private readonly sellOrderCanBeFilled = (
		orderSide: OrderSide,
		size: number,
		price: number,
	): boolean => {
		if (orderSide.volume() < size) {
			return false;
		}

		let cumulativeSize = 0;
		orderSide.priceTree().forEach((_: number, level: OrderQueue) => {
			if (price <= level.price() && cumulativeSize < size) {
				cumulativeSize += level.volume();
			} else {
				return true; // break the loop
			}
		});
		return cumulativeSize >= size;
	};

	private readonly validateMarketOrder = (
		order: MarketOrderOptions | StopMarketOrderOptions,
	): IProcessOrder => {
		const response = this.getProcessOrderResponse(order.size);

		if (![Side.SELL, Side.BUY].includes(order.side)) {
			response.err = CustomError(ERROR.INVALID_SIDE);
			return response;
		}

		if (typeof order.size !== "number" || order.size <= 0) {
			response.err = CustomError(ERROR.INSUFFICIENT_QUANTITY);
			return response;
		}
		return response;
	};

	private readonly validateLimitOrder = (
		options: LimitOrderOptions | StopLimitOrderOptions,
	): IProcessOrder => {
		const response = this.getProcessOrderResponse(options.size);

		if (![Side.SELL, Side.BUY].includes(options.side)) {
			response.err = CustomError(ERROR.INVALID_SIDE);
			return response;
		}

		if (this.orders[options.id] !== undefined) {
			response.err = CustomError(ERROR.ORDER_ALREDY_EXISTS);
			return response;
		}

		if (typeof options.size !== "number" || options.size <= 0) {
			response.err = CustomError(ERROR.INVALID_QUANTITY);
			return response;
		}

		if (typeof options.price !== "number" || options.price <= 0) {
			response.err = CustomError(ERROR.INVALID_PRICE);
			return response;
		}

		if (
			options.timeInForce &&
			!validTimeInForce.includes(options.timeInForce)
		) {
			response.err = CustomError(ERROR.INVALID_TIF);
			return response;
		}
		return response;
	};
	/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
}
