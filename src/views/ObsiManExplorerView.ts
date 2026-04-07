import { ItemView, setIcon, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { PropertyExplorerComponent } from '../components/PropertyExplorerComponent';

export const OBSIMAN_EXPLORER_VIEW_TYPE = 'obsiman-explorer';

export class ObsiManExplorerView extends ItemView {
	private plugin: ObsiManPlugin;
	private explorer!: PropertyExplorerComponent;

	constructor(leaf: WorkspaceLeaf, plugin: ObsiManPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string { return OBSIMAN_EXPLORER_VIEW_TYPE; }
	getDisplayText(): string { return 'ObsiMan Properties'; }
	getIcon(): string { return 'obsiman-icon'; }

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-explorer-view');

		// Toolbar
		const toolbar = contentEl.createDiv({ cls: 'obsiman-props-toolbar' });
		const addBtn = (icon: string, label: string, onClick: (e: MouseEvent) => void) => {
			const btn = toolbar.createDiv({ cls: 'clickable-icon', attr: { 'aria-label': label } });
			setIcon(btn, icon);
			btn.addEventListener('click', onClick);
		};
		addBtn('lucide-search', 'Search', () => this.explorer.toggleSearch());
		addBtn('lucide-list-filter', 'Filter', (e) => this.explorer.showFilterMenu(e));
		addBtn('lucide-arrow-up-down', 'Sort', (e) => this.explorer.showSortMenu(e));
		addBtn('lucide-plus', 'Create property', () => this.explorer.openCreateProperty());

		const explorerContainer = contentEl.createDiv({ cls: 'obsiman-props-explorer-wrap' });
		this.explorer = new PropertyExplorerComponent(explorerContainer, this.plugin, {
			defaultScope: 'filtered',
			onPropertyFilter: (property, value) => {
				void this.applyFilterToBaseFile(property, value);
			},
		});
		this.explorer.render();

		const filterChanged = () => this.explorer.render();
		this.plugin.filterService.on('changed', filterChanged);
		this.register(() => this.plugin.filterService.off('changed', filterChanged));
	}

	async onClose(): Promise<void> {
		this.explorer?.destroy();
		this.contentEl.empty();
	}

	private async applyFilterToBaseFile(property: string, value: string): Promise<void> {
		const path = this.plugin.settings.basesLastUsedPath;
		if (!path) return;

		const tfile = this.plugin.app.vault.getFileByPath(path);
		if (!tfile) return;

		const content = await this.plugin.app.vault.read(tfile);
		const updated = patchBasesFilter(content, property, value);
		await this.plugin.app.vault.modify(tfile, updated);
	}
}

/**
 * Minimal patcher: adds/replaces an ObsiMan-managed filter condition in a .base YAML file.
 * Looks for a line starting with `# obsiman:` or appends to the filters.and array.
 */
function patchBasesFilter(content: string, property: string, value: string): string {
	const expression = buildFilterExpression(property, value);
	const sentinel = '# obsiman-filter:';
	const newLine = `  ${sentinel} ${expression}`;

	const lines = content.split('\n');

	// Replace existing obsiman-filter line if present
	const existingIdx = lines.findIndex(l => l.includes(sentinel));
	if (existingIdx >= 0) {
		lines[existingIdx] = newLine;
		return lines.join('\n');
	}

	// Otherwise insert after `filters:` or `  and:` block, or append before `views:`
	const viewsIdx = lines.findIndex(l => /^views:/.test(l.trim()));
	if (viewsIdx >= 0) {
		lines.splice(viewsIdx, 0, newLine);
	} else {
		lines.push(newLine);
	}
	return lines.join('\n');
}

function buildFilterExpression(property: string, value: string): string {
	if (property === 'tags') return `file.hasTag("${value}")`;
	if (property === 'folder') return `file.folder == "${value}"`;
	return `${property} == "${value}"`;
}
