import { describe, it, expect } from 'vitest';
import {
	TFile,
	parseYaml,
	stringifyYaml,
	mockApp,
	mockTFile,
	prepareSimpleSearch,
} from '../../helpers/obsidian-mocks';

describe('obsidian mock alias', () => {
	it('exports TFile constructor', () => {
		const f = new TFile();
		f.path = 'a.md';
		expect(f.path).toBe('a.md');
	});

	it('round-trips YAML via parseYaml + stringifyYaml', () => {
		const round = parseYaml(stringifyYaml({ title: 'hi', n: 3 })) as Record<string, unknown>;
		expect(round.title).toBe('hi');
		expect(round.n).toBe(3);
	});

	it('mockApp returns a working vault stub', () => {
		const f = mockTFile('notes/a.md', { frontmatter: { x: 1 } });
		const app = mockApp({ files: [f] });
		expect(app.vault.getMarkdownFiles()).toHaveLength(1);
		expect(app.metadataCache.getFileCache(f)?.frontmatter?.x).toBe(1);
	});

	it('prepareSimpleSearch returns null for non-matches and a score for hits', () => {
		const search = prepareSimpleSearch('foo');
		expect(search('foobar')).not.toBeNull();
		expect(search('zzz')).toBeNull();
	});
});
