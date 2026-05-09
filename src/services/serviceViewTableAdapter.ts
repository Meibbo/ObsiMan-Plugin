import type {
	ColumnDef,
	RowSelectionState,
	SortingState,
	Updater,
} from '@tanstack/table-core';
import { functionalUpdate } from '@tanstack/table-core';
import type { NodeBase } from '../types/typeContracts';
import type { TreeNode } from '../types/typeNode';
import type { NodeSelectionSnapshot } from '../types/typeSelection';
import type { ViewCell, ViewColumn, ViewLayers, ViewRow } from '../types/typeViews';

export const DEFAULT_NODE_TABLE_COLUMNS: readonly ViewColumn<TreeNode>[] = [
	{ id: 'label', label: 'Name', icon: 'lucide-text', sortable: true, minWidth: 180 },
	{ id: 'detail', label: 'Detail', icon: 'lucide-info', sortable: false, minWidth: 160 },
	{ id: 'count', label: 'Count', icon: 'lucide-hash', sortable: true, minWidth: 72 },
];

const PROP_NODE_TABLE_COLUMNS: readonly ViewColumn<TreeNode>[] = [
	{ id: 'label', label: 'Name', icon: 'lucide-text', sortable: true, minWidth: 180 },
	{
		id: 'nodeKind',
		label: 'Kind',
		icon: 'lucide-layers',
		sortable: true,
		minWidth: 96,
		getValue: (node) => propNodeKind(node),
	},
	{
		id: 'propType',
		label: 'Type',
		icon: 'lucide-braces',
		sortable: true,
		minWidth: 96,
		getValue: (node) => stringMeta(node, 'propType'),
	},
	{ id: 'count', label: 'Count', icon: 'lucide-hash', sortable: true, minWidth: 72 },
];

const TAG_NODE_TABLE_COLUMNS: readonly ViewColumn<TreeNode>[] = [
	{ id: 'label', label: 'Tag', icon: 'lucide-tag', sortable: true, minWidth: 160 },
	{
		id: 'tagPath',
		label: 'Path',
		icon: 'lucide-route',
		sortable: true,
		minWidth: 180,
		getValue: (node) => tagPathForNode(node),
	},
	{
		id: 'depth',
		label: 'Depth',
		icon: 'lucide-indent',
		sortable: true,
		minWidth: 72,
		getValue: (node) => node.depth,
	},
	{ id: 'count', label: 'Count', icon: 'lucide-hash', sortable: true, minWidth: 72 },
];

const FILE_NODE_TABLE_COLUMNS: readonly ViewColumn<TreeNode>[] = [
	{ id: 'label', label: 'Name', icon: 'lucide-file', sortable: true, minWidth: 180 },
	{
		id: 'fileType',
		label: 'Type',
		icon: 'lucide-file-type',
		sortable: true,
		minWidth: 88,
		getValue: (node) => fileTypeForNode(node),
	},
	{
		id: 'path',
		label: 'Path',
		icon: 'lucide-folder-tree',
		sortable: true,
		minWidth: 220,
		getValue: (node) => filePathForNode(node),
	},
	{ id: 'count', label: 'Props', icon: 'lucide-hash', sortable: true, minWidth: 72 },
];

const CONTENT_NODE_TABLE_COLUMNS: readonly ViewColumn<TreeNode>[] = [
	{ id: 'label', label: 'Match', icon: 'lucide-search', sortable: true, minWidth: 240 },
	{
		id: 'filePath',
		label: 'File',
		icon: 'lucide-file-text',
		sortable: true,
		minWidth: 220,
		getValue: (node) => stringMeta(node, 'filePath'),
	},
	{
		id: 'line',
		label: 'Line',
		icon: 'lucide-list-ordered',
		sortable: true,
		minWidth: 72,
		getValue: (node) => lineForContentNode(node),
	},
	{ id: 'count', label: 'Matches', icon: 'lucide-hash', sortable: true, minWidth: 88 },
];

export type NodeTableRow<TNode extends NodeBase = NodeBase> = ViewRow<TNode>;

export function nodeTableColumnsForProvider<TMeta>(
	providerId: string,
): ViewColumn<TreeNode<TMeta>>[] {
	const columns =
		providerId === 'props'
			? PROP_NODE_TABLE_COLUMNS
			: providerId === 'tags'
				? TAG_NODE_TABLE_COLUMNS
				: providerId === 'files'
					? FILE_NODE_TABLE_COLUMNS
					: providerId === 'content'
						? CONTENT_NODE_TABLE_COLUMNS
						: DEFAULT_NODE_TABLE_COLUMNS;
	return [...columns] as ViewColumn<TreeNode<TMeta>>[];
}

export function nodeRowsFromTree<TMeta>(
	nodes: readonly TreeNode<TMeta>[],
): ViewRow<TreeNode<TMeta>>[] {
	const rows: ViewRow<TreeNode<TMeta>>[] = [];
	const visit = (items: readonly TreeNode<TMeta>[]) => {
		for (const node of items) {
			rows.push(rowFromTreeNode(node));
			if (node.children?.length) visit(node.children);
		}
	};
	visit(nodes);
	return rows;
}

