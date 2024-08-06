import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { ErrorCodes, ErrorMessages } from "../src/errors";
import {
	LimitOrder,
	OrderFactory,
	StopLimitOrder,
	StopMarketOrder,
} from "../src/order";
import { OrderType, Side, TimeInForce } from "../src/types";

void test("it should create LimitOrder", () => {
	const id = "fakeId";
	const side = Side.BUY;
	const type = OrderType.LIMIT;
	const size = 5;
	const price = 100;
	const time = Date.now();
	const timeInForce = TimeInForce.IOC;

	{
		const order = OrderFactory.createOrder({
			id,
			type,
			side,
			size,
			price,
			origSize: size,
			time,
			timeInForce,
			makerQty: size,
			takerQty: 0,
		});

		assert.equal(order instanceof LimitOrder, true);
		assert.equal(order.id, id);
		assert.equal(order.type, type);
		assert.equal(order.side, side);
		assert.equal(order.size, size);
		assert.equal(order.origSize, size);
		assert.equal(order.price, price);
		assert.equal(order.time, time);
		assert.equal(order.timeInForce, timeInForce);
		assert.equal(order.makerQty, size);
		assert.equal(order.takerQty, 0);
		assert.equal(order.ocoStopPrice, undefined);
		assert.deepEqual(order.toObject(), {
			id,
			type,
			side,
			size,
			origSize: size,
			price,
			time,
			timeInForce,
			makerQty: size,
			takerQty: 0,
		});
		assert.equal(
			order.toString(),
			`${id}:
    type: ${type}
    side: ${side}
    size: ${size}
    origSize: ${size}
    price: ${price}
    time: ${time}
    timeInForce: ${timeInForce}
    makerQty: ${size}
    takerQty: 0`,
		);
		assert.equal(
			order.toJSON(),
			JSON.stringify({
				id,
				type,
				side,
				size,
				origSize: size,
				price,
				time,
				timeInForce,
				makerQty: size,
				takerQty: 0,
			}),
		);
	}

	{
		// Limit Order with ocoStopPrice
		const ocoStopPrice = 10;
		const order = OrderFactory.createOrder({
			id,
			type,
			side,
			size,
			price,
			origSize: size,
			time,
			timeInForce,
			makerQty: size,
			takerQty: 0,
			ocoStopPrice,
		});
		assert.equal(order instanceof LimitOrder, true);
		assert.equal(order.id, id);
		assert.equal(order.type, type);
		assert.equal(order.side, side);
		assert.equal(order.size, size);
		assert.equal(order.origSize, size);
		assert.equal(order.price, price);
		assert.equal(order.time, time);
		assert.equal(order.timeInForce, timeInForce);
		assert.equal(order.makerQty, size);
		assert.equal(order.takerQty, 0);
		assert.equal(order.ocoStopPrice, ocoStopPrice);
		assert.deepEqual(order.toObject(), {
			id,
			type,
			side,
			size,
			origSize: size,
			price,
			time,
			timeInForce,
			makerQty: size,
			takerQty: 0,
		});
		assert.equal(
			order.toString(),
			`${id}:
    type: ${type}
    side: ${side}
    size: ${size}
    origSize: ${size}
    price: ${price}
    time: ${time}
    timeInForce: ${timeInForce}
    makerQty: ${size}
    takerQty: 0`,
		);
		assert.equal(
			order.toJSON(),
			JSON.stringify({
				id,
				type,
				side,
				size,
				origSize: size,
				price,
				time,
				timeInForce,
				makerQty: size,
				takerQty: 0,
			}),
		);
	}
});

void test("it should create StopMarketOrder", () => {
	const id = "fakeId";
	const side = Side.BUY;
	const type = OrderType.STOP_MARKET;
	const size = 5;
	const stopPrice = 4;
	const time = Date.now();
	const order = OrderFactory.createOrder({
		id,
		type,
		side,
		size,
		time,
		stopPrice,
	});

	assert.equal(order instanceof StopMarketOrder, true);
	assert.equal(order.id, id);
	assert.equal(order.type, type);
	assert.equal(order.side, side);
	assert.equal(order.size, size);
	assert.equal(order.stopPrice, stopPrice);
	assert.equal(order.time, time);
	assert.deepEqual(order.toObject(), {
		id,
		type,
		side,
		size,
		stopPrice,
		time,
	});
	assert.equal(
		order.toString(),
		`${id}:
    type: ${type}
    side: ${side}
    size: ${size}
    stopPrice: ${stopPrice}
    time: ${time}`,
	);
	assert.equal(
		order.toJSON(),
		JSON.stringify({
			id,
			type,
			side,
			size,
			stopPrice,
			time,
		}),
	);
});

