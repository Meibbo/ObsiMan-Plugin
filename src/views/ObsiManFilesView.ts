import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManPlugin } from '../../main';

export const OBSIMAN_FILES_VIEW_TYPE = 'obsiman-files';

/**
 * Separate-pane Files view — scaffold for Iter.8.
 * When settings.separatePanes is true, this view hosts the Files page content.
 */
export class ObsiManFilesView extends ItemView {
	// plugin stored for Iter.8 implementation
	private readonly plugin: ObsiManPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: ObsiManPlugin) {
		super(leaf);
		this.plugin = plugin;
		void this.plugin; // suppress noUnusedLocals until Iter.8
	}

	getViewType(): string { return OBSIMAN_FILES_VIEW_TYPE; }
	getDisplayText(): string { return 'ObsiMan Files'; }
	getIcon(): string { return 'lucide-files'; }

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.createDiv({
			cls: 'obsiman-coming-soon',
			text: 'Files pane — coming in Iter.8',
		});
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}
