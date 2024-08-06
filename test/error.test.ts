import assert from "node:assert/strict";
import test from "node:test";
import {
	CustomError,
	ERROR,
	ErrorCodes,
	ErrorMessages,
	OrderBookError,
} from "../src/errors";

void test("Test default CustomError", () => {
	const a = CustomError();
	assert.equal(a.message, ErrorMessages.DEFAULT);
	assert.equal(a.code, ErrorCodes.DEFAULT);
	assert.equal(a instanceof OrderBookError, true);
	const b = CustomError("foo");
	assert.equal(b.message, `${ErrorMessages.DEFAULT}: foo`);
	assert.equal(b.code, ErrorCodes.DEFAULT);
	assert.equal(b instanceof OrderBookError, true);
	const c = CustomError("");
	assert.equal(c.message, ErrorMessages.DEFAULT);
	assert.equal(c.code, ErrorCodes.DEFAULT);
	assert.equal(c instanceof OrderBookError, true);

	for (const key in ERROR) {
		if (Object.prototype.hasOwnProperty.call(ERROR, key)) {
			const error = CustomError(ERROR[key]);
			assert.equal(error.message, ErrorMessages[key]);
			assert.equal(error.code, ErrorCodes[key]);
			assert.equal(error instanceof OrderBookError, true);
		}
	}
});
