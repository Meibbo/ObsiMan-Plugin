import type {
	ActiveFilterEntry,
	DecorationOutput,
	IDecorationManager,
	NodeBase,
	QueueChange,
} from '../types/typeContracts';
import type { FilterRule, FilterType } from '../types/typeFilter';
import type { PendingChange } from '../types/typeOps';
import type {
	ExplorerRenderModel,
	ExplorerViewInput,
	ExplorerViewMode,
	IViewService,
	ViewBadge,
	ViewBadgeLayers,
	ViewIconLayer,
	ViewIconSource,
	ViewLayers,
	ViewTextRange,
	ViewRow,
	ViewTone,
} from '../types/typeViews';

interface ViewServiceOptions {
	decorationManager?: IDecorationManager;
	defaultMode?: ExplorerViewMode;
}

type Subscriber = () => void;

export class ViewService implements IViewService {
	private readonly decorationManager?: IDecorationManager;
	private readonly defaultMode: ExplorerViewMode;
	private readonly modes = new Map<string, ExplorerViewMode>();
	private readonly selections = new Map<string, Set<string>>();
	private readonly expanded = new Map<string, Set<string>>();
	private readonly focused = new Map<string, string | null>();
	private readonly subscribers = new Map<string, Set<Subscriber>>();

	constructor(options: ViewServiceOptions = {}) {
		this.decorationManager = options.decorationManager;
		this.defaultMode = options.defaultMode ?? 'tree';
	}

	getModel<TNode extends NodeBase>(input: ExplorerViewInput<TNode>): ExplorerRenderModel<TNode> {
		const selected = this.selectionFor(input.explorerId);
		const rows = input.nodes.map((node) => this.toRow(input, node, selected));

		return {
			explorerId: input.explorerId,
			mode: input.mode,
			rows,
			columns: input.columns ?? [],
			groups: input.groups ?? [],
			selection: { ids: new Set(selected) },
			focus: { id: this.focused.get(input.explorerId) ?? null },
			sort: input.sort ?? { id: 'manual', direction: 'asc' },
			search: input.search ?? { query: '' },
			virtualization: { rowHeight: 32, overscan: 5 },
			capabilities: input.capabilities ?? {},
			empty: rows.length === 0 ? { label: 'No items' } : undefined,
		};
	}

	setViewMode(explorerId: string, mode: ExplorerViewMode): void {
		if (this.modes.get(explorerId) === mode) return;
		this.modes.set(explorerId, mode);
		this.notify(explorerId);
	}

	getViewMode(explorerId: string): ExplorerViewMode {
		return this.modes.get(explorerId) ?? this.defaultMode;
	}

	select(explorerId: string, id: string, mode: 'replace' | 'toggle' | 'add' = 'replace'): void {
		const selected = this.selectionFor(explorerId);
		if (mode === 'replace') {
			selected.clear();
			selected.add(id);
		} else if (mode === 'toggle') {
			if (selected.has(id)) selected.delete(id);
			else selected.add(id);
		} else {
			selected.add(id);
		}
		this.notify(explorerId);
	}

	clearSelection(explorerId: string): void {
		this.selectionFor(explorerId).clear();
		this.notify(explorerId);
	}

	toggleExpanded(explorerId: string, id: string): void {
		const expanded = this.expandedFor(explorerId);
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
		this.notify(explorerId);
	}

	setFocused(explorerId: string, id: string | null): void {
		this.focused.set(explorerId, id);
		this.notify(explorerId);
	}

	subscribe(explorerId: string, cb: Subscriber): () => void {
		let set = this.subscribers.get(explorerId);
		if (!set) {
			set = new Set();
			this.subscribers.set(explorerId, set);
		}
		set.add(cb);
		return () => set?.delete(cb);
	}

	private toRow<TNode extends NodeBase>(
		input: ExplorerViewInput<TNode>,
		node: TNode,
		selected: ReadonlySet<string>,
	): ViewRow<TNode> {
		const label = input.getLabel?.(node) ?? labelFromNode(node);
		const layers = this.layersFor(input, node, label);
		const isSelected = selected.has(node.id);
		return {
			id: node.id,
			node,
			label,
			detail: input.getDetail?.(node),
			icon: layers.icons?.[0]?.icon,
			cells: [],
			layers: {
				...layers,
				state: { ...layers.state, selected: isSelected || undefined },
			},
			actions: input.getActions?.(node) ?? input.actions ?? [],
		};
	}

