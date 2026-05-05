import type { QueueChange } from '../types/typeContracts';
import type { NodeBadge } from '../types/typeNode';
import type { ViewBadge, ViewLayers, ViewTextRange, ViewTone } from '../types/typeViews';

export function nodeBadgesFromViewLayers(
	layers: ViewLayers,
	operations: readonly QueueChange[] = [],
): NodeBadge[] {
	return allViewBadges(layers).map((badge) => ({
		text: badge.label,
		icon: badge.icon,
		color: colorFromTone(badge.tone),
		solid: badge.solid,
		isInherited: badge.inherited,
		queueIndex: queueIndexForBadge(badge, operations),
	}));
}

export function highlightsFromViewLayers(layers: ViewLayers): ViewTextRange[] | undefined {
	const ranges = [
		...(layers.highlights?.query ?? []),
		...(layers.highlights?.filter ?? []),
		...(layers.highlights?.warning ?? []),
	];
	if (ranges.length === 0) return undefined;
	const seen = new Set<string>();
	return ranges
		.sort((a, b) => a.start - b.start || a.end - b.end)
		.filter((range) => {
			const key = `${range.start}:${range.end}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

export function withViewStateClasses(
	current: string | undefined,
	layers: ViewLayers,
	options: { deletedClass?: string } = {},
): string {
	let next = current ?? '';
	if (layers.state?.activeFilter) next = addClass(next, 'is-active-filter');
	if (layers.state?.selected) next = addClass(next, 'is-selected');
	if (layers.state?.focused) next = addClass(next, 'is-focused');
	if (layers.state?.deleted && options.deletedClass) next = addClass(next, options.deletedClass);
	if (layers.state?.warning) next = addClass(next, 'vm-badge-warning');
	return next;
}

function allViewBadges(layers: ViewLayers): ViewBadge[] {
	const badges = layers.badges;
	return [
		...(badges?.ops ?? []),
		...(badges?.filters ?? []),
		...(badges?.warnings ?? []),
		...(badges?.inherited ?? []),
		...(badges?.counts ?? []),
	];
}

function queueIndexForBadge(
	badge: ViewBadge,
	operations: readonly QueueChange[],
): number | undefined {
	if (badge.actionId !== 'remove' || !badge.sourceId) return undefined;
	const index = operations.findIndex(
		(operation) => operation.id === badge.sourceId || operation.change.id === badge.sourceId,
	);
	return index >= 0 ? index : undefined;
}

function colorFromTone(tone: ViewTone | undefined): NodeBadge['color'] {
	if (tone === 'danger') return 'red';
	if (tone === 'success') return 'green';
	if (tone === 'warning') return 'orange';
	if (tone === 'info') return 'blue';
	if (tone === 'accent') return 'purple';
	return 'faint';
}

function addClass(current: string, name: string): string {
	if (current.split(/\s+/).includes(name)) return current;
	return `${current} ${name}`.trim();
}
