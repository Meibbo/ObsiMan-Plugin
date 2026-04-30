import { describe, it, expect } from 'vitest';
import { TagsLogic } from '../../../src/logic/logicTags';
import { mockApp } from 'obsidian';

function appWithTags(rawTags: Record<string, number>) {
	const app = mockApp();
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = () => rawTags;
	return app;
}

describe('TagsLogic.getTree', () => {
	it('builds a nested tree from slash-separated tag paths', () => {
		const app = appWithTags({ '#projects/work': 3, '#projects/home': 1, '#ideas': 5 });
		const logic = new TagsLogic(app);
		const tree = logic.getTree();
		const projects = tree.find((n) => n.id === 'projects');
		expect(projects).toBeDefined();
		expect(projects!.children?.map((c) => c.label).sort()).toEqual(['home', 'work']);
		expect(tree.find((n) => n.id === 'ideas')?.count).toBe(5);
	});

	it('parent count is the leaf count when the parent tag is also written explicitly', () => {
		const app = appWithTags({ '#a': 7, '#a/b': 2 });
		const logic = new TagsLogic(app);
		const tree = logic.getTree();
		const a = tree.find((n) => n.id === 'a');
		expect(a?.count).toBe(7);
		expect(a?.children?.[0].count).toBe(2);
	});

	it('caches tree across calls; invalidate forces rebuild', () => {
		const app = appWithTags({ '#x': 1 });
		const logic = new TagsLogic(app);
		const t1 = logic.getTree();
		expect(logic.getTree()).toBe(t1);
		logic.invalidate();
		expect(logic.getTree()).not.toBe(t1);
	});
});

describe('TagsLogic.filterTree', () => {
	it('keeps a parent if any descendant matches', () => {
		const app = appWithTags({ '#projects/work': 1, '#projects/home': 1, '#unrelated': 1 });
		const logic = new TagsLogic(app);
		const tree = logic.getTree();
		const filtered = logic.filterTree(tree, 'work');
		expect(filtered.find((n) => n.id === 'projects')?.children?.[0].label).toBe('work');
		expect(filtered.find((n) => n.id === 'unrelated')).toBeUndefined();
	});

	it('empty term short-circuits to original list', () => {
		const app = appWithTags({ '#a': 1 });
		const logic = new TagsLogic(app);
		const tree = logic.getTree();
		expect(logic.filterTree(tree, '')).toBe(tree);
	});
});
