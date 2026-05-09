/**
 * Simple debounce utility for performance optimization.
 */
export function debounce<TArgs extends unknown[]>(
	fn: (...args: TArgs) => void,
	ms: number,
): (...args: TArgs) => void {
	let timeout: ReturnType<typeof activeWindow.setTimeout> | null = null;
	return (...args: TArgs) => {
		if (timeout) activeWindow.clearTimeout(timeout);
		timeout = activeWindow.setTimeout(() => {
			timeout = null;
			fn(...args);
		}, ms);
	};
}
