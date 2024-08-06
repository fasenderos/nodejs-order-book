import assert from "node:assert/strict";
import test from "node:test";
import { ERROR, ErrorCodes, ErrorMessages } from "../src/errors";
import { LimitOrder, StopLimitOrder, StopMarketOrder } from "../src/order";
import { OrderBook } from "../src/orderbook";
import type { OrderQueue } from "../src/orderqueue";
import {
	type IProcessOrder,
	type JournalLog,
	OrderType,
	Side,
	TimeInForce,
} from "../src/types";

const addDepth = (
	ob: OrderBook,
	prefix: string,
	quantity: number,
	journal?: JournalLog[],
): void => {
	for (let index = 50; index < 100; index += 10) {
		const response = ob.limit({
			side: Side.BUY,
			id: `${prefix}buy-${index}`,
			size: quantity,
			price: index,
		});
		if (journal != null && response.log != null) journal.push(response.log);
	}
	for (let index = 100; index < 150; index += 10) {
		const response = ob.limit({
			side: Side.SELL,
			id: `${prefix}sell-${index}`,
			size: quantity,
			price: index,
		});
		if (journal != null && response.log != null) journal.push(response.log);
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
	assert.equal(ob.order("sell-100") instanceof LimitOrder, true);

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
	assert.equal((process1.done[0] as LimitOrder).makerQty, 0);
	assert.equal((process1.done[0] as LimitOrder).takerQty, 1);
	assert.equal(
		(process1.done[0] as LimitOrder).makerQty +
			(process1.done[0] as LimitOrder).takerQty,
		(process1.done[0] as LimitOrder).origSize,
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
		(process1.done[0] as LimitOrder).origSize,
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
	const ob = new OrderBook({ experimentalConditionalOrders: true });

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
		assert.equal(stopMarketBuy.done[0] instanceof StopMarketOrder, true);
		assert.equal(stopMarketBuy.quantityLeft, size);
		assert.equal(stopMarketBuy.err, null);
		const stopOrder = stopMarketBuy.done[0].toObject() as StopMarketOrder;
		assert.equal(stopOrder.stopPrice, stopPrice);

		// Create a market order that activate the stop order
		const resp = ob.market({ side: Side.BUY, size: 2 });
		assert.equal(resp.activated[0] instanceof StopMarketOrder, true);
		assert.equal(resp.activated[0].id, stopOrder.id);
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
		assert.equal(stopMarketSell.done[0] instanceof StopMarketOrder, true);
		assert.equal(stopMarketSell.quantityLeft, size);
		assert.equal(stopMarketSell.err, null);
		const stopOrder = stopMarketSell.done[0].toObject() as StopMarketOrder;
		assert.equal(stopOrder.stopPrice, stopPrice);

		// Create a market order that activate the stop order
		const resp = ob.market({ side: Side.SELL, size: 2 });
		assert.equal(resp.activated[0] instanceof StopMarketOrder, true);
		assert.equal(resp.activated[0].id, stopOrder.id);
		assert.equal(resp.done.length, 2);
		assert.equal(resp.partial, null);
		assert.equal(resp.err, null);
	}

	{
		// Use the createOrder method to create a stop order
		const stopOrder = ob.createOrder({
			type: OrderType.STOP_MARKET,
			side: Side.SELL,
			size: 2,
			stopPrice: ob.marketPrice - 10,
		});
		assert.equal(stopOrder.done[0] instanceof StopMarketOrder, true);
		assert.equal(stopOrder.err, null);
		assert.equal(stopOrder.quantityLeft, 2);
	}
});

/**
 * Stop-Limit Order:
 *    Buy: marketPrice < stopPrice <= price
 *    Sell: marketPrice > stopPrice >= price
 */
void test("test stop_limit order", () => {
	const ob = new OrderBook({ experimentalConditionalOrders: true });

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
		assert.equal(stopLimitBuy.done[0] instanceof StopLimitOrder, true);
		assert.equal(stopLimitBuy.quantityLeft, size);
		assert.equal(stopLimitBuy.err, null);
		const stopOrder = stopLimitBuy.done[0].toObject() as StopLimitOrder;
		assert.equal(stopOrder.stopPrice, stopPrice);
		assert.equal(stopOrder.price, price);
		assert.equal(stopOrder.timeInForce, TimeInForce.IOC);

		// Create a market order that activate the stop order
		const resp = ob.market({ side: Side.BUY, size: 6 });
		assert.equal(resp.activated[0] instanceof StopLimitOrder, true);
		assert.equal(resp.activated[0].id, stopOrder.id);
		assert.equal(resp.done.length, 3);
		// The stop order becomes a LimitOrder
		assert.equal(resp.partial instanceof LimitOrder, true);
		assert.equal(resp.partial?.id, stopOrder.id);
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
		assert.equal(stopLimitSell.done[0] instanceof StopLimitOrder, true);
		assert.equal(stopLimitSell.quantityLeft, size);
		assert.equal(stopLimitSell.err, null);
		const stopOrder = stopLimitSell.done[0].toObject() as StopLimitOrder;
		assert.equal(stopOrder.stopPrice, stopPrice);
		assert.equal(stopOrder.price, price);
		assert.equal(stopOrder.timeInForce, TimeInForce.GTC);

		// Create a market order that activate the stop order
		const resp = ob.market({ side: Side.SELL, size: 6 });
		assert.equal(resp.activated[0] instanceof StopLimitOrder, true);
		assert.equal(resp.activated[0].id, stopOrder.id);
		assert.equal(resp.done.length, 3);
		// The stop order becomes a LimitOrder
		assert.equal(resp.partial instanceof LimitOrder, true);
		assert.equal(resp.partial?.id, stopOrder.id);
		assert.equal(resp.err, null);
	}

	{
		// Use the createOrder method to create a stop order
		const stopOrder = ob.createOrder({
			type: OrderType.STOP_LIMIT,
			id: "some-order-id",
			side: Side.SELL,
			size: 2,
			stopPrice: ob.marketPrice - 10,
			price: ob.marketPrice - 10,
		});
		assert.equal(stopOrder.done[0] instanceof StopLimitOrder, true);
		assert.equal(stopOrder.err, null);
		assert.equal(stopOrder.quantityLeft, 2);
	}
});

