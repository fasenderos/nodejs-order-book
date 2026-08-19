/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
import { createRequire } from "node:module";

const requireFn = createRequire(import.meta.url);

/**
 * Lazily requires a module at runtime, avoiding a circular dependency between
 * the core and its plugins at module load time.
 * @template T - The type of the required module's exports.
 * @param {string} id - The module identifier to require.
 * @returns {T} The required module's exports.
 */
export function lazyRequire<T>(id: string): T {
	return requireFn(id) as T;
}
