import { describe, it, expect } from 'vitest';
import { createActiveFiltersIndex } from '../../../src/services/serviceActiveFiltersIndex';
import type { IFilterService } from '../../../src/types/contracts';
import type { FilterRule } from '../../../src/types/typeFilter';

function stubFilter(rules: FilterRule[] = []): IFilterService {
	return {
		activeFilter: {
			type: 'group',
			logic: 'all',
			children: rules,
			id: 'root',
			enabled: true,
		},
		filteredFiles: [],
		selectedFiles: [],
		setFilter: () => {},
		clearFilters: () => {},
		addNode: () => {},
		removeNode: () => {},
		removeNodeByProperty: () => {},
		setSelectedFiles: () => {},
		subscribe: () => () => {},
	};
}

describe('serviceActiveFiltersIndex', () => {
	it('flattens active rules into nodes', async () => {
		const rule: FilterRule = {
			type: 'rule',
			filterType: 'has_property',
			property: 'status',
			values: ['draft'],
			id: 'r1',
			enabled: true,
		};
		const idx = createActiveFiltersIndex(stubFilter([rule]));
		await idx.refresh();
		expect(idx.nodes.length).toBe(1);
		expect(idx.nodes[0].rule.property).toBe('status');
	});

	it('returns empty nodes when filter has no rules', async () => {
		const idx = createActiveFiltersIndex(stubFilter([]));
		await idx.refresh();
		expect(idx.nodes.length).toBe(0);
	});

	it('uses rule.id when provided', async () => {
		const rule: FilterRule = {
			type: 'rule',
			filterType: 'has_property',
			property: 'tag',
			values: [],
			id: 'stable-id',
			enabled: true,
		};
		const idx = createActiveFiltersIndex(stubFilter([rule]));
		await idx.refresh();
		expect(idx.nodes[0].id).toBe('stable-id');
	});

	it('generates an id when rule.id is undefined', async () => {
		const rule: FilterRule = {
			type: 'rule',
			filterType: 'missing_property',
			property: 'author',
			values: [],
		};
		const idx = createActiveFiltersIndex(stubFilter([rule]));
		await idx.refresh();
		expect(idx.nodes[0].id).toBeTruthy();
	});

	it('byId returns the matching node', async () => {
		const rule: FilterRule = {
			type: 'rule',
			filterType: 'has_property',
			property: 'x',
			values: [],
			id: 'node-id',
		};
		const idx = createActiveFiltersIndex(stubFilter([rule]));
		await idx.refresh();
		expect(idx.byId('node-id')?.rule.property).toBe('x');
	});

	it('flattens nested groups into a flat list of rules', async () => {
		const filter: IFilterService = {
			activeFilter: {
				type: 'group',
				logic: 'all',
				id: 'root',
				children: [
					{
						type: 'rule',
						filterType: 'has_property',
						property: 'a',
						values: [],
						id: 'r-a',
					},
					{
						type: 'group',
						logic: 'any',
						id: 'inner',
						children: [
							{
								type: 'rule',
								filterType: 'has_property',
								property: 'b',
								values: [],
								id: 'r-b',
							},
						],
					},
				],
			},
			filteredFiles: [],
			selectedFiles: [],
			setFilter: () => {},
			clearFilters: () => {},
			addNode: () => {},
			removeNode: () => {},
			removeNodeByProperty: () => {},
			setSelectedFiles: () => {},
			subscribe: () => () => {},
		};
		const idx = createActiveFiltersIndex(filter);
		await idx.refresh();
		expect(idx.nodes.length).toBe(2);
		expect(idx.nodes[0].rule.property).toBe('a');
		expect(idx.nodes[1].rule.property).toBe('b');
	});
});
