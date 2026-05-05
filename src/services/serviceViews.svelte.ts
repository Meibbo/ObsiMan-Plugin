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

interface SemanticContext {
	kind?: string;
	propName?: string;
	property?: string;
	value?: string;
	rawValue?: string;
	isValueNode?: boolean;
	tag?: string;
	tagPath?: string;
	path?: string;
	filePath?: string;
	basename?: string;
	folderPath?: string;
	isFolder?: boolean;
	file?: {
		path?: string;
		basename?: string;
		name?: string;
	};
}

interface SemanticTarget {
	kind?: string;
	property?: string;
	value?: string;
	isValueNode?: boolean;
	tag?: string;
	filePath?: string;
	basename?: string;
	folderPath?: string;
	isFolder?: boolean;
}

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
		const semanticLayers = semanticLayersFor(input, node, context, label);
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
	input: ExplorerViewInput<TNode>,
	node: TNode,
	context: unknown,
	label: string,
): ViewLayers {
	const kind = (context as { kind?: string } | undefined)?.kind;
	if (kind === 'operation' || isQueueChange(node)) return operationLayersFor(node);
	if (kind === 'filter' || isActiveFilterEntry(node)) return filterLayersFor(node, label);
	return mergeLayers(
		matchedOperationLayersFor(node, context, input.operations),
		matchedActiveFilterLayersFor(node, context, label, input.activeFilters),
	);
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

function matchedOperationLayersFor(
	node: NodeBase,
	context: unknown,
	operations: readonly QueueChange[] | undefined,
): ViewLayers {
	if (!operations || operations.length === 0) return {};
	const target = semanticTargetFor(node, context);
	const matches = operations
		.map((operation, index) => ({ operation, index }))
		.filter(({ operation }) => operationMatchesTarget(operation.change, target));
	if (matches.length === 0) return {};

	const badges: ViewBadge[] = matches.map(({ operation, index }) => {
		const intent = operationIntent(operation.change, operation.group);
		const sourceId = operation.id || operation.change.id || String(index);
		return {
			id: `${node.id}:op:${sourceId}`,
			label: intent.label,
			icon: intent.icon,
			tone: intent.tone,
			sourceId,
			actionId: 'remove',
		};
	});
	const hasDelete = matches.some(({ operation }) => operationIntent(operation.change, operation.group).label === 'delete');

	return {
		badges: { ops: uniqueBadges(badges) },
		state: {
			pending: true,
			deleted: hasDelete || undefined,
		},
	};
}

function matchedActiveFilterLayersFor(
	node: NodeBase,
	context: unknown,
	label: string,
	activeFilters: readonly ActiveFilterEntry[] | undefined,
): ViewLayers {
	if (!activeFilters || activeFilters.length === 0) return {};
	const target = semanticTargetFor(node, context);
	const matches = activeFilters
		.map((entry, index) => ({ entry, index }))
		.filter(({ entry }) => filterMatchesTarget(entry.rule, target));
	if (matches.length === 0) return {};

	const badges: ViewBadge[] = matches.map(({ entry, index }) => {
		const sourceId = entry.id || entry.rule.id || String(index);
		const enabled = entry.rule.enabled !== false;
		return {
			id: `${node.id}:filter:${sourceId}`,
			label: filterTypeLabel(entry.rule.filterType),
			icon: 'lucide-filter',
			tone: enabled ? 'info' : 'neutral',
			sourceId,
			actionId: 'remove',
		};
	});
	const filterRanges = collapseRanges(
		matches.flatMap(({ entry }) => filterRangesForRule(label, entry.rule) ?? []),
	);
	const hasEnabled = matches.some(({ entry }) => entry.rule.enabled !== false);

	return {
		badges: { filters: uniqueBadges(badges) },
		highlights: filterRanges.length > 0 ? { filter: filterRanges } : undefined,
		state: {
			activeFilter: hasEnabled || undefined,
			disabled: hasEnabled ? undefined : true,
		},
	};
}

function semanticTargetFor(node: NodeBase, context: unknown): SemanticTarget {
	const ctx = (context ?? {}) as SemanticContext;
	const candidate = node as SemanticContext & {
		label?: string;
		tag?: string;
		property?: string;
		meta?: SemanticContext;
	};
	const meta = candidate.meta ?? {};
	const property = ctx.propName ?? ctx.property ?? meta.propName ?? meta.property ?? candidate.property;
	const value = ctx.rawValue ?? ctx.value ?? meta.rawValue ?? meta.value;
	const tag = ctx.tagPath ?? ctx.tag ?? meta.tagPath ?? meta.tag ?? candidate.tag;
	const filePath =
		ctx.filePath ??
		ctx.path ??
		ctx.file?.path ??
		meta.filePath ??
		meta.path ??
		meta.file?.path ??
		candidate.filePath ??
		candidate.path ??
		candidate.file?.path;
	const basename =
		ctx.basename ??
		ctx.file?.basename ??
		ctx.file?.name ??
		meta.basename ??
		meta.file?.basename ??
		meta.file?.name ??
		candidate.basename ??
		candidate.file?.basename ??
		candidate.file?.name;
	const folderPath = ctx.folderPath ?? meta.folderPath ?? candidate.folderPath;
	const isFolder = ctx.isFolder ?? meta.isFolder ?? candidate.isFolder;
	const kind =
		ctx.kind ??
		(property ? 'prop' : tag ? 'tag' : filePath || basename || folderPath ? 'file' : undefined);

	return {
		kind: kind === 'folder' ? 'file' : kind,
		property: normalizeProperty(property),
		value: value == null ? undefined : String(value),
		isValueNode: ctx.isValueNode ?? meta.isValueNode ?? candidate.isValueNode ?? value != null,
		tag: normalizeTag(tag),
		filePath: normalizePath(filePath),
		basename: basename == null ? undefined : String(basename).toLowerCase(),
		folderPath: normalizePath(folderPath),
		isFolder,
	};
}

function operationMatchesTarget(change: PendingChange, target: SemanticTarget): boolean {
	if (change.type === 'property') {
		if (target.kind !== 'prop') return false;
		if (normalizeProperty(change.property) !== target.property) return false;
		if (!target.isValueNode) return true;
		const values = [change.value, change.oldValue].filter((value): value is string => value != null);
		return values.some((value) => String(value) === target.value);
	}

	if (change.type === 'tag') {
		return target.kind === 'tag' && normalizeTag(change.tag) === target.tag;
	}

	if (change.type === 'file_rename' || change.type === 'file_move' || change.type === 'template') {
		return target.kind === 'file' && changeTargetsFile(change, target);
	}

	if (change.type === 'content_replace') {
		return target.kind === 'file' && changeTargetsFile(change, target);
	}

	return false;
}

function filterMatchesTarget(rule: FilterRule, target: SemanticTarget): boolean {
	switch (rule.filterType) {
		case 'has_property':
		case 'missing_property':
			return target.kind === 'prop' && !target.isValueNode && normalizeProperty(rule.property) === target.property;
		case 'specific_value':
		case 'multiple_values':
			return (
				target.kind === 'prop' &&
				Boolean(target.isValueNode) &&
				normalizeProperty(rule.property) === target.property &&
				rule.values.some((value) => String(value) === target.value)
			);
		case 'has_tag':
			return target.kind === 'tag' && rule.values.some((value) => normalizeTag(value) === target.tag);
		case 'folder':
		case 'folder_exclude':
		case 'file_folder':
			return target.kind === 'file' && rule.values.some((value) => targetMatchesFolder(target, value));
		case 'file_name':
		case 'file_name_exclude':
			return target.kind === 'file' && rule.values.some((value) => targetMatchesFileName(target, value));
		default:
			return false;
	}
}

function changeTargetsFile(change: PendingChange, target: SemanticTarget): boolean {
	if (!('files' in change)) return false;
	return change.files.some((file) => {
		const path = normalizePath(file.path);
		const basename = (file.basename ?? file.name ?? '').toLowerCase();
		return Boolean(
			(target.filePath && path === target.filePath) ||
				(target.basename && basename === target.basename),
		);
	});
}

function targetMatchesFolder(target: SemanticTarget, value: string): boolean {
	const folder = normalizePath(value);
	if (!folder) return false;
	if (target.isFolder) return target.folderPath === folder || target.filePath === folder;
	return Boolean(target.filePath && (target.filePath === folder || target.filePath.startsWith(`${folder}/`)));
}

function targetMatchesFileName(target: SemanticTarget, value: string): boolean {
	const needle = value.toLowerCase();
	return Boolean(needle && target.basename?.includes(needle));
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
	const terms = [rule.property, ...rule.values, ...rule.values.map((value) => value.replace(/^#/, ''))].filter(Boolean);
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

function uniqueBadges(badges: readonly ViewBadge[]): readonly ViewBadge[] {
	const seen = new Set<string>();
	return badges.filter((badge) => {
		if (seen.has(badge.id)) return false;
		seen.add(badge.id);
		return true;
	});
}

function normalizeProperty(value: string | undefined): string | undefined {
	return value?.trim().toLowerCase();
}

function normalizeTag(value: string | undefined): string | undefined {
	return value?.trim().replace(/^#/, '').toLowerCase();
}

function normalizePath(value: string | undefined): string | undefined {
	return value?.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
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
