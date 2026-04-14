// src/services/ContextMenuService.ts
import { Component, Menu, TFile, Notice } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import type { ActionDef, MenuCtx, MenuHideRule } from '../types/context-menu';

export class ContextMenuService extends Component {
	private plugin: ObsiManPlugin;
	private _registry: ActionDef[] = [];

	constructor(plugin: ObsiManPlugin) {
		super();
		this.plugin = plugin;
	}

	onload(): void {
		this.registerEvent(
			this.plugin.app.workspace.on('file-menu', (menu, file, source) => {
				if (!(file instanceof TFile)) return;
				const surface: MenuCtx['surface'] =
					source === 'more-options' ? 'more-options' : 'file-menu';
				const settingKey =
					surface === 'more-options'
						? 'contextMenuShowInMoreOptions'
						: 'contextMenuShowInFileMenu';
				if (!this.plugin.settings[settingKey]) {
					this._applyHideRules(menu, surface);
					return;
				}
				this._injectWorkspaceActions(menu, file, surface);
				this._applyHideRules(menu, surface);
			}),
		);

		this.registerEvent(
			this.plugin.app.workspace.on('editor-menu', (menu, _editor, info) => {
				if (!this.plugin.settings.contextMenuShowInEditorMenu) {
					this._applyHideRules(menu, 'editor-menu');
					return;
				}
				const file = 'file' in info ? info.file : null;
				if (!(file instanceof TFile)) {
					this._applyHideRules(menu, 'editor-menu');
					return;
				}
				this._injectWorkspaceActions(menu, file, 'editor-menu');
				this._applyHideRules(menu, 'editor-menu');
			}),
		);
	}

	registerAction(def: ActionDef): void {
		this._registry.push(def);
	}

	/**
	 * Build and show a Menu for an in-frame panel right-click.
	 * The caller constructs ctx from the node that was right-clicked.
	 */
	openPanelMenu(ctx: MenuCtx, event: MouseEvent): void {
		const menu = new Menu();
		const applicable = this._registry.filter(
			(def) =>
				def.nodeTypes.includes(ctx.nodeType) &&
				def.surfaces.includes('panel') &&
				(def.when ? def.when(ctx) : true),
		);
		for (const def of applicable) {
			menu.addItem((item) => {
				const label = typeof def.label === 'function' ? def.label(ctx) : def.label;
				item.setTitle(label);
				if (def.icon) item.setIcon(def.icon);
				item.onClick(() => {
					try {
						void def.run(ctx);
					} catch (err) {
						new Notice(`ObsiMan: action "${def.id}" failed`);
						console.error(err);
					}
				});
			});
		}
		menu.showAtMouseEvent(event);
	}

	/**
	 * Inject ObsiMan items into a workspace menu for a specific file.
	 * Groups them under a separator with a section header.
	 */
	private _injectWorkspaceActions(
		menu: Menu,
		file: TFile,
		surface: 'file-menu' | 'editor-menu' | 'more-options',
	): void {
		// Synthetic node for file-surface context
		const ctx: MenuCtx = {
			nodeType: 'file',
			node: { id: file.path, label: file.name, meta: { file }, icon: '', depth: 0 },
			surface,
			file,
		};

		const applicable = this._registry.filter(
			(def) =>
				def.nodeTypes.includes('file') &&
				def.surfaces.includes(surface) &&
				(def.when ? def.when(ctx) : true),
		);

		if (applicable.length === 0) return;

		menu.addSeparator();
		for (const def of applicable) {
			menu.addItem((item) => {
				const label = typeof def.label === 'function' ? def.label(ctx) : def.label;
				item.setTitle(label);
				if (def.icon) item.setIcon(def.icon);
				item.onClick(() => {
					try {
						void def.run(ctx);
					} catch (err) {
						new Notice(`ObsiMan: action "${def.id}" failed`);
						console.error(err);
					}
				});
			});
		}
	}

	/**
	 * Curator: remove items matching user hide-rules from any workspace menu.
	 * Wrapped in try/catch — if Obsidian internals change, logs a warning and exits cleanly.
	 */
	private _applyHideRules(
		menu: Menu,
		surface: 'file-menu' | 'editor-menu' | 'more-options',
	): void {
		try {
			const rules: MenuHideRule[] = this.plugin.settings.contextMenuHideRules.filter(
				(r) => r.enabled && r.surface === surface,
			);
			if (rules.length === 0) return;

			const items: unknown[] = (menu as unknown as { items: unknown[] }).items;
			if (!Array.isArray(items)) return;

			for (let i = items.length - 1; i >= 0; i--) {
				const item = items[i] as { titleEl?: HTMLElement; dom?: HTMLElement };
				const titleEl = item.titleEl ?? item.dom?.querySelector?.('.menu-item-title');
				const title: string = (titleEl as HTMLElement | undefined)?.textContent?.trim() ?? '';
				const shouldHide = rules.some(
					(r) => title.toLowerCase().includes(r.titleMatch.toLowerCase()),
				);
				if (shouldHide) {
					items.splice(i, 1);
					(titleEl as HTMLElement | undefined)?.closest?.('.menu-item')?.remove();
				}
			}
		} catch (err) {
			console.warn('ObsiMan ContextMenuService: _applyHideRules encountered an error', err);
		}
	}
}
