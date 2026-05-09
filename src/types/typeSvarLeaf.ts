import { ItemView, type WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import type { VaultmanPlugin } from '../main';
import ViewSvarFileManager from '../components/views/ViewSvarFileManager.svelte';

export const TYPE_SVAR_FILEMANAGER = 'vaultman-svar-filemanager';

export class SvarFileManagerView extends ItemView {
	private plugin: VaultmanPlugin;
	private component?: Record<string, unknown>;

	constructor(leaf: WorkspaceLeaf, plugin: VaultmanPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return TYPE_SVAR_FILEMANAGER;
	}

	getDisplayText(): string {
		return 'Vaultman: SVAR filemanager';
	}

	getIcon(): string {
		return 'lucide-files';
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vm-svar-view');

		this.component = mount(ViewSvarFileManager, {
			target: contentEl,
			props: {
				plugin: this.plugin,
			},
		});
	}

	async onClose(): Promise<void> {
		if (this.component) {
			await unmount(this.component);
		}
		this.contentEl.empty();
	}
}