/**
 * OCO Order:
 *    Buy: price < marketPrice < stopPrice
 *    Sell: price > marketPrice > stopPrice
 */
void test("test oco order", () => {
	const ob = new OrderBook({ experimentalConditionalOrders: true });

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
		const order = response.done[0] as StopLimitOrder;
		assert.equal(order instanceof StopLimitOrder, true);
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
		const order = response.done[0] as StopLimitOrder;
		assert.equal(order instanceof StopLimitOrder, true);
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
		const order = response.done[0] as StopLimitOrder;
		assert.equal(order instanceof StopLimitOrder, true);
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
		const order = response.done[0] as StopLimitOrder;
		assert.equal(order instanceof StopLimitOrder, true);
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
		const order = response.done[0] as StopLimitOrder;
		assert.equal(order instanceof StopLimitOrder, true);
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
		assert.equal(response.partial?._id === "oco-sell-2", true);
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

void test("orderbook enableJournaling option", () => {
	const ob = new OrderBook({ enableJournaling: true });

	{
		const response = ob.limit({
			side: Side.BUY,
			id: "first-order",
			size: 50,
			price: 100,
		});
		assert.equal(response.log?.opId, 1);
		assert.equal(typeof response.log?.ts, "number");
		assert.equal(response.log?.op, "l");
		assert.deepEqual(response.log?.o, {
			side: Side.BUY,
			id: "first-order",
			size: 50,
			price: 100,
			timeInForce: TimeInForce.GTC,
		});
	}

	{
		const response = ob.market({ side: Side.BUY, size: 50 });
		assert.equal(response.log?.opId, 2);
		assert.equal(typeof response.log?.ts, "number");
		assert.equal(response.log?.op, "m");
		assert.deepEqual(response.log?.o, {
			side: Side.BUY,
			size: 50,
		});
	}

	{
		const response = ob.modify("first-order", { size: 55 });
		assert.equal(response.log?.opId, 3);
		assert.equal(typeof response.log?.ts, "number");
		assert.equal(response.log?.op, "u");
		assert.deepEqual(response.log?.o, {
			orderID: "first-order",
			orderUpdate: { size: 55 },
		});
	}

	{
		const response = ob.cancel("first-order");
		assert.equal(response?.log?.opId, 4);
		assert.equal(typeof response?.log?.ts, "number");
		assert.equal(response?.log?.op, "d");
		assert.deepEqual(response?.log?.o, {
			orderID: "first-order",
		});
	}
});

void test("orderbook replayJournal", () => {
	const ob = new OrderBook({ enableJournaling: true });

	const journal: JournalLog[] = [];

	addDepth(ob, "", 2, journal);

	{
		// Add Market Order
		const response = ob.market({ side: Side.BUY, size: 3 });
		if (response.log != null) journal.push(response.log);
	}

	{
		// Add Limit Order, modify and delete the order
		const response = ob.limit({
			side: Side.BUY,
			id: "limit-order-b100",
			size: 1,
			price: 100,
		});
		if (response.log != null) journal.push(response.log);
		const modifyOrder = ob.modify("limit-order-b100", { size: 2 });
		if (modifyOrder.log != null) journal.push(modifyOrder.log);
		const deleteOrder = ob.cancel("limit-order-b100");
		if (deleteOrder?.log != null) journal.push(deleteOrder.log);
	}

	const ob2 = new OrderBook({ journal });

	assert.equal(ob.toString(), ob2.toString());
});

void test("orderbook replayJournal test wrong journal", () => {
	// Test valid journal log that is not an array
	try {
		const journalLog: JournalLog = {
			opId: 1,
			ts: Date.now(),
			op: "d",
			o: { orderID: "bar" },
		};
		// @ts-expect-error journal log must be an array
		const ob = new OrderBook({ journal: journalLog });
	} catch (error) {
		assert.equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG);
		assert.equal(error?.code, ErrorCodes.INVALID_JOURNAL_LOG);
	}

	// Test wrong op in journal log
	try {
		const wrongOp = [
			{
				ts: Date.now(),
				op: "x",
				o: { foo: "bar" },
			},
		];
		// @ts-expect-error invalid "op" provided
		const ob = new OrderBook({ journal: wrongOp });
	} catch (error) {
		assert.equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG);
		assert.equal(error?.code, ErrorCodes.INVALID_JOURNAL_LOG);
	}

	// Test wrong market order journal log
	try {
		const wrongOp = [
			{
				ts: Date.now(),
				op: "m",
				o: { foo: "bar" },
			},
		];
		// @ts-expect-error invalid market order "o" prop in journal log
		const ob = new OrderBook({ journal: wrongOp });
	} catch (error) {
		assert.equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG);
		assert.equal(error?.code, ErrorCodes.INVALID_JOURNAL_LOG);
	}

	// Test wrong limit order journal log
	try {
		const wrongOp = [
			{
				ts: Date.now(),
				op: "l",
				o: { foo: "bar" },
			},
		];
		// @ts-expect-error invalid limit order "o" prop in journal log
		const ob = new OrderBook({ journal: wrongOp });
	} catch (error) {
		assert.equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG);
		assert.equal(error?.code, ErrorCodes.INVALID_JOURNAL_LOG);
	}

	// Test wrong update order journal log
	try {
		const wrongOp = [
			{
				ts: Date.now(),
				op: "u",
				o: { foo: "bar" },
			},
		];
		// @ts-expect-error invalid update order "o" prop in journal log
		const ob = new OrderBook({ journal: wrongOp });
	} catch (error) {
		assert.equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG);
		assert.equal(error?.code, ErrorCodes.INVALID_JOURNAL_LOG);
	}

	// Test wrong delete order journal log
	try {
		const wrongOp = [
			{
				ts: Date.now(),
				op: "d",
				o: { foo: "bar" },
			},
		];
		// @ts-expect-error invalid delete order "o" prop in journal log
		const ob = new OrderBook({ journal: wrongOp });
	} catch (error) {
		assert.equal(error?.message, ErrorMessages.INVALID_JOURNAL_LOG);
		assert.equal(error?.code, ErrorCodes.INVALID_JOURNAL_LOG);
	}
});

