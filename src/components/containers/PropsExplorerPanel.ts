// src/components/PropsExplorerPanel.ts
import { Component, App } from 'obsidian';
import { PropsLogic } from '../../logic/PropsLogic';
import type { FilterService } from '../../services/FilterService';
import type { IconicService } from '../../services/IconicService';
import type { ContextMenuService } from '../../services/ContextMenuService';

export interface PanelPluginCtx {
	app: App;
	filterService: FilterService;
	iconicService?: IconicService;
	contextMenuService: ContextMenuService;
}
import { UnifiedTreeView } from '../layout/UnifiedTreeView';
import type { TreeNode, PropMeta } from '../../types/tree';
import { showInputModal } from '../../utils/inputModal';

const TYPE_ICON_MAP: Record<string, string> = {
	text: 'lucide-text',
	number: 'lucide-hash',
	checkbox: 'lucide-check-square',
	list: 'lucide-chevron-right',
	date: 'lucide-calendar',
	datetime: 'lucide-calendar-clock',
	aliases: 'lucide-forward',
	tags: 'lucide-tag',
	multitext: 'lucide-text-cursor-input',
};

export class PropsExplorerPanel extends Component {
	private plugin: PanelPluginCtx;
	private logic: PropsLogic;
	private view: UnifiedTreeView;
	private expandedIds = new Set<string>();
	private searchTerm = '';

	constructor(containerEl: HTMLElement, plugin: PanelPluginCtx) {
		super();
		this.plugin = plugin;
		this.logic = new PropsLogic(plugin.app);
		this.view = new UnifiedTreeView(containerEl);
	}

	onload(): void {
		const svc = this.plugin.contextMenuService;

		// ── L1: Property node actions ─────────────────────────────────────────
		svc.registerAction({
			id: 'prop.rename',
			nodeTypes: ['prop'],
			surfaces: ['panel', 'file-menu'],
			label: 'Rename',
			icon: 'lucide-pencil',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => this._renameProp((ctx.node.meta as PropMeta).propName),
		});

		svc.registerAction({
			id: 'prop.change-type',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: 'Type',
			icon: 'lucide-settings-2',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: () => {
				(this.plugin.app as unknown as {
					commands: { executeCommandById(id: string): void };
				}).commands.executeCommandById('properties:open-all');
			},
		});

		svc.registerAction({
			id: 'prop.delete',
			nodeTypes: ['prop'],
			surfaces: ['panel'],
			label: 'Delete',
			icon: 'lucide-trash-2',
			when: (ctx) => !(ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => this._deleteProp((ctx.node.meta as PropMeta).propName),
		});

		// ── L2: Value node actions ────────────────────────────────────────────
		svc.registerAction({
			id: 'value.rename',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Rename',
			icon: 'lucide-pencil',
			when: (ctx) => (ctx.node.meta as PropMeta).isValueNode,
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._renameValue(meta.propName, meta.rawValue ?? '');
			},
		});

		svc.registerAction({
			id: 'value.convert-to-wikilink',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Convert to wikilink',
			icon: 'lucide-brackets',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return meta.isValueNode &&
					!meta.isTypeIncompatible &&
					['text', 'list', 'multitext'].includes(meta.propType ?? '');
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(meta.propName, meta.rawValue ?? '', v => `[[${v}]]`);
			},
		});

