import { describe, it, expect } from 'vitest';
import { NavigationService } from '../../../src/services/serviceNavigation.svelte';

describe('NavigationService (IRouter)', () => {
	it('navigates to a known page', () => {
		const r = new NavigationService();
		r.navigateToPage('filters');
		expect(r.activePage).toBe('filters');
	});

	it('ignores navigation to an unknown page', () => {
		const r = new NavigationService();
		const before = r.activePage;
		r.navigateToPage('nope');
		expect(r.activePage).toBe(before);
	});

	it('reorders pages via reorderPage(from, to)', () => {
		const r = new NavigationService();
		r.pageOrder = ['a', 'b', 'c'];
		r.reorderPage(0, 2);
		expect(r.pageOrder).toEqual(['b', 'c', 'a']);
	});

	it('reorders tabs via reorderTab(from, to)', () => {
		const r = new NavigationService();
		r.tabOrder = ['x', 'y', 'z'];
		r.reorderTab(2, 0);
		expect(r.tabOrder).toEqual(['z', 'x', 'y']);
	});

	it('has default pageOrder from AGENTS.md §7', () => {
		const r = new NavigationService();
		expect(r.pageOrder).toEqual(['ops', 'statistics', 'filters']);
	});

	it('activePage defaults to first page in pageOrder', () => {
		const r = new NavigationService();
		expect(r.activePage).toBe('ops');
	});
});
