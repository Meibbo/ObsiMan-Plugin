import { Component, type App, type TFile, type CachedMetadata } from 'obsidian';

/**
 * Builds and maintains a live index of all frontmatter property names
 * and their observed values across the vault.
 *
 * Replaces Python's CacheManager + available_properties dictionary.
 * Uses Obsidian's metadataCache instead of a pickle file.
 */
export class PropertyIndexService extends Component {
	/** property name → set of observed string values */
	readonly index: Map<string, Set<string>> = new Map();

	/** Total files scanned */
	fileCount = 0;

	private app: App;

	constructor(app: App) {
		super();
		this.app = app;
	}

	onload(): void {
		this.rebuild();

		// Live update on metadata changes
		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				this.updateFile(file);
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', (_file) => {
				// Full rebuild on delete (simpler than tracking per-file contributions)
				this.rebuild();
			})
		);
	}

	/** Full rebuild from all markdown files */
	rebuild(): void {
		this.index.clear();
		const files = this.app.vault.getMarkdownFiles();
		this.fileCount = files.length;

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			this.indexFrontmatter(cache);
		}
	}

	/** Incrementally update index when a single file changes */
	private updateFile(file: TFile): void {
		const cache = this.app.metadataCache.getFileCache(file);
		this.indexFrontmatter(cache);
		// Recount (file may be new)
		this.fileCount = this.app.vault.getMarkdownFiles().length;
	}

	private indexFrontmatter(cache: CachedMetadata | null): void {
		const fm = cache?.frontmatter;
		if (!fm) return;

		for (const [key, value] of Object.entries(fm)) {
			// Skip Obsidian's internal position key
			if (key === 'position') continue;

			if (!this.index.has(key)) {
				this.index.set(key, new Set());
			}
			const values = this.index.get(key)!;
			this.addValues(values, value);
		}
	}

	private addValues(target: Set<string>, value: unknown): void {
		if (value == null) return;
		if (Array.isArray(value)) {
			for (const v of value) {
				if (v != null) target.add(String(v));
			}
		} else {
			target.add(typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean | null | undefined));
		}
	}

	/** Get sorted property names for autocomplete */
	getPropertyNames(): string[] {
		return [...this.index.keys()].sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' })
		);
	}

	/** Get sorted values for a given property */
	getPropertyValues(property: string): string[] {
		const values = this.index.get(property);
		if (!values) return [];
		return [...values].sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' })
		);
	}
}