	private layersFor<TNode extends NodeBase>(
		input: ExplorerViewInput<TNode>,
		node: TNode,
		label: string,
	): ViewLayers {
		const context = input.getDecorationContext?.(node);
		const decoration = this.decorationManager?.decorate(node, context);
		const semanticLayers = semanticLayersFor(node, context, label);
		if (!decoration) return semanticLayers;

		const source = iconSourceFromContext(context);
		const decorationLayers: ViewLayers = {
			icons: decoration.icons.map((icon, index): ViewIconLayer => ({
				id: `${node.id}:icon:${index}`,
				icon,
				source,
			})),
			badges: badgeLayersFromDecoration(node.id, decoration, source),
			highlights:
				decoration.highlights.length > 0 ? { query: decoration.highlights } : undefined,
		};
		return mergeLayers(decorationLayers, semanticLayers);
	}

	private selectionFor(explorerId: string): Set<string> {
		let selected = this.selections.get(explorerId);
		if (!selected) {
			selected = new Set();
			this.selections.set(explorerId, selected);
		}
		return selected;
	}

	private expandedFor(explorerId: string): Set<string> {
		let expanded = this.expanded.get(explorerId);
		if (!expanded) {
			expanded = new Set();
			this.expanded.set(explorerId, expanded);
		}
		return expanded;
	}

	private notify(explorerId: string): void {
		for (const cb of this.subscribers.get(explorerId) ?? []) cb();
	}
}

function labelFromNode(node: NodeBase): string {
	const candidate = node as {
		label?: string;
		basename?: string;
		tag?: string;
		property?: string;
		name?: string;
	};
	return candidate.label ?? candidate.basename ?? candidate.tag ?? candidate.property ?? candidate.name ?? node.id;
}

function iconSourceFromContext(context: unknown): ViewIconSource {
	const kind = (context as { kind?: string } | undefined)?.kind;
	if (kind === 'operation') return 'operation';
	if (kind === 'filter') return 'filter';
	if (kind === 'file') return 'file';
	if (kind === 'folder') return 'folder';
	if (kind === 'tag') return 'tag';
	if (kind === 'prop') return 'type';
	return 'custom';
}

function semanticLayersFor<TNode extends NodeBase>(
	node: TNode,
	context: unknown,
	label: string,
): ViewLayers {
	const kind = (context as { kind?: string } | undefined)?.kind;
	if (kind === 'operation' || isQueueChange(node)) return operationLayersFor(node);
	if (kind === 'filter' || isActiveFilterEntry(node)) return filterLayersFor(node, label);
	return {};
}

function operationLayersFor(node: NodeBase): ViewLayers {
	if (!isQueueChange(node)) return {};
	const intent = operationIntent(node.change, node.group);
	return {
		icons: [
			{
				id: `${node.id}:op-icon`,
				icon: intent.icon,
				source: 'operation',
			},
		],
		badges: {
			ops: [
				{
					id: `${node.id}:op`,
					label: intent.label,
					icon: intent.icon,
					tone: intent.tone,
					sourceId: node.id,
					actionId: 'remove',
				},
			],
		},
		state: { pending: true },
	};
}

function filterLayersFor(node: NodeBase, label: string): ViewLayers {
	if (!isActiveFilterEntry(node)) return {};
	const enabled = node.rule.enabled !== false;
	return {
		icons: [
			{
				id: `${node.id}:filter-icon`,
				icon: 'lucide-filter',
				source: 'filter',
			},
		],
		badges: {
			filters: [
				{
					id: `${node.id}:filter`,
					label: filterTypeLabel(node.rule.filterType),
					icon: 'lucide-filter',
					tone: enabled ? 'info' : 'neutral',
					sourceId: node.id,
					actionId: 'remove',
				},
			],
		},
		highlights: {
			filter: filterRangesForRule(label, node.rule),
		},
		state: {
			activeFilter: enabled || undefined,
			disabled: enabled ? undefined : true,
		},
	};
}

