import { Component, Events, TFile, type App, type TAbstractFile } from 'obsidian';
import type { FilterGroup } from '../types/filter';
import type { ObsiManSession } from '../types/session';
import {
	SESSION_FM_KEY,
	SESSION_FILTERS_KEY,
	SESSION_COLUMNS_KEY,
} from '../types/session';

/** Regex to parse task list items: `- [x] [[Note Name]]` or `- [ ] [[Note Name]]` */
const TASK_LINE_RE = /^- \[([ x])\] \[\[(.+?)\]\]\s*$/;

/** Default empty filter group */
const EMPTY_FILTER: FilterGroup = { type: 'group', logic: 'all', children: [] };

/**
 * Manages reading/writing ObsiMan session .md files.
 *
 * A session file has:
 * - Frontmatter: obsiman-session, obsiman-filters, obsiman-columns
 * - Body: task list items `- [x] [[NoteName]]` representing file selection
 *
 * Provides bidirectional sync: plugin UI ↔ session file on disk.
 */
export class SessionFileService extends Component {
	private app: App;
	private events = new Events();

	/** Currently watched file */
	private watchedFile: TFile | null = null;

	/** Timestamp of last write performed by this service (write-loop prevention) */
	private lastWriteTime = 0;

	/** Debounce timeout ID for file-change events */
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;

	/** Debounce interval in ms */
	private readonly DEBOUNCE_MS = 500;

	/** Write-loop guard window in ms */
	private readonly WRITE_GUARD_MS = 1000;

	constructor(app: App) {
		super();
		this.app = app;
	}

	onunload(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}

