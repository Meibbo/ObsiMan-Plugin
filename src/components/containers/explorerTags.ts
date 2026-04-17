import { TagsLogic } from '../../logic/logicTags';
import type { TreeNode, TagMeta } from '../../types/typeTree';
import type { VaultmanPlugin } from '../../../main';
import type { ExplorerProvider, ExplorerViewMode } from '../../types/typeExplorer';

export class explorerTags implements ExplorerProvider<TagMeta> {
    id = 'tags';
    private plugin: VaultmanPlugin;
    private logic: TagsLogic;
    private searchTerm = '';
    private searchMode: 'all' | 'leaf' = 'all';
    private sortBy: string = 'name';
    private sortDir: 'asc' | 'desc' = 'asc';
    private addMode = false;

    constructor(plugin: VaultmanPlugin) {
        this.plugin = plugin;
        this.logic = new TagsLogic(plugin.app);
        this.registerActions();
    }

    private registerActions() {
        const svc = this.plugin.contextMenuService;

        svc.registerAction({
            id: 'tag.rename',
            nodeTypes: ['tag'],
            surfaces: ['panel', 'file-menu'],
            label: 'Rename',
            icon: 'lucide-pencil',
            run: () => {
                // In Svelte version, rename can be triggered via editingId in the component
                // This would need a way to set editingId from the context menu
            },
        });

        svc.registerAction({
            id: 'tag.delete',
            nodeTypes: ['tag'],
            surfaces: ['panel'],
            label: 'Delete',
            icon: 'lucide-trash-2',
            run: (ctx) => {
                const meta = ctx.node.meta as TagMeta;
                return this._deleteTag(meta.tagPath);
            },
        });
    }

    getTree(): TreeNode<TagMeta>[] {
        let tree = this.logic.getTree();
        if (this.searchMode === 'leaf') tree = this._collectLeaves(tree);
        if (this.searchTerm) tree = this.logic.filterTree(tree, this.searchTerm);
        tree = this._applySort(tree);
        
        return this._resolveIcons(tree);
    }

    private _resolveIcons(nodes: TreeNode<TagMeta>[], parentDeleted = false): TreeNode<TagMeta>[] {
        const queue = this.plugin.queueService.queue;
        return nodes.map(node => {
            const meta = node.meta;
            const currentCls = node.cls || '';

            const relevantOps = queue.filter(op => op.type === 'tag' && op.tag === meta.tagPath);
            const isEffectivelyDeleted = parentDeleted || relevantOps.some(op => op.action === 'delete');

            const cls = isEffectivelyDeleted ? (currentCls + ' is-deleted-tag').trim() : currentCls;
            const resolvedChildren = node.children ? this._resolveIcons(node.children, isEffectivelyDeleted) : [];

            const badges: import('../../types/typeTree').NodeBadge[] = [];
            for (const op of relevantOps) {
                const opIdx = queue.indexOf(op);
                if (op.action === 'delete') badges.push({ text: 'Delete', icon: 'lucide-trash-2', color: 'red', queueIndex: opIdx });
                else if (op.action === 'rename') badges.push({ text: 'Update', icon: 'lucide-pencil', color: 'blue', queueIndex: opIdx });
                else if (op.action === 'add') badges.push({ text: 'Add', icon: 'lucide-plus', color: 'green', queueIndex: opIdx });
                else badges.push({ text: 'In Queue', icon: 'lucide-clock', color: 'purple', queueIndex: opIdx });
            }

            return {
                ...node,
                cls: cls,
                icon: this.plugin.iconicService?.getTagIcon(meta.tagPath)?.icon ?? 'lucide-tag',
                badges,
                children: resolvedChildren
            };
        });
    }

    handleNodeClick(node: TreeNode<TagMeta>): void {
        const meta = node.meta;
        if (this.addMode) {
             this.plugin.queueService.add({
                type: 'tag', tag: meta.tagPath, action: 'add',
                details: `Add tag "#${meta.tagPath}"`,
                files: this.plugin.filterService.filteredFiles,
                customLogic: true,
                logicFunc: (_file, fm) => {
                    const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
                    if (tags.includes(meta.tagPath)) return null;
                    fm.tags = [...tags, meta.tagPath];
                    return fm;
                },
            });
            return;
        }

        const tagId = `#${meta.tagPath}`;
        if (this.plugin.filterService.hasTagFilter(tagId)) {
            void this.plugin.filterService.removeNodeByTag(tagId);
        } else {
            void this.plugin.filterService.addNode({
                type: 'rule', filterType: 'has_tag', property: '', values: [tagId],
            });
        }
    }

    handleContextMenu(node: TreeNode<TagMeta>, e: MouseEvent): void {
        this.plugin.contextMenuService.openPanelMenu(
            { nodeType: 'tag', node: node as TreeNode<unknown>, surface: 'panel' },
            e,
        );
    }

    setSearchTerm(term: string, mode: 'all' | 'leaf' = 'all'): void {
        this.searchTerm = term;
        this.searchMode = mode;
    }

    setSortBy(sortBy: string, direction: 'asc' | 'desc'): void {
        this.sortBy = sortBy;
        this.sortDir = direction;
    }

    setViewMode(_mode: ExplorerViewMode): void { }
    setAddMode(active: boolean): void { this.addMode = active; }

    private _applySort(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
        const dir = this.sortDir === 'asc' ? 1 : -1;
        return [...nodes].sort((a, b) => {
            if (this.sortBy === 'count') return dir * ((a.count ?? 0) - (b.count ?? 0));
            return dir * a.label.localeCompare(b.label);
        });
    }

    private _collectLeaves(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
        const leaves: TreeNode<TagMeta>[] = [];
        const walk = (ns: TreeNode<TagMeta>[]) => {
            for (const n of ns) {
                if (!n.children || n.children.length === 0) leaves.push({ ...n, children: [] });
                else walk(n.children);
            }
        };
        walk(nodes);
        return leaves;
    }

    private async _deleteTag(tagPath: string): Promise<void> {
        for (const file of this.plugin.app.vault.getMarkdownFiles()) {
            await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
                if (!fm.tags) return;
                const tags = Array.isArray(fm.tags) ? fm.tags : [fm.tags];
                fm.tags = tags.filter((t: any) => String(t) !== tagPath && String(t) !== `#${tagPath}`);
            });
        }
        this.logic.invalidate();
    }
}
