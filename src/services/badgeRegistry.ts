/**
 * Badge registry — single source of truth for hover/active badge ordering
 * across explorer adapters (tree/grid).
 *
 * `convert` is reserved for queue-display only and is omitted from the
 * hover render. When `delete` is queued for a node the hover render
 * collapses to `['filter']` only.
 */

export type BadgeKind = 'set' | 'rename' | 'convert' | 'delete' | 'filter';

/** Canonical render order across all explorers. */
export const ORDER: readonly BadgeKind[] = ['set', 'rename', 'convert', 'delete', 'filter'];

/** Hover-renderable kinds (convert is excluded from hover render). */
const HOVER_KINDS: readonly BadgeKind[] = ['set', 'rename', 'delete', 'filter'];

/**
 * Minimal node shape understood by the registry. We only need `id` so the
 * registry can stay decoupled from the full TreeNode contract.
 */
export interface BadgeRegistryNode {
	id: string;
}

/**
 * Map of nodeId -> set of `BadgeKind`s already queued/active for that node.
 * Callers (panelExplorer) memoize this from `OperationQueueService` keyed
 * on a queue version counter to avoid render loops.
 */
type ActiveOpsByNodeMap = ReadonlyMap<string, ReadonlySet<BadgeKind>>;
type ActiveOpsByNodeRecord = Record<string, readonly BadgeKind[] | ReadonlySet<BadgeKind>>;

export type ActiveOpsByNode = ActiveOpsByNodeMap | ActiveOpsByNodeRecord;

function isActiveOpsMap(activeOpsByNode: ActiveOpsByNode): activeOpsByNode is ActiveOpsByNodeMap {
	return activeOpsByNode instanceof Map;
}

function lookupActive(
	activeOpsByNode: ActiveOpsByNode,
	nodeId: string,
): ReadonlySet<BadgeKind> {
	if (isActiveOpsMap(activeOpsByNode)) {
		return activeOpsByNode.get(nodeId) ?? EMPTY_SET;
	}
	const value = activeOpsByNode[nodeId];
	if (!value) return EMPTY_SET;
	if (value instanceof Set) return value;
	return new Set(value);
}

const EMPTY_SET: ReadonlySet<BadgeKind> = new Set();

function sortByOrder(kinds: Iterable<BadgeKind>): BadgeKind[] {
	const seen = new Set<BadgeKind>();
	for (const kind of kinds) seen.add(kind);
	return ORDER.filter((kind) => seen.has(kind));
}

/**
 * Hover-time badges to render for a node.
 *
 * Rules:
 * - Render in canonical `ORDER`.
 * - Exclude `convert` (queue-display only).
 * - If the node already has kind K queued, hide the hover badge for K
 *   (no duplicate ops on a single node).
 * - If `delete` is queued for the node, return `['filter']` only —
 *   delete supersedes every other hover affordance.
 */
export function visibleHoverBadges(
	node: BadgeRegistryNode,
	activeOpsByNode: ActiveOpsByNode,
): BadgeKind[] {
	const active = lookupActive(activeOpsByNode, node.id);
	if (active.has('delete')) return ['filter'];
	const visible: BadgeKind[] = [];
	for (const kind of HOVER_KINDS) {
		if (active.has(kind)) continue;
		visible.push(kind);
	}
	return sortByOrder(visible);
}

/**
 * Active (queued) badges for a node, ordered canonically. Used by queue-
 * popup / row-active rendering. `convert` is preserved here.
 */
export function activeBadges(
	node: BadgeRegistryNode,
	activeOpsByNode: ActiveOpsByNode,
): BadgeKind[] {
	const active = lookupActive(activeOpsByNode, node.id);
	return sortByOrder(active);
}

/**
 * Heuristic mapping from queue op `kind` strings (as produced by
 * `OperationQueueService`) to the canonical badge kinds.
 */
export function badgeKindFromOpKind(opKind: string): BadgeKind | null {
	if (opKind.startsWith('rename')) return 'rename';
	if (opKind.startsWith('delete')) return 'delete';
	if (opKind === 'set_prop' || opKind === 'add_tag' || opKind === 'set_tag') return 'set';
	if (opKind === 'apply_template' || opKind === 'find_replace_content') return 'set';
	if (opKind === 'reorder_props' || opKind === 'move_file') return 'set';
	return null;
}

/**
 * Heuristic mapping from a `NodeBadge` (decorated by the provider) back to
 * the canonical badge kind. Falls back to `null` for unknown shapes.
 */
export function badgeKindFromNodeBadge(badge: {
	icon?: string;
	text?: string;
	color?: string;
}): BadgeKind | null {
	const text = (badge.text ?? '').toLowerCase();
	const icon = (badge.icon ?? '').toLowerCase();
	if (text.includes('delete') || icon.includes('trash')) return 'delete';
	if (text.includes('rename') || icon.includes('text-cursor') || icon.includes('pencil-line'))
		return 'rename';
	if (text.includes('convert') || icon.includes('replace') || icon.includes('refresh-cw'))
		return 'convert';
	if (text.includes('filter') || icon.includes('filter')) return 'filter';
	if (text.includes('set') || text.includes('add') || icon.includes('plus')) return 'set';
	return null;
}

