import { describe, it, expect } from 'vitest';
import { FilterService } from '../../../src/services/serviceFilter';
import type { FilterRule, FilterTemplate } from '../../../src/types/typeFilter';
import { mockApp, mockTFile, type CachedMetadata } from 'obsidian';

function setup() {
	const a = mockTFile('Notes/a.md', { frontmatter: { status: 'draft', tags: ['idea'] } });
	const b = mockTFile('Notes/b.md', { frontmatter: { status: 'done' } });
	const c = mockTFile('Archive/c.md', { frontmatter: {} });
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', tags: ['idea'] } }],
		[b.path, { frontmatter: { status: 'done' } }],
		[c.path, { frontmatter: {} }],
	]);
	const app = mockApp({ files: [a, b, c], metadata: meta });
	const svc = new FilterService(app);
	svc.onload();
	return { app, svc, a, b, c };
}

const draftRule: FilterRule = {
	type: 'rule',
	filterType: 'specific_value',
	property: 'status',
	values: ['draft'],
	id: 'r1',
	enabled: true,
};

describe('FilterService.applyFilters', () => {
	it('with empty tree returns all markdown files sorted by basename', () => {
		const { svc, a, b, c } = setup();
		const paths = svc.filteredFiles.map((f) => f.path);
		expect(paths.sort()).toEqual([a.path, b.path, c.path].sort());
	});

	it('addNode triggers re-evaluation', () => {
		const { svc, a } = setup();
		svc.addNode({ ...draftRule });
		expect(svc.filteredFiles.map((f) => f.path)).toEqual([a.path]);
	});

	it('search-name AND-combines with the active filter tree', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.setSearchFilter('zzz', '');
		expect(svc.filteredFiles).toHaveLength(0);
	});

	it('search-folder AND-combines on parent path', () => {
		const { svc, c } = setup();
		svc.setSearchFilter('', 'Archive');
		expect(svc.filteredFiles).toEqual([c]);
	});
});

describe('FilterService node mutation helpers', () => {
	it('removeNodeByProperty removes has_property rule', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule, filterType: 'has_property' } as FilterRule);
		svc.removeNodeByProperty('status');
		expect(svc.activeFilter.children).toHaveLength(0);
	});

	it('removeNodeByProperty(value) removes specific_value rule', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.removeNodeByProperty('status', 'draft');
		expect(svc.activeFilter.children).toHaveLength(0);
	});

	it('removeNodeByTag removes has_tag rule', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule, filterType: 'has_tag', values: ['idea'] } as FilterRule);
		svc.removeNodeByTag('idea');
		expect(svc.activeFilter.children).toHaveLength(0);
	});

	it('toggleFilterRule flips enabled and re-evaluates', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.toggleFilterRule('r1');
		expect(svc.filteredFiles.length).toBe(3);
	});

	it('deleteFilterRule removes rule by id', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.deleteFilterRule('r1');
		expect(svc.activeFilter.children).toHaveLength(0);
	});
});

describe('FilterService introspection', () => {
	it('hasTagFilter / hasPropFilter / hasValueFilter detect existing rules', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.addNode({ ...draftRule, id: 'r2', filterType: 'has_tag', values: ['idea'] } as FilterRule);
		svc.addNode({ ...draftRule, id: 'r3', filterType: 'has_property', values: [] } as FilterRule);

		expect(svc.hasTagFilter('idea')).toBe(true);
		expect(svc.hasPropFilter('status')).toBe(true);
		expect(svc.hasValueFilter('status', 'draft')).toBe(true);
		expect(svc.hasValueFilter('status', 'something-else')).toBe(false);
	});

	it('getFlatRules returns description + enabled metadata', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		const rules = svc.getFlatRules();
		expect(rules).toHaveLength(1);
		expect(rules[0].description).toContain('status');
		expect(rules[0].enabled).toBe(true);
	});

	it('loadTemplate replaces the active filter and applies', () => {
		const { svc, a } = setup();
		const tpl: FilterTemplate = {
			name: 'drafts',
			root: { type: 'group', logic: 'all', children: [draftRule] },
		};
		svc.loadTemplate(tpl);
		expect(svc.filteredFiles.map((f) => f.path)).toEqual([a.path]);
	});

	it('clearFilters resets the tree to empty', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.clearFilters();
		expect(svc.activeFilter.children).toHaveLength(0);
		expect(svc.filteredFiles.length).toBe(3);
	});
});
