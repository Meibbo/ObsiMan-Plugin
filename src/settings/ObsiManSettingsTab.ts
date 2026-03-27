import { PluginSettingTab, Setting, type App } from 'obsidian';
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

		// Grid settings section
		new Setting(containerEl).setName("").setHeading();

		new Setting(containerEl)
			.setName(t('settings.grid_render_mode'))
			.setDesc(t('settings.grid_render_mode.desc'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						plain: t('settings.grid_render_mode.plain'),
						chunk: t('settings.grid_render_mode.chunk'),
						all: t('settings.grid_render_mode.all'),
					})
					.setValue(this.plugin.settings.gridRenderMode)
					.onChange(async (v) => {
						this.plugin.settings.gridRenderMode = v as 'plain' | 'chunk' | 'all';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t('settings.grid_editable_columns'))
			.setDesc(t('settings.grid_editable_columns.desc'))
			.addText((text) =>
				text
					.setValue((this.plugin.settings.gridEditableColumns ?? ['name']).join(', '))
					.onChange(async (v) => {
						this.plugin.settings.gridEditableColumns = v
							.split(',')
							.map((s) => s.trim())
							.filter((s) => s.length > 0);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t('settings.base_file'))
			.setDesc(t('settings.base_file.desc'))
			.addText((text) =>
				text
					.setPlaceholder('path/to/file.base')
					.setValue(this.plugin.settings.baseFilePath)
					.onChange(async (v) => {
						this.plugin.settings.baseFilePath = v;
						await this.plugin.saveSettings();
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
}
