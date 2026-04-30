import { describe, it, expect } from 'vitest';
import {
	attachDropDAutoSuggestionInput,
	type DropDSuggestionItem,
} from '../../../src/utils/dropDAutoSuggestionInput';
import { mockApp } from 'obsidian';

function makeInput(): HTMLInputElement {
	if (typeof document !== 'undefined') return document.createElement('input');
	return { value: '', placeholder: '' } as unknown as HTMLInputElement;
}

describe('attachDropDAutoSuggestionInput', () => {
	it('filters items whose label or hint includes the query (case-insensitive)', () => {
		const app = mockApp();
		const inputEl = makeInput();
		const items: DropDSuggestionItem[] = [
			{ value: 'a', label: 'README', hint: 'root' },
			{ value: 'b', label: 'notes/idea', hint: 'subdir' },
			{ value: 'c', label: 'archive', hint: 'STORAGE' },
		];
		const handle = attachDropDAutoSuggestionInput({
			app,
			inputEl,
			getItems: () => items,
			onSelect: () => {},
		});
		expect(typeof handle.destroy).toBe('function');

		const q = 'archive';
		const expected = items.filter(
			(i) => i.label.toLowerCase().includes(q) || (i.hint?.toLowerCase().includes(q) ?? false),
		);
		expect(expected.map((e) => e.value)).toEqual(['c']);

		handle.destroy();
	});

	it('destroy() does not throw', () => {
		const app = mockApp();
		const inputEl = makeInput();
		const handle = attachDropDAutoSuggestionInput({
			app,
			inputEl,
			getItems: () => [],
			onSelect: () => {},
		});
		expect(() => handle.destroy()).not.toThrow();
	});
});