		svc.registerAction({
			id: 'value.convert-to-mdlink',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Convert to Markdown link',
			icon: 'lucide-link',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return meta.isValueNode &&
					!meta.isTypeIncompatible &&
					['text', 'list', 'multitext'].includes(meta.propType ?? '');
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(meta.propName, meta.rawValue ?? '', v => `[${v}](${v})`);
			},
		});

		svc.registerAction({
			id: 'value.case-lower',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Lowercase',
			icon: 'lucide-case-lower',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return meta.isValueNode && !meta.isTypeIncompatible && meta.propType === 'text';
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(meta.propName, meta.rawValue ?? '', v => v.toLowerCase());
			},
		});

		svc.registerAction({
			id: 'value.case-upper',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Uppercase',
			icon: 'lucide-case-upper',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return meta.isValueNode && !meta.isTypeIncompatible && meta.propType === 'text';
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(meta.propName, meta.rawValue ?? '', v => v.toUpperCase());
			},
		});

		svc.registerAction({
			id: 'value.case-title',
			nodeTypes: ['value'],
			surfaces: ['panel'],
			label: 'Title case',
			icon: 'lucide-type',
			when: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return meta.isValueNode && !meta.isTypeIncompatible && meta.propType === 'text';
			},
			run: (ctx) => {
				const meta = ctx.node.meta as PropMeta;
				return this._convertValue(
					meta.propName,
					meta.rawValue ?? '',
					v => v.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()),
				);
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

		this.registerEvent(
			this.plugin.app.metadataCache.on('resolved', () => {
				this.logic.invalidate();
				this._render();
			}),
		);
		// Re-render after Iconic finishes loading (icons not ready on first render)
		this.plugin.iconicService?.onLoaded(() => this._render());
		this._render();
	}

	setSearchTerm(term: string): void {
		this.searchTerm = term;
		this._render();
	}

	render(): void {
		this._render();
	}

	private _render(): void {
		let tree = this.logic.getTree();
		if (this.searchTerm) tree = this.logic.filterTree(tree, this.searchTerm);

		const warningIds = new Set<string>();
		const nodesWithIcons = this._resolveIcons(tree, warningIds);

		this.view.render({
			nodes: nodesWithIcons,
			expandedIds: this.expandedIds,
			warningIds,
			onToggle: (id: string) => {
				if (this.expandedIds.has(id)) this.expandedIds.delete(id);
				else this.expandedIds.add(id);
				this._render();
			},
			onRowClick: (id: string) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				const meta = node.meta;
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
			},
			onContextMenu: (id: string, e: MouseEvent) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				const meta = node.meta;
				const nodeType: 'prop' | 'value' = meta.isValueNode ? 'value' : 'prop';
				this.plugin.contextMenuService.openPanelMenu(
					{ nodeType, node: node as TreeNode<unknown>, surface: 'panel' },
					e,
				);
			},
		});
	}

	private _resolveIcons(nodes: TreeNode<PropMeta>[], warningIds: Set<string>): TreeNode<PropMeta>[] {
		return nodes.map(node => {
			const meta = node.meta;
			if (meta.isTypeIncompatible) warningIds.add(node.id);
			const iconic = !meta.isValueNode
				? this.plugin.iconicService?.getIcon(meta.propName)
				: null;
			const defaultIcon = !meta.isValueNode
				? (TYPE_ICON_MAP[meta.propType] ?? 'lucide-tag')
				: undefined;
			return {
				...node,
				icon: iconic?.icon ?? defaultIcon,
				children: node.children
					? this._resolveIcons(node.children, warningIds)
					: [],
			};
		});
	}

	private async _renameProp(propName: string): Promise<void> {
		const newName = await showInputModal(this.plugin.app, `Rename "${propName}" to:`);
		if (!newName) return;
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			await this.plugin.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				if (!(propName in fm)) return;
				fm[newName] = fm[propName];
				delete fm[propName];
			});
		}
		this.logic.invalidate(); this._render();
	}

	private async _deleteProp(propName: string): Promise<void> {
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			await this.plugin.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				delete fm[propName];
			});
		}
		this.logic.invalidate(); this._render();
	}

	private async _renameValue(propName: string, oldValue: string): Promise<void> {
		const newVal = await showInputModal(this.plugin.app, `Rename value "${oldValue}" to:`);
		if (!newVal) return;
		await this._replaceValueInVault(propName, oldValue, newVal);
	}

	private async _convertValue(propName: string, oldValue: string, transform: (v: string) => string): Promise<void> {
		await this._replaceValueInVault(propName, oldValue, transform(oldValue));
	}

	private async _replaceValueInVault(propName: string, oldValue: string, newValue: string): Promise<void> {
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			await this.plugin.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				if (!(propName in fm)) return;
				const val: unknown = fm[propName];
				if (Array.isArray(val)) {
					fm[propName] = (val as unknown[]).map((v: unknown) =>
						String(v) === oldValue ? newValue : v,
					);
				} else if (String(val) === oldValue) {
					fm[propName] = newValue;
				}
			});
		}
		this.logic.invalidate(); this._render();
	}

	private async _deleteValue(propName: string, value: string): Promise<void> {
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			await this.plugin.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				if (!(propName in fm)) return;
				const val: unknown = fm[propName];
				if (Array.isArray(val)) {
					fm[propName] = (val as unknown[]).filter((v: unknown) => String(v) !== value);
				} else if (String(val) === value) {
					delete fm[propName];
				}
			});
		}
		this.logic.invalidate(); this._render();
	}

	destroy(): void {
		this.unload();
	}

	private _findNode(id: string, nodes: TreeNode<PropMeta>[]): TreeNode<PropMeta> | null {
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = this._findNode(id, n.children);
				if (found) return found;
			}
		}
		return null;
	}
}
