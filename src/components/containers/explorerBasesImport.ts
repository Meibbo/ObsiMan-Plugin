import type { TFile } from 'obsidian';
import type { BasesImportTarget } from '../../types/typeBasesInterop';
import type { IBasesImportTargetsIndex } from '../../types/typeContracts';
import type { MenuCtx } from '../../types/typeCtxMenu';
import type { ExplorerProvider, ExplorerViewMode } from '../../types/typeExplorer';
import type { TreeNode } from '../../types/typeNode';

export type BasesImportExplorerMeta =
	| { kind: 'source'; file: TFile; path: string }
	| { kind: 'target'; file: TFile; path: string; target: BasesImportTarget };

export interface ExplorerBasesImportOptions {
	index: IBasesImportTargetsIndex;
	onImportTarget: (target: BasesImportTarget) => void;
}

export class explorerBasesImport implements ExplorerProvider<BasesImportExplorerMeta> {
	id = 'bases-import';
	empty = {
		kind: 'import' as const,
		label: 'No Bases import targets',
		detail: 'Compatible .base files and notes with bases code blocks will appear here.',
		icon: 'lucide-table-2',
	};

	private index: IBasesImportTargetsIndex;
	private onImportTarget: (target: BasesImportTarget) => void;

	constructor(options: ExplorerBasesImportOptions) {
		this.index = options.index;
		this.onImportTarget = options.onImportTarget;
	}

	getTree(): TreeNode<BasesImportExplorerMeta>[] {
		return this.index.nodes.map((source) => ({
			id: source.id,
			label: source.label,
			icon: getSourceIcon(source.path),
			count: source.targets.length,
			depth: 0,
			meta: {
				kind: 'source',
				file: source.file,
				path: source.path,
			},
			children: source.targets.map((target) => ({
				id: targetId(source.path, target),
				label: target.label,
				icon: getTargetIcon(target),
				depth: 1,
				meta: {
					kind: 'target',
					file: source.file,
					path: source.path,
					target,
				},
			})),
		}));
	}

	getFiles(): TFile[] {
		return this.index.nodes.map((node) => node.file);
	}

	getEmptyState(_context: { mode: ExplorerViewMode; searchTerm: string }) {
		return this.empty;
	}

	handleNodeClick(node: TreeNode<BasesImportExplorerMeta>): void {
		this.handleNodeSelection?.([node]);
	}

	handleNodeSelection(nodes: TreeNode<BasesImportExplorerMeta>[]): void {
		const target = nodes
			.map((node) => node.meta)
			.find((meta): meta is Extract<BasesImportExplorerMeta, { kind: 'target' }> =>
				meta.kind === 'target'
			)?.target;
		if (target) this.onImportTarget(target);
	}

	handleContextMenu(
		_node: TreeNode<BasesImportExplorerMeta>,
		_e: MouseEvent,
		_selectedNodes: TreeNode<BasesImportExplorerMeta>[] = [],
	): void {}

	getNodeType(): MenuCtx['nodeType'] {
		return 'file';
	}
}

function targetId(sourcePath: string, target: BasesImportTarget): string {
	if (target.kind === 'base-view') return `bases-import:target:${sourcePath}:view:${target.targetViewName}`;
	if (target.kind === 'markdown-fence') return `bases-import:target:${sourcePath}:block:${target.blockIndex}`;
	return `bases-import:target:${sourcePath}:file`;
}

function getSourceIcon(path: string): string {
	return path.toLowerCase().endsWith('.base') ? 'lucide-table-2' : 'lucide-file-text';
}

function getTargetIcon(target: BasesImportTarget): string {
	return target.kind === 'markdown-fence' ? 'lucide-code-2' : 'lucide-table';
}
