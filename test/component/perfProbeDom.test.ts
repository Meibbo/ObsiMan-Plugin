import { describe, expect, it } from 'vitest';
import { createPerfProbe } from '../../src/dev/perfProbe';

describe('perf probe DOM scenarios', () => {
	it('runs a filters search scenario against the active DOM', async () => {
		document.body.innerHTML = '<input class="vm-filters-search-input" value="" />';
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('filters-search', { query: 'status' });

		expect(result.scenario).toBe('filters-search');
		expect((document.querySelector('.vm-filters-search-input') as HTMLInputElement).value).toBe(
			'status',
		);
		expect(result.counters['scenario.filters-search'].count).toBe(1);
	});

	it('runs a tree scroll scenario against the active DOM', async () => {
		document.body.innerHTML =
			'<div class="vm-tree-virtual-outer" style="height:100px;overflow:auto"><div style="height:1000px"></div></div>';
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('tree-scroll');

		expect(result.scenario).toBe('tree-scroll');
		expect(result.counters['scenario.tree-scroll'].count).toBe(1);
	});

	it('runs a filter select scenario against the first tree row', async () => {
		let clicks = 0;
		document.body.innerHTML = '<button class="vm-tree-virtual-row">status</button>';
		document.querySelector('.vm-tree-virtual-row')?.addEventListener('click', () => {
			clicks += 1;
		});
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('filter-select');

		expect(result.scenario).toBe('filter-select');
		expect(result.counters['scenario.filter-select'].count).toBe(1);
		expect(clicks).toBe(1);
	});

	it('runs an operation badges scenario against undoable badges', async () => {
		let clicks = 0;
		document.body.innerHTML = '<button class="vm-badge is-undoable"></button>';
		document.querySelector('.vm-badge')?.addEventListener('click', () => {
			clicks += 1;
		});
		const probe = createPerfProbe({ now: () => performance.now(), doc: document });

		const result = await probe.api.run('operation-badges');

		expect(result.scenario).toBe('operation-badges');
		expect(result.counters['scenario.operation-badges'].count).toBe(1);
		expect(clicks).toBe(1);
	});
});
