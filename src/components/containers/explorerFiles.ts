import type { TFile } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { FilesLogic } from '../../logic/logicsFiles';
import type { TreeNode, FileMeta } from '../../types/typeNode';
import type { MenuCtx } from '../../types/typeCtxMenu';
import { FileRenameModal } from '../../modals/modalFileRename';
import { FileMoveModal } from '../../modals/modalFileMove';
import { PropertyManagerModal } from '../../modals/modalPropertyManager';
import type { ExplorerProvider, ExplorerViewMode } from '../../types/typeExplorer';
import { buildFileDeleteChange } from '../../services/serviceFileQueue';

export class explorerFiles implements ExplorerProvider<FileMeta> {
	id = 'files';
	private plugin: VaultmanPlugin;
	private logic: FilesLogic;
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private addMode = false;
	private searchName = '';
	private searchFolder = '';

	constructor(plugin: VaultmanPlugin) {
		this.plugin = plugin;
		this.logic = new FilesLogic(plugin.app);
		this.registerActions();
	}

	private registerActions() {
		const svc = this.plugin.contextMenuService;

		svc.registerAction({
			id: 'file.rename',
			nodeTypes: ['file'],
			surfaces: ['panel', 'file-menu'],
			label: 'Rename',
			icon: 'lucide-pencil',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				new FileRenameModal(
					this.plugin.app,
					this.plugin.propertyIndex,
					[meta.file],
					(change) => void this.plugin.queueService.add(change),
				).open();
			},
		});

		svc.registerAction({
			id: 'file.delete',
			nodeTypes: ['file'],
			surfaces: ['panel', 'file-menu'],
			label: 'Delete',
			icon: 'lucide-trash',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				void this.plugin.queueService.add(buildFileDeleteChange(meta.file));
			},
		});

		svc.registerAction({
			id: 'file.move',
			nodeTypes: ['file'],
			surfaces: ['panel'],
			label: 'Move file',
			icon: 'lucide-folder-input',
			run: (ctx: MenuCtx) => {
				const meta = ctx.node.meta as FileMeta;
				if (!meta.file) return;
				new FileMoveModal(
					this.plugin.app,
					[meta.file],
					(change) => void this.plugin.queueService.add(change),
				).open();
			},
		});
	}

	getTree(): TreeNode<FileMeta>[] {
		const filtered = this.logic.filterFlat(
			this.plugin.filterService.filteredFiles,
			this.searchName,
			this.searchFolder,
		);
		const sorted = this._sortFiles(filtered);
		const tree = this.logic.buildFileTree(sorted);
		this._decorateTree(tree);
		return tree;
	}

	private _decorateTree(nodes: TreeNode<FileMeta>[]): void {
		for (const n of nodes) {
			const decoration = this.plugin.decorationManager.decorate(n, {
				kind: 'file',
				highlightQuery: n.meta.isFolder ? this.searchFolder : this.searchName,
				isFolder: n.meta.isFolder,
			});
			n.icon = decoration.icons[0];
			n.highlights = decoration.highlights;
			if (decoration.highlights.length > 0 && !n.cls?.includes('vm-search-highlight')) {
				n.cls = `${n.cls ?? ''} vm-search-highlight`.trim();
			}
			if (n.children?.length) this._decorateTree(n.children);
		}
	}

	getFiles(): TFile[] {
		return this.logic.filterFlat(
			this.plugin.filterService.filteredFiles,
			this.searchName,
			this.searchFolder,
		);
	}

	handleNodeClick(node: TreeNode<FileMeta>): void {
		this.handleNodeSelection([node]);
	}

	handleNodeSelection(nodes: TreeNode<FileMeta>[]): void {
		const files = nodes
			.map((node) => node.meta)
			.filter((meta) => !meta.isFolder && Boolean(meta.file))
			.map((meta) => meta.file!);
		if (files.length === 0) return;
		if (this.addMode) {
			new PropertyManagerModal(
				this.plugin.app,
				this.plugin.propertyIndex,
				files,
				(change) => void this.plugin.queueService.add(change),
			).open();
			return;
		}
		this.setSelectedFilesFilter(files);
	}

	handleContextMenu(node: TreeNode<FileMeta>, e: MouseEvent, selectedNodes: TreeNode<FileMeta>[] = []): void {
		const meta = node.meta;
		if (meta.isFolder || !meta.file) return;
		this.plugin.contextMenuService.openPanelMenu(
			{ nodeType: 'file', node: node, selectedNodes, surface: 'panel', file: meta.file },
			e,
		);
	}

	getNodeType(node: TreeNode<FileMeta>): 'file' | 'folder' {
		return node.meta.isFolder ? 'folder' : 'file';
	}

	setSearchTerm(term: string): void {
		this.searchName = term;
	}
	setSearchFilter(name: string, folder: string): void {
		this.searchName = name;
		this.searchFolder = folder;
	}
	setSortBy(sortBy: string, direction: 'asc' | 'desc'): void {
		this.sortBy = sortBy;
		this.sortDir = direction;
	}
	setViewMode(_mode: ExplorerViewMode): void {}
	setAddMode(active: boolean): void {
		this.addMode = active;
	}

	private _sortFiles(files: TFile[]): TFile[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		return [...files].sort((a, b) => {
			if (this.sortBy === 'date') return dir * (b.stat.mtime - a.stat.mtime);
			if (this.sortBy === 'count') {
				const aC = Object.keys(
					this.plugin.app.metadataCache.getFileCache(a)?.frontmatter ?? {},
				).filter((k) => k !== 'position').length;
				const bC = Object.keys(
					this.plugin.app.metadataCache.getFileCache(b)?.frontmatter ?? {},
				).filter((k) => k !== 'position').length;
				return dir * (aC - bC);
			}
			return dir * a.basename.localeCompare(b.basename);
		});
	}

	private setSelectedFilesFilter(files: TFile[]): void {
		const filterService = this.plugin.filterService as typeof this.plugin.filterService & {
			setSelectedFileFilter?: (selected: TFile[]) => void;
		};
		if (filterService.setSelectedFileFilter) {
			filterService.setSelectedFileFilter(files);
			return;
		}
		filterService.setSelectedFiles(files);
	}
}
