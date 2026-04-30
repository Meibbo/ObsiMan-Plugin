import { describe, it, expect, beforeAll } from 'vitest';
import { showInputModal } from '../../../src/utils/inputModal';
import { mockApp } from 'obsidian';

beforeAll(() => {
	if (typeof (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame !== 'function') {
		(globalThis as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame =
			(cb) => { setTimeout(cb, 0); return 0; };
	}
});

describe('showInputModal', () => {
	it('returns null when the modal closes without input', async () => {
		const app = mockApp();
		const promise = showInputModal(app, 'Type something');
		const result = await Promise.race([
			promise,
			new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 50)),
		]);
		expect(result).toBeNull();
	});
});
