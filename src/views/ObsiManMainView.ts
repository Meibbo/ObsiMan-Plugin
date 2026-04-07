import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { mount, unmount } from 'svelte';
import ObsiManMainViewSvelte from './ObsiManMainView.svelte';
import { t } from '../i18n/index';

export const OBSIMAN_MAIN_VIEW_TYPE = 'obsiman-main';

/**
 * Full-screen 3-section main view (Filters | Files grid | Operations).
 * Thin shell — all UI logic in ObsiManMainView.svelte.
 */
export class ObsiManMainView extends ItemView {
	private plugin: ObsiManPlugin;
	private svelteApp: ReturnType<typeof mount> | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ObsiManPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string { return OBSIMAN_MAIN_VIEW_TYPE; }
	getDisplayText(): string { return t('plugin.name'); }
	getIcon(): string { return 'obsiman-icon'; }

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-main-view');

		this.svelteApp = mount(ObsiManMainViewSvelte, {
			target: contentEl,
			props: { plugin: this.plugin },
		});
	}

	async onClose(): Promise<void> {
		if (this.svelteApp) {
			unmount(this.svelteApp);
			this.svelteApp = null;
		}
		this.contentEl.empty();
	}
}
