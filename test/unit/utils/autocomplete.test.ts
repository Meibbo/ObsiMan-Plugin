import { describe, it, expect } from 'vitest';
import { PropertySuggest, FolderSuggest } from '../../../src/utils/autocomplete';
import { mockApp, mockTFolder } from 'obsidian';

function makeInput(): HTMLInputElement {
	if (typeof document !== 'undefined') return document.createElement('input');
	return { value: '', placeholder: '' } as unknown as HTMLInputElement;
}

describe('PropertySuggest.getSuggestions', () => {
	it('empty query returns first 20 items', () => {
		const items = Array.from({ length: 25 }, (_, i) => `prop${i.toString().padStart(2, '0')}`);
		const sg = new PropertySuggest(mockApp(), makeInput(), items, () => {});
		expect(sg.getSuggestions('').length).toBe(20);
	});

	it('substring match is case-insensitive', () => {
		const sg = new PropertySuggest(mockApp(), makeInput(), ['Status', 'AUTHOR', 'date'], () => {});
		expect(sg.getSuggestions('aut')).toContain('AUTHOR');
		expect(sg.getSuggestions('STAT')).toContain('Status');
	});

	it('prefix matches sort before substring matches', () => {
		const sg = new PropertySuggest(mockApp(), makeInput(), ['extra-status', 'status', 'mystatus'], () => {});
		const out = sg.getSuggestions('status');
		expect(out[0]).toBe('status');
	});

	it('selectSuggestion fires the callback with the chosen value', () => {
		let chosen = '';
		const sg = new PropertySuggest(mockApp(), makeInput(), ['x'], (v) => { chosen = v; });
		sg.selectSuggestion('x');
		expect(chosen).toBe('x');
	});
});

describe('FolderSuggest.getSuggestions', () => {
	it('returns folder paths from app.vault.getAllFolders', () => {
		const folders = [mockTFolder('Notes'), mockTFolder('Notes/Daily'), mockTFolder('Archive')];
		const app = mockApp({ folders });
		const sg = new FolderSuggest(app, makeInput(), () => {});
		expect(sg.getSuggestions('').length).toBe(3);
		expect(sg.getSuggestions('archi')).toEqual(['Archive']);
	});
});
