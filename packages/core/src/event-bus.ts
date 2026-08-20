/**
 * A typed event bus that manages event listeners and dispatches payloads.
 * Listener errors are swallowed so a faulty listener never breaks the emitter.
 */
export class EventBus<EventMap extends Record<string, unknown>> {
	private readonly listeners: {
		[K in keyof EventMap]?: Array<(payload: EventMap[K]) => void>;
	} = {};

	/**
	 * Register an event handler for the given event.
	 * @template K - The event name, a key of the event map.
	 * @param event - The event name to subscribe to.
	 * @param handler - The handler invoked with the event payload.
	 */
	public on<K extends keyof EventMap>(
		event: K,
		handler: (payload: EventMap[K]) => void,
	): void {
		const handlers = this.listeners[event] ?? [];
		// TypeScript cannot verify generic indexed assignment on a mapped type,
		// so the handler array is cast to the exact event's handler list.
		this.listeners[event] = [
			...handlers,
			handler,
		] as (typeof this.listeners)[K];
	}

	/**
	 * Remove a previously registered event handler.
	 * @template K - The event name, a key of the event map.
	 * @param event - The event name to unsubscribe from.
	 * @param handler - The handler to remove.
	 */
	public off<K extends keyof EventMap>(
		event: K,
		handler: (payload: EventMap[K]) => void,
	): void {
		const handlers = this.listeners[event];
		if (handlers === undefined) return;
		this.listeners[event] = handlers.filter(
			(h) => h !== handler,
		) as (typeof this.listeners)[K];
	}

	/**
	 * Emit an event payload to all registered handlers.
	 * Handler errors are caught and ignored so they never break the emitter.
	 * @template K - The event name, a key of the event map.
	 * @param event - The event name to emit.
	 * @param payload - The payload delivered to each handler.
	 */
	public emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
		const handlers = this.listeners[event];
		if (handlers === undefined) return;
		for (const handler of handlers) {
			try {
				handler(payload);
			} catch {
				// Listener errors must never break the emitter
			}
		}
	}
}
