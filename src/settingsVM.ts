import { PluginSettingTab, type App } from 'obsidian';
import { mount, unmount, type Component } from 'svelte';
import type { iVaultmanPlugin } from './types/typeSettings';
import SettingsUI from './components/settings/SettingsUI.svelte';

export class VaultmanSettingsTab extends PluginSettingTab {
	private plugin: iVaultmanPlugin;
	private svelteApp: ReturnType<typeof mount> | null = null;

	constructor(app: App, plugin: iVaultmanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.svelteApp = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target: containerEl,
			props: { plugin: this.plugin },
		});
	}

	hide(): void {
		if (this.svelteApp) {
			void unmount(this.svelteApp);
			this.svelteApp = null;
		}
	}
}
