import { describe, it, expect } from 'vitest';
import { TreeVirtualizer, Virtualizer } from '../../../src/services/serviceVirtualizer.svelte';
import type { TreeNode } from '../../../src/types/typeTree';

function n(id: string, children?: TreeNode<unknown>[]): TreeNode<unknown> {
	return { id, label: id, depth: 0, children, meta: undefined };
}

describe('TreeVirtualizer.flatten', () => {
	it('returns a single level when no ids are expanded', () => {
		const v = new TreeVirtualizer();
		const tree: TreeNode<unknown>[] = [n('a', [n('a1')]), n('b', [n('b1')])];
		expect(v.flatten(tree, new Set()).map((f) => f.node.id)).toEqual(['a', 'b']);
	});

	it('descends only into expanded ids', () => {
		const v = new TreeVirtualizer();
		const tree: TreeNode<unknown>[] = [n('a', [n('a1'), n('a2')]), n('b', [n('b1')])];
		const flat = v.flatten(tree, new Set(['a']));
		expect(flat.map((f) => f.node.id)).toEqual(['a', 'a1', 'a2', 'b']);
		expect(flat[0].depth).toBe(0);
		expect(flat[1].depth).toBe(1);
	});

	it('marks hasChildren correctly', () => {
		const v = new TreeVirtualizer();
		const tree: TreeNode<unknown>[] = [n('a', [n('a1')]), n('leaf')];
		const flat = v.flatten(tree, new Set());
		expect(flat[0].hasChildren).toBe(true);
		expect(flat[1].hasChildren).toBe(false);
	});
});

describe('Virtualizer.window (rune-derived)', () => {
	it('returns zero range when items is empty', () => {
		const v = new Virtualizer<string>();
		expect(v.window).toEqual({ startIndex: 0, endIndex: 0 });
	});

	it('returns zero range when rowHeight is zero', () => {
		const v = new Virtualizer<string>();
		v.items = Array(50).fill('x');
		v.rowHeight = 0;
		expect(v.window).toEqual({ startIndex: 0, endIndex: 0 });
	});

	it('clamps start to 0 with overscan', () => {
		const v = new Virtualizer<string>();
		v.items = Array(100).fill('x');
		v.rowHeight = 20;
		v.viewportHeight = 100;
		v.overscan = 5;
		v.scrollTop = 20;
		expect(v.window.startIndex).toBe(0);
	});

	it('clamps end to items.length', () => {
		const v = new Virtualizer<string>();
		v.items = Array(10).fill('x');
		v.rowHeight = 20;
		v.viewportHeight = 100;
		v.overscan = 5;
		v.scrollTop = 180;
		expect(v.window.endIndex).toBe(10);
	});

	it('returns symmetric overscan around the visible window', () => {
		const v = new Virtualizer<string>();
		v.items = Array(100).fill('x');
		v.rowHeight = 20;
		v.viewportHeight = 100;
		v.overscan = 5;
		v.scrollTop = 400;
		expect(v.window.startIndex).toBe(15);
		expect(v.window.endIndex).toBe(30);
	});
});
