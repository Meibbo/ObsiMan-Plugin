import type { NodeBadge, TreeNode } from '../types/typeNode';

interface BubbleResult<TMeta> {
	node: TreeNode<TMeta>;
	ownAndDescendantBadges: NodeBadge[];
}

export function bubbleHiddenTreeBadges<TMeta>(
	nodes: readonly TreeNode<TMeta>[],
	expandedIds: ReadonlySet<string>,
): TreeNode<TMeta>[] {
	return nodes.map((node) => bubbleNode(node, expandedIds).node);
}

function bubbleNode<TMeta>(node: TreeNode<TMeta>, expandedIds: ReadonlySet<string>): BubbleResult<TMeta> {
	const childResults = (node.children ?? []).map((child) => bubbleNode(child, expandedIds));
	const children = childResults.map((result) => result.node);
	const directBadges = (node.badges ?? []).filter((badge) => !badge.isInherited);
	const existingInherited = (node.badges ?? []).filter((badge) => badge.isInherited);
	const descendantBadges = childResults.flatMap((result) => result.ownAndDescendantBadges);
	const inheritedBadges =
		children.length > 0 && !expandedIds.has(node.id)
			? uniqueBadges(descendantBadges).map((badge) => ({ ...badge, isInherited: true }))
			: [];

	return {
		node: {
			...node,
			badges: [...directBadges, ...existingInherited, ...inheritedBadges],
			children,
		},
		ownAndDescendantBadges: [...directBadges, ...descendantBadges],
	};
}

function uniqueBadges(badges: readonly NodeBadge[]): NodeBadge[] {
	const seen = new Set<string>();
	return badges.filter((badge) => {
		const key = badgeKey(badge);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function badgeKey(badge: NodeBadge): string {
	return [
		badge.queueIndex ?? 'no-queue',
		badge.text ?? '',
		badge.icon ?? '',
		badge.color ?? '',
		badge.solid ?? false,
	].join(':');
}
