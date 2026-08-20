import assert from "node:assert/strict";
import test from "node:test";
import { ERROR, ErrorCodes, ErrorMessages } from "../src/errors";
import type { LimitOrder } from "../src/order";
import { OrderBook } from "../src/orderbook";
import type { OrderQueue } from "../src/orderqueue";
import type { StopQueue } from "../src/stopqueue";
import {
	type ILimitOrder,
	type IProcessOrder,
	type IStopLimitOrder,
	type IStopMarketOrder,
	type JournalLog,
	type OrderBookEventMap,
	type OrderBookPlugin,
	OrderType,
	Side,
	type StopOrder,
	TimeInForce,
} from "../src/types";

const addDepth = (ob: OrderBook, prefix: string, quantity: number): void => {
	for (let index = 50; index < 100; index += 10) {
		ob.limit({
			side: Side.BUY,
			id: `${prefix}buy-${index}`,
			size: quantity,
			price: index,
		});
	}
	for (let index = 100; index < 150; index += 10) {
		ob.limit({
			side: Side.SELL,
			id: `${prefix}sell-${index}`,
			size: quantity,
			price: index,
		});
	}
};

// First test the addDepth function used by all the other test
void test("test addDepth testing function", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 10);
	assert.equal(
		ob.toString(),
		"\n140 -> 10\n130 -> 10\n120 -> 10\n110 -> 10\n100 -> 10\r\n------------------------------------\n90 -> 10\n80 -> 10\n70 -> 10\n60 -> 10\n50 -> 10",
	);
});
void test("test limit place", () => {
	const ob = new OrderBook();
	const size = 2;
	for (let index = 50; index < 100; index += 10) {
		const { done, partial, partialQuantityProcessed, err } = ob.limit({
			side: Side.BUY,
			id: `buy-${index}`,
			size,
			price: index,
		});
		assert.equal(done.length, 0);
		assert.equal(partial === null, true);
		assert.equal(partialQuantityProcessed, 0);
		assert.equal(err === null, true);
	}

	for (let index = 100; index < 150; index += 10) {
		const { done, partial, partialQuantityProcessed, err } = ob.limit({
			side: Side.SELL,
			id: `sell-${index}`,
			size,
			price: index,
		});
		assert.equal(done.length, 0);
		assert.equal(partial === null, true);
		assert.equal(partialQuantityProcessed, 0);
		assert.equal(err === null, true);
	}

	assert.equal(ob.order("fake") === undefined, true);
	const orderSell100 = ob.order("sell-100");
	assert.equal(orderSell100?.side, Side.SELL);
	assert.equal(orderSell100?.size, size);
	assert.equal(orderSell100?.price, 100);

	const depth = ob.depth();

	depth.forEach((side, index) => {
		side.forEach((level, subIndex) => {
			assert.equal(level[1], 2);
			const price = index === 0 ? 100 + 10 * subIndex : 90 - 10 * subIndex;
			assert.equal(level[0], price);
		});
	});
});

void test("test limit", () => {
	const ob = new OrderBook();

	addDepth(ob, "", 2);
	assert.equal(ob.marketPrice, 0);
	const process1 =
		// { done, partial, partialQuantityProcessed, quantityLeft, err }
		ob.limit({ side: Side.BUY, id: "order-b100", size: 1, price: 100 });

	assert.equal(ob.marketPrice, 100);
	assert.equal(process1.err === null, true);
	assert.equal(process1.done[0].id, "order-b100");
	assert.equal((process1.done[0] as ILimitOrder).makerQty, 0);
	assert.equal((process1.done[0] as ILimitOrder).takerQty, 1);
	assert.equal(
		(process1.done[0] as ILimitOrder).makerQty +
			(process1.done[0] as ILimitOrder).takerQty,
		(process1.done[0] as ILimitOrder).origSize,
	);

	assert.equal(process1.partial?.id, "sell-100");
	assert.equal(process1.partial?.origSize, 2);
	assert.equal(process1.partial?.size, 1);
	assert.equal(process1.partial?.takerQty, 0);
	assert.equal(process1.partial?.makerQty, 2);
	assert.equal(process1.partialQuantityProcessed, 1);
	assert.equal(process1.quantityLeft, 0);
	assert.equal(
		process1.partialQuantityProcessed + process1.quantityLeft,
		(process1.done[0] as ILimitOrder).origSize,
	);

	const process2 =
		// { done, partial, partialQuantityProcessed, quantityLeft, err } =
		ob.limit({ side: Side.BUY, id: "order-b150", size: 10, price: 150 });
	assert.equal(process2.err === null, true);
	assert.equal(process2.done.length, 5);
	assert.equal(process2.partial?.id, "order-b150");
	assert.equal(process2.partial?.origSize, 10);
	assert.equal(process2.partial?.size, 1);
	assert.equal(process2.partial?.takerQty, 9);
	assert.equal(process2.partial?.makerQty, 1);
	assert.equal(
		process2.partial?.takerQty + process2.partial?.makerQty,
		process2.partial?.origSize,
	);
	assert.equal(process2.partialQuantityProcessed, 9);
	assert.equal(process2.quantityLeft, 1);
	assert.equal(
		process2.partialQuantityProcessed + process2.quantityLeft,
		process2.partial?.origSize,
	);

	const process3 = ob.limit({
		side: Side.SELL,
		id: "buy-70",
		size: 11,
		price: 40,
	});
	assert.equal(process3.err?.message, ErrorMessages.ORDER_ALREDY_EXISTS);
	assert.equal(process3.err?.code, ErrorCodes.ORDER_ALREDY_EXISTS);

	const process4 = ob.limit({
		side: Side.SELL,
		id: "fake-70",
		size: 0,
		price: 40,
	});
	assert.equal(process4.err?.message, ErrorMessages.INVALID_QUANTITY);
	assert.equal(process4.err?.code, ErrorCodes.INVALID_QUANTITY);

	const process5 = ob.limit({
		// @ts-expect-error invalid side
		side: "unsupported-side",
		id: "order-70",
		size: 70,
		price: 100,
	});
	assert.equal(process5.err?.message, ErrorMessages.INVALID_SIDE);
	assert.equal(process5.err?.code, ErrorCodes.INVALID_SIDE);

	const removed = ob.cancel("order-b100");
	assert.equal(removed === undefined, true);
	// Test also the createOrder method
	const process6 = ob.createOrder({
		type: OrderType.LIMIT,
		side: Side.SELL,
		size: 11,
		price: 40,
		id: "order-s40",
		timeInForce: TimeInForce.GTC,
	});
	assert.equal(ob.marketPrice, 50);
	assert.equal(process6.err === null, true);
	assert.equal(process6.done.length, 7);
	assert.equal(process6.partial === null, true);
	assert.equal(process6.partialQuantityProcessed, 0);

	const process7 = ob.limit({
		side: Side.SELL,
		id: "fake-wrong-size",
		// @ts-expect-error size must be a number
		size: "0",
		price: 40,
	});
	assert.equal(process7.err?.message, ErrorMessages.INVALID_QUANTITY);
	assert.equal(process7.err?.code, ErrorCodes.INVALID_QUANTITY);

	const process8 = ob.limit({
		side: Side.SELL,
		id: "fake-wrong-size",
		// @ts-expect-error size must be a number
		size: null,
		price: 40,
	});
	assert.equal(process8.err?.message, ErrorMessages.INVALID_QUANTITY);
	assert.equal(process8.err?.code, ErrorCodes.INVALID_QUANTITY);

	const process9 = ob.limit({
		side: Side.SELL,
		id: "fake-wrong-price",
		size: 10,
		// @ts-expect-error price must be a number
		price: "40",
	});
	assert.equal(process9.err?.message, ErrorMessages.INVALID_PRICE);
	assert.equal(process9.err?.code, ErrorCodes.INVALID_PRICE);

	// @ts-expect-error missing price
	const process10 = ob.limit({
		side: Side.SELL,
		id: "fake-without-price",
		size: 10,
	});
	assert.equal(process10.err?.message, ErrorMessages.INVALID_PRICE);
	assert.equal(process10.err?.code, ErrorCodes.INVALID_PRICE);

	const process11 = ob.limit({
		side: Side.SELL,
		id: "unsupported-tif",
		size: 10,
		price: 10,
		// @ts-expect-error invalid time in force
		timeInForce: "FAKE",
	});
	assert.equal(process11.err?.message, ErrorMessages.INVALID_TIF);
	assert.equal(process11.err?.code, ErrorCodes.INVALID_TIF);
});

