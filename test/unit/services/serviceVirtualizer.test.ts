import { describe, it, expect } from 'vitest';
import { TreeVirtualizer } from '../../../src/services/serviceVirtualizer';
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

describe('TreeVirtualizer.computeWindow', () => {
	it('returns zero range when total is zero', () => {
		const v = new TreeVirtualizer();
		expect(v.computeWindow(0, 100, 20, 0)).toEqual({ startIndex: 0, endIndex: 0 });
	});

	it('returns zero range when rowH is zero', () => {
		const v = new TreeVirtualizer();
		expect(v.computeWindow(0, 100, 0, 50)).toEqual({ startIndex: 0, endIndex: 0 });
	});

	it('clamps start to 0 with overscan', () => {
		const v = new TreeVirtualizer();
		const w = v.computeWindow(20, 100, 20, 100, 5);
		expect(w.startIndex).toBe(0);
	});

	it('clamps end to total', () => {
		const v = new TreeVirtualizer();
		const w = v.computeWindow(180, 100, 20, 10, 5);
		expect(w.endIndex).toBe(10);
	});

	it('returns symmetric overscan around the visible window', () => {
		const v = new TreeVirtualizer();
		const w = v.computeWindow(400, 100, 20, 100, 5);
		expect(w.startIndex).toBe(15);
		expect(w.endIndex).toBe(30);
	});
});
