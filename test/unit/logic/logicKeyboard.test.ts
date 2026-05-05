import { describe, expect, it } from 'vitest';
import { applyKeyboardMove, applyPointerSelection } from '../../../src/logic/logicKeyboard';

describe('logicKeyboard', () => {
	it('replaces selection on a plain row click', () => {
		const next = applyPointerSelection({
			orderedIds: ['a', 'b', 'c'],
			selectedIds: new Set(['a']),
			anchorId: 'a',
			targetId: 'b',
		});

		expect([...next.ids]).toEqual(['b']);
		expect(next.anchorId).toBe('b');
		expect(next.focusedId).toBe('b');
	});

	it('extends a range from the anchor on shift click', () => {
		const next = applyPointerSelection({
			orderedIds: ['a', 'b', 'c', 'd'],
			selectedIds: new Set(['b']),
			anchorId: 'b',
			targetId: 'd',
			range: true,
		});

		expect([...next.ids]).toEqual(['b', 'c', 'd']);
		expect(next.anchorId).toBe('b');
		expect(next.focusedId).toBe('d');
	});

	it('toggles a row while preserving other selected rows', () => {
		const next = applyPointerSelection({
			orderedIds: ['a', 'b', 'c'],
			selectedIds: new Set(['a', 'b']),
			anchorId: 'a',
			targetId: 'b',
			additive: true,
		});

		expect([...next.ids]).toEqual(['a']);
		expect(next.anchorId).toBe('b');
		expect(next.focusedId).toBe('b');
	});

	it('moves keyboard focus and extends selection with shift arrows', () => {
		const next = applyKeyboardMove({
			orderedIds: ['a', 'b', 'c', 'd'],
			selectedIds: new Set(['b']),
			anchorId: 'b',
			focusedId: 'b',
			direction: 1,
			range: true,
		});

		expect(next.focusedId).toBe('c');
		expect([...next.ids]).toEqual(['b', 'c']);
		expect(next.anchorId).toBe('b');
	});
});
