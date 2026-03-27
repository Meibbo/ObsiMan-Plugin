import { Component, Events, parseYaml, stringifyYaml, type App, type TFile } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import type {
	BaseFileConfig,
	BaseFileView,
	BaseFileSort,
	RawBaseFile,
	RawBaseView,
} from '../types/base-file';
import { BaseFilterParser } from './BaseFilterParser';

/**
 * Service for reading/writing .base YAML files and syncing with the plugin grid.
 *
 * Bidirectional sync:
 * - Base → Plugin: on load + vault file change
 * - Plugin → Base: on grid sort/resize/column change (debounced)
 */
export class BaseFileService extends Component {
	private app: App;
	private plugin: ObsiManPlugin;
	private parser = new BaseFilterParser();
	private watchedFile: TFile | null = null;
	private writeTimer: ReturnType<typeof setTimeout> | null = null;

	/** Events: 'config-changed' fires when .base file is loaded or changes externally */
	readonly events = new Events();

	/** Currently loaded config */
	private config: BaseFileConfig | null = null;

	/** Raw YAML data preserved for round-trip writing */
	private rawData: RawBaseFile | null = null;

	constructor(app: App, plugin: ObsiManPlugin) {
		super();
		this.app = app;
		this.plugin = plugin;
	}

	onload(): void {
		// Watch for vault file modifications
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (this.watchedFile && file.path === this.watchedFile.path) {
					void this.reloadFromFile();
				}
			})
		);

		// Load initial .base file if configured
		const basePath = this.plugin.settings.baseFilePath;
		if (basePath) {
			void this.loadBaseFile(basePath);
		}
	}

	onunload(): void {
		if (this.writeTimer) clearTimeout(this.writeTimer);
		this.watchedFile = null;
	}

	/** Get the currently loaded config */
	getConfig(): BaseFileConfig | null {
		return this.config;
	}

	/** Get a specific view by name */
	getView(name: string): BaseFileView | undefined {
		return this.config?.views.find((v) => v.name === name);
	}

	/** Get the first table view (most common use case for grid sync) */
	getFirstTableView(): BaseFileView | undefined {
		return this.config?.views.find((v) => v.type === 'table');
	}

	/** Load and parse a .base file */
	async loadBaseFile(path: string): Promise<BaseFileConfig | null> {
		const file = this.app.vault.getFileByPath(path);
		if (!file) {
			console.warn(`ObsiMan: .base file not found at ${path}`);
			this.config = null;
			this.rawData = null;
			this.watchedFile = null;
			return null;
		}

		this.watchedFile = file;
		return this.reloadFromFile();
	}

	private async reloadFromFile(): Promise<BaseFileConfig | null> {
		if (!this.watchedFile) return null;

		try {
			const content = await this.app.vault.read(this.watchedFile);
			const raw = parseYaml(content) as RawBaseFile;
			this.rawData = raw;
			this.config = this.parseRawConfig(raw);
			this.events.trigger('config-changed', this.config);
			return this.config;
		} catch (err) {
			console.error('ObsiMan: Failed to parse .base file', err);
			this.config = null;
			this.rawData = null;
			return null;
		}
	}

	/** Parse raw YAML into structured config */
	private parseRawConfig(raw: RawBaseFile): BaseFileConfig {
		const globalFilters = raw.filters
			? this.parser.parseFilterBlock(raw.filters)
			: null;

		const views: BaseFileView[] = (raw.views ?? [])
			.filter((v) => v.type === 'table')
			.map((v) => this.parseRawView(v));

		return { globalFilters, views };
	}

	private parseRawView(raw: RawBaseView): BaseFileView {
		// Extract columns from order, filtering out formula.* entries
		const columns = (raw.order ?? []).filter(
			(col) => !col.startsWith('formula.')
		);

		// Parse sort
		const sort: BaseFileSort[] = (raw.sort ?? []).map((s) => ({
			property: s.property,
			direction: s.direction?.toLowerCase() === 'desc' ? 'desc' : 'asc',
		}));

		// Column widths
		const columnWidths: Record<string, number> = {};
		if (raw.columnSize) {
			for (const [key, val] of Object.entries(raw.columnSize)) {
				// .base uses note.property format; strip the note. prefix
				const cleanKey = key.replace(/^note\./, '');
				columnWidths[cleanKey] = val;
			}
		}

		// Parse per-view filters
		const filters = raw.filters
			? this.parser.parseFilterBlock(raw.filters)
			: null;

		return {
			name: raw.name,
			type: raw.type,
			filters,
			columns,
			sort,
			columnWidths,
		};
	}

	// --- Plugin → Base sync (debounced writes) ---

	/** Update columns for the first table view and write back */
	updateColumns(columns: string[]): void {
		if (!this.rawData?.views) return;
		const tableView = this.rawData.views.find((v) => v.type === 'table');
		if (!tableView) return;
		tableView.order = columns;
		this.scheduleWrite();
	}

	/** Update sort for the first table view and write back */
	updateSort(column: string, direction: 'asc' | 'desc'): void {
		if (!this.rawData?.views) return;
		const tableView = this.rawData.views.find((v) => v.type === 'table');
		if (!tableView) return;
		tableView.sort = [{ property: column, direction: direction.toUpperCase() }];
		this.scheduleWrite();
	}

	/** Update column widths for the first table view and write back */
	updateColumnWidths(widths: Record<string, number>): void {
		if (!this.rawData?.views) return;
		const tableView = this.rawData.views.find((v) => v.type === 'table');
		if (!tableView) return;
		// Restore note. prefix to match .base file format
		const prefixedWidths: Record<string, number> = {};
		for (const [key, val] of Object.entries(widths)) {
			prefixedWidths[`note.${key}`] = val;
		}
		tableView.columnSize = prefixedWidths;
		this.scheduleWrite();
	}

	private scheduleWrite(): void {
		if (this.writeTimer) clearTimeout(this.writeTimer);
		this.writeTimer = setTimeout(() => void this.writeToFile(), 500);
	}

	private async writeToFile(): Promise<void> {
		if (!this.watchedFile || !this.rawData) return;

		try {
			const yaml = stringifyYaml(this.rawData);
			await this.app.vault.modify(this.watchedFile, yaml);
		} catch (err) {
			console.error('ObsiMan: Failed to write .base file', err);
		}
	}
}
