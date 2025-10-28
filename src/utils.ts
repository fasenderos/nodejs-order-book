/* node:coverage ignore next - Don't know why this line is uncovered */
export const safeStringify = (value: unknown): string | null => {
	try {
		return JSON.stringify(value);
	} catch (_error) {
		return null;
	}
};

/* node:coverage ignore next - Don't know why this line is uncovered */
export const safeParse = <T>(value: string): T | null => {
	try {
		return JSON.parse(value);
	} catch (_error) {
		return null;
	}
};