void test("test limit with postOnly", () => {
	const ob = new OrderBook();

	addDepth(ob, "", 2);
	assert.equal(ob.marketPrice, 0);
	const process1 = ob.limit({
		side: Side.BUY,
		id: "order-b90",
		size: 2,
		price: 90,
		postOnly: true,
	});
	assert.equal(process1.err, null);
	assert.equal(process1.quantityLeft, 2);

	const process2 = ob.limit({
		side: Side.BUY,
		id: "order-b100",
		size: 3,
		price: 100,
		postOnly: true,
	});
	assert.equal(process2.err?.message, ErrorMessages.LIMIT_ORDER_POST_ONLY);
	assert.equal(process2.err?.code, ErrorCodes.LIMIT_ORDER_POST_ONLY);

	assert.equal(process2.quantityLeft, 3);
});

void test("test limit FOK and IOC", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);
	const process1 = ob.limit({
		side: Side.BUY,
		id: "order-fok-b100",
		size: 3,
		price: 100,
		timeInForce: TimeInForce.FOK,
	});
	assert.equal(
		process1.err?.message,
		ErrorMessages.LIMIT_ORDER_FOK_NOT_FILLABLE,
	);
	assert.equal(process1.err?.code, ErrorCodes.LIMIT_ORDER_FOK_NOT_FILLABLE);

	const process2 = ob.limit({
		side: Side.SELL,
		id: "order-fok-s90",
		size: 3,
		price: 90,
		timeInForce: TimeInForce.FOK,
	});
	assert.equal(
		process2.err?.message,
		ErrorMessages.LIMIT_ORDER_FOK_NOT_FILLABLE,
	);
	assert.equal(process2.err?.code, ErrorCodes.LIMIT_ORDER_FOK_NOT_FILLABLE);

	const process3 = ob.limit({
		side: Side.BUY,
		id: "buy-order-size-greather-than-order-side-volume",
		size: 30,
		price: 100,
		timeInForce: TimeInForce.FOK,
	});
	assert.equal(
		process3.err?.message,
		ErrorMessages.LIMIT_ORDER_FOK_NOT_FILLABLE,
	);
	assert.equal(process3.err?.code, ErrorCodes.LIMIT_ORDER_FOK_NOT_FILLABLE);

	const process4 = ob.limit({
		side: Side.SELL,
		id: "sell-order-size-greather-than-order-side-volume",
		size: 30,
		price: 90,
		timeInForce: TimeInForce.FOK,
	});
	assert.equal(
		process4.err?.message,
		ErrorMessages.LIMIT_ORDER_FOK_NOT_FILLABLE,
	);
	assert.equal(process4.err?.code, ErrorCodes.LIMIT_ORDER_FOK_NOT_FILLABLE);

	ob.limit({
		side: Side.BUY,
		id: "order-ioc-b100",
		size: 3,
		price: 100,
		timeInForce: TimeInForce.IOC,
	});
	assert.equal(ob.order("order-ioc-b100") === undefined, true);

	const processIOC = ob.limit({
		side: Side.SELL,
		id: "order-ioc-s90",
		size: 3,
		price: 90,
		timeInForce: TimeInForce.IOC,
	});
	assert.equal(ob.order("order-ioc-s90") === undefined, true);
	assert.equal(processIOC.partial?.id, "order-ioc-s90");

	const processFOKBuy = ob.limit({
		side: Side.BUY,
		id: "order-fok-b110",
		size: 2,
		price: 120,
		timeInForce: TimeInForce.FOK,
	});

	assert.equal(processFOKBuy.err === null, true);
	assert.equal(processFOKBuy.quantityLeft, 0);

	const processFOKSell = ob.limit({
		side: Side.SELL,
		id: "order-fok-sell-4-70",
		size: 4,
		price: 70,
		timeInForce: TimeInForce.FOK,
	});
	assert.equal(processFOKSell.err === null, true);
	assert.equal(processFOKSell.quantityLeft, 0);
});

void test("test market", () => {
	const ob = new OrderBook();

	addDepth(ob, "", 2);

	const process1 =
		// { done, partial, partialQuantityProcessed, quantityLeft, err }
		ob.market({ side: Side.BUY, size: 3 });

	assert.equal(process1.err === null, true);
	assert.equal(process1.quantityLeft, 0);
	assert.equal(process1.partialQuantityProcessed, 1);

	// Test also the createOrder method
	const process3 =
		// { done, partial, partialQuantityProcessed, quantityLeft, err } =
		ob.createOrder({ type: OrderType.MARKET, side: Side.SELL, size: 12 });

	assert.equal(process3.done.length, 5);
	assert.equal(process3.err === null, true);
	assert.equal(process3.partial === null, true);
	assert.equal(process3.partialQuantityProcessed, 0);
	assert.equal(process3.quantityLeft, 2);

	// @ts-expect-error size must be a number
	const process4 = ob.market({ side: Side.SELL, size: "0" });
	assert.equal(process4.err?.message, ErrorMessages.INSUFFICIENT_QUANTITY);
	assert.equal(process4.err?.code, ErrorCodes.INSUFFICIENT_QUANTITY);

	// @ts-expect-error missing size
	const process5 = ob.market({ side: Side.SELL });
	assert.equal(process5.err?.message, ErrorMessages.INSUFFICIENT_QUANTITY);
	assert.equal(process5.err?.code, ErrorCodes.INSUFFICIENT_QUANTITY);

	// @ts-expect-error invalid side
	const process6 = ob.market({ side: "unsupported-side", size: 100 });
	assert.equal(process6.err?.message, ErrorMessages.INVALID_SIDE);
	assert.equal(process6.err?.code, ErrorCodes.INVALID_SIDE);
});

void test("createOrder error", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);
	const result = ob.createOrder({
		// @ts-expect-error invalid order type
		type: "wrong-market-type",
		side: Side.SELL,
		size: 10,
	});
	assert.equal(result.err?.message, ErrorMessages.INVALID_ORDER_TYPE);
	assert.equal(result.err?.code, ErrorCodes.INVALID_ORDER_TYPE);

	// Added for testing with default timeOnForce when not provided
	const process1 = ob.createOrder({
		type: OrderType.LIMIT,
		id: "buy-1-at-90",
		side: Side.BUY,
		size: 1,
		price: 90,
	});
	assert.equal(process1.done.length, 0);
	assert.equal(process1.partial, null);
	assert.equal(process1.partialQuantityProcessed, 0);
	assert.equal(process1.quantityLeft, 1);
	assert.equal(process1.err, null);
});

/**
 * Stop-Market Order:
 *    Buy: marketPrice < stopPrice
 *    Sell: marketPrice > stopPrice
 */
