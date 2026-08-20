import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { safeParse, safeStringify } from "../src/utils";

describe("safeStringify", () => {
	test("should stringify a valid object", () => {
		const obj = { name: "Alice", age: 25 };
		const result = safeStringify(obj);
		assert.strictEqual(result, JSON.stringify(obj));
	});

	test("should return null for objects with circular references", () => {
		const obj = {};
		// @ts-expect-error self does not exist on {}
		obj.self = obj; // Riferimento circolare
		const result = safeStringify(obj);
		assert.strictEqual(result, null);
	});

	test("should handle non-object values gracefully", () => {
		const result = safeStringify(null);
		assert.strictEqual(result, JSON.stringify(null));
	});

	test("should handle arrays correctly", () => {
		const arr = [1, 2, 3];
		const result = safeStringify(arr);
		assert.strictEqual(result, JSON.stringify(arr));
	});
});

describe("safeParse", () => {
	test("should parse a valid JSON string", () => {
		const jsonStr = '{"name":"Alice","age":25}';
		const result = safeParse(jsonStr);
		assert.deepStrictEqual(result, { name: "Alice", age: 25 });
	});

	test("should return null for invalid JSON strings", () => {
		const invalidJson = '{name:"Alice",age:25}'; // JSON non valido
		const result = safeParse(invalidJson);
		assert.strictEqual(result, null);
	});

	test("should handle an empty string gracefully", () => {
		const result = safeParse("");
		assert.strictEqual(result, null);
	});

	test("should handle JSON strings representing non-object types", () => {
		const jsonStr = '"hello"'; // Stringa valida in JSON
		const result = safeParse(jsonStr);
		assert.strictEqual(result, "hello");
	});

	test("should handle arrays correctly", () => {
		const jsonStr = "[1,2,3]";
		const result = safeParse(jsonStr);
		assert.deepStrictEqual(result, [1, 2, 3]);
	});
});
