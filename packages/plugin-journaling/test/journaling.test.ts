import assert from "node:assert/strict";
import test from "node:test";
import type { JournalLog } from "@nodejs-order-book/core";
import { ERROR, OrderBook, Side } from "@nodejs-order-book/core";
import { journalingPlugin } from "../src/index";

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

void test("journaling plugin records operations", () => {
	const jp = journalingPlugin();
	const ob = new OrderBook();
	ob.use(jp);

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
		assert.deepStrictEqual(response.log?.o, {
			side: Side.BUY,
			id: "first-order",
			size: 50,
			price: 100,
		});
	}

	{
		const response = ob.market({ side: Side.BUY, size: 50 });
		assert.equal(response.log?.opId, 2);
		assert.equal(typeof response.log?.ts, "number");
		assert.equal(response.log?.op, "m");
		assert.deepStrictEqual(response.log?.o, {
			side: Side.BUY,
			size: 50,
		});
	}

	{
		const response = ob.modify("first-order", { size: 55 });
		assert.equal(response.log?.opId, 3);
		assert.equal(typeof response.log?.ts, "number");
		assert.equal(response.log?.op, "u");
		assert.deepStrictEqual(response.log?.o, {
			orderID: "first-order",
			orderUpdate: { size: 55 },
		});
	}

	{
		const response = ob.cancel("first-order");
		assert.equal(response?.log?.opId, 4);
		assert.equal(typeof response?.log?.ts, "number");
		assert.equal(response?.log?.op, "d");
		assert.deepStrictEqual(response?.log?.o, {
			orderID: "first-order",
		});
	}

	assert.equal(jp.getJournal().length, 4);
});

void test("journaling plugin replays journal", () => {
	const jp = journalingPlugin();
	const ob = new OrderBook();
	ob.use(jp);

	const journal: JournalLog[] = [];

	addDepth(ob, "", 2, journal);

	{
		// Add Market Order
		const response = ob.market({ side: Side.BUY, size: 3 });
		if (response.log != null) journal.push(response.log);
	}

	{
		// Add Limit Order
		const response = ob.limit({
			side: Side.BUY,
			id: "limit-order-b100",
			size: 1,
			price: 100,
		});
		if (response.log != null) journal.push(response.log);
	}

	{
		// Add Stop Market BUY Order
		const response = ob.stopMarket({
			side: Side.BUY,
			size: 1,
			stopPrice: 120,
		});
		if (response.log != null) journal.push(response.log);
	}

	{
		// Add Stop Market SELL Order
		const response = ob.stopMarket({
			side: Side.SELL,
			size: 1,
			stopPrice: 80,
		});
		if (response.log != null) journal.push(response.log);
	}

	{
		// Add Stop Limit BUY Order
		const response = ob.stopLimit({
			side: Side.BUY,
			id: "stop-limit-order-b130",
			size: 1,
			price: 130,
			stopPrice: 125,
		});
		if (response.log != null) journal.push(response.log);
	}

	{
		// Add Stop Limit SELL Order
		const response = ob.stopLimit({
			side: Side.SELL,
			id: "stop-limit-order-b70",
			size: 1,
			price: 70,
			stopPrice: 75,
		});
		if (response.log != null) journal.push(response.log);
	}

	{
		// Add OCO BUY Order
		const response = ob.oco({
			side: Side.BUY,
			id: "oco-order-b-90-130/140",
			size: 1,
			price: 90,
			stopPrice: 130,
			stopLimitPrice: 140,
		});
		if (response.log != null) journal.push(response.log);
	}

	{
		// Add OCO SELL Order
		const response = ob.oco({
			side: Side.SELL,
			id: "oco-order-s-130-90/80",
			size: 1,
			price: 130,
			stopPrice: 90,
			stopLimitPrice: 80,
		});
		if (response.log != null) journal.push(response.log);
	}

	{
		// Modify and delete the order
		const modifyOrder = ob.modify("limit-order-b100", { size: 2 });
		if (modifyOrder.log != null) journal.push(modifyOrder.log);
		const deleteOrder = ob.cancel("limit-order-b100");
		if (deleteOrder?.log != null) journal.push(deleteOrder.log);
	}

	const jp2 = journalingPlugin({ journal });
	const ob2 = new OrderBook();
	ob2.use(jp2);

	assert.equal(ob.toString(), ob2.toString());
	assert.equal(
		// @ts-expect-error stopBook is private
		ob.stopBook.bids._priceTree.length,
		// @ts-expect-error stopBook is private
		ob2.stopBook.bids._priceTree.length,
	);
	assert.equal(
		// @ts-expect-error stopBook is private
		ob.stopBook.bids._priceTree.keys.join(),
		// @ts-expect-error stopBook is private
		ob2.stopBook.bids._priceTree.keys.join(),
	);
	assert.equal(
		// @ts-expect-error stopBook is private
		ob.stopBook.asks._priceTree.length,
		// @ts-expect-error stopBook is private
		ob2.stopBook.asks._priceTree.length,
	);
	assert.equal(
		// @ts-expect-error stopBook is private
		ob.stopBook.asks._priceTree.keys.join(),
		// @ts-expect-error stopBook is private
		ob2.stopBook.asks._priceTree.keys.join(),
	);
});