void test("test stop_market order", () => {
	const ob = new OrderBook();

	addDepth(ob, "", 2);
	// We need to create at least on maket order in order to set
	// the market price
	ob.market({ side: Side.BUY, size: 3 });
	assert.equal(ob.marketPrice, 110);

	{
		// Test stop market BUY wrong stopPrice
		const wrongStopPrice = ob.stopMarket({
			side: Side.BUY,
			size: 1,
			stopPrice: ob.marketPrice - 10,
		}); // Below market price
		assert.equal(
			wrongStopPrice.err?.message,
			ErrorMessages.INVALID_CONDITIONAL_ORDER,
		);
		assert.equal(
			wrongStopPrice.err?.code,
			ErrorCodes.INVALID_CONDITIONAL_ORDER,
		);
		const wrongStopPrice2 = ob.stopMarket({
			side: Side.BUY,
			size: 1,
			stopPrice: ob.marketPrice,
		}); // Same as market price
		assert.equal(
			wrongStopPrice2.err?.message,
			ErrorMessages.INVALID_CONDITIONAL_ORDER,
		);
		assert.equal(
			wrongStopPrice2.err?.code,
			ErrorCodes.INVALID_CONDITIONAL_ORDER,
		);
		const wrongOtherOrderOption1 = ob.stopMarket({
			// @ts-expect-error invalid side
			side: "wrong-side",
			size: 1,
		});
		assert.equal(wrongOtherOrderOption1.err != null, true);

		// @ts-expect-error size must be greather than 0
		const wrongOtherOrderOption2 = ob.stopMarket({ side: Side.BUY, size: 0 });
		assert.equal(wrongOtherOrderOption2.err != null, true);

		// Add a stop market BUY order
		const beforeMarketPrice = ob.marketPrice;
		const stopPrice = 120;
		const size = 1;
		const stopMarketBuy = ob.stopMarket({ side: Side.BUY, size, stopPrice });

		// Market price should be the same as before
		assert.equal(ob.marketPrice, beforeMarketPrice);
		const stopOrder = stopMarketBuy.done[0];
		assert.equal(stopOrder.type, OrderType.STOP_MARKET);
		assert.equal(stopOrder.side, Side.BUY);
		assert.equal(stopOrder.size, size);
		assert.equal(stopOrder.stopPrice, stopPrice);
		assert.equal(stopMarketBuy.quantityLeft, size);
		assert.equal(stopMarketBuy.err, null);

		// Create a market order that activate the stop order
		const resp = ob.market({ side: Side.BUY, size: 2 });
		const activatedStopOrder = resp.activated[0];
		assert.equal(JSON.stringify(activatedStopOrder), JSON.stringify(stopOrder));
		assert.equal(resp.done.length, 2);
		assert.equal(resp.partial, null);
		assert.equal(resp.err, null);
	}

	{
		// Add a stop market SELL order
		// Test stop market BUY wrong stopPrice
		const wrongStopPrice = ob.stopMarket({
			side: Side.SELL,
			size: 1,
			stopPrice: ob.marketPrice + 10,
		}); // Above market price
		assert.equal(
			wrongStopPrice.err?.message,
			ErrorMessages.INVALID_CONDITIONAL_ORDER,
		);
		assert.equal(
			wrongStopPrice.err?.code,
			ErrorCodes.INVALID_CONDITIONAL_ORDER,
		);
		const wrongStopPrice2 = ob.stopMarket({
			side: Side.SELL,
			size: 1,
			stopPrice: ob.marketPrice,
		}); // Same as market price
		assert.equal(
			wrongStopPrice2.err?.message,
			ErrorMessages.INVALID_CONDITIONAL_ORDER,
		);
		assert.equal(
			wrongStopPrice2.err?.code,
			ErrorCodes.INVALID_CONDITIONAL_ORDER,
		);

		// Add a stop market SELL order
		const beforeMarketPrice = ob.marketPrice;
		const stopPrice = 100;
		const size = 2;
		const stopMarketSell = ob.stopMarket({
			side: Side.SELL,
			size,
			stopPrice,
		});

		// Market price should be the same as before
		assert.equal(ob.marketPrice, beforeMarketPrice);
		const stopOrder = stopMarketSell.done[0] as IStopMarketOrder;
		assert.equal(stopOrder.type, OrderType.STOP_MARKET);
		assert.equal(stopOrder.side, Side.SELL);
		assert.equal(stopOrder.size, size);
		assert.equal(stopOrder.stopPrice, stopPrice);
		assert.equal(stopMarketSell.quantityLeft, size);
		assert.equal(stopMarketSell.err, null);

		// Create a market order that activate the stop order
		const resp = ob.market({ side: Side.SELL, size: 2 });
		const activatedStopOrder = resp.activated[0];
		assert.equal(JSON.stringify(activatedStopOrder), JSON.stringify(stopOrder));
		assert.equal(resp.done.length, 2);
		assert.equal(resp.partial, null);
		assert.equal(resp.err, null);
	}

	{
		// Use the createOrder method to create a stop order
		const size = 2;
		const stopPrice = ob.marketPrice - 10;
		const response = ob.createOrder({
			type: OrderType.STOP_MARKET,
			side: Side.SELL,
			size,
			stopPrice,
		});
		const stopOrder = response.done[0];
		assert.equal(stopOrder.type, OrderType.STOP_MARKET);
		assert.equal(stopOrder.side, Side.SELL);
		assert.equal(stopOrder.size, size);
		assert.equal(stopOrder.stopPrice, stopPrice);
		assert.equal(response.err, null);
		assert.equal(response.quantityLeft, 2);
	}
});

/**
 * Stop-Limit Order:
 *    Buy: marketPrice < stopPrice <= price
 *    Sell: marketPrice > stopPrice >= price
 */
