import assert from "node:assert/strict";
import test from "node:test";
import { OrderFactory } from "../src/order";
import { StopBook } from "../src/stopbook";
import { OrderType, Side, type StopOrder, TimeInForce } from "../src/types";

void test("it should add/remove/get order to stop book", () => {
	const ob = new StopBook();
	// @ts-expect-error asks is private
	assert.equal(ob.asks._priceTree.length, 0);
	// @ts-expect-error bids is private
	assert.equal(ob.bids._priceTree.length, 0);

	const addOrder = (side: Side, orderId: string, stopPrice: number): void => {
		const order = OrderFactory.createOrder({
			id: orderId,
			type: OrderType.STOP_LIMIT,
			side,
			size: 5,
			price: stopPrice,
			stopPrice,
			timeInForce: TimeInForce.GTC,
		});
		ob.add(order);
	};

	//  Start with SELL side
	addOrder(Side.SELL, "sell-1", 110);
	// @ts-expect-error asks is private
	assert.equal(ob.asks._priceTree.length, 1);
	// @ts-expect-error bids is private
	assert.equal(ob.bids._priceTree.length, 0);

	addOrder(Side.SELL, "sell-2", 110); // Same price as before
	addOrder(Side.SELL, "sell-3", 120);
	addOrder(Side.SELL, "sell-4", 130);
	addOrder(Side.SELL, "sell-5", 140);

	// @ts-expect-error asks is private
	assert.equal(ob.asks._priceTree.length, 4);
	// @ts-expect-error bids is private
	assert.equal(ob.bids._priceTree.length, 0);

	// Test BUY side
	addOrder(Side.BUY, "buy-1", 100);
	// @ts-expect-error asks is private
	assert.equal(ob.asks._priceTree.length, 4);
	// @ts-expect-error bids is private
	assert.equal(ob.bids._priceTree.length, 1);

	addOrder(Side.BUY, "buy-2", 100); // Same price as before
	addOrder(Side.BUY, "buy-3", 90);
	addOrder(Side.BUY, "buy-4", 80);
	addOrder(Side.BUY, "buy-5", 70);

	// @ts-expect-error asks is private
	assert.equal(ob.asks._priceTree.length, 4);
	// @ts-expect-error bids is private
	assert.equal(ob.bids._priceTree.length, 4);

	{
		// Before removing orders, test getConditionalOrders
		const response = ob.getConditionalOrders(Side.SELL, 110, 130);
		let totalOrder = 0;
		response.forEach((stopQueue) => {
			totalOrder += stopQueue.len();
			// @ts-expect-error _price is private
			assert.equal(stopQueue._price >= 110 && stopQueue._price <= 130, true);
		});
		assert.equal(totalOrder, 4);
	}

	{
		// Before removing orders, test getConditionalOrders
		const response = ob.getConditionalOrders(Side.BUY, 70, 130);
		let totalOrder = 0;
		response.forEach((stopQueue) => {
			totalOrder += stopQueue.len();
			// @ts-expect-error _price is private
			assert.equal(stopQueue._price >= 70 && stopQueue._price <= 100, true);
		});
		assert.equal(totalOrder, 5);
	}

	assert.deepStrictEqual(ob.remove(Side.SELL, "sell-3", 120)?.id, "sell-3");
	// @ts-expect-error asks is private
	assert.equal(ob.asks._priceTree.length, 3);

	// Lenght non changed because there were two orders at price level 100
	assert.deepStrictEqual(ob.remove(Side.BUY, "buy-2", 100)?.id, "buy-2");
	// @ts-expect-error asks is private
	assert.equal(ob.bids._priceTree.length, 4);

	// Try to remove non existing order
	assert.equal(ob.remove(Side.SELL, "fake-id", 130), undefined);
});

