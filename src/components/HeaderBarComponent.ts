import { setIcon, type TFile } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { CreateSessionModal } from '../modals/CreateSessionModal';
import { QueueDetailsModal } from '../modals/QueueDetailsModal';
import { t } from '../i18n/index';

export interface HeaderBarCallbacks {
	onSessionChange: (file: TFile | null) => void;
	onApplyQueue: () => void;
	onToggleShowSelected: (active: boolean) => void;
}

/**
 * Thin header bar: [Session▼] [●Sync]   ...spacer...   [👁 ShowSelected] [Queue 3] [Apply]
 */
export class HeaderBarComponent {
	private containerEl: HTMLElement;
	private plugin: ObsiManPlugin;
	private callbacks: HeaderBarCallbacks;

	private sessionSelect!: HTMLSelectElement;
	private syncIndicator!: HTMLElement;
	private queueBadge!: HTMLElement;
	private showSelectedBtn!: HTMLElement;
	private _showSelectedOnly = false;

	constructor(containerEl: HTMLElement, plugin: ObsiManPlugin, callbacks: HeaderBarCallbacks) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.callbacks = callbacks;
		this.render();
	}

	private render(): void {
		this.containerEl.empty();
		this.containerEl.addClass('obsiman-header-bar');

		// Left: Session picker
		this.sessionSelect = this.containerEl.createEl('select', {
			cls: 'obsiman-toolbar-select dropdown',
		});
		this.populateSessionSelect();

		this.sessionSelect.addEventListener('change', () => {
			void (async () => {
				const val = this.sessionSelect.value;
				if (val === '__new__') {
					this.sessionSelect.value = this.plugin.settings.sessionFilePath || '';
					new CreateSessionModal(
						this.plugin.app,
						this.plugin,
						(file) => this.callbacks.onSessionChange(file)
					).open();
				} else if (val === '') {
					this.callbacks.onSessionChange(null);
				} else {
					const file = this.plugin.app.vault.getFileByPath(val);
					if (file) this.callbacks.onSessionChange(file);
				}
			})();
		});

		// Sync indicator
		this.syncIndicator = this.containerEl.createSpan({ cls: 'obsiman-sync-indicator' });
		this.refreshSyncStatus();

		// Spacer
		this.containerEl.createDiv({ cls: 'obsiman-header-spacer' });

		// Show only selected toggle
		this.showSelectedBtn = this.containerEl.createDiv({ cls: 'clickable-icon' });
		this.showSelectedBtn.setAttribute('aria-label', t('header.show_selected'));
		this.updateShowSelectedIcon();
		this.showSelectedBtn.addEventListener('click', () => {
			this._showSelectedOnly = !this._showSelectedOnly;
			this.updateShowSelectedIcon();
			this.callbacks.onToggleShowSelected(this._showSelectedOnly);
		});

		// Queue badge (clickable → opens QueueDetailsModal)
		this.queueBadge = this.containerEl.createSpan({ cls: 'obsiman-header-queue-badge' });
		this.queueBadge.addEventListener('click', () => {
			new QueueDetailsModal(
				this.plugin.app,
				this.plugin.queueService
			).open();
		});
		this.refreshQueueBadge(0);

		// Apply button
		const applyBtn = this.containerEl.createEl('button', {
			cls: 'obsiman-btn mod-cta obsiman-header-apply',
			text: t('ops.apply'),
		});
		applyBtn.addEventListener('click', () => this.callbacks.onApplyQueue());
	}

	private updateShowSelectedIcon(): void {
		this.showSelectedBtn.empty();
		setIcon(this.showSelectedBtn, this._showSelectedOnly ? 'lucide-eye-off' : 'lucide-eye');
		if (this._showSelectedOnly) {
			this.showSelectedBtn.addClass('is-active');
		} else {
			this.showSelectedBtn.removeClass('is-active');
		}
	}

	private populateSessionSelect(): void {
		this.sessionSelect.empty();
		this.sessionSelect.createEl('option', { value: '', text: t('toolbar.no_session') });

		const sessionFiles = this.plugin.sessionService.getSessionFiles();
		for (const f of sessionFiles) {
			this.sessionSelect.createEl('option', { value: f.path, text: f.basename });
		}

		this.sessionSelect.createEl('option', { value: '__new__', text: t('toolbar.new_session') });

		const currentPath = this.plugin.settings.sessionFilePath;
		if (currentPath) this.sessionSelect.value = currentPath;
	}

	// --- Public API ---

	refreshSessionList(): void {
		const currentVal = this.sessionSelect?.value;
		this.populateSessionSelect();
		if (currentVal && this.sessionSelect) this.sessionSelect.value = currentVal;
	}

	refreshSyncStatus(): void {
		if (!this.syncIndicator) return;
		const status = this.plugin.sessionService.getSyncStatus();
		this.syncIndicator.empty();

		// Reset to base class, then add status-specific modifier
		this.syncIndicator.className = '';
		this.syncIndicator.addClasses(['obsiman-sync-indicator']);

		switch (status) {
			case 'synced':
				this.syncIndicator.setText('●');
				this.syncIndicator.addClass('obsiman-sync-ok');
				this.syncIndicator.title = t('session.synced');
				break;
			case 'conflict':
				this.syncIndicator.setText('●');
				this.syncIndicator.addClass('obsiman-sync-conflict');
				this.syncIndicator.title = t('session.conflict');
				break;
			case 'external':
				this.syncIndicator.setText('●');
				this.syncIndicator.addClass('obsiman-sync-external');
				this.syncIndicator.title = t('session.outdated');
				break;
			default:
				this.syncIndicator.setText('');
				break;
		}
	}

	refreshQueueBadge(count: number): void {
		if (!this.queueBadge) return;
		if (count > 0) {
			this.queueBadge.setText(t('header.queue_badge', { count }));
			this.queueBadge.removeClass('obsiman-hidden');
		} else {
			this.queueBadge.setText('');
			this.queueBadge.addClass('obsiman-hidden');
		}
	}

	isShowSelectedOnly(): boolean {
		return this._showSelectedOnly;
	}
}