void test("test stop_limit order", () => {
	const ob = new OrderBook();

	addDepth(ob, "", 2);
	// We need to create at least on maket order in order to set
	// the market price
	ob.market({ side: Side.BUY, size: 3 });
	assert.equal(ob.marketPrice, 110);

	{
		// Test stop limit BUY wrong stopPrice
		const wrongStopPrice = ob.stopLimit({
			id: "fake-id",
			side: Side.BUY,
			size: 1,
			stopPrice: ob.marketPrice - 10, // Below market price
			price: ob.marketPrice,
		});
		assert.equal(
			wrongStopPrice.err?.message,
			ErrorMessages.INVALID_CONDITIONAL_ORDER,
		);
		assert.equal(
			wrongStopPrice.err?.code,
			ErrorCodes.INVALID_CONDITIONAL_ORDER,
		);
		const wrongStopPrice2 = ob.stopLimit({
			id: "fake-id",
			side: Side.BUY,
			size: 1,
			stopPrice: ob.marketPrice,
			price: ob.marketPrice,
		}); // Same as market price
		assert.equal(
			wrongStopPrice2.err?.message,
			ErrorMessages.INVALID_CONDITIONAL_ORDER,
		);
		assert.equal(
			wrongStopPrice2.err?.code,
			ErrorCodes.INVALID_CONDITIONAL_ORDER,
		);
		const wrongOtherOrderOption1 = ob.stopLimit({
			// @ts-expect-error invalid side
			side: "wrong-side",
			size: 1,
			price: 10,
		});
		assert.equal(wrongOtherOrderOption1.err != null, true);

		// @ts-expect-error size must be greather than 0
		const wrongOtherOrderOption2 = ob.stopLimit({
			side: Side.BUY,
			size: 0,
			price: 10,
		});
		assert.equal(wrongOtherOrderOption2.err != null, true);

		// @ts-expect-error price must be greather than 0
		const wrongOtherOrderOption3 = ob.stopLimit({
			side: Side.BUY,
			size: 1,
			price: 0,
		});
		assert.equal(wrongOtherOrderOption3.err != null, true);

		// Add a stop limit BUY order
		const beforeMarketPrice = ob.marketPrice;
		const stopPrice = 120;
		const price = 130;
		const size = 1;
		const stopLimitBuy = ob.stopLimit({
			id: "stop-limit-buy-1",
			side: Side.BUY,
			size,
			stopPrice,
			price,
			timeInForce: TimeInForce.IOC,
		});

		// Market price should be the same as before
		assert.equal(ob.marketPrice, beforeMarketPrice);
		const stopOrder = stopLimitBuy.done[0] as IStopLimitOrder;
		assert.equal(stopOrder.type, OrderType.STOP_LIMIT);
		assert.equal(stopOrder.side, Side.BUY);
		assert.equal(stopOrder.size, size);
		assert.equal(stopOrder.price, price);
		assert.equal(stopOrder.stopPrice, stopPrice);
		assert.equal(stopOrder.timeInForce, TimeInForce.IOC);
		assert.equal(stopLimitBuy.quantityLeft, size);
		assert.equal(stopLimitBuy.err, null);

		// Create a market order that activate the stop order
		const resp = ob.market({ side: Side.BUY, size: 6 });
		const activatedStopOrder = resp.activated[0];
		assert.equal(JSON.stringify(activatedStopOrder), JSON.stringify(stopOrder));
		assert.equal(resp.done.length, 3);

		// The stop order becomes a LimitOrder
		const partialOrder = resp.partial as ILimitOrder;
		assert.equal(partialOrder.id, stopOrder.id);
		assert.equal(partialOrder.type, OrderType.LIMIT);
		assert.equal(resp.err, null);
	}

	// addDepth(ob, 'second-run-', 2)
	ob.market({ side: Side.SELL, size: 1 });

	{
		// Test stop limit SELL wrong stopPrice
		const wrongStopPrice = ob.stopLimit({
			id: "fake-id",
			side: Side.SELL,
			size: 1,
			stopPrice: ob.marketPrice + 10, // Above market price
			price: ob.marketPrice,
		});
		assert.equal(
			wrongStopPrice.err?.message,
			ErrorMessages.INVALID_CONDITIONAL_ORDER,
		);
		assert.equal(
			wrongStopPrice.err?.code,
			ErrorCodes.INVALID_CONDITIONAL_ORDER,
		);
		const wrongStopPrice2 = ob.stopLimit({
			id: "fake-id",
			side: Side.SELL,
			size: 1,
			stopPrice: ob.marketPrice,
			price: ob.marketPrice,
		}); // Same as market price
		assert.equal(
			wrongStopPrice2.err?.message,
			ErrorMessages.INVALID_CONDITIONAL_ORDER,
		);
		assert.equal(
			wrongStopPrice2.err?.code,
			ErrorCodes.INVALID_CONDITIONAL_ORDER,
		);

		// Add a stop limit BUY order
		const beforeMarketPrice = ob.marketPrice;
		const stopPrice = 80;
		const price = 70;
		const size = 1;
		const stopLimitSell = ob.stopLimit({
			id: "stop-limit-sell-1",
			side: Side.SELL,
			size,
			stopPrice,
			price,
		});

		// Market price should be the same as before
		assert.equal(ob.marketPrice, beforeMarketPrice);
		const stopOrder = stopLimitSell.done[0] as IStopLimitOrder;
		assert.equal(stopOrder.type, OrderType.STOP_LIMIT);
		assert.equal(stopOrder.side, Side.SELL);
		assert.equal(stopOrder.size, size);
		assert.equal(stopOrder.price, price);
		assert.equal(stopOrder.stopPrice, stopPrice);
		assert.equal(stopOrder.timeInForce, TimeInForce.GTC);
		assert.equal(stopLimitSell.quantityLeft, size);
		assert.equal(stopLimitSell.err, null);

		// Create a market order that activate the stop order
		const resp = ob.market({ side: Side.SELL, size: 6 });
		const activatedStopOrder = resp.activated[0];
		assert.equal(JSON.stringify(activatedStopOrder), JSON.stringify(stopOrder));
		assert.equal(resp.done.length, 3);

		// The stop order becomes a LimitOrder
		const partialOrder = resp.partial as ILimitOrder;
		assert.equal(partialOrder.id, stopOrder.id);
		assert.equal(partialOrder.type, OrderType.LIMIT);
		assert.equal(resp.err, null);
	}

	{
		// Use the createOrder method to create a stop order
		const size = 2;
		const stopPrice = ob.marketPrice - 10;
		const price = ob.marketPrice - 10;
		const response = ob.createOrder({
			type: OrderType.STOP_LIMIT,
			id: "some-order-id",
			side: Side.SELL,
			size,
			stopPrice,
			price,
		});
		const stopOrder = response.done[0] as IStopLimitOrder;
		assert.equal(stopOrder.type, OrderType.STOP_LIMIT);
		assert.equal(stopOrder.side, Side.SELL);
		assert.equal(stopOrder.size, size);
		assert.equal(stopOrder.stopPrice, stopPrice);
		assert.equal(stopOrder.price, price);
		assert.equal(response.err, null);
		assert.equal(response.quantityLeft, 2);
	}
});

/**
 * OCO Order:
 *    Buy: price < marketPrice < stopPrice
 *    Sell: price > marketPrice > stopPrice
 */
