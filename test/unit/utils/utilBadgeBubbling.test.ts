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
				node('status:draft', [], [
					{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 0 },
				]),
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
				node('status:draft', [], [
					{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 0 },
				]),
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
				node('status:draft', [], [
					{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 2 },
				]),
				node('status:done', [], [
					{ text: 'delete', icon: 'lucide-trash-2', color: 'red', queueIndex: 2 },
				]),
			]),
		];

		const bubbled = bubbleHiddenTreeBadges(tree, new Set());

		expect(bubbled[0].badges?.filter((badge) => badge.isInherited)).toHaveLength(1);
	});
});
