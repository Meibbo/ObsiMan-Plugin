import { Component, Events, Notice, type App, type TFile } from 'obsidian';
import type { PendingChange, OperationResult } from '../types/operation';
import { DELETE_PROP, RENAME_FILE, REORDER_ALL } from '../types/operation';
import { t } from '../i18n/index';

/**
 * Manages the queue of pending property operations.
 * All operations are staged first, then executed atomically on user confirmation.
 *
 * Port of Python's pending_changes list + _execute_queue_internal().
 */
export class OperationQueueService extends Component {
	private app: App;
	private events = new Events();

	readonly queue: PendingChange[] = [];

	constructor(app: App) {
		super();
		this.app = app;
	}

	on(name: 'changed' | 'executed', callback: (result?: OperationResult) => void): void {
		this.events.on(name, callback as (...data: unknown[]) => unknown);
	}

	off(name: 'changed' | 'executed', callback: (result?: OperationResult) => void): void {
		this.events.off(name, callback as (...data: unknown[]) => unknown);
	}

	/** Add an operation to the queue */
	add(change: PendingChange): void {
		this.queue.push(change);
		this.events.trigger('changed');
	}

	/** Remove an operation by index */
	remove(index: number): void {
		if (index >= 0 && index < this.queue.length) {
			this.queue.splice(index, 1);
			this.events.trigger('changed');
		}
	}

	/** Clear all pending operations */
	clear(): void {
		this.queue.length = 0;
		this.events.trigger('changed');
	}

	get isEmpty(): boolean {
		return this.queue.length === 0;
	}

	/**
	 * Execute all queued operations.
	 * Re-reads metadata per file before applying (handles concurrent edits).
	 */
	async execute(): Promise<OperationResult> {
		const result: OperationResult = { success: 0, errors: 0, messages: [] };

		if (this.isEmpty) {
			new Notice(t('result.no_changes'));
			return result;
		}

		for (const change of this.queue) {
			for (const file of change.files) {
				try {
					await this.applyChange(file, change);
					result.success++;
				} catch (err) {
					result.errors++;
					result.messages.push(`${file.path}: ${String(err)}`);
				}
			}
		}

		// Clear queue after execution
		this.queue.length = 0;

		new Notice(
			result.errors > 0
				? t('result.errors', { count: result.errors })
				: t('result.success', { count: result.success })
		);

		this.events.trigger('executed', result);
		this.events.trigger('changed');

		return result;
	}

	private async applyChange(file: TFile, change: PendingChange): Promise<void> {
		// Re-read current metadata
		const cache = this.app.metadataCache.getFileCache(file);
		const currentMeta = { ...(cache?.frontmatter ?? {}) };
		delete currentMeta['position']; // Remove Obsidian internal key

		const updates = change.logicFunc(file, currentMeta);
		if (!updates) return;

		// Handle special operation signals
		if (RENAME_FILE in updates) {
			const newName = updates[RENAME_FILE] as string;
			const newPath = file.path.replace(file.name, newName);
			await this.app.fileManager.renameFile(file, newPath);
			return;
		}

		// Apply frontmatter changes
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			for (const [key, value] of Object.entries(updates)) {
				if (key === DELETE_PROP) {
					// value is the property name to delete
					delete fm[value as string];
				} else if (key === REORDER_ALL) {
					// value is the ordered key array — rebuild fm in order
					const ordered = value as string[];
					const copy = { ...fm };
					for (const k of Object.keys(fm)) delete fm[k];
					for (const k of ordered) {
						if (k in copy) fm[k] = copy[k];
					}
					// Add any remaining keys not in the order list
					for (const k of Object.keys(copy)) {
						if (!(k in fm)) fm[k] = copy[k];
					}
				} else {
					fm[key] = value;
				}
			}
		});
	}

	/**
	 * Simulate all queued changes without writing.
	 * Returns a map of file path → { before, after } metadata snapshots.
	 */
	simulateChanges(): Map<string, { before: Record<string, unknown>; after: Record<string, unknown> }> {
		const diffs = new Map<string, { before: Record<string, unknown>; after: Record<string, unknown> }>();

		for (const change of this.queue) {
			for (const file of change.files) {
				const cache = this.app.metadataCache.getFileCache(file);
				const before = { ...(cache?.frontmatter ?? {}) };
				delete before['position'];

				// Start from previous "after" if this file was already changed
				const existing = diffs.get(file.path);
				const base = existing ? { ...existing.after } : { ...before };

				const updates = change.logicFunc(file, base);
				if (!updates) continue;

				const after = { ...base };
				for (const [key, value] of Object.entries(updates)) {
					if (key === DELETE_PROP) {
						delete after[value as string];
					} else if (key === REORDER_ALL) {
						// Simulate key reordering
						const ordered = value as string[];
						const copy = { ...after };
						for (const k of Object.keys(after)) delete after[k];
						for (const k of ordered) {
							if (k in copy) after[k] = copy[k];
						}
						for (const k of Object.keys(copy)) {
							if (!(k in after)) after[k] = copy[k];
						}
					} else if (key !== RENAME_FILE) {
						after[key] = value;
					}
				}

				diffs.set(file.path, {
					before: existing?.before ?? before,
					after,
				});
			}
		}

		return diffs;
	}
}
