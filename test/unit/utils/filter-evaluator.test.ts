import { describe, it, expect } from 'vitest';
import { evalNode } from '../../../src/utils/filter-evaluator';
import type { FilterGroup, FilterRule } from '../../../src/types/typeFilter';
import { mockTFile, type CachedMetadata, type TFile } from '../../helpers/obsidian-mocks';

function rule(partial: Partial<FilterRule>): FilterRule {
	return {
		type: 'rule',
		filterType: 'has_property',
		property: '',
		values: [],
		id: 'r1',
		enabled: true,
		...partial,
	};
}

function group(children: (FilterRule | FilterGroup)[], logic: 'all' | 'any' | 'none' = 'all'): FilterGroup {
	return { type: 'group', logic, children, id: 'g', enabled: true };
}

function fixture() {
	const a = mockTFile('Notes/draft.md', { frontmatter: { status: 'draft', tags: ['idea'] } });
	const b = mockTFile('Notes/done.md', { frontmatter: { status: 'done' } });
	const c = mockTFile('Archive/old.md', { frontmatter: {} });
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', tags: ['idea'] } }],
		[b.path, { frontmatter: { status: 'done' } }],
		[c.path, { frontmatter: {} }],
	]);
	const getMeta = (file: TFile): CachedMetadata | null => meta.get(file.path) ?? null;
	return { universe: [a, b, c], getMeta, a, b, c };
}

describe('evalNode', () => {
	it('has_property keeps files where the key exists in fm', () => {
		const { universe, getMeta, a, b } = fixture();
		const r = rule({ property: 'status', filterType: 'has_property' });
		const out = evalNode(r, universe, getMeta);
		expect(out).toEqual(new Set([a.path, b.path]));
	});

	it('missing_property keeps files where the key is absent', () => {
		const { universe, getMeta, c } = fixture();
		const r = rule({ property: 'status', filterType: 'missing_property' });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set([c.path]));
	});

	it('specific_value matches case-insensitively', () => {
		const { universe, getMeta, a } = fixture();
		const r = rule({ property: 'status', filterType: 'specific_value', values: ['DRAFT'] });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set([a.path]));
	});

	it('multiple_values matches any provided value', () => {
		const { universe, getMeta, a, b } = fixture();
		const r = rule({ property: 'status', filterType: 'multiple_values', values: ['draft', 'done'] });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set([a.path, b.path]));
	});

	it('folder + folder_exclude work on substring of path', () => {
		const { universe, getMeta, a, b } = fixture();
		const inc = rule({ filterType: 'folder', values: ['Notes'] });
		const exc = rule({ filterType: 'folder_exclude', values: ['Archive'] });
		expect(evalNode(inc, universe, getMeta)).toEqual(new Set([a.path, b.path]));
		expect(evalNode(exc, universe, getMeta)).toEqual(new Set([a.path, b.path]));
	});

	it('file_name + file_name_exclude match on basename substring', () => {
		const { universe, getMeta, a } = fixture();
		const inc = rule({ filterType: 'file_name', values: ['draft'] });
		expect(evalNode(inc, universe, getMeta)).toEqual(new Set([a.path]));
	});

	it('file_path matches exact file paths case-insensitively', () => {
		const { universe, getMeta, a } = fixture();
		const r = rule({ filterType: 'file_path' as FilterRule['filterType'], values: ['notes/draft.md'] });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set([a.path]));
	});

	it('has_tag matches files with frontmatter tag', () => {
		const { universe, getMeta, a } = fixture();
		const r = rule({ filterType: 'has_tag', values: ['idea'] });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set([a.path]));
	});

	it('group ALL = intersection of children', () => {
		const { universe, getMeta, a } = fixture();
		const g = group([
			rule({ property: 'status', filterType: 'has_property' }),
			rule({ filterType: 'folder', values: ['Notes'] }),
			rule({ filterType: 'specific_value', property: 'status', values: ['draft'] }),
		], 'all');
		expect(evalNode(g, universe, getMeta)).toEqual(new Set([a.path]));
	});

	it('group ANY = union of children', () => {
		const { universe, getMeta, a, c } = fixture();
		const g = group([
			rule({ filterType: 'specific_value', property: 'status', values: ['draft'] }),
			rule({ filterType: 'folder', values: ['Archive'] }),
		], 'any');
		expect(evalNode(g, universe, getMeta)).toEqual(new Set([a.path, c.path]));
	});

	it('group NONE = universe minus union', () => {
		const { universe, getMeta, c } = fixture();
		const g = group([
			rule({ property: 'status', filterType: 'has_property' }),
		], 'none');
		expect(evalNode(g, universe, getMeta)).toEqual(new Set([c.path]));
	});

	it('disabled node returns empty set', () => {
		const { universe, getMeta } = fixture();
		const r = rule({ property: 'status', filterType: 'has_property', enabled: false });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set());
	});

	it('empty group: ALL = universe, ANY = empty, NONE = universe', () => {
		const { universe, getMeta } = fixture();
		const all = group([], 'all');
		const any = group([], 'any');
		const none = group([], 'none');
		expect(evalNode(all, universe, getMeta).size).toBe(universe.length);
		expect(evalNode(any, universe, getMeta).size).toBe(0);
		expect(evalNode(none, universe, getMeta).size).toBe(universe.length);
	});

	it('unknown filterType returns empty', () => {
		const { universe, getMeta } = fixture();
		const r = rule({ filterType: 'bogus' as unknown as FilterRule['filterType'] });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set());
	});
});
