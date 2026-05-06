import type { NodeBadge, TreeNode } from '../types/typeNode';

interface BubbleResult<TMeta> {
	node: TreeNode<TMeta>;
	ownAndDescendantBadges: NodeBadge[];
	changed: boolean;
}

export function bubbleHiddenTreeBadges<TMeta>(
	nodes: readonly TreeNode<TMeta>[],
	expandedIds: ReadonlySet<string>,
): TreeNode<TMeta>[] {
	let changed = false;
	const results = nodes.map((node) => {
		const result = bubbleNode(node, expandedIds);
		if (result.changed) changed = true;
		return result.node;
	});
	return changed ? results : (nodes as TreeNode<TMeta>[]);
}

function bubbleNode<TMeta>(
	node: TreeNode<TMeta>,
	expandedIds: ReadonlySet<string>,
): BubbleResult<TMeta> {
	const sourceChildren = node.children ?? [];
	const childResults = sourceChildren.map((child) => bubbleNode(child, expandedIds));
	const childrenChanged = childResults.some((result) => result.changed);
	const children = childrenChanged ? childResults.map((result) => result.node) : sourceChildren;
	const currentBadges = node.badges ?? [];
	const directBadges = currentBadges.filter((badge) => !badge.isInherited);
	const bubbleableDirectBadges = directBadges.filter((badge) => !badge.quickAction);
	const descendantBadges = childResults.flatMap((result) => result.ownAndDescendantBadges);
	const inheritedBadges =
		children.length > 0 && !expandedIds.has(node.id)
			? uniqueBadges(descendantBadges).map((badge) => ({ ...badge, isInherited: true }))
			: [];
	const badges = [...directBadges, ...inheritedBadges];
	const badgesChanged = !sameBadges(currentBadges, badges);
	const changed = childrenChanged || badgesChanged;

	return {
		node: changed ? { ...node, badges, children } : node,
		ownAndDescendantBadges: [...bubbleableDirectBadges, ...descendantBadges],
		changed,
	};
}

function sameBadges(left: readonly NodeBadge[], right: readonly NodeBadge[]): boolean {
	if (left.length !== right.length) return false;
	return left.every((badge, index) => badgeKey(badge) === badgeKey(right[index]));
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
		badge.quickAction ?? false,
	].join(':');
}
