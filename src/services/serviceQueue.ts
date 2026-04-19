import { App, Component, Events, Notice, TFile, FileManager, parseYaml, stringifyYaml } from 'obsidian';
import type {
	PendingChange,
	OperationResult,
	VirtualFileState,
	StagedOp,
	TemplateChange,
} from '../types/typeOps';
import { DELETE_PROP, RENAME_FILE, REORDER_ALL, MOVE_FILE, FIND_REPLACE_CONTENT, NATIVE_RENAME_PROP, APPLY_TEMPLATE } from '../types/typeOps';
import { translate } from '../i18n/index';

/**
 * Split a markdown file's raw content into its frontmatter object and body string.
 * Uses Obsidian's parseYaml for byte-exact compatibility with processFrontMatter.
 */
function splitYamlBody(content: string): {
  fm: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { fm: {}, body: content };
  }
  const yaml = match[1];
  const body = content.slice(match[0].length);
  try {
    const fm = parseYaml(yaml) as Record<string, unknown> | null;
    return { fm: fm ?? {}, body };
  } catch {
    return { fm: {}, body };
  }
}

/**
 * Inverse of splitYamlBody — produce raw content from fm + body.
 * Empty fm means no frontmatter block.
 */
export function serializeFile(fm: Record<string, unknown>, body: string): string {
  if (Object.keys(fm).length === 0) return body;
  const yaml = stringifyYaml(fm);
  return `---\n${yaml}---\n${body}`;
}

interface InternalApp extends App {
	fileManager: FileManager & {
		renameProperty(oldName: string, newName: string): Promise<void>;
	};
}

/**
 * Manages the queue of pending property operations.
 * All operations are staged first, then executed atomically on user confirmation.
 *
 * Port of Python's pending_changes list + _execute_queue_internal().
 */
export class OperationQueueService extends Component {
	private app: App;
	private events = new Events();

	private get internalApp(): InternalApp {
		return this.app as unknown as InternalApp;
	}

	readonly transactions = new Map<string, VirtualFileState>();
	private opCounter = 0;

	constructor(app: App) {
		super();
		this.app = app;
	}

