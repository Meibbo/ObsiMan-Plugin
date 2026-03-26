import { Modal, Notice, Setting, type App } from 'obsidian';
import type { OperationQueueService } from '../services/OperationQueueService';
import { t } from '../i18n/index';

/**
 * Enhanced diff preview modal with:
 * - Summary header (N files, M operations)
 * - Collapsible file sections (collapsed by default)
 * - Color-coded property diffs (green/red/yellow)
 * - "Show unchanged" toggle
 * - Progress indicator during execution
 */
export class QueueDetailsModal extends Modal {
	private queueService: OperationQueueService;
	private showUnchanged = false;

	constructor(app: App, queueService: OperationQueueService) {
		super(app);
		this.queueService = queueService;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-modal obsiman-queue-details');

		contentEl.createEl('h3', { text: t('queue.title') });

		const diffs = this.queueService.simulateChanges();

		if (diffs.size === 0) {
			contentEl.createEl('p', { text: t('result.no_changes') });
			return;
		}

		// --- Summary header ---
		const operationCount = this.queueService.queue.length;
		const summaryEl = contentEl.createDiv({ cls: 'obsiman-diff-summary' });
		summaryEl.createSpan({
			text: `${diffs.size} ${t('section.files').toLowerCase()} · ${operationCount} ${t('section.operations').toLowerCase()}`,
		});

		// --- Operations list ---
		const opsEl = contentEl.createDiv({ cls: 'obsiman-diff-ops' });
		for (let i = 0; i < this.queueService.queue.length; i++) {
			const op = this.queueService.queue[i];
			const opEl = opsEl.createDiv({ cls: 'obsiman-diff-op' });
			opEl.createSpan({ cls: 'obsiman-diff-op-index', text: `${i + 1}.` });
			opEl.createSpan({ cls: 'obsiman-diff-op-action', text: op.action });
			opEl.createSpan({ cls: 'obsiman-diff-op-detail', text: op.details });
			opEl.createSpan({
				cls: 'obsiman-diff-op-files',
				text: `(${op.files.length} files)`,
			});
		}

		// --- Show unchanged toggle ---
		const toggleRow = contentEl.createDiv({ cls: 'obsiman-diff-toggle-row' });
		const toggleLabel = toggleRow.createEl('label', { cls: 'obsiman-diff-toggle' });
		const toggleCb = toggleLabel.createEl('input', {
			attr: { type: 'checkbox' },
		});
		toggleCb.checked = this.showUnchanged;
		toggleLabel.createSpan({ text: ` ${t('queue.show_unchanged')}` });
		toggleCb.addEventListener('change', () => {
			this.showUnchanged = toggleCb.checked;
			this.renderDiffs(diffContainer, diffs);
		});

		// --- File diffs ---
		const diffContainer = contentEl.createEl('div', { cls: 'obsiman-diff-container' });
		this.renderDiffs(diffContainer, diffs);

		// --- Apply / Cancel buttons ---
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(t('ops.apply'))
					.setCta()
					.onClick(async () => {
						this.close();
						await this.executeWithProgress();
					})
			)
			.addButton((btn) =>
				btn.setButtonText('Cancel').onClick(() => this.close())
			);
	}

	private renderDiffs(
		container: HTMLElement,
		diffs: Map<string, { before: Record<string, unknown>; after: Record<string, unknown> }>
	): void {
		container.empty();

		for (const [path, { before, after }] of diffs) {
			const fileEl = container.createDiv({ cls: 'obsiman-diff-file' });

			// Collapsible header
			const headerEl = fileEl.createDiv({ cls: 'obsiman-diff-file-header' });
			const toggleIcon = headerEl.createSpan({
				cls: 'obsiman-diff-file-toggle',
				text: '▶',
			});

			const fileName = path.replace(/\.md$/, '').split('/').pop() ?? path;
			headerEl.createSpan({ cls: 'obsiman-diff-path', text: fileName });

			// Count changes for this file
			const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
			let changeCount = 0;
			for (const key of allKeys) {
				if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
					changeCount++;
				}
			}
			headerEl.createSpan({
				cls: 'obsiman-diff-change-count',
				text: `${changeCount} change${changeCount !== 1 ? 's' : ''}`,
			});

			// Content (collapsed by default)
			const contentEl = fileEl.createDiv({
				cls: 'obsiman-diff-content obsiman-diff-collapsed',
			});

			headerEl.addEventListener('click', () => {
				const isCollapsed = contentEl.hasClass('obsiman-diff-collapsed');
				if (isCollapsed) {
					contentEl.removeClass('obsiman-diff-collapsed');
					toggleIcon.setText('▼');
				} else {
					contentEl.addClass('obsiman-diff-collapsed');
					toggleIcon.setText('▶');
				}
			});

			// Render property changes
			for (const key of allKeys) {
				const beforeVal = before[key];
				const afterVal = after[key];

				const isChanged = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);

				if (!isChanged && !this.showUnchanged) continue;

				const rowEl = contentEl.createDiv({
					cls: `obsiman-diff-row ${isChanged ? '' : 'obsiman-diff-unchanged'}`,
				});
				rowEl.createSpan({ cls: 'obsiman-diff-key', text: key });

				if (!isChanged) {
					rowEl.createSpan({
						cls: 'obsiman-diff-same',
						text: this.formatValue(beforeVal),
					});
				} else if (beforeVal !== undefined && afterVal === undefined) {
					// Deleted
					rowEl.createSpan({
						cls: 'obsiman-diff-deleted',
						text: `− ${this.formatValue(beforeVal)}`,
					});
				} else if (beforeVal === undefined && afterVal !== undefined) {
					// Added
					rowEl.createSpan({
						cls: 'obsiman-diff-added',
						text: `+ ${this.formatValue(afterVal)}`,
					});
				} else {
					// Changed
					rowEl.createSpan({
						cls: 'obsiman-diff-deleted',
						text: `− ${this.formatValue(beforeVal)}`,
					});
					rowEl.createSpan({
						cls: 'obsiman-diff-added',
						text: `+ ${this.formatValue(afterVal)}`,
					});
				}
			}
		}
	}

	private async executeWithProgress(): Promise<void> {
		const total = this.queueService.queue.reduce(
			(sum, op) => sum + op.files.length,
			0
		);
		new Notice(`${t('linter.applying')} (0/${total})...`);

		const result = await this.queueService.execute();

		if (result.errors > 0 && result.messages.length > 0) {
			console.warn('ObsiMan execution errors:', result.messages);
		}
	}

	private formatValue(val: unknown): string {
		if (val === null || val === undefined) return '(empty)';
		if (Array.isArray(val)) {
			if (val.length <= 3) return `[${val.join(', ')}]`;
			// YAML-like list for longer arrays
			return val.map((v) => `  - ${v}`).join('\n');
		}
		return String(val as string | number | boolean);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
