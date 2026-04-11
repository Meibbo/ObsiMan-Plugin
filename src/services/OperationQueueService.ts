import { Component, Events, Notice, type App, type TFile } from 'obsidian';
import type { PendingChange, OperationResult } from '../types/operation';
import { DELETE_PROP, RENAME_FILE, REORDER_ALL, MOVE_FILE, FIND_REPLACE_CONTENT } from '../types/operation';
import { translate } from '../i18n/index';

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

	/**
	 * Bridge to Obsidian events that returns an unsubscribe function.
	 * Used by Svelte components in $effect blocks.
	 */
	onUpdate(callback: () => void): () => void {
		this.on('changed', callback);
		return () => this.off('changed', callback);
	}

	on(name: 'changed' | 'executed', callback: (result?: OperationResult) => void): void {
		this.events.on(name, callback as (...data: unknown[]) => unknown);
	}

	off(name: 'changed' | 'executed', callback: (result?: OperationResult) => void): void {
		this.events.off(name, callback as (...data: unknown[]) => unknown);
	}

	/** Add a single operation to the queue */
	add(change: PendingChange): void {
		this.queue.push(change);
		this.events.trigger('changed');
	}

	/**
	 * Add multiple operations at once — fires only ONE 'changed' event.
	 * Use this instead of calling add() in a loop to avoid freezing the UI
	 * with thousands of re-renders (one per file).
	 */
	addBatch(changes: PendingChange[]): void {
		if (changes.length === 0) return;
		this.queue.push(...changes);
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
	 *
	 * - Re-reads metadata per file before applying (handles concurrent edits).
	 * - Processes in chunks of 20 files, yielding to the UI thread between
	 *   chunks so Obsidian stays responsive during large batches.
	 * - Shows a persistent Notice with a live progress counter.
	 *
	 * Note: Obsidian's metadataCache indexes each renamed/moved file
	 * individually via a 'rename' event (one at a time, single-threaded).
	 * This is expected OS-level behavior — files move instantly at the
	 * filesystem level, but Obsidian's vault view updates incrementally
	 * as each file is re-indexed. The queue clears when execution finishes,
	 * regardless of how far Obsidian's indexing has progressed.
	 */
	async execute(): Promise<OperationResult> {
		const result: OperationResult = { success: 0, errors: 0, messages: [] };

		if (this.isEmpty) {
			new Notice(translate('result.no_changes'));
			return result;
		}

		// Flatten all (file, change) pairs for progress tracking
		const ops: Array<{ file: TFile; change: PendingChange }> = [];
		for (const change of this.queue) {
			for (const file of change.files) {
				ops.push({ file, change });
			}
		}

		const total = ops.length;
		const CHUNK = 20; // yield to UI after every N files

		// Persistent notice — updated live as files are processed
		const notice = new Notice('', 0);

		for (let i = 0; i < ops.length; i++) {
			const { file, change } = ops[i];
			notice.setMessage(`${translate('result.applying')} ${i + 1} / ${total}`);

			try {
				await this.applyChange(file, change);
				result.success++;
			} catch (err) {
				result.errors++;
				result.messages.push(`${file.path}: ${String(err)}`);
			}

			// Yield to UI thread every CHUNK files to keep the app responsive
			if ((i + 1) % CHUNK === 0) {
				await new Promise<void>((r) => setTimeout(r, 0));
			}
		}

		notice.hide();

		// Clear queue after all operations complete
		this.queue.length = 0;

		new Notice(
			result.errors > 0
				? translate('result.errors', { count: result.errors })
				: translate('result.success', { count: result.success })
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

		if (MOVE_FILE in updates) {
			const targetFolder = updates[MOVE_FILE] as string;
			const newPath = targetFolder ? `${targetFolder}/${file.name}` : file.name;
			await this.app.fileManager.renameFile(file, newPath);
			return;
		}

		if (FIND_REPLACE_CONTENT in updates) {
			const { pattern, replacement, isRegex, caseSensitive } = updates[FIND_REPLACE_CONTENT] as {
				pattern: string;
				replacement: string;
				isRegex: boolean;
				caseSensitive: boolean;
			};
			const flags = 'g' + (caseSensitive ? '' : 'i');
			const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const regex = new RegExp(escaped, flags);
			const content = await this.app.vault.read(file);
			const newContent = content.replace(regex, replacement);
			if (newContent !== content) {
				await this.app.vault.modify(file, newContent);
			}
			return;
		}

		// Apply frontmatter changes
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			for (const [key, value] of Object.entries(updates)) {
				if (key === DELETE_PROP) {
					// value is the property name to delete
					delete fm[value as string];
				} else if (key === REORDER_ALL) {
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
						const copy: Record<string, unknown> = { ...after };
						for (const k of Object.keys(after)) delete after[k];
						for (const k of ordered) {
							if (k in copy) after[k] = copy[k];
						}
						for (const k of Object.keys(copy)) {
							if (!(k in after)) after[k] = copy[k];
						}
					} else if (key !== RENAME_FILE && key !== MOVE_FILE && key !== FIND_REPLACE_CONTENT) {
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
