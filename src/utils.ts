/* node:coverage ignore next - Don't know why this line is uncovered */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const safeStringify = (value: any): string | null => {
	try {
		return JSON.stringify(value);
	} catch (error) {
		return null;
	}
};

/* node:coverage ignore next - Don't know why this line is uncovered */
export const safeParse = <T>(value: string): T | null => {
	try {
		return JSON.parse(value);
	} catch (error) {
		return null;
	}
};
