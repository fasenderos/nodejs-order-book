import assert from "node:assert/strict";
import test from "node:test";
import { EventBus } from "../src/event-bus";

interface TestEventMap {
	ping: { value: number };
	pong: { value: string };
}

void test("event bus delivers payload to registered handler", () => {
	const bus = new EventBus<TestEventMap>();

	let captured: TestEventMap["ping"] | undefined;
	bus.on("ping", (payload) => {
		captured = payload;
	});

	bus.emit("ping", { value: 42 });

	assert.deepStrictEqual(captured, { value: 42 });
});

void test("event bus delivers payload to all handlers", () => {
	const bus = new EventBus<TestEventMap>();

	let calls = 0;
	bus.on("ping", () => {
		calls++;
	});
	bus.on("ping", () => {
		calls++;
	});

	bus.emit("ping", { value: 1 });

	assert.equal(calls, 2);
});

void test("event bus off removes a handler", () => {
	const bus = new EventBus<TestEventMap>();

	let calls = 0;
	const handler = (): void => {
		calls++;
	};
	bus.on("ping", handler);
	bus.emit("ping", { value: 1 });
	assert.equal(calls, 1);

	bus.off("ping", handler);
	bus.emit("ping", { value: 2 });
	assert.equal(calls, 1);
});

void test("event bus off on event with no listeners is a no-op", () => {
	const bus = new EventBus<TestEventMap>();

	const handler = (): void => {};
	bus.off("ping", handler);
	bus.off("pong", handler);
});

void test("event bus emit with no listeners is a no-op", () => {
	const bus = new EventBus<TestEventMap>();

	bus.emit("ping", { value: 1 });
	bus.emit("pong", { value: "x" });
});

void test("event bus handler errors do not break emit", () => {
	const bus = new EventBus<TestEventMap>();

	let calls = 0;
	bus.on("ping", () => {
		calls++;
		throw new Error("handler error");
	});
	bus.on("ping", () => {
		calls++;
	});

	bus.emit("ping", { value: 1 });

	assert.equal(calls, 2);
});