void test("it should create StopLimitOrder", () => {
	const id = "fakeId";
	const side = Side.BUY;
	const type = OrderType.STOP_LIMIT;
	const size = 5;
	const price = 100;
	const stopPrice = 4;
	const time = Date.now();
	const timeInForce = TimeInForce.IOC;
	{
		const order = OrderFactory.createOrder({
			id,
			type,
			side,
			size,
			price,
			time,
			stopPrice,
			timeInForce,
		});

		assert.equal(order instanceof StopLimitOrder, true);
		assert.equal(order.id, id);
		assert.equal(order.type, type);
		assert.equal(order.side, side);
		assert.equal(order.size, size);
		assert.equal(order.price, price);
		assert.equal(order.stopPrice, stopPrice);
		assert.equal(order.timeInForce, timeInForce);
		assert.equal(order.time, time);
		assert.equal(order.isOCO, false);
		assert.deepEqual(order.toObject(), {
			id,
			type,
			side,
			size,
			price,
			stopPrice,
			timeInForce,
			time,
		});
		assert.equal(
			order.toString(),
			`${id}:
    type: ${type}
    side: ${side}
    size: ${size}
    price: ${price}
    stopPrice: ${stopPrice}
    timeInForce: ${timeInForce}
    time: ${time}`,
		);
		assert.equal(
			order.toJSON(),
			JSON.stringify({
				id,
				type,
				side,
				size,
				price,
				stopPrice,
				timeInForce,
				time,
			}),
		);
		// Price setter
		const newPrice = 120;
		order.price = newPrice;
		assert.equal(order.price, newPrice);
	}

	{
		// Stop Limit Order created by OCO order
		const order = OrderFactory.createOrder({
			id,
			type,
			side,
			size,
			price,
			time,
			stopPrice,
			timeInForce,
			isOCO: true,
		});

		assert.equal(order instanceof StopLimitOrder, true);
		assert.equal(order.id, id);
		assert.equal(order.type, type);
		assert.equal(order.side, side);
		assert.equal(order.size, size);
		assert.equal(order.price, price);
		assert.equal(order.stopPrice, stopPrice);
		assert.equal(order.timeInForce, timeInForce);
		assert.equal(order.time, time);
		assert.equal(order.isOCO, true);
		assert.deepEqual(order.toObject(), {
			id,
			type,
			side,
			size,
			price,
			stopPrice,
			timeInForce,
			time,
		});
		assert.equal(
			order.toString(),
			`${id}:
    type: ${type}
    side: ${side}
    size: ${size}
    price: ${price}
    stopPrice: ${stopPrice}
    timeInForce: ${timeInForce}
    time: ${time}`,
		);
		assert.equal(
			order.toJSON(),
			JSON.stringify({
				id,
				type,
				side,
				size,
				price,
				stopPrice,
				timeInForce,
				time,
			}),
		);
		// Price setter
		const newPrice = 120;
		order.price = newPrice;
		assert.equal(order.price, newPrice);
	}
});

void test("it should create order without passing a date or id", (t) => {
	const fakeTimestamp = 1487076708000;
	const fakeId = "some-uuid";
	const { now } = Date;
	const originalRandomUUID = randomUUID;

	// biome-ignore lint: we need to mock the returned value
	t.after(() => (Date.now = now));
	// @ts-expect-error cannot assign because is readonly
	// biome-ignore lint: we need to mock the returned value
	t.after(() => (randomUUID = originalRandomUUID));

	Date.now = (...m) => fakeTimestamp;
	// @ts-expect-error cannot assign because is readonly
	// biome-ignore lint: we need to mock the returned value
	randomUUID = () => fakeId;

	const type = OrderType.STOP_MARKET;
	const side = Side.BUY;
	const size = 5;
	const stopPrice = 4;
	const order = OrderFactory.createOrder({
		type,
		side,
		size,
		stopPrice,
	});
	assert.equal(order.id, fakeId);
	assert.equal(order.time, fakeTimestamp);
	assert.deepEqual(order.toObject(), {
		id: fakeId,
		type,
		side,
		size,
		stopPrice,
		time: fakeTimestamp,
	});
	assert.equal(
		order.toString(),
		`${fakeId}:
    type: ${type}
    side: ${side}
    size: ${size}
    stopPrice: ${stopPrice}
    time: ${fakeTimestamp}`,
	);

	assert.equal(
		order.toJSON(),
		JSON.stringify({
			id: fakeId,
			type,
			side,
			size,
			stopPrice,
			time: fakeTimestamp,
		}),
	);
});

void test("test orders setters", () => {
	const type = OrderType.LIMIT;
	const id = "fakeId";
	const side = Side.BUY;
	const size = 5;
	const price = 100;
	const time = Date.now();
	const timeInForce = TimeInForce.GTC;
	const order = OrderFactory.createOrder({
		type,
		id,
		side,
		size,
		price,
		origSize: size,
		time,
		timeInForce,
		makerQty: size,
		takerQty: 0,
	});

	// Price setter
	const newPrice = 300;
	order.price = newPrice;
	assert.equal(order.price, newPrice);

	// Size setter
	const newSize = 40;
	order.size = newSize;
	assert.equal(order.size, newSize);

	// Time setter
	const newTime = Date.now();
	order.time = newTime;
	assert.equal(order.time, newTime);

	// Original size should not be changed
	assert.equal(order.origSize, size);
});

void test("test invalid order type", () => {
	try {
		const id = "fakeId";
		const side = Side.BUY;
		const type = "invalidOrderType";
		const size = 5;
		const price = 100;
		const time = Date.now();
		const timeInForce = TimeInForce.IOC;
		OrderFactory.createOrder({
			id,
			// @ts-expect-error order type invalid
			type,
			side,
			size,
			price,
			time,
			timeInForce,
		});
	} catch (error) {
		assert.equal(error?.message, ErrorMessages.INVALID_ORDER_TYPE);
		assert.equal(error?.code, ErrorCodes.INVALID_ORDER_TYPE);
	}
});
