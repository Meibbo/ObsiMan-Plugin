import { describe, it, expect } from 'vitest';
import { PropertyIndexService } from '../../../src/index/utilPropIndex';
import { mockApp, mockTFile, type CachedMetadata } from '../../helpers/obsidian-mocks';

function setup() {
	const a = mockTFile('a.md', { frontmatter: { status: 'draft', tags: ['x'] } });
	const b = mockTFile('b.md', { frontmatter: { status: 'done', author: 'me' } });
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', tags: ['x'] } }],
		[b.path, { frontmatter: { status: 'done', author: 'me' } }],
	]);
	const app = mockApp({ files: [a, b], metadata: meta });
	const svc = new PropertyIndexService(app);
	return { app, svc, a, b };
}

describe('PropertyIndexService.rebuild', () => {
	it('indexes property names and values across all files', () => {
		const { svc } = setup();
		svc.rebuild();
		expect(svc.getPropertyNames()).toEqual(['author', 'status', 'tags']);
		expect(svc.getPropertyValues('status')).toEqual(['done', 'draft']);
		expect(svc.getPropertyValues('author')).toEqual(['me']);
	});

	it('skips the synthetic "position" key from metadataCache', () => {
		const file = mockTFile('p.md', { frontmatter: { real: 1 } });
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { real: 1, position: { start: 0, end: 0 } } }],
		]);
		const app = mockApp({ files: [file], metadata: meta });
		const svc = new PropertyIndexService(app);
		svc.rebuild();
		expect(svc.getPropertyNames()).toEqual(['real']);
	});

	it('flattens array values into individual entries', () => {
		const file = mockTFile('a.md', { frontmatter: { tags: ['idea', 'todo', 'idea'] } });
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { tags: ['idea', 'todo', 'idea'] } }],
		]);
		const app = mockApp({ files: [file], metadata: meta });
		const svc = new PropertyIndexService(app);
		svc.rebuild();
		expect(svc.getPropertyValues('tags')).toEqual(['idea', 'todo']);
	});

	it('counts files in fileCount', () => {
		const { svc } = setup();
		svc.rebuild();
		expect(svc.fileCount).toBe(2);
	});

	it('returns [] for unknown property', () => {
		const { svc } = setup();
		svc.rebuild();
		expect(svc.getPropertyValues('does-not-exist')).toEqual([]);
	});
});
