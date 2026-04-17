import { prepareSimpleSearch } from 'obsidian';
import { PropsLogic } from '../../logic/logicProps';
import type { TreeNode, PropMeta } from '../../types/typeTree';
import type { PropertyChange } from '../../types/typeOps';
import { showInputModal } from '../../utils/inputModal';
import type { VaultmanPlugin } from '../../../main';
import type { ExplorerProvider, ExplorerViewMode } from '../../types/typeExplorer';

const TYPE_ICON_MAP: Record<string, string> = {
    text: 'lucide-text-align-start',
    number: 'lucide-hash',
    checkbox: 'lucide-check-square',
    date: 'lucide-calendar',
    datetime: 'lucide-clock',
    list: 'lucide-list',
    multitext: 'lucide-list-plus',
};

export class explorerProps implements ExplorerProvider<PropMeta> {
    id = 'props';
    private plugin: VaultmanPlugin;
    private logic: PropsLogic;
    private searchTerm = '';
    private sortBy: string = 'name';
    private sortDir: 'asc' | 'desc' = 'asc';
    private addMode = false;

    constructor(plugin: VaultmanPlugin) {
        this.plugin = plugin;
        this.logic = new PropsLogic(plugin.app);
        this.registerActions();
    }

    private registerActions() {
        const svc = this.plugin.contextMenuService;

        svc.registerAction({
            id: 'prop.rename',
            nodeTypes: ['prop'],
            surfaces: ['panel'],
            label: (ctx) => `Rename "${ctx.node.label}"`,
            icon: 'lucide-pencil',
            when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
            run: (ctx) => this._renameProp(ctx.node.label),
        });

        svc.registerAction({
            id: 'prop.delete',
            nodeTypes: ['prop'],
            surfaces: ['panel'],
            label: (ctx) => `Delete "${ctx.node.label}"`,
            icon: 'lucide-trash-2',
            when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
            run: (ctx) => this._deleteProp(ctx.node.label),
        });

        const types = ['text', 'number', 'checkbox', 'date', 'list'] as const;
        types.forEach(type => {
            svc.registerAction({
                id: `prop.type-${type}`,
                nodeTypes: ['prop'],
                surfaces: ['panel'],
                label: type.charAt(0).toUpperCase() + type.slice(1),
                icon: TYPE_ICON_MAP[type],
                submenu: 'Change type',
                when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
                run: (ctx) => this._changePropType(ctx.node.label, type),
            });
        });

        svc.registerAction({
            id: 'value.rename',
            nodeTypes: ['value'],
            surfaces: ['panel'],
            label: 'Rename value',
            icon: 'lucide-pencil',
            when: (ctx) => (ctx.node.meta as PropMeta).isValueNode,
            run: (ctx) => {
                const meta = ctx.node.meta as PropMeta;
                return this._renameValue(meta.propName, meta.rawValue ?? '');
            },
        });

        svc.registerAction({
            id: 'value.delete',
            nodeTypes: ['value'],
            surfaces: ['panel'],
            label: 'Delete value',
            icon: 'lucide-trash-2',
            when: (ctx) => (ctx.node.meta as PropMeta).isValueNode,
            run: (ctx) => {
                const meta = ctx.node.meta as PropMeta;
                return this._deleteValue(meta.propName, meta.rawValue ?? '');
            },
        });
    }

    getTree(): TreeNode<PropMeta>[] {
        const tree = this.logic.getTree();
        const searcher = this.searchTerm ? prepareSimpleSearch(this.searchTerm) : null;
        const searchFunc = searcher ? (text: string) => searcher(text) : null;

        const sorted = this._applySort(tree);
        // Warning: resolution logic for icons and badges should stay complex here
        // until we move it to a shared helper or Svelte logic.
        return this._resolveIcons(sorted, searchFunc);
    }

    private _resolveIcons(nodes: TreeNode<PropMeta>[], searchFunc: ((text: string) => import('obsidian').SearchResult | null) | null, parentDeleted = false): TreeNode<PropMeta>[] {
        const queue = this.plugin.queueService.queue;
        return nodes.map(node => {
            const meta = node.meta;
            let currentCls = node.cls || '';

            const isPropDeleted = parentDeleted || queue.some(op => 
                op.type === 'property' && op.property === meta.propName && op.action === 'delete' && !('value' in op)
            );

            if (isPropDeleted) {
                if (!currentCls.includes('is-deleted-prop')) currentCls = (currentCls + ' is-deleted-prop').trim();
            } else if (meta.isValueNode) {
                const isValueDeleted = queue.some(op => 
                    op.type === 'property' && op.property === meta.propName && op.action === 'delete' && (op as any).oldValue === meta.rawValue
                );
                if (isValueDeleted) {
                    if (!currentCls.includes('is-deleted-value')) currentCls = (currentCls + ' is-deleted-value').trim();
                }
            }

            const badges: import('../../types/typeTree').NodeBadge[] = [];
            if (meta.isTypeIncompatible) {
                badges.push({ text: 'Conflict', color: 'red', solid: true, icon: 'lucide-alert-triangle' });
            }

            const relevantOps = queue.filter(op =>
                op.type === 'property' &&
                op.property === meta.propName &&
                (meta.isValueNode
                    ? (op.value === meta.rawValue || op.oldValue === meta.rawValue || op.action === 'change_type')
                    : true)
            ) as PropertyChange[];

            for (const op of relevantOps) {
                const action = op.action;
                const opIdx = queue.indexOf(op);
                if (action === 'delete') badges.push({ text: 'Delete', icon: 'lucide-trash-2', color: 'red', queueIndex: opIdx });
                else if (action === 'rename' || action === 'set') badges.push({ text: 'Update', icon: 'lucide-pencil', color: 'blue', queueIndex: opIdx });
                else badges.push({ text: 'In Queue', icon: 'lucide-clock', color: 'purple', queueIndex: opIdx });
            }

            const defaultIcon = !meta.isValueNode ? (TYPE_ICON_MAP[meta.propType] ?? 'lucide-tag') : undefined;
            const iconic = !meta.isValueNode ? this.plugin.iconicService?.getIcon(meta.propName) : null;

            return {
                ...node,
                cls: currentCls,
                icon: (iconic?.icon ?? defaultIcon) || undefined,
                badges,
                children: node.children ? this._resolveIcons(node.children, searchFunc, isPropDeleted) : undefined
            };
        });
    }

