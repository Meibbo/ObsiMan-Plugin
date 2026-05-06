import { App, Component, Notice, TFile, parseYaml, stringifyYaml } from 'obsidian';
import { SvelteMap } from 'svelte/reactivity';
import type {
	PendingChange,
	OperationResult,
	VirtualFileState,
	StagedOp,
	TemplateChange,
} from '../types/typeOps';
import {
	DELETE_PROP,
	RENAME_FILE,
	REORDER_ALL,
	MOVE_FILE,
	DELETE_FILE,
	FIND_REPLACE_CONTENT,
	NATIVE_RENAME_PROP,
	APPLY_TEMPLATE,
} from '../types/typeOps';
import type { IOperationQueue } from '../types/typeContracts';
import { translate } from '../index/i18n/lang';
import { getActivePerfProbe } from '../dev/perfProbe';

/**
 * Split a markdown file's raw content into its frontmatter object and body string.
 * Uses Obsidian's parseYaml for byte-exact compatibility with processFrontMatter.
 */
export function splitYamlBody(
	content: string,
	cache?: { frontmatter?: { position?: { start: { offset: number }; end: { offset: number } } } },
): {
	fm: Record<string, unknown>;
	body: string;
} {
	// 1. Precise split using Obsidian's cache if available
	const pos = cache?.frontmatter?.position;
	if (pos && pos.start && pos.end) {
		const fmSource = content.slice(pos.start.offset, pos.end.offset);
		const body = content.slice(pos.end.offset);

		// Strip leading/trailing delimiters from source before parsing
		const yamlMatch = fmSource.match(/^---\r?\n([\s\S]*?)\r?\n---$/);
		const yaml = yamlMatch ? yamlMatch[1] : fmSource.replace(/^---\n?/, '').replace(/\n?---$/, '');

		try {
			const fm = parseYaml(yaml) as Record<string, unknown> | null;
			return { fm: fm ?? {}, body };
		} catch {
			// Fallback if parse fails
		}
	}

	// 2. Manual fallback using a safer line-by-line approach
	const lines = content.split(/\r?\n/);
	if (lines.length > 0 && lines[0] === '---') {
		let endIdx = -1;
		for (let i = 1; i < lines.length; i++) {
			if (lines[i] === '---' || lines[i] === '...') {
				endIdx = i;
				break;
			}
		}

		if (endIdx !== -1) {
			const yaml = lines.slice(1, endIdx).join('\n');
			const body = lines.slice(endIdx + 1).join('\n');
			try {
				const fm = parseYaml(yaml) as Record<string, unknown> | null;
				return { fm: fm ?? {}, body };
			} catch {
				// Fallback to empty fm
			}
		}
	}

	return { fm: {}, body: content };
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

function tagOpKind(action: string): StagedOp['kind'] {
	if (action === 'delete') return 'delete_tag';
	if (action === 'add') return 'add_tag';
	return 'set_tag';
}

/**
 * Manages the queue of pending property operations.
 * All operations are staged first, then executed atomically on user confirmation.
 *
 * Port of Python's pending_changes list + _execute_queue_internal().
 */
export class OperationQueueService extends Component implements IOperationQueue {
	private app: App;

	// SvelteMap provides fine-grained reactivity out of the box.
	readonly transactions = new SvelteMap<string, VirtualFileState>();

	// Lock mechanism to prevent race conditions when multiple operations hydrate the same file concurrently.
	private loadingLocks = new Map<string, Promise<VirtualFileState>>();
	private listeners = new Map<'changed', Set<() => void>>();

	private opCounter = 0;
	private changeCounter = 0;

	/**
	 * Reactive list of pending changes (rune-backed).
	 */
	pending = $state<PendingChange[]>([]);

	get size(): number {
		return this.logicalOpCount;
	}

	constructor(app: App) {
		super();
		this.app = app;
	}

	on(event: 'changed', callback: () => void): () => void {
		const listeners = this.listeners.get(event) ?? new Set<() => void>();
		listeners.add(callback);
		this.listeners.set(event, listeners);
		return () => listeners.delete(callback);
	}

	off(event: 'changed', callback: () => void): void {
		this.listeners.get(event)?.delete(callback);
	}

	private emitChanged(): void {
		for (const callback of this.listeners.get('changed') ?? []) callback();
	}

	/** Back-compat shim — some UI code iterates the array. Returns empty for now. */
	get queue(): PendingChange[] {
		return [];
	}

	onUpdate(callback: () => void): () => void {
		return this.subscribe(callback);
	}

	subscribe(cb: () => void): () => void {
		return this.on('changed', cb);
	}

	/** Remove a staged op by its op ID across all file transactions. */
	remove(id: string): void {
		for (const [path, vfs] of this.transactions) {
			if (vfs.ops.some((o) => o.id === id || o.changeId === id)) {
				this.removeOp(path, id, true);
			}
		}
	}

	/**
	 * Get existing VFS for file.path, or read from disk and create a new one.
	 * Uses loadingLocks to prevent race conditions during concurrent hydration.
	 */
	private async getOrCreateVFS(file: TFile, requireBody: boolean): Promise<VirtualFileState> {
		const key = file.path;

		const activeLock = this.loadingLocks.get(key);
		if (activeLock) return activeLock;

		const existing = this.transactions.get(key);
		if (existing) {
			if (requireBody && !existing.bodyLoaded) {
				return this.hydrateWithLock(existing);
			}
			return existing;
		}

		const promise = Promise.resolve().then(async () => {
			try {
				let vfs: VirtualFileState;
				if (!requireBody) {
					const cache = this.app.metadataCache.getFileCache(file);
					const fmCopy = { ...cache?.frontmatter };
					delete fmCopy['position'];
					vfs = {
						file,
						originalPath: key,
						newPath: undefined,
						fm: { ...fmCopy },
						body: '',
						ops: [],
						fmInitial: { ...fmCopy },
						bodyInitial: '',
						bodyLoaded: false,
					};
				} else {
					const content = await this.app.vault.read(file);
					const cache = this.app.metadataCache.getFileCache(file);
					const { fm, body } = splitYamlBody(content, cache ?? undefined);
					vfs = {
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
				}
				this.transactions.set(key, vfs);
				return vfs;
			} finally {
				this.loadingLocks.delete(key);
			}
		});

		this.loadingLocks.set(key, promise);
		return promise;
	}

	private async hydrateWithLock(vfs: VirtualFileState): Promise<VirtualFileState> {
		const key = vfs.file.path;
		const activeLock = this.loadingLocks.get(key);
		if (activeLock) return activeLock;

		const promise = Promise.resolve().then(async () => {
			try {
				await this.hydrateBody(vfs);
				return vfs;
			} finally {
				this.loadingLocks.delete(key);
			}
		});

		this.loadingLocks.set(key, promise);
		return promise;
	}

	private async hydrateBody(vfs: VirtualFileState): Promise<void> {
		const content = await this.app.vault.read(vfs.file);
		const { body } = splitYamlBody(content);
		(vfs as { bodyInitial: string }).bodyInitial = body;
		vfs.body = body;
		vfs.bodyLoaded = true;
	}

	add(change: PendingChange): void {
		this.ingest(change).catch((err) => {
			console.error('Failed to add change:', err);
		});
	}

	async addAsync(change: PendingChange): Promise<void> {
		await this.ingest(change);
	}

	async addBatch(changes: PendingChange[]): Promise<void> {
		if (changes.length === 0) return;
		for (const c of changes) {
			await this.ingest(c, false);
		}
		this.emitChanged();
	}

	private async ingest(change: PendingChange, emit = true): Promise<void> {
		const probe = getActivePerfProbe();
		if (probe) {
			await probe.measureAsync('queue.ingest', { files: change.files.length }, () =>
				this.ingestInner(change, emit),
			);
			return;
		}
		await this.ingestInner(change, emit);
	}

	private async ingestInner(change: PendingChange, emit = true): Promise<void> {
		const changeId = change.id ?? `change-${++this.changeCounter}`;
		const probe = this.probeForNativeRename(change);
		if (probe) {
			const activeProbe = getActivePerfProbe();
			if (activeProbe) {
				await activeProbe.measureAsync(
					'queue.expandNativeRename',
					{ files: change.files.length },
					() => this.expandNativeRename(change, probe.oldName, probe.newName, changeId),
				);
			} else {
				await this.expandNativeRename(change, probe.oldName, probe.newName, changeId);
			}
			if (emit) this.emitChanged();
			return;
		}

		for (const file of change.files) {
			const needsBody = this.opNeedsBody(change);
			const activeProbe = getActivePerfProbe();
			const vfs =
				(await activeProbe?.measureAsync('queue.getOrCreateVFS', { files: 1 }, () =>
					this.getOrCreateVFS(file, needsBody),
				)) ?? (await this.getOrCreateVFS(file, needsBody));
			const updates = activeProbe
				? activeProbe.measure('queue.logicFunc', { files: 1 }, () => change.logicFunc(file, vfs.fm))
				: change.logicFunc(file, vfs.fm);
			if (!updates) continue;
			if (activeProbe) {
				activeProbe.measure('queue.applyUpdates', { files: 1 }, () =>
					this.applyUpdates(vfs, change, updates, changeId),
				);
			} else {
				this.applyUpdates(vfs, change, updates, changeId);
			}
		}
		if (emit) this.emitChanged();
	}

	private probeForNativeRename(change: PendingChange): { oldName: string; newName: string } | null {
		if (change.files.length === 0) return null;
		const sample = change.logicFunc(change.files[0], {});
		if (sample && NATIVE_RENAME_PROP in sample) {
			return sample[NATIVE_RENAME_PROP] as { oldName: string; newName: string };
		}
		return null;
	}

	private opNeedsBody(change: PendingChange): boolean {
		if (change.type === 'content_replace') return true;
		if (change.type === 'template') return true;
		return false;
	}

	private applyUpdates(
		vfs: VirtualFileState,
		change: PendingChange,
		updates: Record<string, unknown>,
		changeId: string,
	): void {
		for (const [key, value] of Object.entries(updates)) {
			const op = this.translateUpdate(vfs, change, key, value, changeId);
			if (!op) continue;
			vfs.ops.push(op);
			op.apply(vfs);
		}
	}

	private translateUpdate(
		_vfs: VirtualFileState,
		change: PendingChange,
		key: string,
		value: unknown,
		changeId: string,
	): StagedOp | null {
		const id = `op-${++this.opCounter}`;
		const action = change.action;
		const details = change.details;

		if (key === DELETE_PROP) {
			const propName = value as string;
			return {
				id,
				changeId,
				property: propName,
				kind: 'delete_prop',
				action,
				details,
				apply: (v) => {
					delete v.fm[propName];
				},
			};
		}
		if (key === REORDER_ALL) {
			const ordered = value as string[];
			return {
				id,
				changeId,
				kind: 'reorder_props',
				action,
				details,
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
				id,
				changeId,
				kind: 'rename_file',
				action,
				details,
				apply: (v) => {
					v.newPath = v.originalPath.replace(v.file.name, newName);
				},
			};
		}
		if (key === MOVE_FILE) {
			const targetFolder = value as string;
			return {
				id,
				changeId,
				kind: 'move_file',
				action,
				details,
				apply: (v) => {
					v.newPath = targetFolder ? `${targetFolder}/${v.file.name}` : v.file.name;
				},
			};
		}
		if (key === DELETE_FILE) {
			return {
				id,
				changeId,
				kind: 'delete_file',
				action,
				details,
				apply: (v) => {
					v.deleted = true;
				},
			};
		}
		if (key === FIND_REPLACE_CONTENT) {
			const { pattern, replacement, isRegex, caseSensitive } = value as {
				pattern: string;
				replacement: string;
				isRegex: boolean;
				caseSensitive: boolean;
			};
			const flags = 'g' + (caseSensitive ? '' : 'i');
			const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const rx = new RegExp(escaped, flags);
			return {
				id,
				changeId,
				kind: 'find_replace_content',
				action,
				details,
				apply: (v) => {
					v.body = v.body.replace(rx, replacement);
				},
			};
		}
		if (key === APPLY_TEMPLATE) {
			const templateContent = (change as TemplateChange).templateContent;
			return {
				id,
				changeId,
				kind: 'apply_template',
				action,
				details,
				apply: (v) => {
					v.body = v.body + '\n\n' + templateContent;
				},
			};
		}
		if (key === NATIVE_RENAME_PROP) {
			return null;
		}
		if (change.type === 'tag' && key === 'tags') {
			return {
				id,
				changeId,
				tag: change.tag,
				kind: tagOpKind(change.action),
				action,
				details,
				apply: (v) => {
					v.fm.tags = value;
				},
			};
		}
		return {
			id,
			changeId,
			property: key,
			kind: 'set_prop',
			action,
			details,
			apply: (v) => {
				v.fm[key] = value;
			},
		};
	}

	private async expandNativeRename(
		change: PendingChange,
		oldName: string,
		newName: string,
		changeId: string,
	): Promise<void> {
		const allFiles = this.app.vault.getMarkdownFiles();
		for (const file of allFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm || !(oldName in fm)) continue;

			const existing = this.transactions.get(file.path);
			let vfs: VirtualFileState;
			if (existing) {
				vfs = existing;
			} else {
				const fmCopy = { ...fm };
				delete fmCopy['position'];
				vfs = {
					file,
					originalPath: file.path,
					newPath: undefined,
					fm: { ...fmCopy },
					body: '',
					ops: [],
					fmInitial: { ...fmCopy },
					bodyInitial: '',
					bodyLoaded: false,
				};
				this.transactions.set(file.path, vfs);
			}

			const id = `op-${++this.opCounter}`;
			const op: StagedOp = {
				id,
				changeId,
				property: oldName,
				kind: 'rename_prop',
				action: change.action,
				details: `${oldName} → ${newName}`,
				apply: (v) => {
					if (oldName in v.fm) {
						v.fm[newName] = v.fm[oldName];
						delete v.fm[oldName];
					}
				},
			};
			vfs.ops.push(op);
			op.apply(vfs);
		}
	}

	clear(): void {
		const hadTransactions = this.transactions.size > 0;
		this.transactions.clear();
		if (hadTransactions) this.emitChanged();
	}

	removeFile(path: string): void {
		const removed = this.transactions.delete(path);
		if (removed) this.emitChanged();
	}

	removeOp(path: string, opId: string, _silent = false): void {
		const vfs = this.transactions.get(path);
		if (!vfs) return;
		const filtered = vfs.ops.filter((o) => o.id !== opId && o.changeId !== opId);
		if (filtered.length === vfs.ops.length) return;
		if (filtered.length === 0) {
			this.transactions.delete(path);
		} else {
			vfs.fm = { ...vfs.fmInitial };
			vfs.body = vfs.bodyInitial;
			vfs.newPath = undefined;
			vfs.deleted = false;
			vfs.ops = filtered;
			for (const op of vfs.ops) op.apply(vfs);
			this.transactions.set(path, vfs);
		}
		if (!_silent) this.emitChanged();
	}

	get fileCount(): number {
		return this.transactions.size;
	}

	get opCount(): number {
		let n = 0;
		for (const v of this.transactions.values()) n += v.ops.length;
		return n;
	}

	get logicalOpCount(): number {
		const ids = new Set<string>();
		for (const v of this.transactions.values()) {
			for (const op of v.ops) {
				ids.add(op.changeId ?? op.id);
			}
		}
		return ids.size;
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

	async execute(): Promise<OperationResult> {
		const result: OperationResult = { success: 0, errors: 0, messages: [] };

		if (this.transactions.size === 0) {
			new Notice(translate('result.no_changes'));
			return result;
		}

		const entries = [...this.transactions.values()];
		const total = entries.length;
		const CHUNK = 20;
		const notice = new Notice('', 0);

		for (let i = 0; i < entries.length; i++) {
			const vfs = entries[i];
			notice.setMessage(`${translate('result.applying')} ${i + 1} / ${total}`);

			try {
				await this.commitFile(vfs);
				result.success++;
			} catch (err) {
				result.errors++;
				result.messages.push(`${vfs.originalPath}: ${String(err)}`);
			}

			if ((i + 1) % CHUNK === 0) {
				await new Promise<void>((r) => activeWindow.setTimeout(r, 0));
			}
		}

		notice.hide();
		this.transactions.clear();
		this.emitChanged();

		new Notice(
			result.errors > 0
				? translate('result.errors', { count: result.errors })
				: translate('result.success', { count: result.success }),
		);

		return result;
	}

	private async commitFile(vfs: VirtualFileState): Promise<void> {
		if (vfs.deleted) {
			await this.app.fileManager.trashFile(vfs.file);
			return;
		}

		await this.app.vault.process(vfs.file, (currentContent) => {
			if (!vfs.bodyLoaded) {
				return this.applyOpsToRawContent(currentContent, vfs);
			}
			return serializeFile(vfs.fm, vfs.body);
		});

		if (vfs.newPath && vfs.newPath !== vfs.originalPath) {
			await this.app.fileManager.renameFile(vfs.file, vfs.newPath);
		}
	}

	private applyOpsToRawContent(currentContent: string, vfs: VirtualFileState): string {
		const { fm, body } = splitYamlBody(currentContent);
		const scratch: VirtualFileState = {
			...vfs,
			fm: { ...fm },
			body,
			fmInitial: { ...fm },
			bodyInitial: body,
			bodyLoaded: true,
			ops: [],
		};
		for (const op of vfs.ops) op.apply(scratch);
		return serializeFile(scratch.fm, scratch.body);
	}

	simulateChanges(): Map<
		string,
		{ before: Record<string, unknown>; after: Record<string, unknown>; newPath?: string }
	> {
		const diffs = new Map<
			string,
			{ before: Record<string, unknown>; after: Record<string, unknown>; newPath?: string }
		>();
		for (const [path, vfs] of this.transactions) {
			diffs.set(path, {
				before: { ...vfs.fmInitial },
				after: { ...vfs.fm },
				newPath: vfs.newPath,
			});
		}
		return diffs;
	}
}