	onload(): void {
		// Listen to vault file modifications for watched session file
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (
					this.watchedFile &&
					file.path === this.watchedFile.path &&
					Date.now() - this.lastWriteTime > this.WRITE_GUARD_MS
				) {
					this.debouncedEmit();
				}
			})
		);

		// Handle file deletion
		this.registerEvent(
			this.app.vault.on('delete', (file: TAbstractFile) => {
				if (this.watchedFile && file.path === this.watchedFile.path) {
					this.watchedFile = null;
					this.events.trigger('file-changed', null);
				}
			})
		);

		// Handle file rename
		this.registerEvent(
			this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
				if (this.watchedFile && oldPath === this.watchedFile.path) {
					if (file instanceof TFile) {
						this.watchedFile = file;
					}
				}
			})
		);
	}

	// --- Event system ---

	on(name: 'file-changed', callback: (session: ObsiManSession | null) => void): void {
		this.events.on(name, callback as (...data: unknown[]) => unknown);
	}

	off(name: 'file-changed', callback: (session: ObsiManSession | null) => void): void {
		this.events.off(name, callback as (...data: unknown[]) => unknown);
	}

	// --- File watching ---

	/** Start watching a session file for external changes */
	watchFile(file: TFile): void {
		this.watchedFile = file;
	}

	/** Stop watching */
	unwatchFile(): void {
		this.watchedFile = null;
	}

	get currentFile(): TFile | null {
		return this.watchedFile;
	}

	// --- Read ---

	/** Parse a session file into an ObsiManSession */
	async loadFromFile(file: TFile): Promise<ObsiManSession> {
		const content = await this.app.vault.read(file);
		return this.parseSessionContent(content);
	}

	/** Parse raw markdown content into an ObsiManSession */
	parseSessionContent(content: string): ObsiManSession {
		const { frontmatter, body } = this.splitFrontmatter(content);

		// Parse filters from frontmatter
		const filters: FilterGroup = frontmatter[SESSION_FILTERS_KEY]
			? this.parseFilterGroup(frontmatter[SESSION_FILTERS_KEY])
			: { ...EMPTY_FILTER };

		// Parse columns
		const columns: string[] = Array.isArray(frontmatter[SESSION_COLUMNS_KEY])
			? (frontmatter[SESSION_COLUMNS_KEY] as string[])
			: [];

		// Parse task list
		const selectedPaths = new Set<string>();
		const allPaths: string[] = [];

		for (const line of body.split('\n')) {
			const match = line.match(TASK_LINE_RE);
			if (match) {
				const isChecked = match[1] === 'x';
				const noteName = match[2];
				// Resolve note name to file path
				const resolved = this.resolveNotePath(noteName);
				if (resolved) {
					allPaths.push(resolved);
					if (isChecked) {
						selectedPaths.add(resolved);
					}
				}
			}
		}

		return { filters, columns, selectedPaths, allPaths };
	}

	// --- Write ---

	/** Write a full session back to its file */
	async saveToFile(file: TFile, session: ObsiManSession): Promise<void> {
		const content = this.buildSessionContent(session);
		this.lastWriteTime = Date.now();
		await this.app.vault.modify(file, content);
	}

	/** Create a new session file in +/ */
	async createSessionFile(
		name: string,
		filters: FilterGroup,
		columns: string[],
		files: TFile[]
	): Promise<TFile> {
		const session: ObsiManSession = {
			filters,
			columns,
			selectedPaths: new Set(),
			allPaths: files.map((f) => f.path),
		};

		const content = this.buildSessionContent(session);
		const path = `+/${name}.md`;
		const file = await this.app.vault.create(path, content);
		return file;
	}

	/** Update only the checkbox state in the session file without rewriting filters/columns */
	async syncSelectionToFile(
		file: TFile,
		selectedPaths: Set<string>
	): Promise<void> {
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');
		const updatedLines: string[] = [];

		for (const line of lines) {
			const match = line.match(TASK_LINE_RE);
			if (match) {
				const noteName = match[2];
				const resolved = this.resolveNotePath(noteName);
				if (resolved) {
					const checked = selectedPaths.has(resolved) ? 'x' : ' ';
					updatedLines.push(`- [${checked}] [[${noteName}]]`);
					continue;
				}
			}
			updatedLines.push(line);
		}

		this.lastWriteTime = Date.now();
		await this.app.vault.modify(file, updatedLines.join('\n'));
	}

	/**
	 * Regenerate the task list body from a new set of filtered files,
	 * preserving checkbox state for files that were already listed.
	 */
	async refreshFileList(
		file: TFile,
		filteredFiles: TFile[],
		currentSelected: Set<string>
	): Promise<void> {
		const content = await this.app.vault.read(file);
		const { frontmatterRaw } = this.splitRaw(content);

		// Build new task list
		const taskLines = filteredFiles.map((f) => {
			const checked = currentSelected.has(f.path) ? 'x' : ' ';
			return `- [${checked}] [[${f.basename}]]`;
		});

		const newContent = frontmatterRaw + '\n' + taskLines.join('\n') + '\n';
		this.lastWriteTime = Date.now();
		await this.app.vault.modify(file, newContent);
	}

	/** Update the filter tree in the session file's frontmatter */
	async syncFiltersToFile(file: TFile, filters: FilterGroup): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			fm[SESSION_FILTERS_KEY] = this.serializeFilterGroup(filters);
		});
		this.lastWriteTime = Date.now();
	}

	/** Update the column list in the session file's frontmatter */
	async syncColumnsToFile(file: TFile, columns: string[]): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			fm[SESSION_COLUMNS_KEY] = columns;
		});
		this.lastWriteTime = Date.now();
	}

	// --- List session files ---

	/** Find all .md files with obsiman-session: true */
	getSessionFiles(): TFile[] {
		return this.app.vault.getMarkdownFiles().filter((file) => {
			const cache = this.app.metadataCache.getFileCache(file);
			return cache?.frontmatter?.[SESSION_FM_KEY] === true;
		});
	}

	/**
	 * Detect Google Drive conflict files near the watched session file.
	 * Scopes search to the parent folder instead of scanning the full vault.
	 * Pattern: "filename (conflict YYYY-MM-DD-HH-MM-SS).md"
	 */
	detectConflicts(): TFile[] {
		if (!this.watchedFile) return [];
		const baseName = this.watchedFile.basename;
		const parent = this.watchedFile.parent;
		if (!parent) return [];

		const conflicts: TFile[] = [];
		for (const child of parent.children) {
			if (!(child instanceof TFile)) continue;
			if (child.path === this.watchedFile.path) continue;
			if (child.extension !== 'md') continue;
			if (child.basename.startsWith(baseName) &&
				/\(conflict \d{4}-\d{2}-\d{2}/.test(child.basename)) {
				conflicts.push(child);
			}
		}
		return conflicts;
	}

	/** Get sync status for the current session file */
	getSyncStatus(): 'synced' | 'external' | 'conflict' | 'none' {
		if (!this.watchedFile) return 'none';
		if (this.detectConflicts().length > 0) return 'conflict';
		// If a file-changed event fired but we didn't write it, it was external
		return 'synced';
	}

	// --- Internal helpers ---

	private debouncedEmit(): void {
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => {
			void (async () => {
				if (!this.watchedFile) return;
				try {
					const session = await this.loadFromFile(this.watchedFile);
					this.events.trigger('file-changed', session);
				} catch {
					// File may have been deleted or corrupted
					this.events.trigger('file-changed', null);
				}
			})();
		}, this.DEBOUNCE_MS);
	}

	/** Resolve a note name (from wikilink) to a file path */
	private resolveNotePath(noteName: string): string | null {
		// Strip display text from aliased links: [[path|display]]
		const barIdx = noteName.indexOf('|');
		const linkTarget = barIdx !== -1 ? noteName.substring(0, barIdx) : noteName;

		const file = this.app.metadataCache.getFirstLinkpathDest(linkTarget, '');
		return file?.path ?? null;
	}

	/** Split content into frontmatter object and body string */
	private splitFrontmatter(content: string): {
		frontmatter: Record<string, unknown>;
		body: string;
	} {
		const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
		if (!fmMatch) {
			return { frontmatter: {}, body: content };
		}

		// Use metadataCache-like parsing: simple key-value extraction
		// For complex YAML we rely on Obsidian's processFrontMatter for writes
		const fmRaw = fmMatch[1];
		const body = fmMatch[2];

		// Parse YAML-like frontmatter manually for read (avoid external dependency)
		// We only need obsiman-specific keys which are simple types
		const frontmatter: Record<string, unknown> = {};
		try {
			// Simple line-based parsing for our known keys
			const lines = fmRaw.split('\n');
			let currentKey = '';
			let currentValue: unknown = undefined;
			let inArray = false;

			for (const line of lines) {
				const keyMatch = line.match(/^(\w[\w-]*?):\s*(.*)$/);
				if (keyMatch) {
					// Save previous key
					if (currentKey && currentValue !== undefined) {
						frontmatter[currentKey] = currentValue;
					}
					currentKey = keyMatch[1];
					const val = keyMatch[2].trim();
					if (val === '' || val === '|' || val === '>') {
						currentValue = undefined;
						inArray = false;
					} else if (val.startsWith('[') && val.endsWith(']')) {
						// Inline array: [a, b, c]
						currentValue = val
							.slice(1, -1)
							.split(',')
							.map((s) => s.trim())
							.filter((s) => s.length > 0);
						inArray = false;
					} else if (val === 'true') {
						currentValue = true;
						inArray = false;
					} else if (val === 'false') {
						currentValue = false;
						inArray = false;
					} else {
						currentValue = val;
						inArray = false;
					}
				} else if (line.match(/^\s+-\s+/)) {
					// Array item
					const itemVal = line.replace(/^\s+-\s+/, '').trim();
					if (!inArray) {
						currentValue = [];
						inArray = true;
					}
					if (Array.isArray(currentValue)) {
						currentValue.push(itemVal);
					}
				}
			}
			if (currentKey && currentValue !== undefined) {
				frontmatter[currentKey] = currentValue;
			}
		} catch {
			// Fallback: return empty frontmatter, body is the full content
		}

		return { frontmatter, body };
	}

	/** Split content into raw frontmatter block (including ---) and body */
	private splitRaw(content: string): { frontmatterRaw: string; body: string } {
		const fmMatch = content.match(/^(---\n[\s\S]*?\n---)\n?([\s\S]*)$/);
		if (!fmMatch) {
			return { frontmatterRaw: '', body: content };
		}
		return { frontmatterRaw: fmMatch[1], body: fmMatch[2] };
	}

	/** Build full markdown content from a session */
	private buildSessionContent(session: ObsiManSession): string {
		const fm = [
			'---',
			`${SESSION_FM_KEY}: true`,
			`${SESSION_FILTERS_KEY}:`,
			...this.serializeFilterGroupYaml(session.filters, 1),
			`${SESSION_COLUMNS_KEY}: [${session.columns.join(', ')}]`,
			'---',
			'',
		];

		const tasks = session.allPaths.map((path) => {
			const file = this.app.vault.getAbstractFileByPath(path);
			const name = (file instanceof TFile) ? file.basename : path.replace(/\.md$/, '');
			const checked = session.selectedPaths.has(path) ? 'x' : ' ';
			return `- [${checked}] [[${name}]]`;
		});

		return fm.join('\n') + tasks.join('\n') + '\n';
	}

	/** Parse a raw frontmatter object into a FilterGroup */
	private parseFilterGroup(raw: unknown): FilterGroup {
		if (!raw || typeof raw !== 'object') return { ...EMPTY_FILTER };

		const obj = raw as Record<string, unknown>;
		return {
			type: 'group',
			logic: (obj.logic as 'all' | 'any' | 'none') ?? 'all',
			children: Array.isArray(obj.children)
				? obj.children.map((c: unknown) => this.parseFilterNode(c))
				: [],
		};
	}

	private parseFilterNode(raw: unknown): import('../types/filter').FilterNode {
		if (!raw || typeof raw !== 'object') {
			return { type: 'rule', filterType: 'has_property', property: '', values: [] };
		}
		const obj = raw as Record<string, unknown>;
		if (obj.type === 'group') {
			return this.parseFilterGroup(obj);
		}
		return {
			type: 'rule',
			filterType: (obj.filterType as string) ?? 'has_property',
			property: (obj.property as string) ?? '',
			values: Array.isArray(obj.values) ? obj.values.map(String) : [],
		} as import('../types/filter').FilterRule;
	}

	/** Serialize a FilterGroup for frontmatter storage */
	private serializeFilterGroup(group: FilterGroup): Record<string, unknown> {
		return {
			type: 'group',
			logic: group.logic,
			children: group.children.map((child) => {
				if (child.type === 'group') {
					return this.serializeFilterGroup(child);
				}
				return {
					type: 'rule',
					filterType: child.filterType,
					property: child.property,
					values: child.values,
				};
			}),
		};
	}

	/** Serialize a FilterGroup to YAML lines with indentation */
	private serializeFilterGroupYaml(group: FilterGroup, indent: number): string[] {
		const pad = '  '.repeat(indent);
		const lines: string[] = [];
		lines.push(`${pad}type: group`);
		lines.push(`${pad}logic: ${group.logic}`);
		lines.push(`${pad}children:`);

		for (const child of group.children) {
			if (child.type === 'group') {
				lines.push(`${pad}  -`);
				lines.push(
					...this.serializeFilterGroupYaml(child, indent + 2)
				);
			} else {
				lines.push(`${pad}  - type: rule`);
				lines.push(`${pad}    filterType: ${child.filterType}`);
				lines.push(`${pad}    property: ${child.property}`);
				lines.push(
					`${pad}    values: [${child.values.join(', ')}]`
				);
			}
		}

		return lines;
	}
}
