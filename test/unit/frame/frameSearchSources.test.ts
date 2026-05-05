import { describe, expect, it } from 'vitest';
import { SEARCH_SEMANTICS_SOURCES } from '../../../src/components/frame/frameSearchSources';

describe('frame search sources', () => {
	it('keeps read-more sources for the supported query syntaxes', () => {
		expect(SEARCH_SEMANTICS_SOURCES.map((source) => source.id)).toEqual([
			'obsidian-search',
			'obsidian-bases',
			'dataview-dql',
			'javascript-replace',
			'ant-renamer',
			'notebook-navigator',
		]);
		expect(SEARCH_SEMANTICS_SOURCES.every((source) => source.href.startsWith('https://'))).toBe(
			true,
		);
	});
});