	/** Back-compat shim — some UI code iterates the array. Returns empty for now. */
	get queue(): PendingChange[] {
		// Temporary back-compat. Remove after all UI migrates (Task 14–18).
		return [];
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

	/**
	 * Get existing VFS for file.path, or read from disk and create a new one.
	 * For lazy-body entries (bodyLoaded: false), hydrates them on demand
	 * when callers request full materialization (requireBody=true).
	 */
	private async getOrCreateVFS(file: TFile, requireBody: boolean): Promise<VirtualFileState> {
		const key = file.path;
		const existing = this.transactions.get(key);

		if (existing) {
			if (requireBody && !existing.bodyLoaded) {
				await this.hydrateBody(existing);
			}
			return existing;
		}

		// Fresh — read full content
		const content = await this.app.vault.read(file);
		const { fm, body } = splitYamlBody(content);
		const vfs: VirtualFileState = {
			file,
			originalPath: key,
			newPath: undefined,
			fm: { ...fm },
			body,
			ops: [],
			fmInitial: { ...fm },
			bodyInitial: body,
			bodyLoaded: true,
		};
		this.transactions.set(key, vfs);
		return vfs;
	}

	/** Upgrade a lazy VFS: read body from disk and fill bodyInitial/body. */
	private async hydrateBody(vfs: VirtualFileState): Promise<void> {
		const content = await this.app.vault.read(vfs.file);
		const { body } = splitYamlBody(content);
		(vfs as { bodyInitial: string }).bodyInitial = body;
		vfs.body = body;
		vfs.bodyLoaded = true;
	}

	/** Add a single pending change. Async because VFS may need disk read. */
	async add(change: PendingChange): Promise<void> {
		await this.ingest(change, /*silent*/ false);
	}

	/** Add many changes, firing only ONE 'changed' event at the end. */
	async addBatch(changes: PendingChange[]): Promise<void> {
		if (changes.length === 0) return;
		for (const c of changes) {
			await this.ingest(c, /*silent*/ true);
		}
		this.events.trigger('changed');
	}

	/** Shared internal ingestion: translate PendingChange to per-file StagedOps. */
	private async ingest(change: PendingChange, silent: boolean): Promise<void> {
		// Special case: NATIVE_RENAME_PROP is vault-wide — expand across metadataCache.
		const probe = this.probeForNativeRename(change);
		if (probe) {
			await this.expandNativeRename(change, probe.oldName, probe.newName);
			if (!silent) this.events.trigger('changed');
			return;
		}

		for (const file of change.files) {
			const needsBody = this.opNeedsBody(change);
			const vfs = await this.getOrCreateVFS(file, needsBody);
			const updates = change.logicFunc(file, vfs.fm);
			if (!updates) continue;
			this.applyUpdates(vfs, change, updates);
		}
		if (!silent) this.events.trigger('changed');
	}

	/**
	 * Probe: does this change carry _NATIVE_RENAME_PROP?
	 * Safe to call — logicFunc for rename-prop changes ignores file/fm.
	 */
	private probeForNativeRename(change: PendingChange): { oldName: string; newName: string } | null {
		if (change.files.length === 0) return null;
		const sample = change.logicFunc(change.files[0], {});
		if (sample && NATIVE_RENAME_PROP in sample) {
			return sample[NATIVE_RENAME_PROP] as { oldName: string; newName: string };
		}
		return null;
	}

	/** Returns true if the change will modify body content. */
	private opNeedsBody(change: PendingChange): boolean {
		if (change.type === 'content_replace') return true;
		if (change.type === 'template') return true;
		return false;
	}

	/**
	 * Translate logicFunc's `updates` dict into one or more StagedOps,
	 * push them onto vfs.ops, and mutate vfs state eagerly.
	 */
	private applyUpdates(
		vfs: VirtualFileState,
		change: PendingChange,
		updates: Record<string, unknown>
	): void {
		for (const [key, value] of Object.entries(updates)) {
			const op = this.translateUpdate(vfs, change, key, value);
			if (!op) continue;
			vfs.ops.push(op);
			op.apply(vfs);
		}
	}

	/** Build a StagedOp from a single update entry. Null if unknown/ignored. */
	private translateUpdate(
		_vfs: VirtualFileState,
		change: PendingChange,
		key: string,
		value: unknown
	): StagedOp | null {
		const id = `op-${++this.opCounter}`;
		const action = change.action;
		const details = change.details;

		if (key === DELETE_PROP) {
			const propName = value as string;
			return {
				id, kind: 'delete_prop', action, details,
				apply: (v) => { delete v.fm[propName]; },
			};
		}
		if (key === REORDER_ALL) {
			const ordered = value as string[];
			return {
				id, kind: 'reorder_props', action, details,
				apply: (v) => {
					const copy = { ...v.fm };
					for (const k of Object.keys(v.fm)) delete v.fm[k];
					for (const k of ordered) if (k in copy) v.fm[k] = copy[k];
					for (const k of Object.keys(copy)) if (!(k in v.fm)) v.fm[k] = copy[k];
				},
			};
		}
		if (key === RENAME_FILE) {
			const newName = value as string;
			return {
				id, kind: 'rename_file', action, details,
				apply: (v) => { v.newPath = v.originalPath.replace(v.file.name, newName); },
			};
		}
		if (key === MOVE_FILE) {
			const targetFolder = value as string;
			return {
				id, kind: 'move_file', action, details,
				apply: (v) => {
					v.newPath = targetFolder ? `${targetFolder}/${v.file.name}` : v.file.name;
				},
			};
		}
		if (key === FIND_REPLACE_CONTENT) {
			const { pattern, replacement, isRegex, caseSensitive } = value as {
				pattern: string; replacement: string; isRegex: boolean; caseSensitive: boolean;
			};
			const flags = 'g' + (caseSensitive ? '' : 'i');
			const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const rx = new RegExp(escaped, flags);
			return {
				id, kind: 'find_replace_content', action, details,
				apply: (v) => { v.body = v.body.replace(rx, replacement); },
			};
		}
		if (key === APPLY_TEMPLATE) {
			const templateContent = (change as TemplateChange).templateContent ?? '';
			return {
				id, kind: 'apply_template', action, details,
				apply: (v) => { v.body = v.body + '\n\n' + templateContent; },
			};
		}
		if (key === NATIVE_RENAME_PROP) {
			// Should have been pre-expanded via probeForNativeRename. Skip defensively.
			return null;
		}
		// Normal frontmatter property set
		return {
			id, kind: 'set_prop', action, details,
			apply: (v) => { v.fm[key] = value; },
		};
	}

	private async expandNativeRename(
		_change: PendingChange,
		_oldName: string,
		_newName: string
	): Promise<void> {
		// Implemented in Task 7
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

	get fileCount(): number {
		return this.transactions.size;
	}

	get opCount(): number {
		let n = 0;
		for (const v of this.transactions.values()) n += v.ops.length;
		return n;
	}

	get isEmpty(): boolean {
		return this.transactions.size === 0;
	}

	getTransaction(path: string): VirtualFileState | undefined {
		return this.transactions.get(path);
	}

	listTransactions(): VirtualFileState[] {
		return [...this.transactions.values()];
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
		let specialUpdates: Record<string, unknown> | null = null;

		// By executing logic inside processFrontMatter, we bypass metadataCache entirely
		// and guarantee we are acting on the absolute freshest file frontmatter buffer.
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			const updates = change.logicFunc(file, fm);
			if (!updates) return;

			// Check for special signals that require APIs outside frontmatter manipulation
			if (RENAME_FILE in updates || MOVE_FILE in updates || FIND_REPLACE_CONTENT in updates || NATIVE_RENAME_PROP in updates || APPLY_TEMPLATE in updates) {
				specialUpdates = updates;
			}

			// Apply frontmatter changes in the secured context
			for (const [key, value] of Object.entries(updates)) {
				if (key === DELETE_PROP) {
					delete fm[value as string];
				} else if (key === REORDER_ALL) {
					const ordered = value as string[];
					const copy = { ...fm };
					for (const k of Object.keys(fm)) delete fm[k];
					for (const k of ordered) {
						if (k in copy) fm[k] = copy[k];
					}
					for (const k of Object.keys(copy)) {
						if (!(k in fm)) fm[k] = copy[k];
					}
				} else if (key !== RENAME_FILE && key !== MOVE_FILE && key !== FIND_REPLACE_CONTENT && key !== NATIVE_RENAME_PROP && key !== APPLY_TEMPLATE) {
					fm[key] = value;
				}
			}
		});

		if (!specialUpdates) return;

		// Execute special vault operations sequentially AFTER frontmatter is safely saved
		if (RENAME_FILE in specialUpdates) {
			const newName = specialUpdates[RENAME_FILE] as string;
			const newPath = file.path.replace(file.name, newName);
			await this.app.fileManager.renameFile(file, newPath);
			return;
		}

		if (MOVE_FILE in specialUpdates) {
			const targetFolder = specialUpdates[MOVE_FILE] as string;
			const newPath = targetFolder ? `${targetFolder}/${file.name}` : file.name;
			await this.app.fileManager.renameFile(file, newPath);
			return;
		}

		if (FIND_REPLACE_CONTENT in specialUpdates) {
			const { pattern, replacement, isRegex, caseSensitive } = specialUpdates[FIND_REPLACE_CONTENT] as {
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

		if (NATIVE_RENAME_PROP in specialUpdates) {
			const { oldName, newName } = specialUpdates[NATIVE_RENAME_PROP] as { oldName: string; newName: string };
			await this.internalApp.fileManager.renameProperty(oldName, newName);
			return;
		}

		if (APPLY_TEMPLATE in specialUpdates) {
			const templatePath = specialUpdates[APPLY_TEMPLATE] as string;
			const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
			if (templateFile instanceof TFile) {
				const templateContent = await this.app.vault.read(templateFile);
				const content = await this.app.vault.read(file);

				// Standard text append logic
				const newContent = content + '\n\n' + templateContent;
				await this.app.vault.modify(file, newContent);
			}
			return;
		}
	}

	/**
	 * Simulate all queued changes without writing.
	 * Returns a map of file path → { before, after } metadata snapshots.
	 */
	simulateChanges(): Map<string, { before: Record<string, unknown>; after: Record<string, unknown>; newPath?: string }> {
		const diffs = new Map<string, { before: Record<string, unknown>; after: Record<string, unknown>; newPath?: string }>();

		for (const change of this.queue) {
			for (const file of change.files) {
				const cache = this.app.metadataCache.getFileCache(file);
				const before = { ...(cache?.frontmatter ?? {}) };
				delete before['position'];

				// Start from previous "after" if this file was already changed
				const existing = diffs.get(file.path);
				const base = existing ? { ...existing.after } : { ...before };
				let currentNewPath = existing?.newPath;

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
					} else if (key === RENAME_FILE) {
						const newName = value as string;
						currentNewPath = (currentNewPath ?? file.path).replace(file.name, newName);
					} else if (key === MOVE_FILE) {
						const targetFolder = value as string;
						const fileName = (currentNewPath ?? file.path).split('/').pop()!;
						currentNewPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;
					} else if (key !== FIND_REPLACE_CONTENT && key !== NATIVE_RENAME_PROP && key !== APPLY_TEMPLATE) {
						after[key] = value;
					}
				}

				diffs.set(file.path, {
					before: existing?.before ?? before,
					after,
					newPath: currentNewPath
				});
			}
		}

		return diffs;
	}
}