function rowFromTreeNode<TMeta>(node: TreeNode<TMeta>): ViewRow<TreeNode<TMeta>> {
	const count = node.countLabel ?? node.count ?? node.children?.length ?? '';
	const detail = detailForNode(node);
	const cells: ViewCell[] = [
		cell(node.id, 'label', node.label, 'text'),
		cell(node.id, 'detail', detail, 'text'),
		cell(node.id, 'count', count, typeof count === 'number' ? 'number' : 'text'),
	];
	return {
		id: node.id,
		node,
		label: node.label,
		detail,
		icon: node.icon,
		depth: node.depth,
		cells,
		cls: node.cls,
		layers: layersFromNode(node),
		actions: [],
	};
}

function cell(rowId: string, columnId: string, value: unknown, type: ViewCell['type']): ViewCell {
	const display = displayForValue(value);
	return { id: `${rowId}:${columnId}`, columnId, value, display, type };
}

function displayForValue(value: unknown): string {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}
	return '';
}

function detailForNode<TMeta>(node: TreeNode<TMeta>): string {
	const meta = node.meta as
		| { file?: { path?: string }; folderPath?: string; propType?: string }
		| undefined;
	return meta?.file?.path ?? meta?.folderPath ?? meta?.propType ?? '';
}

function layersFromNode<TMeta>(node: TreeNode<TMeta>): ViewLayers {
	const meta = node.meta as { layers?: ViewLayers } | undefined;
	return meta?.layers ?? {};
}

function propNodeKind<TMeta>(node: TreeNode<TMeta>): string {
	return booleanMeta(node, 'isValueNode') ? 'Value' : 'Property';
}

function tagPathForNode<TMeta>(node: TreeNode<TMeta>): string {
	const tagPath = stringMeta(node, 'tagPath');
	return tagPath ? `#${tagPath}` : '';
}

function fileTypeForNode<TMeta>(node: TreeNode<TMeta>): string {
	return booleanMeta(node, 'isFolder') ? 'Folder' : 'File';
}

function filePathForNode<TMeta>(node: TreeNode<TMeta>): string {
	const meta = metaRecord(node);
	const file = meta.file;
	if (isRecord(file) && typeof file.path === 'string') return file.path;
	return stringMeta(node, 'folderPath');
}

function lineForContentNode<TMeta>(node: TreeNode<TMeta>): number | '' {
	const line = numberMeta(node, 'line');
	return typeof line === 'number' ? line + 1 : '';
}

function stringMeta<TMeta>(node: TreeNode<TMeta>, key: string): string {
	const value = metaRecord(node)[key];
	return typeof value === 'string' ? value : '';
}

function numberMeta<TMeta>(node: TreeNode<TMeta>, key: string): number | undefined {
	const value = metaRecord(node)[key];
	return typeof value === 'number' ? value : undefined;
}

function booleanMeta<TMeta>(node: TreeNode<TMeta>, key: string): boolean {
	return metaRecord(node)[key] === true;
}

function metaRecord<TMeta>(node: TreeNode<TMeta>): Record<string, unknown> {
	return isRecord(node.meta) ? node.meta : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function buildNodeTableColumnDefs<TNode extends NodeBase>(
	columns: readonly ViewColumn<TNode>[],
): ColumnDef<ViewRow<TNode>, unknown>[] {
	return columns.map((column) => ({
		id: column.id,
		header: column.label,
		accessorFn: (row) => valueForColumn(row, column),
		enableSorting: column.sortable === true,
		size: column.width,
		minSize: column.minWidth,
		meta: { viewColumn: column },
	}));
}

function valueForColumn<TNode extends NodeBase>(
	row: ViewRow<TNode>,
	column: ViewColumn<TNode>,
): unknown {
	if (column.getValue) return column.getValue(row.node);
	const cellValue = row.cells.find((cell) => cell.columnId === column.id)?.value;
	if (cellValue !== undefined) return cellValue;
	if (column.id === 'label') return row.label;
	if (column.id === 'detail') return row.detail ?? '';
	return '';
}

export function rowSelectionFromSnapshot(snapshot: NodeSelectionSnapshot): RowSelectionState {
	const out: RowSelectionState = {};
	for (const id of snapshot.ids) out[id] = true;
	return out;
}

export function rowSelectionIds(state: RowSelectionState): string[] {
	return Object.entries(state)
		.filter(([, selected]) => selected)
		.map(([id]) => id);
}

export function resolveRowSelectionUpdate(
	updater: Updater<RowSelectionState>,
	previous: RowSelectionState,
): RowSelectionState {
	return functionalUpdate(updater, previous);
}

export function sortingStateFromViewSort(sort?: {
	id: string;
	direction: 'asc' | 'desc';
}): SortingState {
	return sort && sort.id !== 'manual' ? [{ id: sort.id, desc: sort.direction === 'desc' }] : [];
}
