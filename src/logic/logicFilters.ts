import { Menu, setIcon } from 'obsidian';
import { mount, unmount } from 'svelte';
import type { Component } from 'svelte';
import { translate } from '../i18n/index';
import type { VaultmanPlugin } from '../main';
import { SaveTemplateModal } from '../modals/modalSaveTemplate';
import BtnSelection from '../components/btnSelection.svelte';
import type { BtnSelectionItem } from '../types/typeUI';

/**
 * In-frame floating island showing active filter rules.
 * Mirrors the design of QueueIslandComponent.
 */
export class ActiveFiltersIslandComponent {
	private containerEl: HTMLElement;
	private plugin: VaultmanPlugin;
	private onClose: () => void;

	private islandEl: HTMLElement | null = null;
	private btnRowEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private headerEl: HTMLElement | null = null;
	private btnComponent: ReturnType<typeof mount> | null = null;

	constructor(containerEl: HTMLElement, plugin: VaultmanPlugin, onClose: () => void) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.onClose = onClose;
	}

	private buildButtons(): BtnSelectionItem[] {
		return [
			{
				icon: 'lucide-trash-2',
				label: translate('filters.popup.clear_all'),
				onClick: () => {
					this.plugin.filterService.clearFilters();
					this.onClose();
				},
			},
			{
				icon: 'lucide-list',
				label: translate('ops.details'),
				onClick: () => {
					// Toggle between tree and flat list if needed in future
				},
			},
			{
				icon: 'lucide-bookmark',
				label: translate('filters.popup.templates'),
				onClick: () => {
					// showAtPosition uses the btn row's bounding rect since no MouseEvent is available
					const rect = this.btnRowEl?.getBoundingClientRect();
					const menu = new Menu();
					this.plugin.settings.filterTemplates.forEach((tpl) => {
						menu.addItem((item) =>
							item.setTitle(tpl.name).onClick(() => {
								this.plugin.filterService.loadTemplate(tpl);
								this.onClose();
							}),
						);
					});
					menu.addSeparator();
					menu.addItem((item) =>
						item.setTitle(translate('filter.template.save')).onClick(() => {
							new SaveTemplateModal(
								this.plugin.app,
								this.plugin,
								this.plugin.filterService.activeFilter,
							).open();
							this.onClose();
						}),
					);
					menu.showAtPosition({
						x: rect ? rect.left : 0,
						y: rect ? rect.bottom : 0,
					});
				},
			},
			{
				icon: 'lucide-check',
				label: translate('filter.template.save'),
				isActive: true,
				onClick: () => {
					this.onClose();
				},
			},
		];
	}

	mount(): void {
		this.islandEl = this.containerEl.createDiv({ cls: 'vm-active-filters-island' });

		// 1. Squircle action buttons row
		this.btnRowEl = this.islandEl.createDiv({ cls: 'vm-filters-island-btns' });
		this.btnComponent = mount(
			BtnSelection as unknown as Component<{ buttons: BtnSelectionItem[]; ariaLabel?: string }>,
			{
				target: this.btnRowEl,
				props: { buttons: this.buildButtons() },
			}
		);

		// 2. Header
		this.headerEl = this.islandEl.createDiv({ cls: 'vm-active-filters-island-header' });

		// 3. Scrollable item list
		this.listEl = this.islandEl.createDiv({ cls: 'vm-active-filters-island-list' });

		this.render();

		requestAnimationFrame(() => {
			this.islandEl?.addClass('is-open');
		});
	}

	render(): void {
		if (!this.listEl || !this.headerEl) return;
		const rules = this.plugin.filterService.getFlatRules();

		this.headerEl.setText(`${rules.length} ${translate('filters.popup.active') || 'active rules'}`);

		this.listEl.empty();
		if (rules.length === 0) {
			this.listEl.createDiv({ cls: 'vm-active-filters-empty', text: translate('filters.popup.empty') });
			return;
		}

		for (const rule of rules) {
			const row = this.listEl.createDiv({ cls: 'vm-active-filter-island-row' });
			row.toggleClass('is-disabled', !rule.enabled);

			row.createSpan({ cls: 'vm-active-filter-row-text', text: rule.description });

			const actions = row.createDiv({ cls: 'vm-active-filter-row-actions' });

			const toggle = actions.createDiv({
				cls: 'vm-active-filter-toggle clickable-icon',
				attr: { 'aria-label': rule.enabled ? 'Disable' : 'Enable' },
			});
			setIcon(toggle, rule.enabled ? 'lucide-eye' : 'lucide-eye-off');
			toggle.addEventListener('click', (e) => {
				e.stopPropagation();
				this.plugin.filterService.toggleFilterRule(rule.id);
				this.render();
			});

			const del = actions.createDiv({
				cls: 'vm-active-filter-delete clickable-icon',
				attr: { 'aria-label': 'Delete' },
			});
			setIcon(del, 'lucide-trash-2');
			del.addEventListener('click', (e) => {
				e.stopPropagation();
				this.plugin.filterService.deleteFilterRule(rule.id);
				this.render();
			});
		}
	}

	destroy(): void {
		if (this.btnComponent) {
			void unmount(this.btnComponent);
			this.btnComponent = null;
		}
		this.islandEl?.remove();
		this.islandEl = null;
		this.btnRowEl = null;
		this.listEl = null;
		this.headerEl = null;
	}
}
