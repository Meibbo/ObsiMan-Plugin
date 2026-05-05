import { describe, expect, it } from 'vitest';
import {
	addFiltersSearchHistory,
	createFiltersSearchState,
	getFiltersSearch,
	getFiltersSearchHistory,
	setFiltersSearch,
	type FiltersSearchTab,
} from '../../../src/components/frame/frameFiltersSearch';

describe('frame filters search state', () => {
	it('keeps each filters tab search term isolated', () => {
		let state = createFiltersSearchState();

		state = setFiltersSearch(state, 'props', 'status');
		state = setFiltersSearch(state, 'files', 'daily');
		state = setFiltersSearch(state, 'content', 'needle');

		expect(getFiltersSearch(state, 'props')).toBe('status');
		expect(getFiltersSearch(state, 'files')).toBe('daily');
		expect(getFiltersSearch(state, 'tags')).toBe('');
		expect(getFiltersSearch(state, 'content')).toBe('needle');
	});

	it('normalizes unknown or missing tab values to an empty search', () => {
		const state = { props: 'status' } as Partial<Record<FiltersSearchTab, string>>;

		expect(getFiltersSearch(state, 'files')).toBe('');
	});

	it('keeps the last three unique non-empty searches per tab', () => {
		let state = createFiltersSearchState();

		state = addFiltersSearchHistory(state, 'props', 'status');
		state = addFiltersSearchHistory(state, 'props', 'author');
		state = addFiltersSearchHistory(state, 'props', 'status');
		state = addFiltersSearchHistory(state, 'props', 'category');
		state = addFiltersSearchHistory(state, 'props', 'type');
		state = addFiltersSearchHistory(state, 'files', 'Daily');
		state = addFiltersSearchHistory(state, 'files', '   ');

		expect(getFiltersSearchHistory(state, 'props')).toEqual(['type', 'category', 'status']);
		expect(getFiltersSearchHistory(state, 'files')).toEqual(['Daily']);
		expect(getFiltersSearchHistory(state, 'tags')).toEqual([]);
	});
});
