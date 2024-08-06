import assert from "node:assert/strict";
import test from "node:test";
import { ErrorCodes, ErrorMessages } from "../src/errors";
import { OrderFactory } from "../src/order";
import { StopSide } from "../src/stopside";
import { OrderType, Side, TimeInForce } from "../src/types";

void test("it should append/remove orders from queue on BUY side", () => {
	const os = new StopSide(Side.BUY);
	// @ts-expect-error _prices is private
	assert.equal(Object.keys(os._prices).length, 0);
	// @ts-expect-error _priceTree is private
	assert.equal(os._priceTree.length, 0);
	{
		const order = OrderFactory.createOrder({
			type: OrderType.STOP_LIMIT,
			id: "order1",
			side: Side.BUY,
			size: 5,
			price: 10,
			timeInForce: TimeInForce.GTC,
			stopPrice: 10,
		});
		os.append(order);
		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 1);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 1);
	}

	{
		const order = OrderFactory.createOrder({
			type: OrderType.STOP_LIMIT,
			id: "order2",
			side: Side.BUY,
			size: 5,
			price: 10,
			timeInForce: TimeInForce.GTC,
			stopPrice: 10, // same stopPrice as before, so same price level
		});
		os.append(order);
		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 1);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 1);
	}

	{
		const order = OrderFactory.createOrder({
			type: OrderType.STOP_MARKET,
			side: Side.BUY,
			size: 5,
			stopPrice: 20,
			timeInForce: TimeInForce.GTC,
		});

		os.append(order);
		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 2);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 2);
	}

	// @ts-expect-error _priceTree is private property
	os._priceTree.values.reduce((previousPrice, curr) => {
		// BUY side are in descending order bigger to lower
		// @ts-expect-error _price is private property
		const currPrice = curr._price;
		assert.equal(currPrice < previousPrice, true);
		return currPrice;
	}, Number.POSITIVE_INFINITY);

	{
		// Remove the first order
		const response = os.remove("order1", 10);

		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 2);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 2);
		assert.equal(response?.id, "order1");
	}

	{
		// Try to remove the same order already deleted
		const response = os.remove("order1", 10);
		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 2);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 2);
		assert.equal(response, undefined);
	}

	{
		// Remove the second order order, so the price level is empty
		const response = os.remove("order2", 10);

		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 1);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 1);
		assert.equal(response?.id, "order2");
	}

	// Test for error when price level not exists
	try {
		// order1 has been replaced whit updateOrder, so trying to update order1 will throw an error of type INVALID_PRICE_LEVEL
		os.remove("some-id", 100);
	} catch (error) {
		assert.equal(error?.message, ErrorMessages.INVALID_PRICE_LEVEL);
		assert.equal(error?.code, ErrorCodes.INVALID_PRICE_LEVEL);
	}
});