function operationIntent(
	change: PendingChange,
	group: string,
): { label: string; icon: string; tone: ViewTone } {
	const raw = `${change.action ?? ''} ${change.type ?? ''} ${group}`.toLowerCase();
	if (raw.includes('delete') || raw.includes('remove')) {
		return { label: 'delete', icon: 'lucide-trash-2', tone: 'danger' };
	}
	if (raw.includes('add')) return { label: 'add', icon: 'lucide-plus', tone: 'success' };
	if (raw.includes('rename')) return { label: 'rename', icon: 'lucide-pencil', tone: 'warning' };
	if (raw.includes('move')) return { label: 'move', icon: 'lucide-folder-input', tone: 'info' };
	if (raw.includes('template')) return { label: 'template', icon: 'lucide-book-marked', tone: 'accent' };
	if (raw.includes('replace')) return { label: 'replace', icon: 'lucide-replace', tone: 'warning' };
	if (raw.includes('set')) return { label: 'set', icon: 'lucide-settings-2', tone: 'info' };
	return { label: change.action || change.type || group || 'operation', icon: 'lucide-settings-2', tone: 'info' };
}

function filterTypeLabel(type: FilterType): string {
	return type.replaceAll('_', ' ');
}

function filterRangesForRule(label: string, rule: FilterRule): ViewTextRange[] | undefined {
	const terms = [rule.property, ...rule.values].filter(Boolean);
	const ranges = terms.flatMap((term) => rangesForTerm(label, term));
	if (ranges.length === 0) return undefined;
	return collapseRanges(ranges);
}

function rangesForTerm(label: string, term: string): ViewTextRange[] {
	const ranges: ViewTextRange[] = [];
	const haystack = label.toLowerCase();
	const needle = term.toLowerCase();
	if (!needle) return ranges;
	let index = 0;
	while ((index = haystack.indexOf(needle, index)) !== -1) {
		ranges.push({ start: index, end: index + term.length });
		index += term.length;
	}
	return ranges;
}

function collapseRanges(ranges: ViewTextRange[]): ViewTextRange[] {
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

function isQueueChange(node: NodeBase): node is QueueChange {
	const candidate = node as Partial<QueueChange>;
	return Boolean(candidate.change && typeof candidate.group === 'string');
}

function isActiveFilterEntry(node: NodeBase): node is ActiveFilterEntry {
	const candidate = node as Partial<ActiveFilterEntry>;
	return Boolean(candidate.rule && candidate.rule.type === 'rule');
}

function mergeLayers(primary: ViewLayers, secondary: ViewLayers): ViewLayers {
	return {
		icons: mergeArrays(primary.icons, secondary.icons),
		badges: mergeBadges(primary.badges, secondary.badges),
		highlights: {
			query: mergeArrays(primary.highlights?.query, secondary.highlights?.query),
			filter: mergeArrays(primary.highlights?.filter, secondary.highlights?.filter),
			warning: mergeArrays(primary.highlights?.warning, secondary.highlights?.warning),
		},
		state: { ...primary.state, ...secondary.state },
		marks: mergeArrays(primary.marks, secondary.marks),
	};
}

function mergeBadges(
	primary: ViewBadgeLayers | undefined,
	secondary: ViewBadgeLayers | undefined,
): ViewBadgeLayers | undefined {
	if (!primary && !secondary) return undefined;
	return {
		ops: mergeArrays(primary?.ops, secondary?.ops),
		filters: mergeArrays(primary?.filters, secondary?.filters),
		warnings: mergeArrays(primary?.warnings, secondary?.warnings),
		inherited: mergeArrays(primary?.inherited, secondary?.inherited),
		counts: mergeArrays(primary?.counts, secondary?.counts),
	};
}

function mergeArrays<T>(primary: readonly T[] | undefined, secondary: readonly T[] | undefined): readonly T[] | undefined {
	const merged = [...(primary ?? []), ...(secondary ?? [])];
	return merged.length > 0 ? merged : undefined;
}

function badgeLayersFromDecoration(
	nodeId: string,
	decoration: DecorationOutput,
	source: ViewIconSource,
): ViewBadgeLayers | undefined {
	if (decoration.badges.length === 0) return undefined;
	const badges = decoration.badges.map((badge, index): ViewBadge => ({
		id: `${nodeId}:badge:${index}`,
		label: badge.label,
		tone: toneFromAccent(badge.accent),
	}));

	if (source === 'operation') return { ops: badges };
	if (source === 'filter') return { filters: badges };
	return { counts: badges };
}

function toneFromAccent(accent: string | undefined): ViewTone {
	if (accent === 'red') return 'danger';
	if (accent === 'green') return 'success';
	if (accent === 'orange') return 'warning';
	if (accent === 'blue') return 'info';
	if (accent === 'purple') return 'accent';
	if (accent === 'accent') return 'accent';
	return 'neutral';
}
