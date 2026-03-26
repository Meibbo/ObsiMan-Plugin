import { Modal, Setting, type App } from 'obsidian';
import type { FilterGroup, FilterTemplate } from '../types/filter';
import type { ObsiManPlugin } from '../../main';
import { t } from '../i18n/index';

/**
 * Modal to save the current filter tree as a named template.
 * Templates are stored in plugin settings and persist across sessions.
 */
export class SaveTemplateModal extends Modal {
	private plugin: ObsiManPlugin;
	private filterRoot: FilterGroup;
	private templateName = '';

	constructor(app: App, plugin: ObsiManPlugin, filterRoot: FilterGroup) {
		super(app);
		this.plugin = plugin;
		this.filterRoot = filterRoot;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-modal');

		contentEl.createEl('h3', { text: t('filter.template.save') });

		// Show existing templates for reference
		const existing = this.plugin.settings.filterTemplates;
		if (existing.length > 0) {
			const listEl = contentEl.createDiv({ cls: 'obsiman-template-list' });
			listEl.createEl('small', {
				cls: 'obsiman-text-faint',
				text: `${t('settings.templates')}: ${existing.map((t) => t.name).join(', ')}`,
			});
		}

		// Name input
		new Setting(contentEl)
			.setName(t('session.name'))
			.addText((text) =>
				text
					.setPlaceholder('Template name...')
					.setValue(this.templateName)
					.onChange((v) => {
						this.templateName = v.trim();
					})
			);

		// Buttons
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(t('filter.template.save'))
					.setCta()
					.onClick(() => {
						if (!this.templateName) return;
						void this.saveTemplate();
						this.close();
					})
			)
			.addButton((btn) =>
				btn.setButtonText('Cancel').onClick(() => this.close())
			);
	}

	private async saveTemplate(): Promise<void> {
		const template: FilterTemplate = {
			name: this.templateName,
			root: JSON.parse(JSON.stringify(this.filterRoot)) as FilterGroup,
		};

		// Replace existing template with same name, or append
		const templates = this.plugin.settings.filterTemplates;
		const idx = templates.findIndex((t) => t.name === this.templateName);
		if (idx !== -1) {
			templates[idx] = template;
		} else {
			templates.push(template);
		}

		await this.plugin.saveSettings();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
