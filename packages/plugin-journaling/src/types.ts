import type { JournalLog } from "@nodejs-order-book/core";

/**
 * Options for configuring the journaling plugin.
 * Installing the plugin always enables recording — there is no opt-out flag.
 */
export interface JournalingPluginOptions {
	/** Journal logs to replay on install. */
	journal?: JournalLog[];
}
