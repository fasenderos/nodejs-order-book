import {
	CustomError,
	ERROR,
	type JournalLog,
	type OrderBook,
	OrderType,
} from "@nodejs-order-book/core";
import type { JournalingPlugin, JournalingPluginOptions } from "./types.js";

/**
 * Maps an {@link OrderType} to the journal operation code used in log entries.
 * @param type - The order type of the processed order.
 * @returns The journal operation code.
 */
const journalOpFromType = (type: OrderType): JournalLog["op"] => {
	switch (type) {
		case OrderType.MARKET:
			return "m";
		case OrderType.LIMIT:
			return "l";
		case OrderType.STOP_MARKET:
			return "sm";
		case OrderType.STOP_LIMIT:
			return "sl";
		case OrderType.OCO:
			return "oco";
	}
};

/**
 * Replays a journal log against the order book, validating each entry.
 *
 * @param book - The order book to replay against.
 * @param journal - The journal logs to replay.
 */
const replayJournal = (book: OrderBook, journal: JournalLog[]): void => {
	for (const log of journal) {
		switch (log.op) {
			case "m": {
				const { side, size } = log.o;
				if (side == null || size == null) {
					throw CustomError(ERROR.INVALID_JOURNAL_LOG);
				}
				book.market(log.o);
				break;
			}
			case "l": {
				const { side, id, size, price } = log.o;
				if (side == null || id == null || size == null || price == null) {
					throw CustomError(ERROR.INVALID_JOURNAL_LOG);
				}
				book.limit(log.o);
				break;
			}
			case "sm": {
				const { side, size, stopPrice } = log.o;
				if (side == null || size == null || stopPrice == null) {
					throw CustomError(ERROR.INVALID_JOURNAL_LOG);
				}
				book.stopMarket(log.o);
				break;
			}
			case "sl": {
				const { side, id, size, price, stopPrice } = log.o;
				if (
					side == null ||
					id == null ||
					size == null ||
					price == null ||
					stopPrice == null
				) {
					throw CustomError(ERROR.INVALID_JOURNAL_LOG);
				}
				book.stopLimit(log.o);
				break;
			}
			case "oco": {
				const { side, id, size, price, stopPrice, stopLimitPrice } = log.o;
				if (
					side == null ||
					id == null ||
					size == null ||
					price == null ||
					stopPrice == null ||
					stopLimitPrice == null
				) {
					throw CustomError(ERROR.INVALID_JOURNAL_LOG);
				}
				book.oco(log.o);
				break;
			}
			case "d":
				if (log.o.orderID == null) {
					throw CustomError(ERROR.INVALID_JOURNAL_LOG);
				}
				book.cancel(log.o.orderID);
				break;
			case "u":
				if (log.o.orderID == null || log.o.orderUpdate == null) {
					throw CustomError(ERROR.INVALID_JOURNAL_LOG);
				}
				book.modify(log.o.orderID, log.o.orderUpdate);
				break;
			default:
				throw CustomError(ERROR.INVALID_JOURNAL_LOG);
		}
	}
};

/**
 * Creates a journaling plugin for the order book.
 *
 * Installing the plugin always enables recording — there is no opt-out flag.
 * The `journal` option replays the provided logs on install, filtered by the
 * book's `lastOp` (so logs already covered by a restored snapshot are skipped).
 *
 * @param options - Plugin options.
 * @returns The journaling plugin instance.
 */
export function journalingPlugin(
	options: JournalingPluginOptions = {},
): JournalingPlugin {
	if (options.journal != null && !Array.isArray(options.journal)) {
		throw CustomError(ERROR.INVALID_JOURNAL_LOG);
	}
	const logs: JournalLog[] = [...(options.journal ?? [])];

	return {
		name: "journaling",
		install(book: OrderBook): void {
			if (options.journal != null) {
				const filtered =
					book.lastOp > 0
						? options.journal.filter((log) => log.opId > book.lastOp)
						: options.journal;
				replayJournal(book, filtered);
			}

			book.on("order.processed", ({ opId, type, options: o, response }) => {
				// The correlation between the op code and the options shape is
				// guaranteed by the emitter (OrderBook dispatches the correct
				// options for each order type), so the log is cast to JournalLog.
				const log = {
					opId,
					ts: Date.now(),
					op: journalOpFromType(type),
					o,
				} as JournalLog;
				logs.push(log);
				response.log = log;
			});
			book.on("order.cancelled", ({ opId, orderID, response }) => {
				const log = { opId, ts: Date.now(), op: "d" as const, o: { orderID } };
				logs.push(log);
				response.log = log;
			});
			book.on("order.modified", ({ opId, orderID, orderUpdate, response }) => {
				const log = {
					opId,
					ts: Date.now(),
					op: "u" as const,
					o: { orderID, orderUpdate },
				};
				logs.push(log);
				response.log = log;
			});
		},
		getJournal(): JournalLog[] {
			return logs;
		},
	};
}
