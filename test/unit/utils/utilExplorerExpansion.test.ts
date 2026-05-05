import { describe, expect, it } from 'vitest';
import {
	collectAutoExpandedIds,
	resolveExpandedIds,
	type ExpansionTreeNode,
} from '../../../src/utils/utilExplorerExpansion';

function node(id: string, children: ExpansionTreeNode[] = []): ExpansionTreeNode {
	return {
		id,
		label: id,
		depth: 0,
		meta: {},
		children,
	};
}

describe('utilExplorerExpansion', () => {
	it('auto-expands parent nodes while a search term is active', () => {
		const tree = [node('status', [node('draft'), node('done')]), node('tag')];

		const expanded = collectAutoExpandedIds(tree, { searchTerm: 'dra' });

		expect([...expanded]).toEqual(['status']);
	});

	it('auto-expands all parents when the filtered tree is small', () => {
		const tree = [node('props', [node('status', [node('draft')])])];

		const expanded = collectAutoExpandedIds(tree, {
			searchTerm: '',
			smallTreeThreshold: 8,
		});

		expect([...expanded]).toEqual(['props', 'status']);
	});

	it('does not auto-expand large idle trees', () => {
		const tree = [
			node('a', [node('a1')]),
			node('b', [node('b1')]),
			node('c', [node('c1')]),
			node('d', [node('d1')]),
			node('e', [node('e1')]),
		];

		const expanded = collectAutoExpandedIds(tree, {
			searchTerm: '',
			smallTreeThreshold: 8,
		});

		expect(expanded.size).toBe(0);
	});

	it('merges manual expansion with auto expansion and honors manual collapses', () => {
		const resolved = resolveExpandedIds({
			manualExpandedIds: new Set(['manual']),
			manualCollapsedIds: new Set(['auto']),
			autoExpandedIds: new Set(['auto', 'search-parent']),
		});

		expect([...resolved].sort()).toEqual(['manual', 'search-parent']);
	});
});
