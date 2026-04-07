import { PluginSettingTab, Setting, setIcon, type App } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import type { Language } from '../types/settings';
import { t, setLanguage } from '../i18n/index';

export class ObsiManSettingsTab extends PluginSettingTab {
	private plugin: ObsiManPlugin;

	constructor(app: App, plugin: ObsiManPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Language
		new Setting(containerEl)
			.setName(t('settings.language'))
			.setDesc(t('settings.language.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({ auto: 'Auto', en: 'English', es: 'Español' })
					.setValue(this.plugin.settings.language)
					.onChange(async (v) => {
						this.plugin.settings.language = v as Language;
						setLanguage(v as Language);
						await this.plugin.saveSettings();
						this.display(); // Refresh labels
					})
			);

		// Default property type
		new Setting(containerEl)
			.setName(t('settings.default_type'))
			.setDesc(t('settings.default_type.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						text: t('prop.type.text'),
						number: t('prop.type.number'),
						checkbox: t('prop.type.checkbox'),
						list: t('prop.type.list'),
						date: t('prop.type.date'),
					})
					.setValue(this.plugin.settings.defaultPropertyType)
					.onChange(async (v) => {
						this.plugin.settings.defaultPropertyType = v;
						await this.plugin.saveSettings();
					})
			);

		// Explorer settings
		new Setting(containerEl).setName("").setHeading();

		new Setting(containerEl)
			.setName(t('settings.ctrl_click_search'))
			.setDesc(t('settings.ctrl_click_search.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.explorerCtrlClickSearch)
					.onChange(async (v) => {
						this.plugin.settings.explorerCtrlClickSearch = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t('settings.queue_preview'))
			.setDesc(t('settings.queue_preview.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.explorerShowQueuePreview)
					.onChange(async (v) => {
						this.plugin.settings.explorerShowQueuePreview = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t('settings.content_search'))
			.setDesc(t('settings.content_search.desc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.explorerContentSearch)
					.onChange(async (v) => {
						this.plugin.settings.explorerContentSearch = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t('settings.operation_scope'))
			.setDesc(t('settings.operation_scope.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						auto: t('settings.scope.auto'),
						selected: t('settings.scope.selected'),
						filtered: t('settings.scope.filtered'),
						all: t('settings.scope.all'),
					})
					.setValue(this.plugin.settings.explorerOperationScope)
					.onChange(async (v) => {
						this.plugin.settings.explorerOperationScope = v as 'auto' | 'selected' | 'filtered' | 'all';
						await this.plugin.saveSettings();
					})
			);

		// View section
		new Setting(containerEl).setName(t('settings.view_section')).setHeading();

		new Setting(containerEl)
			.setName(t('settings.open_mode'))
			.setDesc(t('settings.open_mode.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						sidebar: t('settings.open_mode.sidebar'),
						main: t('settings.open_mode.main'),
						both: t('settings.open_mode.both'),
					})
					.setValue(this.plugin.settings.openMode)
					.onChange(async (v) => {
						this.plugin.settings.openMode = v as 'sidebar' | 'main' | 'both';
						await this.plugin.saveSettings();
					})
			);

		// Page order — drag-and-drop reorder list
		new Setting(containerEl)
			.setName(t('settings.page_order'))
			.setDesc(t('settings.page_order.desc'));

		this.buildPageOrderList(containerEl);

		// Layout section
		new Setting(containerEl).setName("").setHeading();

		new Setting(containerEl)
			.setName(t('settings.ops_position'))
			.setDesc(t('settings.ops_position.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						right: t('settings.ops_position.right'),
						bottom: t('settings.ops_position.bottom'),
						replace: t('settings.ops_position.replace'),
					})
					.setValue(this.plugin.settings.operationsPanelPosition)
					.onChange(async (v) => {
						this.plugin.settings.operationsPanelPosition = v as 'right' | 'bottom' | 'replace';
						await this.plugin.saveSettings();
					})
			);

		// Bases integration section
		new Setting(containerEl).setName('Bases Integration').setHeading();

		new Setting(containerEl)
			.setName('Open mode')
			.setDesc('How to open a .base file when none is active: reopen last used, or show a picker.')
			.addDropdown((dd) =>
				dd
					.addOptions({
						'last-used': 'Reopen last used',
						picker: 'Always show picker',
					})
					.setValue(this.plugin.settings.basesOpenMode)
					.onChange(async (v) => {
						this.plugin.settings.basesOpenMode = v as 'last-used' | 'picker';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Operations panel side')
			.setDesc('Which side the operations panel opens on when attaching to a .base file.')
			.addDropdown((dd) =>
				dd
					.addOptions({ left: 'Left', right: 'Right' })
					.setValue(this.plugin.settings.basesOpsPanelSide)
					.onChange(async (v) => {
						this.plugin.settings.basesOpsPanelSide = v as 'left' | 'right';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Properties explorer side')
			.setDesc('Which side the property explorer panel opens on.')
			.addDropdown((dd) =>
				dd
					.addOptions({ left: 'Left', right: 'Right' })
					.setValue(this.plugin.settings.basesExplorerSide)
					.onChange(async (v) => {
						this.plugin.settings.basesExplorerSide = v as 'left' | 'right';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Auto-attach to .base files')
			.setDesc('Automatically open ObsiMan panels whenever the active leaf becomes a .base file.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.basesAutoAttach)
					.onChange(async (v) => {
						this.plugin.settings.basesAutoAttach = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Inject checkbox column')
			.setDesc('Add a selection checkbox column to the Bases table.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.basesInjectCheckboxes)
					.onChange(async (v) => {
						this.plugin.settings.basesInjectCheckboxes = v;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Show column separators')
			.setDesc('Show vertical borders between columns in the Bases table.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.basesShowColumnSeparators)
					.onChange(async (v) => {
						this.plugin.settings.basesShowColumnSeparators = v;
						await this.plugin.saveSettings();
						document.body.toggleClass('obsiman-bases-column-separators', v);
					})
			);

		// Filter templates section
		new Setting(containerEl).setName("").setHeading();

		if (this.plugin.settings.filterTemplates.length === 0) {
			containerEl.createEl('p', {
				text: t('settings.templates.desc'),
				cls: 'setting-item-description',
			});
		} else {
			for (const tmpl of this.plugin.settings.filterTemplates) {
				new Setting(containerEl)
					.setName(tmpl.name)
					.setDesc(`${tmpl.root.children.length} filters`)
					.addButton((btn) =>
						btn
							.setButtonText(t('filter.template.delete'))
							.setWarning()
							.onClick(async () => {
								this.plugin.settings.filterTemplates =
									this.plugin.settings.filterTemplates.filter(
										(t) => t.name !== tmpl.name
									);
								await this.plugin.saveSettings();
								this.display();
							})
					);
			}
		}
	}

	/**
	 * Renders a drag-and-drop list for reordering sidebar pages.
	 * Uses HTML5 native drag-and-drop on custom rows (not Obsidian's Setting API,
	 * which doesn't support drag handles natively).
	 */
	private buildPageOrderList(containerEl: HTMLElement): void {
		const pageLabels: Record<string, string> = {
			files: t('settings.page.files'),
			filters: t('settings.page.filters'),
			ops: t('settings.page.ops'),
		};

		const list = containerEl.createDiv({ cls: 'obsiman-page-order-list' });

		const order = [...this.plugin.settings.pageOrder];
		let dragSourceIndex = -1;

		const renderRows = () => {
			list.empty();
			for (let i = 0; i < order.length; i++) {
				const pageId = order[i];
				const row = list.createDiv({
					cls: 'obsiman-page-order-row',
					attr: { draggable: 'true' },
				});

				// Drag handle
				const handle = row.createDiv({ cls: 'obsiman-page-order-handle' });
				setIcon(handle, 'lucide-grip-vertical');

				// Position badge
				row.createDiv({ cls: 'obsiman-page-order-pos', text: String(i + 1) });

				// Page label
				row.createSpan({ cls: 'obsiman-page-order-label', text: pageLabels[pageId] ?? pageId });

				// Drag events
				const idx = i; // capture

				row.addEventListener('dragstart', (e: DragEvent) => {
					dragSourceIndex = idx;
					row.addClass('is-dragging');
					if (e.dataTransfer) {
						e.dataTransfer.effectAllowed = 'move';
					}
				});

				row.addEventListener('dragend', () => {
					row.removeClass('is-dragging');
					list.querySelectorAll('.obsiman-page-order-row').forEach((el) => {
						el.removeClass('drag-over');
					});
				});

				row.addEventListener('dragover', (e: DragEvent) => {
					e.preventDefault();
					if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
					list.querySelectorAll('.obsiman-page-order-row').forEach((el) => {
						el.removeClass('drag-over');
					});
					row.addClass('drag-over');
				});

				row.addEventListener('dragleave', () => {
					row.removeClass('drag-over');
				});

				row.addEventListener('drop', (e: DragEvent) => {
					e.preventDefault();
					row.removeClass('drag-over');
					if (dragSourceIndex === idx || dragSourceIndex === -1) return;

					// Reorder: move dragged item to drop position
					const moved = order.splice(dragSourceIndex, 1)[0];
					order.splice(idx, 0, moved);
					dragSourceIndex = -1;

					void (async () => {
						this.plugin.settings.pageOrder = [...order];
						await this.plugin.saveSettings();
						renderRows();
					})();
				});
			}
		};

		renderRows();
	}
}