void test("journaling plugin rejects invalid journal", () => {
	// Test valid journal log that is not an array
	assert.throws(
		() => {
			const journalLog: JournalLog = {
				opId: 1,
				ts: Date.now(),
				op: "d",
				o: { orderID: "bar" },
			};
			// @ts-expect-error journal log must be an array
			new OrderBook().use(journalingPlugin({ journal: journalLog }));
		},
		(error: { code: number; message: string }) =>
			error.code === 1201 && error.message === "Invalid journal log format",
	);

	// Test wrong op in journal log
	assert.throws(
		() => {
			const wrongOp = [
				{
					ts: Date.now(),
					op: "x",
					o: { foo: "bar" },
				},
			];
			// @ts-expect-error invalid "op" provided
			new OrderBook().use(journalingPlugin({ journal: wrongOp }));
		},
		(error: { code: number; message: string }) =>
			error.code === 1201 && error.message === "Invalid journal log format",
	);

	// Test wrong market order journal log
	assert.throws(
		() => {
			const wrongOp = [
				{
					ts: Date.now(),
					op: "m",
					o: { foo: "bar" },
				},
			];
			// @ts-expect-error invalid market order "o" prop in journal log
			new OrderBook().use(journalingPlugin({ journal: wrongOp }));
		},
		(error: { code: number; message: string }) =>
			error.code === 1201 && error.message === "Invalid journal log format",
	);

	// Test wrong limit order journal log
	assert.throws(
		() => {
			const wrongOp = [
				{
					ts: Date.now(),
					op: "l",
					o: { foo: "bar" },
				},
			];
			// @ts-expect-error invalid limit order "o" prop in journal log
			new OrderBook().use(journalingPlugin({ journal: wrongOp }));
		},
		(error: { code: number; message: string }) =>
			error.code === 1201 && error.message === "Invalid journal log format",
	);

	// Test wrong stop market order journal log
	assert.throws(
		() => {
			const wrongOp = [
				{
					ts: Date.now(),
					op: "sm",
					o: { foo: "bar" },
				},
			];
			// @ts-expect-error invalid stop market order "o" prop in journal log
			new OrderBook().use(journalingPlugin({ journal: wrongOp }));
		},
		(error: { code: number; message: string }) =>
			error.code === 1201 && error.message === "Invalid journal log format",
	);

	// Test wrong stop limit order journal log
	assert.throws(
		() => {
			const wrongOp = [
				{
					ts: Date.now(),
					op: "sl",
					o: { foo: "bar" },
				},
			];
			// @ts-expect-error invalid stop limit order "o" prop in journal log
			new OrderBook().use(journalingPlugin({ journal: wrongOp }));
		},
		(error: { code: number; message: string }) =>
			error.code === 1201 && error.message === "Invalid journal log format",
	);

	// Test wrong oco order journal log
	assert.throws(
		() => {
			const wrongOp = [
				{
					ts: Date.now(),
					op: "oco",
					o: { foo: "bar" },
				},
			];
			// @ts-expect-error invalid oco order "o" prop in journal log
			new OrderBook().use(journalingPlugin({ journal: wrongOp }));
		},
		(error: { code: number; message: string }) =>
			error.code === 1201 && error.message === "Invalid journal log format",
	);

	// Test wrong update order journal log
	assert.throws(
		() => {
			const wrongOp = [
				{
					ts: Date.now(),
					op: "u",
					o: { foo: "bar" },
				},
			];
			// @ts-expect-error invalid update order "o" prop in journal log
			new OrderBook().use(journalingPlugin({ journal: wrongOp }));
		},
		(error: { code: number; message: string }) =>
			error.code === 1201 && error.message === "Invalid journal log format",
	);

	// Test wrong delete order journal log
	assert.throws(
		() => {
			const wrongOp = [
				{
					ts: Date.now(),
					op: "d",
					o: { foo: "bar" },
				},
			];
			// @ts-expect-error invalid delete order "o" prop in journal log
			new OrderBook().use(journalingPlugin({ journal: wrongOp }));
		},
		(error: { code: number; message: string }) =>
			error.code === 1201 && error.message === "Invalid journal log format",
	);
});

