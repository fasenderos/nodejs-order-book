/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
import { CustomError, ERROR, type OrderBookError } from "./errors.js";
import { EventBus } from "./event-bus.js";
import { lazyRequire } from "./lazy-require.js";
import {
	type LimitOrder,
	OrderFactory,
	type StopLimitOrder,
	type StopMarketOrder,
} from "./order.js";
import type { OrderQueue } from "./orderqueue.js";
import { OrderSide } from "./orderside.js";
import { StopBook } from "./stopbook.js";
import {
	type CreateOrderOptions,
	type ICancelOrder,
	type ILimitOrder,
	type IOrder,
	type IProcessOrder,
	type JournalLog,
	type LimitOrderOptions,
	type MarketOrderOptions,
	type OCOOrderOptions,
	type OrderBookEvent,
	type OrderBookEventMap,
	type OrderBookOptions,
	type OrderBookPlugin,
	OrderType,
	type OrderUpdatePrice,
	type OrderUpdateSize,
	SelfTradePreventionMode,
	Side,
	type Snapshot,
	type StopLimitOrderOptions,
	type StopMarketOrderOptions,
	type StopOrder,
	TimeInForce,
} from "./types.js";

const validTimeInForce = Object.values(TimeInForce);

export class OrderBook {
	private orders: { [key: string]: LimitOrder } = {};
	private _lastOp = 0;
	private _marketPrice = 0;
	private readonly bids: OrderSide;
	private readonly asks: OrderSide;
	private readonly stopBook: StopBook;
	private readonly eventBus = new EventBus<OrderBookEventMap>();
	/**
	 * Creates an instance of OrderBook.
	 * @param {OrderBookOptions} [options={}] - Options for configuring the order book.
	 * @param {Snapshot} [options.snapshot] - The orderbook snapshot will be restored before processing any journal logs, if any.
	 * @param {JournalLog[]} [options.journal] - Array of journal logs (optional). Deprecated: use the `@nodejs-order-book/plugin-journaling` plugin instead.
	 * @param {boolean} [options.enableJournaling=false] - Flag to enable journaling. Deprecated: use the `@nodejs-order-book/plugin-journaling` plugin instead.
	 */
	constructor({ snapshot, journal, enableJournaling }: OrderBookOptions = {}) {
		this.bids = new OrderSide(Side.BUY);
		this.asks = new OrderSide(Side.SELL);
		this.stopBook = new StopBook();
		// First restore from orderbook snapshot
		if (snapshot != null) {
			this.restoreSnapshot(snapshot);
		}
		// Deprecated journaling options: warn and initialize the journaling plugin
		if (enableJournaling || journal != null) {
			console.warn(
				"[nodejs-order-book] The 'enableJournaling' and 'journal' options are deprecated and will be removed in the next major version (v12). Use the '@nodejs-order-book/plugin-journaling' plugin instead: const journaling = journalingPlugin(); ob.use(journaling);",
			);
			const { journalingPlugin } = lazyRequire<{
				journalingPlugin: (options?: {
					journal?: JournalLog[];
				}) => OrderBookPlugin;
			}>("@nodejs-order-book/plugin-journaling");
			this.use(journalingPlugin({ journal }));
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
	 * Register an event handler for the given order book event.
	 * @template K - The event name, a key of {@link OrderBookEventMap}.
	 * @param event - The event name to subscribe to.
	 * @param handler - The handler invoked with the event payload.
	 */
	public on<K extends OrderBookEvent>(
		event: K,
		handler: (payload: OrderBookEventMap[K]) => void,
	): void {
		this.eventBus.on(event, handler);
	}

	/**
	 * Remove a previously registered event handler.
	 * @template K - The event name, a key of {@link OrderBookEventMap}.
	 * @param event - The event name to unsubscribe from.
	 * @param handler - The handler to remove.
	 */
	public off<K extends OrderBookEvent>(
		event: K,
		handler: (payload: OrderBookEventMap[K]) => void,
	): void {
		this.eventBus.off(event, handler);
	}

	/**
	 * Install a plugin into the order book. The plugin's `install` method is
	 * invoked with the order book instance so it can subscribe to events.
	 * @param plugin - The plugin to install.
	 * @returns The order book instance, allowing method chaining.
	 */
	public use(plugin: OrderBookPlugin): OrderBook {
		plugin.install(this);
		return this;
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
	public createOrder(options: CreateOrderOptions): IProcessOrder {
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
			default: {
				const error = CustomError(ERROR.INVALID_ORDER_TYPE);
				this.eventBus.emit("order.rejected", {
					opId: ++this._lastOp,
					options,
					error,
				});
				return {
					done: [],
					activated: [],
					partial: null,
					partialQuantityProcessed: 0,
					quantityLeft: 0,
					err: error,
				};
			}
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
	public market(options: MarketOrderOptions): IProcessOrder {
		const response = this._market(options);
		const opId = ++this._lastOp;
		if (response.err === null) {
			this.eventBus.emit("order.processed", {
				opId,
				type: OrderType.MARKET,
				options,
				response,
			});
		} else {
			this.eventBus.emit("order.rejected", {
				opId,
				type: OrderType.MARKET,
				options,
				error: response.err,
			});
		}
		return response;
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
		const response = this._stopMarket(options);
		const opId = ++this._lastOp;
		if (response.err === null) {
			this.eventBus.emit("order.processed", {
				opId,
				type: OrderType.STOP_MARKET,
				options,
				response,
			});
		} else {
			this.eventBus.emit("order.rejected", {
				opId,
				type: OrderType.STOP_MARKET,
				options,
				error: response.err,
			});
		}
		return response;
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
	public limit(options: LimitOrderOptions): IProcessOrder {
		const response = this._limit(options);
		const opId = ++this._lastOp;
		if (response.err === null) {
			this.eventBus.emit("order.processed", {
				opId,
				type: OrderType.LIMIT,
				options,
				response,
			});
		} else {
			this.eventBus.emit("order.rejected", {
				opId,
				type: OrderType.LIMIT,
				options,
				error: response.err,
			});
		}
		return response;
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
		const response = this._stopLimit(options);
		const opId = ++this._lastOp;
		if (response.err === null) {
			this.eventBus.emit("order.processed", {
				opId,
				type: OrderType.STOP_LIMIT,
				options,
				response,
			});
		} else {
			this.eventBus.emit("order.rejected", {
				opId,
				type: OrderType.STOP_LIMIT,
				options,
				error: response.err,
			});
		}
		return response;
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
		const response = this._oco(options);
		const opId = ++this._lastOp;
		if (response.err === null) {
			this.eventBus.emit("order.processed", {
				opId,
				type: OrderType.OCO,
				options,
				response,
			});
		} else {
			this.eventBus.emit("order.rejected", {
				opId,
				type: OrderType.OCO,
				options,
				error: response.err,
			});
		}
		return response;
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
			const error = CustomError(ERROR.ORDER_NOT_FOUND);
			this.eventBus.emit("order.rejected", {
				opId: ++this._lastOp,
				options: { orderID, orderUpdate },
				error,
			});
			return {
				done: [],
				activated: [],
				partial: null,
				partialQuantityProcessed: 0,
				quantityLeft: 0,
				err: error,
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
					undefined,
					"",
					SelfTradePreventionMode.NONE,
				);
				if (response.err === null) {
					this.eventBus.emit("order.modified", {
						opId: ++this._lastOp,
						orderID,
						orderUpdate,
						response,
					});
				} else {
					this.eventBus.emit("order.rejected", {
						opId: ++this._lastOp,
						options: { orderID, orderUpdate },
						error: response.err,
					});
				}
				return response;
			}
		}
		// Missing one of price and/or size, or the provided ones are not greater than zero
		const error = CustomError(ERROR.INVALID_PRICE_OR_QUANTITY);
		this.eventBus.emit("order.rejected", {
			opId: ++this._lastOp,
			type: OrderType.LIMIT,
			options: { orderID, orderUpdate },
			error,
		});
		return {
			done: [],
			activated: [],
			partial: null,
			partialQuantityProcessed: 0,
			quantityLeft: orderUpdate?.size ?? 0,
			err: error,
		};
	};

	/**
	 * Remove an existing order with given ID from the order book
	 *
	 * @param orderID - The ID of the order to be removed
	 * @returns The removed order if exists or `undefined`
	 */
	public cancel = (orderID: string): ICancelOrder | undefined => {
		const response = this._cancelOrder(orderID);
		if (response !== undefined) {
			this.eventBus.emit("order.cancelled", {
				opId: ++this._lastOp,
				orderID,
				response,
			});
		} else {
			this.eventBus.emit("order.rejected", {
				opId: ++this._lastOp,
				options: { orderID },
				error: CustomError(ERROR.ORDER_NOT_FOUND),
			});
		}
		return response;
	};

	/**
	 * Get an existing order with the given ID
	 *
	 * @param orderID - The ID of the order to be returned
	 * @returns The order if exists or `undefined`
	 */
	public order = (orderID: string): ILimitOrder | undefined => {
		return this.orders[orderID]?.toObject();
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
		const bids: Array<{ price: number; orders: ILimitOrder[] }> = [];
		const asks: Array<{ price: number; orders: ILimitOrder[] }> = [];
		this.bids.priceTree().forEach((price: number, orders: OrderQueue) => {
			bids.push({ price, orders: orders.toArray().map((o) => o.toObject()) });
		});
		this.asks.priceTree().forEach((price: number, orders: OrderQueue) => {
			asks.push({ price, orders: orders.toArray().map((o) => o.toObject()) });
		});
		const stopBook = this.stopBook.snapshot();
		return { bids, asks, stopBook, ts: Date.now(), lastOp: this._lastOp };
	};

	private readonly _market = (
		options: MarketOrderOptions,
		incomingResponse?: IProcessOrder,
	): IProcessOrder => {
		const response = incomingResponse ?? this.validateMarketOrder(options);
		if (response.err !== null) return response;

		const takerAccountId = options.accountId;
		const takerStpMode = options.stpMode;

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
		while (
			quantityToTrade > 0 &&
			sideToProcess.len() > 0 &&
			response.err === null
		) {
			// if sideToProcess.len > 0 it is not necessary to verify that bestPrice exists
			const bestPrice = iter() as OrderQueue;
			const {
				done,
				partial,
				partialQuantityProcessed,
				quantityLeft,
				stpExpired,
				err,
			} = this.processQueue(
				bestPrice,
				quantityToTrade,
				takerAccountId,
				takerStpMode,
			);
			response.done = response.done.concat(done);
			response.partial = partial;
			response.partialQuantityProcessed = partialQuantityProcessed;
			quantityToTrade = quantityLeft;
			if (err !== null) {
				response.err = err;
			}
			if (stpExpired !== undefined) {
				if (response.stpExpired === undefined) {
					response.stpExpired = [];
				}
				response.stpExpired = response.stpExpired.concat(stpExpired);
			}
		}
		response.quantityLeft = quantityToTrade;

		if (response.err === null) {
			this.executeConditionalOrder(options.side, priceBefore, response);
		}

		return response;
	};

	private readonly _limit = (
		options: LimitOrderOptions & { ocoStopPrice?: number },
		incomingResponse?: IProcessOrder,
	): IProcessOrder => {
		const response = incomingResponse ?? this.validateLimitOrder(options);
		if (response.err !== null) return response;
		this.createLimitOrder(
			response,
			options.side,
			options.id,
			options.size,
			options.price,
			options.postOnly ?? false,
			options.timeInForce ?? TimeInForce.GTC,
			options.ocoStopPrice,
			options.accountId,
			options.stpMode,
		);
		return response;
	};

	private readonly _stopMarket = (
		options: StopMarketOrderOptions,
	): IProcessOrder => {
		const response = this.validateMarketOrder(options);
		if (response.err !== null) return response;
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
		if (response.err !== null) return response;
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
		if (response.err !== null) return response;
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
			if (response.err !== null) return response;

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
			response.done.push(stopLimit.toObject());
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
			response.done.push(stopOrder.toObject());
		} else {
			response.err = CustomError(ERROR.INVALID_CONDITIONAL_ORDER);
		}
		return response;
	};

	private readonly restoreSnapshot = (snapshot: Snapshot): void => {
		this._lastOp = snapshot.lastOp;
		for (const level of snapshot.bids) {
			for (const order of level.orders) {
				const newOrder = OrderFactory.createOrder(order);
				this.orders[newOrder.id] = newOrder;
				this.bids.append(newOrder);
			}
		}

		for (const level of snapshot.asks) {
			for (const order of level.orders) {
				const newOrder = OrderFactory.createOrder(order);
				this.orders[newOrder.id] = newOrder;
				this.asks.append(newOrder);
			}
		}

		if (snapshot.stopBook?.bids?.length > 0) {
			for (const level of snapshot.stopBook.bids) {
				for (const order of level.orders) {
					// @ts-expect-error // TODO fix types
					const newOrder = OrderFactory.createOrder(order);
					// @ts-expect-error // TODO fix types
					this.stopBook.add(newOrder);
				}
			}
		}

		if (snapshot.stopBook?.asks?.length > 0) {
			for (const level of snapshot.stopBook.asks) {
				for (const order of level.orders) {
					// @ts-expect-error // TODO fix types
					const newOrder = OrderFactory.createOrder(order);
					// @ts-expect-error // TODO fix types
					this.stopBook.add(newOrder);
				}
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
			order: side.remove(order)?.toObject(),
		};

		// Delete OCO Order only when the delete request comes from user
		if (!internalDeletion && order.ocoStopPrice !== undefined) {
			response.stopOrder = this.stopBook
				.remove(order.side, orderID, order.ocoStopPrice)
				?.toObject();
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
		takerAccountId?: string,
		stpMode?: SelfTradePreventionMode,
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
			comparator(price, bestPrice.price()) &&
			response.err === null
		) {
			if (postOnly) {
				response.err = CustomError(ERROR.LIMIT_ORDER_POST_ONLY);
				return;
			}
			const {
				done,
				partial,
				partialQuantityProcessed,
				quantityLeft,
				stpExpired,
				err,
			} = this.processQueue(
				bestPrice,
				quantityToTrade,
				takerAccountId,
				stpMode,
			);
			response.done = response.done.concat(done);
			response.partial = partial;
			response.partialQuantityProcessed = partialQuantityProcessed;
			quantityToTrade = quantityLeft;
			response.quantityLeft = quantityToTrade;
			if (err !== null) {
				response.err = err;
			}
			if (stpExpired !== undefined) {
				if (response.stpExpired === undefined) {
					response.stpExpired = [];
				}
				response.stpExpired = response.stpExpired.concat(stpExpired);
			}
			bestPrice = iter();
		}

		// If STP triggered (EXPIRE_TAKER or EXPIRE_BOTH), don't add order to book
		if (response.err !== null) {
			return;
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
				accountId: takerAccountId,
				stpMode: stpMode,
				...(ocoStopPrice !== undefined ? { ocoStopPrice } : {}),
			});
			if (response.done.length > 0) {
				response.partialQuantityProcessed = size - quantityToTrade;
				response.partial = order.toObject();
			}
			this.orders[orderID] = sideToAdd.append(order);
		} else {
			let totalQuantity = 0;
			let totalPrice = 0;

			response.done.forEach((order: IOrder) => {
				totalQuantity += order.size;
				totalPrice += (order as ILimitOrder).price * order.size;
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
				accountId: takerAccountId,
				stpMode: stpMode,
			});
			response.done.push(order.toObject());
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
							accountId: stopOrder.accountId,
							stpMode: stopOrder.stpMode,
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
							accountId: stopOrder.accountId,
							stpMode: stopOrder.stpMode,
						},
						response,
					);
				}
				response.activated.push(stopOrder.toObject());
			});
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
		takerAccountId?: string,
		stpMode?: SelfTradePreventionMode,
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
					// Self-Trade Prevention check
					if (
						takerAccountId &&
						headOrder.accountId === takerAccountId &&
						stpMode != null &&
						stpMode !== SelfTradePreventionMode.NONE
					) {
						switch (stpMode) {
							case SelfTradePreventionMode.EXPIRE_MAKER: {
								// Remove the maker order from the book, continue matching
								const removedOrder = this._cancelOrder(headOrder.id, true);
								if (removedOrder?.order !== undefined) {
									if (response.stpExpired === undefined) {
										response.stpExpired = [];
									}
									response.stpExpired.push(removedOrder.order);
								}
								continue;
							}
							case SelfTradePreventionMode.EXPIRE_TAKER: {
								// Taker expires immediately, nothing matches
								response.err = CustomError(ERROR.STP_TRIGGERED);
								response.quantityLeft = quantityToTrade;
								return response;
							}
							case SelfTradePreventionMode.EXPIRE_BOTH: {
								// Remove maker from book AND expire taker
								const removedOrder = this._cancelOrder(headOrder.id, true);
								if (removedOrder?.order !== undefined) {
									if (response.stpExpired === undefined) {
										response.stpExpired = [];
									}
									response.stpExpired.push(removedOrder.order);
								}
								response.err = CustomError(ERROR.STP_TRIGGERED);
								response.quantityLeft = quantityToTrade;
								return response;
							}
						}
					}

					if (response.quantityLeft < headOrder.size) {
						const partial = OrderFactory.createOrder({
							...headOrder.toObject(),
							size: headOrder.size - response.quantityLeft,
						});
						response.partial = partial.toObject();
						this.orders[headOrder.id] = partial;
						response.partialQuantityProcessed = response.quantityLeft;
						orderQueue.update(headOrder, partial);
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
					if (headOrder.ocoStopPrice !== undefined) {
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
		// biome-ignore lint/suspicious/useIterableCallbackReturn: the forEach of the priceTree must return true to break the loop
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
		// biome-ignore lint/suspicious/useIterableCallbackReturn: the forEach of the priceTree must return true to break the loop
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
