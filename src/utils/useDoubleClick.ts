/**
 * useDoubleClick — small helper that distinguishes single from double clicks
 * using a debounced timer rather than the native `dblclick` event. Native
 * `dblclick` fires AFTER the second `click`, which means the single-click
 * handler still runs first; the timer-based approach defers the single-click
 * action so the double-click can pre-empt it.
 *
 * Usage:
 *   const handlers = useDoubleClick({
 *     onSingle: () => doSingle(),
 *     onDouble: () => doDouble(),
 *     threshold: 250,
 *   });
 *   element.addEventListener('click', handlers.handleClick);
 *
 * Returns an object with a `handleClick(event?: Event)` method and a
 * `cancel()` method that clears any pending single-click timer.
 */
export interface UseDoubleClickOptions {
	onSingle?: () => void;
	onDouble?: () => void;
	threshold?: number;
}

export interface UseDoubleClickHandle {
	handleClick: (event?: Event) => void;
	cancel: () => void;
}

export function useDoubleClick(options: UseDoubleClickOptions): UseDoubleClickHandle {
	const threshold = options.threshold ?? 250;
	let pending: ReturnType<typeof setTimeout> | null = null;

	function cancel(): void {
		if (pending !== null) {
			clearTimeout(pending);
			pending = null;
		}
	}

	function handleClick(_event?: Event): void {
		if (pending !== null) {
			cancel();
			options.onDouble?.();
			return;
		}
		pending = setTimeout(() => {
			pending = null;
			options.onSingle?.();
		}, threshold);
	}

	return { handleClick, cancel };
}
