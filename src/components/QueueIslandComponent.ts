import { setIcon } from 'obsidian';
import type { OperationQueueService } from '../services/OperationQueueService';
import { t } from '../i18n/index';

/**
 * In-frame floating island showing the pending operation queue.
 * Rendered above the bottom nav bar, slides up from below.
 *
 * Structure (top → bottom inside island):
 *   header ("N pending changes")
 *   squircle buttons: Execute ▶ · Clear ✕ · Details ☰
 *   scrollable item list
 *
 * Height grows with content up to 70vh, then scrolls internally.
 */
export class QueueIslandComponent {
	private containerEl: HTMLElement;
	private queueService: OperationQueueService;
	private onClose: () => void;
	private onOpenDetails: () => void;

	private islandEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private headerEl: HTMLElement | null = null;

	constructor(
		containerEl: HTMLElement,
		_app: unknown,
		queueService: OperationQueueService,
		onClose: () => void,
		onOpenDetails: () => void
	) {
		this.containerEl = containerEl;
		this.queueService = queueService;
		this.onClose = onClose;
		this.onOpenDetails = onOpenDetails;
	}

	mount(): void {
		this.islandEl = this.containerEl.createDiv({ cls: 'obsiman-queue-island' });

		// Header — count label (visually distinct, can be removed without touching the rest)
		this.headerEl = this.islandEl.createDiv({ cls: 'obsiman-queue-island-header' });

		// Squircle action buttons
		const btnRow = this.islandEl.createDiv({ cls: 'obsiman-squircle-row obsiman-queue-island-btns' });

		const executeBtn = btnRow.createDiv({
			cls: 'obsiman-squircle',
			attr: { 'aria-label': t('ops.apply'), role: 'button', tabindex: '0' },
		});
		setIcon(executeBtn, 'lucide-play');
		executeBtn.addEventListener('click', () => {
			void this.queueService.execute();
			this.onClose();
		});

		const clearBtn = btnRow.createDiv({
			cls: 'obsiman-squircle',
			attr: { 'aria-label': t('ops.clear'), role: 'button', tabindex: '0' },
		});
		setIcon(clearBtn, 'lucide-x');
		clearBtn.addEventListener('click', () => {
			this.queueService.clear();
			this.onClose();
		});

		const detailsBtn = btnRow.createDiv({
			cls: 'obsiman-squircle',
			attr: { 'aria-label': t('ops.details'), role: 'button', tabindex: '0' },
		});
		setIcon(detailsBtn, 'lucide-list');
		detailsBtn.addEventListener('click', () => {
			this.onOpenDetails();
		});

		// Scrollable item list
		this.listEl = this.islandEl.createDiv({ cls: 'obsiman-queue-island-list' });

		this.render();

		// Slide in after next frame so CSS transition fires
		requestAnimationFrame(() => {
			this.islandEl?.addClass('is-open');
		});
	}

	render(): void {
		if (!this.listEl || !this.headerEl) return;
		const queue = this.queueService.queue;

		const pendingLabel = t('queue.island.pending');
		this.headerEl.setText(`${queue.length} ${pendingLabel}`);

		this.listEl.empty();
		if (queue.length === 0) {
			this.listEl.createDiv({ cls: 'obsiman-queue-island-empty', text: t('queue.island.empty') });
			return;
		}

		for (const change of queue) {
			const rowEl = this.listEl.createDiv({ cls: 'obsiman-queue-island-row' });
			const fileCount = change.files.length;
			rowEl.createSpan({
				cls: 'obsiman-queue-island-row-files',
				text: `${fileCount} file${fileCount !== 1 ? 's' : ''}`,
			});
			rowEl.createSpan({
				cls: 'obsiman-queue-island-row-detail',
				text: change.details,
			});
		}
	}

	destroy(): void {
		this.islandEl?.remove();
		this.islandEl = null;
		this.listEl = null;
		this.headerEl = null;
	}
}
