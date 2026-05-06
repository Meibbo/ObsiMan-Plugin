import { describe, expect, it } from 'vitest';
import { bubbleHiddenTreeBadges } from '../../../src/utils/utilBadgeBubbling';
import type { TreeNode } from '../../../src/types/typeNode';

function node(id: string, children: TreeNode[] = [], badges: TreeNode['badges'] = []): TreeNode {
	return {
		id,
		label: id,
		depth: 0,
		meta: {},
		badges,
		children,
	};
}

describe('bubbleHiddenTreeBadges', () => {
	it('adds hidden descendant badges to collapsed parents as inherited badges', () => {
		const tree = [
			node('status', [
				node(
					'status:draft',
					[],
					[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 0 }],
				),
			]),
		];

		const bubbled = bubbleHiddenTreeBadges(tree, new Set());

		expect(bubbled[0].badges).toContainEqual(
			expect.objectContaining({
				text: 'delete',
				icon: 'lucide-trash-2',
				color: 'red',
				queueIndex: 0,
				isInherited: true,
			}),
		);
		expect(bubbled[0].children?.[0].badges?.[0]).toMatchObject({ text: 'delete' });
		expect(bubbled[0].children?.[0].badges?.[0].isInherited).toBeUndefined();
	});

	it('does not bubble child badges when the parent is expanded', () => {
		const tree = [
			node('status', [
				node(
					'status:draft',
					[],
					[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 0 }],
				),
			]),
		];

		const bubbled = bubbleHiddenTreeBadges(tree, new Set(['status']));

		expect(bubbled[0].badges ?? []).toEqual([]);
		expect(bubbled[0].children?.[0].badges).toContainEqual(
			expect.objectContaining({ text: 'delete', queueIndex: 0 }),
		);
	});

	it('collapses duplicate inherited badges by stable operation identity', () => {
		const tree = [
			node('status', [
				node(
					'status:draft',
					[],
					[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 2 }],
				),
				node(
					'status:done',
					[],
					[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 2 }],
				),
			]),
		];

		const bubbled = bubbleHiddenTreeBadges(tree, new Set());

		expect(bubbled[0].badges?.filter((badge) => badge.isInherited)).toHaveLength(1);
	});

	it('reuses node references when no hidden descendant badges are present', () => {
		const child = node('status:draft');
		const parent = node('status', [child]);
		const tree = [parent];

		const bubbled = bubbleHiddenTreeBadges(tree, new Set());

		expect(bubbled[0]).toBe(parent);
		expect(bubbled[0].children?.[0]).toBe(child);
	});

	it('reuses expanded branch references when bubbling does not change badges', () => {
		const child = node(
			'status:draft',
			[],
			[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 0 }],
		);
		const parent = node('status', [child]);
		const tree = [parent];

		const bubbled = bubbleHiddenTreeBadges(tree, new Set(['status']));

		expect(bubbled[0]).toBe(parent);
		expect(bubbled[0].children?.[0]).toBe(child);
	});

	it('clones only collapsed ancestors that receive inherited badges', () => {
		const child = node(
			'status:draft',
			[],
			[{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 0 }],
		);
		const stableSibling = node('status:done');
		const parent = node('status', [child, stableSibling]);
		const tree = [parent];

		const bubbled = bubbleHiddenTreeBadges(tree, new Set());

		expect(bubbled[0]).not.toBe(parent);
		expect(bubbled[0].children?.[0]).toBe(child);
		expect(bubbled[0].children?.[1]).toBe(stableSibling);
		expect(bubbled[0].badges).toContainEqual(
			expect.objectContaining({
				text: 'delete',
				queueIndex: 0,
				isInherited: true,
			}),
		);
	});
});
