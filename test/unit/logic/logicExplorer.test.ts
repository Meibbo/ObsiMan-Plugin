import { describe, it, expect } from 'vitest';
import { ExplorerLogic } from '../../../src/logic/logicExplorer';

describe('ExplorerLogic', () => {
	it('toggleSelect adds and removes from selection', () => {
		const e = new ExplorerLogic();
		e.toggleSelect('a');
		expect(e.selectedIds.has('a')).toBe(true);
		e.toggleSelect('a');
		expect(e.selectedIds.has('a')).toBe(false);
	});

	it('expand/collapse manage expandedIds', () => {
		const e = new ExplorerLogic();
		e.expand('node1');
		expect(e.expandedIds.has('node1')).toBe(true);
		e.collapse('node1');
		expect(e.expandedIds.has('node1')).toBe(false);
	});

	it('search updates the query', () => {
		const e = new ExplorerLogic();
		e.setSearch('foo');
		expect(e.search).toBe('foo');
	});

	it('clearSelection wipes everything', () => {
		const e = new ExplorerLogic();
		e.toggleSelect('a');
		e.toggleSelect('b');
		e.clearSelection();
		expect(e.selectedIds.size).toBe(0);
	});

	it('toggleExpand works symmetrically', () => {
		const e = new ExplorerLogic();
		e.toggleExpand('x');
		expect(e.expandedIds.has('x')).toBe(true);
		e.toggleExpand('x');
		expect(e.expandedIds.has('x')).toBe(false);
	});
});
