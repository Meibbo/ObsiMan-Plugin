// src/components/PropsExplorerPanel.ts
import { Component, Menu } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { PropsLogic } from '../logic/PropsLogic';
import { UnifiedTreeView } from './UnifiedTreeView';
import type { TreeNode, PropMeta } from '../types/tree';
import { showInputModal } from '../utils/inputModal';

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
	private plugin: ObsiManPlugin;
	private logic: PropsLogic;
	private view: UnifiedTreeView;
	private expandedIds = new Set<string>();
	private searchTerm = '';

	constructor(containerEl: HTMLElement, plugin: ObsiManPlugin) {
		super();
		this.plugin = plugin;
		this.logic = new PropsLogic(plugin.app);
		this.view = new UnifiedTreeView(containerEl);
	}

	onload(): void {
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
			onToggle: (id) => {
				if (this.expandedIds.has(id)) this.expandedIds.delete(id);
				else this.expandedIds.add(id);
				this._render();
			},
			onRowClick: (id) => {
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
			onContextMenu: (id, e) => this._showContextMenu(id, e, tree),
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

	private _showContextMenu(id: string, e: MouseEvent, tree: TreeNode<PropMeta>[]): void {
		const node = this._findNode(id, tree);
		if (!node) return;
		const meta = node.meta;
		const menu = new Menu();

		if (!meta.isValueNode) {
			// Property node context menu
			menu.addItem(item =>
				item.setTitle('Rename').setIcon('lucide-pencil').onClick(() => {
					void this._renameProp(meta.propName);
				}),
			);
			menu.addItem(item =>
				item.setTitle('Type').setIcon('lucide-sliders').onClick(() => {
					// Open Obsidian native property type picker via command
					void (this.plugin.app as unknown as { commands: { executeCommandById(id: string): void } })
						.commands.executeCommandById('properties:open-all');
				}),
			);
			menu.addItem(item =>
				item.setTitle('Delete').setIcon('lucide-trash').onClick(() => {
					void this._deleteProp(meta.propName);
				}),
			);
		} else {
			// Value node context menu
			menu.addItem(item =>
				item.setTitle('Rename').setIcon('lucide-pencil').onClick(() => {
					void this._renameValue(meta.propName, meta.rawValue ?? '');
				}),
			);

			if (meta.isTypeIncompatible) {
				menu.addItem(item =>
					item.setTitle('Update incompatible value').setIcon('lucide-alert-triangle').onClick(() => {
						void this._updateValue(meta.propName, meta.rawValue ?? '');
					}),
				);
			} else if (meta.propType === 'text' || meta.propType === 'list' || meta.propType === 'multitext') {
				menu.addSeparator();
				menu.addItem(item =>
					item.setTitle('Convert to wikilink').setIcon('lucide-link').onClick(() => {
						void this._convertValue(meta.propName, meta.rawValue ?? '', v => `[[${v}]]`);
					}),
				);
				menu.addItem(item =>
					item.setTitle('Convert to Markdown link').setIcon('lucide-external-link').onClick(() => {
						void this._convertValue(meta.propName, meta.rawValue ?? '', v => `[${v}](${v})`);
					}),
				);
				if (meta.propType === 'text') {
					menu.addSeparator();
					menu.addItem(item =>
						item.setTitle('Lowercase').onClick(() => {
							void this._convertValue(meta.propName, meta.rawValue ?? '', v => v.toLowerCase());
						}),
					);
					menu.addItem(item =>
						item.setTitle('Uppercase').onClick(() => {
							void this._convertValue(meta.propName, meta.rawValue ?? '', v => v.toUpperCase());
						}),
					);
					menu.addItem(item =>
						item.setTitle('Title case').onClick(() => {
							void this._convertValue(meta.propName, meta.rawValue ?? '', v =>
								v.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()),
							);
						}),
					);
				}
			}

			menu.addSeparator();
			menu.addItem(item =>
				item.setTitle('Delete value').setIcon('lucide-trash').onClick(() => {
					void this._deleteValue(meta.propName, meta.rawValue ?? '');
				}),
			);
		}

		menu.showAtMouseEvent(e);
	}

	private async _renameProp(propName: string): Promise<void> {
		const newName = await showInputModal(this.plugin.app, `Rename "${propName}" to:`);
		if (!newName) return;
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			await this.plugin.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				if (!(propName in fm)) return;
				fm[newName] = fm[propName];
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete fm[propName];
			});
		}
		this.logic.invalidate(); this._render();
	}

	private async _deleteProp(propName: string): Promise<void> {
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			await this.plugin.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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

	private async _updateValue(propName: string, oldValue: string): Promise<void> {
		const newVal = await showInputModal(this.plugin.app, `Replace incompatible value "${oldValue}" with:`);
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
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
