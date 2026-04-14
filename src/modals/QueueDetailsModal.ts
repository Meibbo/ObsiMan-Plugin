import { Modal, Notice, Setting, type App } from 'obsidian';
import type { OperationQueueService } from '../services/OperationQueueService';
import { FIND_REPLACE_CONTENT } from '../types/operation';
import { translate } from '../i18n/index';

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
		contentEl.addClasses(['obsiman-modal', 'obsiman-queue-details']);

		contentEl.createEl('h3', { text: translate('queue.title') });

		const diffs = this.queueService.simulateChanges();

		if (diffs.size === 0) {
			contentEl.createEl('p', { text: translate('result.no_changes') });
			return;
		}

		// --- Summary header ---
		const operationCount = this.queueService.queue.length;
		const summaryEl = contentEl.createDiv({ cls: 'obsiman-diff-summary' });
		summaryEl.createSpan({
			text: `${diffs.size} ${translate('section.files').toLowerCase()} · ${operationCount} ${translate('section.operations').toLowerCase()}`,
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
		toggleLabel.createSpan({ text: ` ${translate('queue.show_unchanged')}` });
		toggleCb.addEventListener('change', () => {
			this.showUnchanged = toggleCb.checked;
			this.renderDiffs(diffContainer, diffs);
		});

		// --- File diffs ---
		const diffContainer = contentEl.createEl('div', { cls: 'obsiman-diff-container' });
		this.renderDiffs(diffContainer, diffs);

		// --- Async content-op snippet section (below property diffs) ---
		const contentOpsContainer = contentEl.createDiv();
		void this.renderContentOps(contentOpsContainer);

		// --- Apply / Cancel buttons ---
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(translate('ops.apply'))
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
		diffs: Map<string, { before: Record<string, unknown>; after: Record<string, unknown>; newPath?: string }>
	): void {
		container.empty();

		for (const [path, { before, after, newPath }] of diffs) {
			const fileEl = container.createDiv({ cls: 'obsiman-diff-file' });

			// Collapsible header
			const headerEl = fileEl.createDiv({ cls: 'obsiman-diff-file-header' });
			const toggleIcon = headerEl.createSpan({
				cls: 'obsiman-diff-file-toggle',
				text: '▶',
			});

			const oldBasename = path.replace(/\.md$/, '').split('/').pop() ?? path;
			const newBasename = newPath ? newPath.replace(/\.md$/, '').split('/').pop() ?? newPath : undefined;
			const oldFolder = path.includes('/') ? path.split('/').slice(0, -1).join('/') : '';
			const newFolder = newPath?.includes('/') ? newPath.split('/').slice(0, -1).join('/') : '';

			if (newPath && newPath !== path) {
				if (oldFolder !== newFolder && oldBasename === newBasename) {
					// Only moved
					headerEl.createSpan({ cls: 'obsiman-diff-deleted', text: `${oldFolder ? oldFolder + '/' : ''}${oldBasename}` });
					headerEl.createSpan({ text: ' → ' });
					headerEl.createSpan({ cls: 'obsiman-diff-added', text: `${newFolder ? newFolder + '/' : ''}${oldBasename}` });
				} else if (oldBasename !== newBasename) {
					// Renamed (and possibly moved)
					headerEl.createSpan({ cls: 'obsiman-diff-deleted', text: oldBasename });
					headerEl.createSpan({ text: ' → ' });
					headerEl.createSpan({ cls: 'obsiman-diff-added', text: newBasename });
					if (oldFolder !== newFolder) {
						headerEl.createSpan({ text: ` (moved to /${newFolder})`, cls: 'obsiman-text-faint' });
					}
				}
			} else {
				headerEl.createSpan({ cls: 'obsiman-diff-path', text: oldBasename });
			}

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
		new Notice(`${translate('linter.applying')} (0/${total})...`);

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

	private async renderContentOps(container: HTMLElement): Promise<void> {
		const contentOps = this.queueService.queue.filter(
			(op) => op.action === 'find_replace_content'
		);
		if (contentOps.length === 0) return;

		const section = container.createDiv({ cls: 'obsiman-diff-content-section' });
		section.createDiv({
			cls: 'obsiman-diff-content-section-title',
			text: translate('queue.content_changes'),
		});

		const MAX_FILES_SHOWN = 10;
		const MAX_SNIPPETS_PER_FILE = 3;
		const CONTEXT_LEN = 60;

		for (const op of contentOps) {
			// Extract pattern data from logicFunc closure (file/metadata args are ignored for content ops)
			const logicResult = op.logicFunc(op.files[0], {});
			if (!logicResult || !(FIND_REPLACE_CONTENT in logicResult)) continue;
			const { pattern, replacement, isRegex, caseSensitive } = logicResult[FIND_REPLACE_CONTENT] as {
				pattern: string;
				replacement: string;
				isRegex: boolean;
				caseSensitive: boolean;
			};

			const flags = 'g' + (caseSensitive ? '' : 'i');
			const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			try {
				new RegExp(escaped, flags); // validate regex before iterating files
			} catch {
				continue;
			}

			const filesToShow = op.files.slice(0, MAX_FILES_SHOWN);

			for (const file of filesToShow) {
				const fileEl = section.createDiv({ cls: 'obsiman-diff-content-file' });
				fileEl.createDiv({
					cls: 'obsiman-diff-content-file-path',
					text: file.path,
				});

				let content: string;
				try {
					content = await this.app.vault.read(file);
				} catch {
					continue;
				}

				const matches = [...content.matchAll(new RegExp(escaped, flags))];
				if (matches.length === 0) {
					fileEl.createDiv({
						cls: 'obsiman-diff-content-no-matches',
						text: translate('queue.content_no_matches'),
					});
					continue;
				}

				for (const m of matches.slice(0, MAX_SNIPPETS_PER_FILE)) {
					const start = m.index ?? 0;
					const end = start + m[0].length;
					const before = content.slice(Math.max(0, start - CONTEXT_LEN), start);
					const matchText = m[0];
					const after = content.slice(end, end + CONTEXT_LEN);
					const replText = isRegex
						? matchText.replace(new RegExp(escaped, flags.replace('g', '')), replacement)
						: replacement;

					const snippetEl = fileEl.createDiv({ cls: 'obsiman-diff-snippet' });
					snippetEl.createSpan({ text: (start > CONTEXT_LEN ? '…' : '') + before });
					snippetEl.createEl('mark', { text: matchText });
					snippetEl.createSpan({ cls: 'obsiman-diff-replace-arrow', text: '→' });
					snippetEl.createEl('mark', { cls: 'obsiman-diff-replace-new', text: replText });
					snippetEl.createSpan({ text: after + (end + CONTEXT_LEN < content.length ? '…' : '') });
				}

				if (matches.length > MAX_SNIPPETS_PER_FILE) {
					fileEl.createDiv({
						cls: 'obsiman-diff-content-no-matches',
						text: `…and ${matches.length - MAX_SNIPPETS_PER_FILE} more match(es)`,
					});
				}
			}

			if (op.files.length > MAX_FILES_SHOWN) {
				section.createDiv({
					cls: 'obsiman-diff-content-no-matches',
					text: `…and ${op.files.length - MAX_FILES_SHOWN} more files`,
				});
			}
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