void test("it should append/remove orders from queue on SELL side", () => {
	const os = new StopSide(Side.SELL);
	// @ts-expect-error _prices is private
	assert.equal(Object.keys(os._prices).length, 0);
	// @ts-expect-error _priceTree is private
	assert.equal(os._priceTree.length, 0);
	{
		const order = OrderFactory.createOrder({
			type: OrderType.STOP_LIMIT,
			id: "order1",
			side: Side.SELL,
			size: 5,
			price: 10,
			timeInForce: TimeInForce.GTC,
			stopPrice: 10,
		});
		os.append(order);
		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 1);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 1);
	}

	{
		const order = OrderFactory.createOrder({
			type: OrderType.STOP_LIMIT,
			id: "order2",
			side: Side.SELL,
			size: 5,
			price: 10,
			timeInForce: TimeInForce.GTC,
			stopPrice: 10, // same stopPrice as before, so same price level
		});
		os.append(order);
		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 1);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 1);
	}

	{
		const order = OrderFactory.createOrder({
			type: OrderType.STOP_MARKET,
			side: Side.SELL,
			size: 5,
			stopPrice: 20,
			timeInForce: TimeInForce.GTC,
		});

		os.append(order);
		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 2);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 2);
	}

	// @ts-expect-error _priceTree is private property
	os._priceTree.values.reduce((previousPrice, curr) => {
		// SELL side are in ascending order lower to bigger
		// @ts-expect-error _price is private property
		const currPrice = curr._price;
		assert.equal(currPrice > previousPrice, true);
		return currPrice;
	}, 0);

	{
		// Remove the first order
		const response = os.remove("order1", 10);

		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 2);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 2);
		assert.equal(response?.id, "order1");
	}

	{
		// Try to remove the same order already deleted
		const response = os.remove("order1", 10);
		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 2);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 2);
		assert.equal(response, undefined);
	}

	{
		// Remove the second order order, so the price level is empty
		const response = os.remove("order2", 10);

		// @ts-expect-error _prices is private
		assert.equal(Object.keys(os._prices).length, 1);
		// @ts-expect-error _priceTree is private
		assert.equal(os._priceTree.length, 1);
		assert.equal(response?.id, "order2");
	}

	// Test for error when price level not exists
	try {
		// order1 has been replaced whit updateOrder, so trying to update order1 will throw an error of type INVALID_PRICE_LEVEL
		os.remove("some-id", 100);
	} catch (error) {
		assert.equal(error?.message, ErrorMessages.INVALID_PRICE_LEVEL);
		assert.equal(error?.code, ErrorCodes.INVALID_PRICE_LEVEL);
	}
});

void test("it should find all queue between upper and lower bound", () => {
	const appenOrder = (
		orderId: string,
		stopPrice: number,
		side,
		os: StopSide,
	): void => {
		const order = OrderFactory.createOrder({
			type: OrderType.STOP_LIMIT,
			id: orderId,
			side,
			size: 5,
			price: 10,
			timeInForce: TimeInForce.GTC,
			stopPrice,
		});
		os.append(order);
	};

	{
		const side = Side.BUY;
		const os = new StopSide(side);
		appenOrder("order1", 10, side, os);
		appenOrder("order1-1", 19.5, side, os);
		appenOrder("order2", 20, side, os);
		appenOrder("order2-1", 20, side, os);
		appenOrder("order2-3", 20, side, os);
		appenOrder("order3", 30, side, os);
		appenOrder("order4", 40, side, os);
		appenOrder("order4-1", 40, side, os);
		appenOrder("order4-2", 40.5, side, os);
		appenOrder("order5", 50, side, os);

		{
			const response = os.between(40, 20);

			response.forEach((queue) => {
				// @ts-expect-error _price is private
				assert.equal(queue._price <= 40, true);
				// @ts-expect-error _price is private
				assert.equal(queue._price >= 20, true);
			});
		}

		{
			const response = os.between(20, 40);
			response.forEach((queue) => {
				// @ts-expect-error _price is private
				assert.equal(queue._price <= 40, true);
				// @ts-expect-error _price is private
				assert.equal(queue._price >= 20, true);
			});
		}
	}

	{
		const side = Side.SELL;
		const os = new StopSide(side);
		appenOrder("order1", 10, side, os);
		appenOrder("order1-1", 19.5, side, os);
		appenOrder("order2", 20, side, os);
		appenOrder("order2-1", 20, side, os);
		appenOrder("order2-3", 20, side, os);
		appenOrder("order3", 30, side, os);
		appenOrder("order4", 40, side, os);
		appenOrder("order4-1", 40, side, os);
		appenOrder("order4-2", 40.5, side, os);
		appenOrder("order5", 50, side, os);

		{
			const response = os.between(40, 20);

			response.forEach((queue) => {
				// @ts-expect-error _price is private
				assert.equal(queue._price <= 40, true);
				// @ts-expect-error _price is private
				assert.equal(queue._price >= 20, true);
			});
		}

		{
			const response = os.between(20, 40);
			response.forEach((queue) => {
				// @ts-expect-error _price is private
				assert.equal(queue._price <= 40, true);
				// @ts-expect-error _price is private
				assert.equal(queue._price >= 20, true);
			});
		}
	}
});
