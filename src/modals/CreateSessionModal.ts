import { Modal, Setting, type App, type TFile } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { t } from '../i18n/index';

type SessionCreatedCallback = (file: TFile) => void;

/**
 * Modal for creating a new ObsiMan session file.
 */
export class CreateSessionModal extends Modal {
	private plugin: ObsiManPlugin;
	private onCreated: SessionCreatedCallback;

	private sessionName = '';

	constructor(app: App, plugin: ObsiManPlugin, onCreated: SessionCreatedCallback) {
		super(app);
		this.plugin = plugin;
		this.onCreated = onCreated;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-modal');

		contentEl.createEl('h3', { text: t('session.create') });

		new Setting(contentEl)
			.setName(t('session.name'))
			.addText((text) =>
				text
					.setPlaceholder('Example session')
					.onChange((v) => {
						this.sessionName = v;
					})
			);

		// Show current filter info
		const filterCount = this.plugin.filterService.activeFilter.children.length;
		const fileCount = this.plugin.filterService.filteredFiles.length;
		contentEl.createEl('p', {
			cls: 'obsiman-modal-subtitle',
			text: `${filterCount} ${t('toolbar.filters').toLowerCase()} · ${t('statusbar.filtered_label', { count: fileCount })} / ${t('statusbar.files', { count: this.plugin.propertyIndex.fileCount })}`,
		});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText(t('session.create'))
				.setCta()
				.onClick(async () => {
					if (!this.sessionName.trim()) return;

					const file = await this.plugin.sessionService.createSessionFile(
						this.sessionName.trim(),
						this.plugin.filterService.activeFilter,
						[],
						this.plugin.filterService.filteredFiles
					);

					this.onCreated(file);
					this.close();
				})
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
