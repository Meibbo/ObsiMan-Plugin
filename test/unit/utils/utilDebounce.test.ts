import { describe, expect, it, vi } from 'vitest';
import { leadingDebounce } from '../../../src/utils/utilDebounce';

describe('leadingDebounce', () => {
	it('runs the first call immediately and coalesces burst updates into one trailing call', () => {
		const scheduled: Array<() => void> = [];
		const clearTimeout = vi.fn();
		const fn = vi.fn();
		const debounced = leadingDebounce(fn, 250, {
			setTimeout: (cb) => {
				scheduled.push(cb);
				return scheduled.length;
			},
			clearTimeout,
		});

		debounced('first');
		debounced('second');
		debounced('third');

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenLastCalledWith('first');
		expect(scheduled).toHaveLength(1);

		scheduled[0]();

		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenLastCalledWith('third');
		expect(clearTimeout).not.toHaveBeenCalled();
	});
});