    handleNodeClick(node: TreeNode<PropMeta>): void {
        const meta = node.meta;
        if (this.addMode && !meta.isValueNode) {
            this.plugin.queueService.add({
                type: 'property',
                property: meta.propName,
                action: 'add',
                details: `Add property "${meta.propName}"`,
                files: this.plugin.filterService.filteredFiles,
                customLogic: true,
                logicFunc: (_file, fm) => {
                    if (meta.propName in fm) return null;
                    fm[meta.propName] = '';
                    return fm;
                },
            });
            return;
        }

        // Logic to toggle filter...
        if (meta.isValueNode) {
             void this.plugin.filterService.addNode({
                type: 'rule', filterType: 'specific_value',
                property: meta.propName, values: [meta.rawValue ?? ''],
            });
        } else {
            void this.plugin.filterService.addNode({
                type: 'rule', filterType: 'has_property',
                property: meta.propName, values: [],
            });
        }
    }

    handleContextMenu(node: TreeNode<PropMeta>, e: MouseEvent): void {
        const nodeType: 'prop' | 'value' = node.meta.isValueNode ? 'value' : 'prop';
        this.plugin.contextMenuService.openPanelMenu(
            { nodeType, node: node as TreeNode<unknown>, surface: 'panel' },
            e,
        );
    }

    setSearchTerm(term: string): void { this.searchTerm = term; }
    setSortBy(sortBy: string, direction: 'asc' | 'desc'): void { this.sortBy = sortBy; this.sortDir = direction; }
    setViewMode(_mode: ExplorerViewMode): void { }
    setAddMode(active: boolean): void { this.addMode = active; }

    private _applySort(nodes: TreeNode<PropMeta>[]): TreeNode<PropMeta>[] {
        const dir = this.sortDir === 'asc' ? 1 : -1;
        return [...nodes].sort((a, b) => {
            if (this.sortBy === 'count') return dir * ((a.count ?? 0) - (b.count ?? 0));
            return dir * a.label.localeCompare(b.label);
        });
    }

    private async _renameProp(propName: string): Promise<void> {
        const newName = await showInputModal(this.plugin.app, `Rename "${propName}" to:`);
        if (!newName) return;
        this.plugin.queueService.add({
            type: 'property',
            property: propName,
            action: 'rename',
            details: `Rename property "${propName}" → "${newName}"`,
            files: this.plugin.app.vault.getMarkdownFiles().filter(f => propName in (this.plugin.app.metadataCache.getFileCache(f)?.frontmatter ?? {})),
            customLogic: true,
            logicFunc: (_file, fm) => {
                if (!(propName in fm)) return null;
                fm[newName] = fm[propName];
                delete fm[propName];
                return fm;
            }
        });
    }

    private async _deleteProp(propName: string): Promise<void> {
        this.plugin.queueService.add({
            type: 'property',
            property: propName,
            action: 'delete',
            details: `Bulk delete property "${propName}"`,
            files: this.plugin.app.vault.getMarkdownFiles().filter(f => propName in (this.plugin.app.metadataCache.getFileCache(f)?.frontmatter ?? {})),
            customLogic: true,
            logicFunc: (_file, fm) => {
                if (!(propName in fm)) return null;
                delete fm[propName];
                return fm;
            }
        });
    }

    private async _changePropType(propName: string, newType: string): Promise<void> {
        this.plugin.queueService.add({
            type: 'property', property: propName, action: 'change_type',
            details: `Change type of "${propName}" to ${newType}`,
            files: this.plugin.app.vault.getMarkdownFiles().filter(f => propName in (this.plugin.app.metadataCache.getFileCache(f)?.frontmatter ?? {})),
            customLogic: true,
            logicFunc: (_file, fm) => fm
        });
    }

    private async _renameValue(propName: string, oldValue: string): Promise<void> {
        const newVal = await showInputModal(this.plugin.app, `Rename value "${oldValue}" to:`);
        if (!newVal) return;
        this.plugin.queueService.add({
            type: 'property', property: propName, action: 'set',
            details: `Rename value "${oldValue}" → "${newVal}"`,
            files: this.plugin.app.vault.getMarkdownFiles().filter(f => {
                const fm = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter ?? {};
                return propName in fm && String(fm[propName]) === oldValue;
            }),
            value: newVal, oldValue: oldValue,
            customLogic: true,
            logicFunc: (_file, fm) => {
                if (!(propName in fm)) return null;
                fm[propName] = newVal;
                return fm;
            }
        });
    }

    private async _deleteValue(propName: string, oldValue: string): Promise<void> {
        this.plugin.queueService.add({
            type: 'property', property: propName, action: 'delete',
            details: `Delete value "${oldValue}" from "${propName}"`,
            files: this.plugin.app.vault.getMarkdownFiles().filter(f => {
                const fm = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter ?? {};
                return propName in fm && String(fm[propName]) === oldValue;
            }),
            customLogic: true,
            logicFunc: (_file, fm) => {
                if (!(propName in fm)) return null;
                delete fm[propName];
                return fm;
            }
        });
    }
}