void test("test oco order", () => {
	const ob = new OrderBook();

	addDepth(ob, "", 2);
	// We need to create at least on maket order in order to set
	// the market price
	ob.market({ side: Side.BUY, size: 3, id: "some-fake-order" });
	assert.equal(ob.marketPrice, 110);

	const validate = (
		orderId: string,
		side: Side,
		price: number,
		stopPrice: number,
		stopLimitPrice: number,
		expect: ERROR | ((response: IProcessOrder) => void),
	): void => {
		const order = ob.oco({
			id: orderId,
			side,
			size: 1,
			price,
			stopPrice,
			stopLimitPrice,
			stopLimitTimeInForce: TimeInForce.GTC,
		});
		if (typeof expect === "function") {
			expect(order);
		} else {
			assert.equal(order.err?.message, ErrorMessages[expect]);
			assert.equal(order.err?.code, ErrorCodes[expect]);
		}
	};

	// Test OCO Buy
	// wrong stopPrice
	validate(
		"fake-id",
		Side.BUY,
		ob.marketPrice - 10,
		ob.marketPrice - 10,
		ob.marketPrice,
		ERROR.INVALID_CONDITIONAL_ORDER,
	);
	// wrong price
	validate(
		"fake-id",
		Side.BUY,
		ob.marketPrice + 10,
		ob.marketPrice + 10,
		ob.marketPrice,
		ERROR.INVALID_CONDITIONAL_ORDER,
	);

	// Here marketPrice is 110, lowest sell is 110 and highest buy is 90
	// valid OCO with limit to 100 and stopLimit to 120
	validate("oco-buy-1", Side.BUY, 100, 120, 121, (response) => {
		const order = response.done[0] as IStopLimitOrder;
		assert.equal(order.type, OrderType.STOP_LIMIT);
		assert.equal(order.side, Side.BUY);
		assert.equal(order.stopPrice === 120, true);
		assert.equal(order.price === 121, true);
		assert.equal(order.isOCO, true);
		// The limit oco must be the only one inserted in the price level 100
		// @ts-expect-error bids is private
		assert.equal(ob.bids.maxPriceQueue()?.price(), 100);
		// @ts-expect-error bids is private
		assert.equal(ob.bids.maxPriceQueue()?.tail()?.id, "oco-buy-1");
	});

	// Here marketPrice is 110, lowest sell is 110 and highest buy is 90
	// valid OCO with limit to 100 and stopLimit to 120
	validate("oco-buy-2", Side.BUY, 100, 120, 121, (response) => {
		const order = response.done[0] as IStopLimitOrder;
		assert.equal(order.type, OrderType.STOP_LIMIT);
		assert.equal(order.side, Side.BUY);
		assert.equal(order.stopPrice === 120, true);
		assert.equal(order.price === 121, true);
		assert.equal(order.isOCO, true);
		// The limit oco must be the only one inserted in the price level 100
		// @ts-expect-error bids is private
		assert.equal(ob.bids.maxPriceQueue()?.price(), 100);
		// @ts-expect-error bids is private
		assert.equal(ob.bids.maxPriceQueue()?.tail()?.id, "oco-buy-2");
	});

	// Test OCO Sell
	// wrong stopPrice
	validate(
		"fake-id",
		Side.SELL,
		ob.marketPrice + 10,
		ob.marketPrice + 10,
		ob.marketPrice,
		ERROR.INVALID_CONDITIONAL_ORDER,
	);
	// wrong price
	validate(
		"fake-id",
		Side.SELL,
		ob.marketPrice - 10,
		ob.marketPrice - 10,
		ob.marketPrice,
		ERROR.INVALID_CONDITIONAL_ORDER,
	);

	// Here marketPrice is 110, lowest sell is 110 and highest buy is 100
	// valid OCO with limit to 120 and stopLimit to 100
	validate("oco-sell-1", Side.SELL, 120, 100, 99, (response) => {
		const order = response.done[0] as IStopLimitOrder;
		assert.equal(order.type, OrderType.STOP_LIMIT);
		assert.equal(order.side, Side.SELL);
		assert.equal(order.stopPrice === 100, true);
		assert.equal(order.price === 99, true);
		assert.equal(order.isOCO, true);
		// The limit oco must be in the tail of the price level 120
		// @ts-expect-error bids is private
		assert.equal(ob.asks._prices[120].tail()?.id === "oco-sell-1", true);
	});

	//  Here marketPrice is 110, lowest sell is 110 and highest buy is 90
	//  valid OCO with limit to 120 and stopLimit to 100
	validate("oco-sell-2", Side.SELL, 120, 100, 99, (response) => {
		const order = response.done[0] as IStopLimitOrder;
		assert.equal(order.type, OrderType.STOP_LIMIT);
		assert.equal(order.side, Side.SELL);
		assert.equal(order.stopPrice === 100, true);
		assert.equal(order.price === 99, true);
		assert.equal(order.isOCO, true);
		// The limit oco must be in the tail of the price level 120
		// @ts-expect-error bids is private
		assert.equal(ob.asks._prices[120].tail()?.id === "oco-sell-2", true);
	});

	// Removing the limit order should remove also the stop limit
	const response = ob.cancel("oco-sell-2");
	assert.equal(response?.order.id, "oco-sell-2");
	assert.equal(response?.stopOrder?.id, "oco-sell-2");

	// Recreate the same OCO with the createOrder method
	{
		const response = ob.createOrder({
			id: "oco-sell-2",
			type: OrderType.OCO,
			size: 1,
			side: Side.SELL,
			price: 120,
			stopPrice: 100,
			stopLimitPrice: 99,
		});
		const order = response.done[0] as IStopLimitOrder;
		assert.equal(order.type, OrderType.STOP_LIMIT);
		assert.equal(order.side, Side.SELL);
		assert.equal(order.stopPrice === 100, true);
		assert.equal(order.price === 99, true);
		assert.equal(order.isOCO, true);
		// The limit oco must be in the tail of the price level 120
		// @ts-expect-error bids is private
		assert.equal(ob.asks._prices[120].tail()?.id === "oco-sell-2", true);
	}

	{
		const response = ob.market({ side: Side.SELL, size: 1 });
		// market order match against the limit order oco-buy-1 and activate the two stop limit
		// orders of the oco sell.
		assert.equal(response.done[0]?.id === "oco-buy-1", true);
		assert.equal(response.activated[0]?.id === "oco-sell-1", true);
		assert.equal(response.activated[1]?.id === "oco-sell-2", true);

		// The first stop limit oco-sell-1 match against the limit oco-buy-2
		assert.equal(response.done[1]?.id === "oco-buy-2", true);
		assert.equal(response.done[2]?.id === "oco-sell-1", true);

		// While the second stop limit oco-sell-2 go to the order book
		assert.equal(response.partial?.id === "oco-sell-2", true);
		assert.equal(response.partialQuantityProcessed, 0);

		// Both the side of the stop book must be empty
		// @ts-expect-error stopBook is private
		assert.equal(ob.stopBook.asks._priceTree.length, 0);
		// @ts-expect-error stopBook is private
		assert.equal(ob.stopBook.bids._priceTree.length, 0);
	}
});

void test("test modify", () => {
	const ob = new OrderBook();

	addDepth(ob, "", 2);

	const initialPrice1 = 52;
	const initialSize1 = 1000;
	const initialPrice2 = 200;
	const initialSize2 = 1000;
	ob.limit({
		side: Side.BUY,
		id: "first-order",
		size: initialSize1,
		price: initialPrice1,
	});
	ob.limit({
		side: Side.SELL,
		id: "second-order",
		size: initialSize2,
		price: initialPrice2,
	});

	{
		// SIDE BUY
		const newSize = 990;
		// Test update size
		let response = ob.modify("first-order", { size: newSize });
		assert.equal(response?.done.length, 0);
		assert.equal(response?.err, null);
		assert.equal(response?.quantityLeft, newSize);

		// Test passing an invalid price
		response = ob.modify("first-order", { price: 0 });
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test passing an invalid size
		response = ob.modify("first-order", { size: -1 });
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test passing an invalid size and price
		response = ob.modify("first-order", { size: -1, price: 0 });
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test passing an invalid price
		response = ob.modify("first-order", { price: 0 });
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test passing an invalid size
		response = ob.modify("first-order", { size: -1 });
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test modify without passing size and price
		// @ts-expect-error missing size and/or price
		response = ob.modify("first-order");
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test update price
		const newPrice = 82;
		response = ob.modify("first-order", { price: newPrice, size: newSize });
		assert.equal(response?.done.length, 0);
		assert.equal(response?.err, null);
		assert.equal(response?.quantityLeft, newSize);
		assert.equal(ob.order("first-order")?.price, newPrice);

		// @ts-expect-error properties bids and _priceTree are private
		const bookOrdersSize = ob.asks._priceTree.values
			.filter((queue) => queue.price() <= 130)
			.map((queue) =>
				queue
					.toArray()
					.reduce((acc: number, curr: LimitOrder) => acc + curr.size, 0),
			)
			.reduce((acc: number, curr: number) => acc + curr, 0);

		// Test modify price order that cross the market price and don't fill completely
		response = ob.modify("first-order", { price: 130 });
		const completedOrders = response?.done.map((order) => order.id);
		assert.equal(
			completedOrders?.join(),
			["sell-100", "sell-110", "sell-120", "sell-130"].join(),
		);
		assert.equal(response?.partial?.id, "first-order");
		assert.equal(response?.partial?.size, newSize - bookOrdersSize);
		assert.equal(response?.partialQuantityProcessed, bookOrdersSize);
		assert.equal(response?.quantityLeft, newSize - bookOrdersSize);
	}

	{
		// SIDE SELL
		const newSize = 990;
		// Test update size
		let response = ob.modify("second-order", { size: newSize });
		assert.equal(response?.done.length, 0);
		assert.equal(response?.err, null);
		assert.equal(response?.quantityLeft, newSize);

		// Test passing an invalid price
		response = ob.modify("second-order", { price: 0 });
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test passing an invalid size
		response = ob.modify("second-order", { size: -1 });
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test passing an invalid size and price
		response = ob.modify("second-order", { size: -1, price: 0 });
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test passing an invalid price
		response = ob.modify("second-order", { price: 0 });
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test passing an invalid size
		response = ob.modify("second-order", { size: -1 });
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test modify without passing size and price
		// @ts-expect-error missing size and/or price
		response = ob.modify("second-order");
		assert.equal(
			response?.err?.message,
			ErrorMessages.INVALID_PRICE_OR_QUANTITY,
		);
		assert.equal(response?.err?.code, ErrorCodes.INVALID_PRICE_OR_QUANTITY);

		// Test update price
		const newPrice = 250;
		response = ob.modify("second-order", { price: newPrice, size: newSize });
		assert.equal(response?.done.length, 0);
		assert.equal(response?.err, null);
		assert.equal(response?.quantityLeft, newSize);
		assert.equal(ob.order("second-order")?.price, newPrice);

		// @ts-expect-error properties bids and _priceTree are private
		const bookOrdersSize = ob.bids._priceTree.values
			.filter((queue) => queue.price() >= 80)
			.map((queue) =>
				queue
					.toArray()
					.reduce((acc: number, curr: LimitOrder) => acc + curr.size, 0),
			)
			.reduce((acc: number, curr: number) => acc + curr, 0);

		// Test modify price order that cross the market price
		response = ob.modify("second-order", { price: 80 });
		const completedOrders = response?.done.map((order) => order.id);
		assert.equal(
			completedOrders?.join(),
			["first-order", "buy-90", "buy-80"].join(),
		);
		assert.equal(response?.partial?.id, "second-order");
		assert.equal(response?.partial?.size, newSize - bookOrdersSize);
		assert.equal(response?.partialQuantityProcessed, bookOrdersSize);
		assert.equal(response?.quantityLeft, newSize - bookOrdersSize);
	}

	// Test modify a non-existent order without passing size
	const resp = ob.modify("non-existent-order", { price: 123 });
	assert.equal(resp.err?.message, ErrorMessages.ORDER_NOT_FOUND);
	assert.equal(resp.err?.code, ErrorCodes.ORDER_NOT_FOUND);
	assert.equal(resp.quantityLeft, 0);
});

