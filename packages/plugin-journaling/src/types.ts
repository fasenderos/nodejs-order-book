import type {
	JournalLog,
	OrderBook,
	OrderBookPlugin,
} from "@nodejs-order-book/core";

/**
 * Options for configuring the journaling plugin.
 * Installing the plugin always enables recording — there is no opt-out flag.
 */
export interface JournalingPluginOptions {
	/** Journal logs to replay on install. */
	journal?: JournalLog[];
}

/**
 * Journaling plugin that records order book operations and exposes the
 * internal journal. Installing the plugin always enables recording.
 */
export interface JournalingPlugin extends OrderBookPlugin {
	/** Returns the internal journal (preserves provided history + recorded logs). */
	getJournal(): JournalLog[];
}