void test("it should validate conditional order", () => {
	const ob = new StopBook();

	const validate = (
		orderType: OrderType.STOP_LIMIT | OrderType.STOP_MARKET,
		side: Side,
		price: number | null = null,
		stopPrice: number,
		expect: boolean,
		marketPrice: number,
	): void => {
		// @ts-expect-error price is available only for STOP_LIMIT
		const order = OrderFactory.createOrder({
			id: "foo",
			type: orderType,
			side,
			size: 5,
			...(price !== null ? { price } : {}),
			stopPrice,
			timeInForce: TimeInForce.GTC,
		}) as StopOrder;
		assert.equal(ob.validConditionalOrder(marketPrice, order), expect);
	};

	// Stop LIMIT BUY
	validate(OrderType.STOP_LIMIT, Side.BUY, 100, 90, true, 80);
	validate(OrderType.STOP_LIMIT, Side.BUY, 100, 90, false, 90);
	validate(OrderType.STOP_LIMIT, Side.BUY, 100, 90, false, 110);
	validate(OrderType.STOP_LIMIT, Side.BUY, 90, 90, true, 80);
	validate(OrderType.STOP_LIMIT, Side.BUY, 90, 90, true, 80);
	validate(OrderType.STOP_LIMIT, Side.BUY, 90, 100, false, 80);

	// Stop LIMIT SELL
	validate(OrderType.STOP_LIMIT, Side.SELL, 90, 100, true, 110);
	validate(OrderType.STOP_LIMIT, Side.SELL, 90, 100, false, 100);
	validate(OrderType.STOP_LIMIT, Side.SELL, 90, 90, true, 110);
	validate(OrderType.STOP_LIMIT, Side.SELL, 90, 80, false, 110);

	// Stop MARKET BUY
	validate(OrderType.STOP_MARKET, Side.BUY, null, 90, true, 80);
	validate(OrderType.STOP_MARKET, Side.BUY, null, 90, false, 90);
	validate(OrderType.STOP_MARKET, Side.BUY, null, 90, false, 110);

	// Stop MARKET SELL
	validate(OrderType.STOP_MARKET, Side.SELL, null, 90, true, 100);
	validate(OrderType.STOP_MARKET, Side.SELL, null, 90, false, 90);
	validate(OrderType.STOP_MARKET, Side.SELL, null, 90, false, 80);
});

void test("it should get snapshot", () => {
	const ob = new StopBook();

	const addOrder = (side: Side, orderId: string, stopPrice: number): void => {
		const order = OrderFactory.createOrder({
			id: orderId,
			type: OrderType.STOP_LIMIT,
			side,
			size: 5,
			price: stopPrice,
			stopPrice,
			timeInForce: TimeInForce.GTC,
		});
		ob.add(order);
	};

	//  Start with SELL side
	addOrder(Side.SELL, "sell-1", 110);
	addOrder(Side.SELL, "sell-2", 110); // Same price as before
	addOrder(Side.SELL, "sell-3", 120);
	addOrder(Side.SELL, "sell-4", 130);
	addOrder(Side.SELL, "sell-5", 140);

	// Test BUY side
	addOrder(Side.BUY, "buy-1", 100);
	addOrder(Side.BUY, "buy-2", 100); // Same price as before
	addOrder(Side.BUY, "buy-3", 90);
	addOrder(Side.BUY, "buy-4", 80);
	addOrder(Side.BUY, "buy-5", 70);

	const snapshot = ob.snapshot();
	assert.equal(Array.isArray(snapshot.bids), true);
	assert.equal(Array.isArray(snapshot.asks), true);
	assert.equal(snapshot.bids.length, 4);
	assert.equal(snapshot.asks.length, 4);

	const price70 = snapshot.bids.find((x) => x.price === 70);
	const price80 = snapshot.bids.find((x) => x.price === 80);
	const price90 = snapshot.bids.find((x) => x.price === 90);
	const price100 = snapshot.bids.find((x) => x.price === 100);
	const price110 = snapshot.asks.find((x) => x.price === 110);
	const price120 = snapshot.asks.find((x) => x.price === 120);
	const price130 = snapshot.asks.find((x) => x.price === 130);
	const price140 = snapshot.asks.find((x) => x.price === 140);

	assert.equal(price70?.orders.length, 1);
	assert.equal(price80?.orders.length, 1);
	assert.equal(price90?.orders.length, 1);
	assert.equal(price100?.orders.length, 2);
	assert.equal(price110?.orders.length, 2);
	assert.equal(price120?.orders.length, 1);
	assert.equal(price130?.orders.length, 1);
	assert.equal(price140?.orders.length, 1);
});