void test("test priceCalculation", () => {
	const ob = new OrderBook();

	addDepth(ob, "05-", 10);
	addDepth(ob, "10-", 10);
	addDepth(ob, "15-", 10);

	const calc1 = ob.calculateMarketPrice(Side.BUY, 115);

	assert.equal(calc1.err === null, true);
	assert.equal(calc1.price, 13150);

	const calc2 = ob.calculateMarketPrice(Side.BUY, 200);

	assert.equal(calc2.err?.message, ErrorMessages.INSUFFICIENT_QUANTITY);
	assert.equal(calc2.err?.code, ErrorCodes.INSUFFICIENT_QUANTITY);
	assert.equal(calc2.price, 18000);

	const calc3 = ob.calculateMarketPrice(Side.SELL, 115);

	assert.equal(calc3.err === null, true);
	assert.equal(calc3.price, 8700);

	const calc4 = ob.calculateMarketPrice(Side.SELL, 200);

	assert.equal(calc4.err?.message, ErrorMessages.INSUFFICIENT_QUANTITY);
	assert.equal(calc4.err?.code, ErrorCodes.INSUFFICIENT_QUANTITY);
	assert.equal(calc4.price, 10500);
});

void test("orderbook event order.processed market payload", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);

	let captured: OrderBookEventMap["order.processed"] | undefined;
	ob.on("order.processed", (payload) => {
		captured = payload;
	});

	const options = { side: Side.BUY, size: 3 };
	const response = ob.market(options);

	assert.equal(captured?.opId, 11);
	assert.equal(captured?.opId, ob.lastOp);
	assert.equal(captured?.type, OrderType.MARKET);
	assert.deepStrictEqual(captured?.options, options);
	assert.equal(captured?.response, response);
});

void test("orderbook event order.processed limit payload", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);

	let captured: OrderBookEventMap["order.processed"] | undefined;
	ob.on("order.processed", (payload) => {
		captured = payload;
	});

	const options = { side: Side.BUY, id: "order-b100", size: 1, price: 100 };
	const response = ob.limit(options);

	assert.equal(captured?.opId, 11);
	assert.equal(captured?.opId, ob.lastOp);
	assert.equal(captured?.type, OrderType.LIMIT);
	assert.deepStrictEqual(captured?.options, options);
	assert.equal(captured?.response, response);
});

void test("orderbook event order.processed stop_market payload", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);
	ob.market({ side: Side.BUY, size: 3 });

	let captured: OrderBookEventMap["order.processed"] | undefined;
	ob.on("order.processed", (payload) => {
		captured = payload;
	});

	const options = { side: Side.BUY, size: 1, stopPrice: 120 };
	const response = ob.stopMarket(options);

	assert.equal(captured?.opId, 12);
	assert.equal(captured?.opId, ob.lastOp);
	assert.equal(captured?.type, OrderType.STOP_MARKET);
	assert.deepStrictEqual(captured?.options, options);
	assert.equal(captured?.response, response);
});

void test("orderbook event order.processed stop_limit payload", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);
	ob.market({ side: Side.BUY, size: 3 });

	let captured: OrderBookEventMap["order.processed"] | undefined;
	ob.on("order.processed", (payload) => {
		captured = payload;
	});

	const options = {
		side: Side.BUY,
		id: "stop-limit-buy-1",
		size: 1,
		price: 130,
		stopPrice: 120,
	};
	const response = ob.stopLimit(options);

	assert.equal(captured?.opId, 12);
	assert.equal(captured?.opId, ob.lastOp);
	assert.equal(captured?.type, OrderType.STOP_LIMIT);
	assert.deepStrictEqual(captured?.options, options);
	assert.equal(captured?.response, response);
});

void test("orderbook event order.processed oco payload", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);
	ob.market({ side: Side.BUY, size: 3 });

	let captured: OrderBookEventMap["order.processed"] | undefined;
	ob.on("order.processed", (payload) => {
		captured = payload;
	});

	const options = {
		side: Side.BUY,
		id: "oco-buy-1",
		size: 1,
		price: 100,
		stopPrice: 120,
		stopLimitPrice: 121,
	};
	const response = ob.oco(options);

	assert.equal(captured?.opId, 12);
	assert.equal(captured?.opId, ob.lastOp);
	assert.equal(captured?.type, OrderType.OCO);
	assert.deepStrictEqual(captured?.options, options);
	assert.equal(captured?.response, response);
});

void test("orderbook event order.cancelled payload", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);

	let captured: OrderBookEventMap["order.cancelled"] | undefined;
	ob.on("order.cancelled", (payload) => {
		captured = payload;
	});

	const response = ob.cancel("sell-100");

	assert.equal(captured?.opId, 11);
	assert.equal(captured?.opId, ob.lastOp);
	assert.equal(captured?.orderID, "sell-100");
	assert.equal(captured?.response, response);
});

void test("orderbook event order.modified payload", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);

	let captured: OrderBookEventMap["order.modified"] | undefined;
	ob.on("order.modified", (payload) => {
		captured = payload;
	});

	const orderUpdate = { size: 55 };
	const response = ob.modify("buy-50", orderUpdate);

	assert.equal(captured?.opId, 11);
	assert.equal(captured?.opId, ob.lastOp);
	assert.equal(captured?.orderID, "buy-50");
	assert.deepStrictEqual(captured?.orderUpdate, orderUpdate);
	assert.equal(captured?.response, response);
});

void test("orderbook event order.rejected on invalid market order", () => {
	const ob = new OrderBook();

	let captured: OrderBookEventMap["order.rejected"] | undefined;
	ob.on("order.rejected", (payload) => {
		captured = payload;
	});

	const options = { side: Side.BUY, size: 0 };
	const response = ob.market(options);

	assert.equal(response.err?.code, ErrorCodes.INSUFFICIENT_QUANTITY);
	assert.equal(captured?.opId, 1);
	assert.equal(captured?.opId, ob.lastOp);
	assert.deepStrictEqual(captured?.options, options);
	assert.equal(captured?.error, response.err);
});