void test("orderbook test snapshot", () => {
	const ob = new OrderBook();
	addDepth(ob, "", 10);
	const snapshot = ob.snapshot();

	assert.equal(Array.isArray(snapshot.asks), true);
	assert.equal(Array.isArray(snapshot.bids), true);
	assert.equal(typeof snapshot.ts, "number");
	snapshot.asks.forEach((level) => {
		assert.equal(typeof level.price, "number");
		assert.equal(Array.isArray(level.orders), true);
		level.orders.forEach((order) => {
			assert.equal(order instanceof LimitOrder, true);
		});
	});

	snapshot.bids.forEach((level) => {
		assert.equal(typeof level.price, "number");
		assert.equal(Array.isArray(level.orders), true);
		level.orders.forEach((order) => {
			assert.equal(order instanceof LimitOrder, true);
		});
	});
});

void test("orderbook restore from snapshot", () => {
	// Create a new orderbook with 3 orders for price levels and make a snapshot
	const journal: JournalLog[] = [];
	const ob = new OrderBook({ enableJournaling: true });
	addDepth(ob, "first-run-", 10, journal);
	addDepth(ob, "second-run-", 10, journal);
	addDepth(ob, "third-run-", 10, journal);

	const snapshot = ob.snapshot();
	{
		// Create a new orderbook from the snapshot and check is the same as before
		const ob2 = new OrderBook({ snapshot, enableJournaling: true });

		assert.equal(ob.toString(), ob2.toString());
		assert.deepEqual(ob.depth(), ob2.depth());

		// @ts-expect-error these are private properties
		assert.deepEqual(ob.orders, ob2.orders);
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

		const prev = {};
		const restored = {};

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

		assert.deepEqual(prev, restored);

		// Compare also the snapshot from the original order book and the restored one
		const snapshot2 = ob2.snapshot();
		assert.deepEqual(snapshot.asks, snapshot2.asks);
		assert.deepEqual(snapshot.bids, snapshot2.bids);
	}

	{
		// Add three additional order to the original orderbook with journal
		const lastOp = ob.lastOp;
		addDepth(ob, "fourth-run-", 10, journal);
		addDepth(ob, "fifth-run-", 10, journal);
		addDepth(ob, "sixth-run-", 10, journal);

		const ob2 = new OrderBook({ snapshot, journal, enableJournaling: true });
		assert.equal(ob2.lastOp, lastOp + 30); // every run add 10 additional orders
	}
});

void test("orderbook test unreachable lines", () => {
	const ob = new OrderBook({ enableJournaling: true });
	addDepth(ob, "", 10);

	// test SELL side remove order with journal enabled
	const deleted = ob.cancel("sell-100");
	assert.equal(ob.lastOp, deleted?.log?.opId);
});