void test("journaling plugin getJournal returns provided history and recorded logs", () => {
	const journal: JournalLog[] = [
		{
			opId: 1,
			ts: Date.now(),
			op: "l",
			o: { side: Side.BUY, id: "a", size: 10, price: 100 },
		},
	];
	const jp = journalingPlugin({ journal });
	const ob = new OrderBook();
	ob.use(jp);

	// Provided history is preserved
	assert.equal(jp.getJournal().length, 1);

	// New operations are appended
	ob.limit({ side: Side.BUY, id: "b", size: 10, price: 90 });
	assert.equal(jp.getJournal().length, 2);
	assert.equal(jp.getJournal()[1].op, "l");
	assert.equal(jp.getJournal()[1].opId, 2);
});

void test("journaling plugin replay is filtered by book.lastOp", () => {
	const journal: JournalLog[] = [
		{
			opId: 1,
			ts: Date.now(),
			op: "l",
			o: { side: Side.BUY, id: "a", size: 10, price: 100 },
		},
		{
			opId: 2,
			ts: Date.now(),
			op: "l",
			o: { side: Side.BUY, id: "b", size: 10, price: 90 },
		},
	];

	// Book already at lastOp 1 (e.g. restored from a snapshot covering op 1)
	const ob = new OrderBook();
	ob.limit({ side: Side.BUY, id: "a", size: 10, price: 100 });
	assert.equal(ob.lastOp, 1);

	const jp = journalingPlugin({ journal });
	ob.use(jp);

	// Only op 2 was replayed (op 1 skipped)
	assert.equal(ob.lastOp, 2);
	assert.equal(ob.order("b")?.price, 90);
	// The full journal is still preserved
	assert.equal(jp.getJournal().length, 2);
});

void test("journaling plugin replay does not produce spurious logs", () => {
	const journal: JournalLog[] = [
		{
			opId: 1,
			ts: Date.now(),
			op: "l",
			o: { side: Side.BUY, id: "a", size: 10, price: 100 },
		},
		{
			opId: 2,
			ts: Date.now(),
			op: "l",
			o: { side: Side.BUY, id: "b", size: 10, price: 90 },
		},
	];

	const jp = journalingPlugin({ journal });
	const ob = new OrderBook();
	ob.use(jp);

	// Replay happened before subscribing: no duplicate logs
	assert.equal(jp.getJournal().length, 2);
	assert.equal(ob.lastOp, 2);
});

void test("journaling plugin errors do not break operations", () => {
	const jp = journalingPlugin();
	const ob = new OrderBook();
	ob.use(jp);

	// A throwing handler must not break the operation
	ob.on("order.processed", () => {
		throw new Error("boom");
	});

	const response = ob.limit({
		side: Side.BUY,
		id: "first-order",
		size: 50,
		price: 100,
	});
	assert.equal(response.err, null);
	assert.equal(response.log?.op, "l");
	assert.equal(ob.lastOp, 1);
});