void test("orderbook event order.rejected on cancel of missing order", () => {
	const ob = new OrderBook();

	let captured: OrderBookEventMap["order.rejected"] | undefined;
	ob.on("order.rejected", (payload) => {
		captured = payload;
	});

	const response = ob.cancel("missing");

	assert.equal(response, undefined);
	assert.equal(captured?.opId, 1);
	assert.equal(captured?.error.code, ErrorCodes.ORDER_NOT_FOUND);
	assert.deepStrictEqual(captured?.options, { orderID: "missing" });
});

void test("orderbook event order.rejected on modify of missing order", () => {
	const ob = new OrderBook();

	let captured: OrderBookEventMap["order.rejected"] | undefined;
	ob.on("order.rejected", (payload) => {
		captured = payload;
	});

	const response = ob.modify("missing", { size: 5 });

	assert.equal(response.err?.code, ErrorCodes.ORDER_NOT_FOUND);
	assert.equal(captured?.opId, 1);
	assert.equal(captured?.error.code, ErrorCodes.ORDER_NOT_FOUND);
	assert.deepStrictEqual(captured?.options, {
		orderID: "missing",
		orderUpdate: { size: 5 },
	});
});

void test("orderbook off removes event handler", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);

	let called = 0;
	const handler = (): void => {
		called++;
	};

	// Removing a handler from an event with no listeners is a no-op
	ob.off("order.processed", handler);

	ob.on("order.processed", handler);
	const response1 = ob.limit({
		side: Side.BUY,
		id: "order-b100",
		size: 1,
		price: 100,
	});
	assert.equal(response1.err, null);
	assert.equal(called, 1);

	ob.off("order.processed", handler);
	const response2 = ob.limit({
		side: Side.BUY,
		id: "order-b101",
		size: 1,
		price: 101,
	});
	assert.equal(response2.err, null);
	assert.equal(called, 1);
});

void test("orderbook event handler errors do not break operations", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 2);

	let called = 0;
	ob.on("order.processed", () => {
		called++;
		throw new Error("plugin error");
	});
	ob.on("order.processed", () => {
		called++;
	});

	const response = ob.limit({
		side: Side.BUY,
		id: "order-b100",
		size: 1,
		price: 100,
	});
	assert.equal(response.err, null);
	assert.equal(called, 2);
});

void test("orderbook use installs plugin and returns the orderbook", () => {
	const ob = new OrderBook();

	let installedWith: OrderBook | undefined;
	const plugin: OrderBookPlugin = {
		name: "test-plugin",
		install: (book) => {
			installedWith = book;
		},
	};

	const result = ob.use(plugin);

	assert.equal(result, ob);
	assert.equal(installedWith, ob);
});

void test("orderbook deprecated enableJournaling option", () => {
	const warn = console.warn;
	console.warn = () => {};
	try {
		const ob = new OrderBook({ enableJournaling: true });

		const response = ob.limit({
			side: Side.BUY,
			id: "first-order",
			size: 50,
			price: 100,
		});
		assert.equal(response.log?.opId, 1);
		assert.equal(typeof response.log?.ts, "number");
		assert.equal(response.log?.op, "l");
		assert.deepStrictEqual(response.log?.o, {
			side: Side.BUY,
			id: "first-order",
			size: 50,
			price: 100,
		});
	} finally {
		console.warn = warn;
	}
});

void test("orderbook deprecated journal option replays journal", () => {
	const warn = console.warn;
	console.warn = () => {};
	try {
		const journal: JournalLog[] = [
			{
				opId: 1,
				ts: Date.now(),
				op: "l",
				o: { side: Side.BUY, id: "buy-50", size: 2, price: 50 },
			},
			{
				opId: 2,
				ts: Date.now(),
				op: "l",
				o: { side: Side.SELL, id: "sell-100", size: 2, price: 100 },
			},
		];

		const ob = new OrderBook({ journal });

		assert.equal(ob.order("buy-50")?.price, 50);
		assert.equal(ob.order("buy-50")?.size, 2);
		assert.equal(ob.order("sell-100")?.price, 100);
		assert.equal(ob.order("sell-100")?.size, 2);
		assert.equal(ob.lastOp, 2);
	} finally {
		console.warn = warn;
	}
});

void test("orderbook deprecated journal option replays and records new logs", () => {
	const warn = console.warn;
	console.warn = () => {};
	try {
		const journal: JournalLog[] = [
			{
				opId: 1,
				ts: Date.now(),
				op: "l",
				o: { side: Side.BUY, id: "buy-50", size: 2, price: 50 },
			},
		];

		const ob = new OrderBook({ journal, enableJournaling: true });

		// The journal is replayed
		assert.equal(ob.order("buy-50")?.price, 50);
		assert.equal(ob.lastOp, 1);

		// New logs are recorded
		const response = ob.limit({
			side: Side.SELL,
			id: "sell-100",
			size: 2,
			price: 100,
		});
		assert.equal(response.log?.opId, 2);
		assert.equal(typeof response.log?.ts, "number");
		assert.equal(response.log?.op, "l");
		assert.deepStrictEqual(response.log?.o, {
			side: Side.SELL,
			id: "sell-100",
			size: 2,
			price: 100,
		});
	} finally {
		console.warn = warn;
	}
});

void test("orderbook test snapshot", () => {
	const ob = new OrderBook();
	const addStopOrder = (
		side: Side,
		orderId: string,
		stopPrice: number,
	): void => {
		ob.createOrder({
			id: orderId,
			type: OrderType.STOP_LIMIT,
			side,
			size: 10,
			price: stopPrice,
			stopPrice,
			timeInForce: TimeInForce.GTC,
		});
	};
	// Inizialize order book with some orders
	addDepth(ob, "", 10);

	// Add some stop orders
	//  Start with SELL side
	addStopOrder(Side.SELL, "sell-1", 110);
	addStopOrder(Side.SELL, "sell-2", 110); // Same price as before
	addStopOrder(Side.SELL, "sell-3", 120);
	addStopOrder(Side.SELL, "sell-4", 130);
	addStopOrder(Side.SELL, "sell-5", 140);

	// Test BUY side
	addStopOrder(Side.BUY, "buy-1", 100);
	addStopOrder(Side.BUY, "buy-2", 100); // Same price as before
	addStopOrder(Side.BUY, "buy-3", 90);
	addStopOrder(Side.BUY, "buy-4", 80);
	addStopOrder(Side.BUY, "buy-5", 70);

	const snapshot = ob.snapshot();

	assert.equal(Array.isArray(snapshot.asks), true);
	assert.equal(Array.isArray(snapshot.bids), true);

	assert.equal(Array.isArray(snapshot.stopBook.asks), true);
	assert.equal(Array.isArray(snapshot.stopBook.bids), true);

	assert.equal(typeof snapshot.ts, "number");
	snapshot.asks.forEach((level) => {
		assert.equal(typeof level.price, "number");
		assert.equal(Array.isArray(level.orders), true);
		level.orders.forEach((order) => {
			assert.equal(typeof order.id, "string");
			assert.equal(order.type, OrderType.LIMIT);
			assert.equal(order.side, Side.SELL);
			assert.equal(order.size, 10);
			assert.equal(order.origSize, 10);
		});
	});

	snapshot.bids.forEach((level) => {
		assert.equal(typeof level.price, "number");
		assert.equal(Array.isArray(level.orders), true);
		level.orders.forEach((order) => {
			assert.equal(typeof order.id, "string");
			assert.equal(order.type, OrderType.LIMIT);
			assert.equal(order.side, Side.BUY);
			assert.equal(order.size, 10);
			assert.equal(order.origSize, 10);
		});
	});

	snapshot.stopBook.asks.forEach((level) => {
		assert.equal(typeof level.price, "number");
		assert.equal(Array.isArray(level.orders), true);
		level.orders.forEach((order) => {
			assert.equal(typeof order.id, "string");
			assert.equal(order.type, OrderType.STOP_LIMIT);
			assert.equal(order.side, Side.BUY);
			assert.equal(order.size, 10);
			// @ts-expect-error we know exists for IStopLimitOrder
			assert.equal(typeof order.price, "number");
			assert.equal(typeof order.stopPrice, "number");
		});
	});

	snapshot.stopBook.bids.forEach((level) => {
		assert.equal(typeof level.price, "number");
		assert.equal(Array.isArray(level.orders), true);
		level.orders.forEach((order) => {
			assert.equal(typeof order.id, "string");
			assert.equal(order.type, OrderType.STOP_LIMIT);
			assert.equal(order.side, Side.BUY);
			assert.equal(order.size, 10);
			// @ts-expect-error we know exists for IStopLimitOrder
			assert.equal(typeof order.price, "number");
			assert.equal(typeof order.stopPrice, "number");
		});
	});
});

