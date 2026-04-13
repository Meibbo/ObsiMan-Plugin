import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { mount, unmount } from 'svelte';
import ObsiManFrameSvelte from './ObsiManFrame.svelte';
import { translate } from '../i18n/index';

export const OBSIMAN_FRAME_TYPE = 'obsiman-frame';

/**
 * Full-width explorer view shell.
 */
export class ObsiManFrame extends ItemView {
	private plugin: ObsiManPlugin;
	private svelteApp: ReturnType<typeof mount> | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ObsiManPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string { return OBSIMAN_FRAME_TYPE; }
	getDisplayText(): string { return translate('plugin.frame_name'); }
	getIcon(): string { return 'lucide-layout-dashboard'; }

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-frame');

		this.svelteApp = mount(ObsiManFrameSvelte, {
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
