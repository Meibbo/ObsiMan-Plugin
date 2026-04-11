import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { mount, unmount } from 'svelte';
import ObsiManViewSvelte from './ObsiManView.svelte';
import { translate } from '../i18n/index';

export const OBSIMAN_VIEW_TYPE = 'obsiman-view';

/**
 * Thin Obsidian ItemView shell — mounts ObsiManView.svelte into contentEl.
 * All UI logic lives in the Svelte component.
 */
export class ObsiManView extends ItemView {
	private plugin: ObsiManPlugin;
	private svelteApp: ReturnType<typeof mount> | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ObsiManPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string { return OBSIMAN_VIEW_TYPE; }
	getDisplayText(): string { return translate('plugin.name'); }
	getIcon(): string { return 'lucide-dessert'; }

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-view');

		this.svelteApp = mount(ObsiManViewSvelte, {
			target: contentEl,
			props: { plugin: this.plugin },
		});
	}

	async onClose(): Promise<void> {
		if (this.svelteApp) {
			await unmount(this.svelteApp);
			this.svelteApp = null;
		}
		this.contentEl.empty();
	}
}