void test("orderbook restore from snapshot", () => {
	// Create a new orderbook with 3 orders for price levels and make a snapshot
	const ob = new OrderBook();

	const addStopOrder = (
		side: Side,
		orderId: string,
		stopPrice: number,
	): void => {
		ob.createOrder({
			id: orderId,
			type: OrderType.STOP_LIMIT,
			side,
			size: 10,
			price: stopPrice,
			stopPrice,
			timeInForce: TimeInForce.GTC,
		});
	};

	// Inizialize order book with some orders
	addDepth(ob, "first-run-", 10);
	addDepth(ob, "second-run-", 10);
	addDepth(ob, "third-run-", 10);

	// Add some stop orders
	// Test BUY side
	addStopOrder(Side.BUY, "buy-1", 100);
	addStopOrder(Side.BUY, "buy-2", 100); // Same price as before
	addStopOrder(Side.BUY, "buy-3", 90);
	addStopOrder(Side.BUY, "buy-4", 80);
	addStopOrder(Side.BUY, "buy-5", 70);

	//  Start with SELL side
	const prevMarketprice = ob.marketPrice;
	// @ts-expect-error we should hack the marketPrice in order to let stop order to be executed
	ob._marketPrice = 150;
	addStopOrder(Side.SELL, "sell-1", 110);
	addStopOrder(Side.SELL, "sell-2", 110); // Same price as before
	addStopOrder(Side.SELL, "sell-3", 120);
	addStopOrder(Side.SELL, "sell-4", 130);
	addStopOrder(Side.SELL, "sell-5", 140);
	// @ts-expect-error restore marketPrice to the original market price
	ob._marketPrice = prevMarketprice;

	const snapshot = ob.snapshot();
	{
		// Create a new orderbook from the snapshot and check is the same as before
		const ob2 = new OrderBook({ snapshot });

		assert.equal(ob.toString(), ob2.toString());
		assert.deepStrictEqual(ob.depth(), ob2.depth());
		assert.equal(
			// @ts-expect-error these are private properties
			ob.stopBook.bids
				.priceTree()
				.values.map((queue) => queue.toArray())
				.join(","),
			// @ts-expect-error these are private properties
			ob2.stopBook.bids
				.priceTree()
				.values.map((queue) => queue.toArray())
				.join(","),
		);
		assert.equal(
			// @ts-expect-error these are private properties
			ob.stopBook.asks
				.priceTree()
				.values.map((queue) => queue.toArray())
				.join(","),
			// @ts-expect-error these are private properties
			ob2.stopBook.asks
				.priceTree()
				.values.map((queue) => queue.toArray())
				.join(","),
		);

		// @ts-expect-error these are private properties
		Object.entries(ob.orders).forEach(([key, order]) => {
			// @ts-expect-error these are private properties
			assert.deepStrictEqual(order.toObject(), ob2.orders[key].toObject());
		});
		// @ts-expect-error these are private properties
		assert.equal(ob.asks.volume(), ob2.asks.volume());
		// @ts-expect-error these are private properties
		assert.equal(ob.bids.volume(), ob2.bids.volume());

		// @ts-expect-error these are private properties
		assert.equal(ob.asks.total(), ob2.asks.total());
		// @ts-expect-error these are private properties
		assert.equal(ob.bids.total(), ob2.bids.total());

		// @ts-expect-error these are private properties
		assert.equal(ob.asks.len(), ob2.asks.len());
		// @ts-expect-error these are private properties
		assert.equal(ob.bids.len(), ob2.bids.len());

		assert.equal(ob.lastOp, ob2.lastOp);

		const prev: Record<number, LimitOrder[]> = {};
		const restored: Record<number, LimitOrder[]> = {};

		// @ts-expect-error these are private properties
		ob.asks.priceTree().forEach((price: number, level: OrderQueue) => {
			prev[price] = level.toArray();
		});

		// @ts-expect-error these are private properties
		ob.bids.priceTree().forEach((price: number, level: OrderQueue) => {
			prev[price] = level.toArray();
		});

		// @ts-expect-error these are private properties
		ob2.asks.priceTree().forEach((price: number, level: OrderQueue) => {
			restored[price] = level.toArray();
		});

		// @ts-expect-error these are private properties
		ob2.bids.priceTree().forEach((price: number, level: OrderQueue) => {
			restored[price] = level.toArray();
		});

		Object.entries(prev).forEach(([price, orders]) => {
			assert.deepStrictEqual(
				orders.map((order) => order.toObject()),
				restored[Number(price)].map((order) => order.toObject()),
			);
		});

		const prevStopBook: Record<number, StopOrder[]> = {};
		const restoredStopBook: Record<number, StopOrder[]> = {};

		// @ts-expect-error these are private properties
		ob.stopBook.asks.priceTree().forEach((price: number, level: StopQueue) => {
			prevStopBook[price] = level.toArray();
		});

		// @ts-expect-error these are private properties
		ob.stopBook.bids.priceTree().forEach((price: number, level: StopQueue) => {
			prevStopBook[price] = level.toArray();
		});

		// @ts-expect-error these are private properties
		ob2.stopBook.asks.priceTree().forEach((price: number, level: StopQueue) => {
			restoredStopBook[price] = level.toArray();
		});

		// @ts-expect-error these are private properties
		ob2.stopBook.bids.priceTree().forEach((price: number, level: StopQueue) => {
			restoredStopBook[price] = level.toArray();
		});

		Object.entries(prevStopBook).forEach(([price, orders]) => {
			assert.deepStrictEqual(
				orders.map((order) => order.toObject()),
				restoredStopBook[Number(price)].map((order) => order.toObject()),
			);
		});

		// Compare also the snapshot from the original order book and the restored one
		const snapshot2 = ob2.snapshot();
		assert.deepStrictEqual(snapshot.asks, snapshot2.asks);
		assert.deepStrictEqual(snapshot.bids, snapshot2.bids);
		assert.deepStrictEqual(snapshot.stopBook.asks, snapshot2.stopBook.asks);
		assert.deepStrictEqual(snapshot.stopBook.bids, snapshot2.stopBook.bids);
	}

	{
		// Add three additional order to the original orderbook
		addDepth(ob, "fourth-run-", 10);
		addDepth(ob, "fifth-run-", 10);
		addDepth(ob, "sixth-run-", 10);

		const ob2 = new OrderBook({ snapshot });
		// The restored orderbook reflects the snapshot only, without the additional orders
		assert.equal(ob2.lastOp, snapshot.lastOp);
		assert.equal(ob2.order("fourth-run-buy-50") === undefined, true);
	}
});

void test("orderbook test unreachable lines", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 10);

	// test SELL side remove order
	const deleted = ob.cancel("sell-100");
	assert.equal(deleted !== undefined, true);
	assert.equal(ob.order("sell-100") === undefined, true);
});
