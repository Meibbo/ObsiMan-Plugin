import type { PendingChange } from '../types/operation';
import { t } from '../i18n/index';

/**
 * Renders the operation queue as a simple list with remove buttons.
 */
export class QueueListComponent {
	private containerEl: HTMLElement;
	private onRemove: (index: number) => void;

	constructor(containerEl: HTMLElement, onRemove: (index: number) => void) {
		this.containerEl = containerEl;
		this.onRemove = onRemove;
	}

	render(queue: PendingChange[]): void {
		this.containerEl.empty();

		if (queue.length === 0) {
			this.containerEl.createDiv({
				cls: 'obsiman-queue-empty',
				text: t('ops.queue.empty'),
			});
			return;
		}

		const headerEl = this.containerEl.createDiv({ cls: 'obsiman-queue-header' });
		headerEl.createSpan({
			text: t('ops.queue', { count: queue.length }),
			cls: 'obsiman-queue-title',
		});

		const listEl = this.containerEl.createDiv({ cls: 'obsiman-queue-list' });
		for (let i = 0; i < queue.length; i++) {
			this.renderItem(listEl, queue[i], i);
		}
	}

	private renderItem(parent: HTMLElement, change: PendingChange, index: number): void {
		const itemEl = parent.createDiv({ cls: 'obsiman-queue-item' });

		itemEl.createSpan({
			cls: 'obsiman-queue-index',
			text: `${index + 1}.`,
		});

		const descEl = itemEl.createSpan({
			cls: 'obsiman-queue-desc',
		});
		descEl.createSpan({
			cls: 'obsiman-queue-action',
			text: change.action,
		});
		descEl.createSpan({
			text: ` ${change.details}`,
		});

		itemEl.createSpan({
			cls: 'obsiman-queue-file-count',
			text: `(${change.files.length} files)`,
		});

		const removeBtn = itemEl.createEl('button', {
			cls: 'obsiman-filter-remove-btn clickable-icon',
			attr: { 'aria-label': 'Remove from queue' },
		});
		removeBtn.setText('×');
		removeBtn.addEventListener('click', () => this.onRemove(index));
	}
}
