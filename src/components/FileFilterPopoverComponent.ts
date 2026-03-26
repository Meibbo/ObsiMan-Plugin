import type { ObsiManPlugin } from '../../main';
import { FilterTreeComponent } from './FilterTreeComponent';
import { AddFilterModal } from '../modals/AddFilterModal';
import { SaveTemplateModal } from '../modals/SaveTemplateModal';
import { t } from '../i18n/index';

/**
 * Popover for file filtering — extracted from ToolbarComponent.
 * Contains: template dropdown, add/clear/save/refresh buttons, and FilterTree.
 */
export class FileFilterPopoverComponent {
	private containerEl: HTMLElement;
	private plugin: ObsiManPlugin;
	private onFiltersChanged: () => void;
	private filterTree!: FilterTreeComponent;
	private visible = false;

	constructor(containerEl: HTMLElement, plugin: ObsiManPlugin, onFiltersChanged: () => void) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.onFiltersChanged = onFiltersChanged;
		this.render();
	}

	private render(): void {
		this.containerEl.empty();
		this.containerEl.addClass('obsiman-file-filter-popover', 'obsiman-popover-hidden');

		// Template dropdown
		const templateRow = this.containerEl.createDiv({ cls: 'obsiman-filter-actions' });
		const templateSelect = templateRow.createEl('select', {
			cls: 'obsiman-template-select dropdown',
		});
		templateSelect.createEl('option', { value: '', text: t('filter.template.none') });
		for (const tmpl of this.plugin.settings.filterTemplates) {
			templateSelect.createEl('option', { value: tmpl.name, text: tmpl.name });
		}
		templateSelect.addEventListener('change', () => {
			const name = templateSelect.value;
			if (name) {
				const tmpl = this.plugin.settings.filterTemplates.find(
					(t) => t.name === name
				);
				if (tmpl) {
					this.plugin.filterService.loadTemplate(tmpl);
					this.refreshTree();
				}
			}
		});

		// Action buttons
		const btnRow = this.containerEl.createDiv({ cls: 'obsiman-filter-buttons' });

		const addBtn = btnRow.createEl('button', { cls: 'obsiman-btn-small', text: t('filter.add_rule') });
		addBtn.addEventListener('click', () => {
			new AddFilterModal(
				this.plugin.app,
				this.plugin.propertyIndex.getPropertyNames(),
				(prop) => this.plugin.propertyIndex.getPropertyValues(prop),
				(node) => {
					this.plugin.filterService.addNode(node);
					this.refreshTree();
				}
			).open();
		});

		const clearBtn = btnRow.createEl('button', { cls: 'obsiman-btn-small', text: t('filter.clear') });
		clearBtn.addEventListener('click', () => {
			this.plugin.filterService.clearFilters();
			this.refreshTree();
		});

		const saveBtn = btnRow.createEl('button', { cls: 'obsiman-btn-small', text: t('filter.template.save') });
		saveBtn.addEventListener('click', () => {
			new SaveTemplateModal(
				this.plugin.app,
				this.plugin,
				this.plugin.filterService.activeFilter
			).open();
		});

		const refreshBtn = btnRow.createEl('button', { cls: 'obsiman-btn-small', text: t('filter.refresh') });
		refreshBtn.addEventListener('click', () => {
			this.plugin.propertyIndex.rebuild();
			this.plugin.filterService.applyFilters();
			this.onFiltersChanged();
		});

		// Filter tree
		const treeContainer = this.containerEl.createDiv({ cls: 'obsiman-filter-tree' });
		this.filterTree = new FilterTreeComponent(treeContainer, (node, parent) => {
			this.plugin.filterService.removeNode(node, parent);
			this.refreshTree();
		});

		this.refreshTree();
	}

	toggle(): void {
		this.visible = !this.visible;
		if (this.visible) {
			this.containerEl.removeClass('obsiman-popover-hidden');
			this.refreshTree();
		} else {
			this.containerEl.addClass('obsiman-popover-hidden');
		}
	}

	hide(): void {
		this.visible = false;
		this.containerEl.addClass('obsiman-popover-hidden');
	}

	refresh(): void {
		this.refreshTree();
	}

	getActiveCount(): number {
		return this.plugin.filterService.activeFilter.children.length;
	}

	private refreshTree(): void {
		this.filterTree?.render(this.plugin.filterService.activeFilter);
		this.onFiltersChanged();
	}
}
