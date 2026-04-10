import type { App } from 'obsidian';
import { describe, expect, it } from 'vitest';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/obsidian-plugin-vitest-setup';

type PluginApp = App & {
	commands: { listCommands(): Array<{ id: string }> };
	plugins: {
		enabledPlugins: Set<string>;
		plugins: Record<string, { settings?: { pageOrder?: string[]; filtersShowTabLabels?: boolean } }>;
	};
};

describe('ObsiMan integrity', () => {
	const vault = getTempVault();

	it('enables the plugin and registers its commands', async () => {
		const result = await evalInObsidian({
			args: { pluginId: 'obsiman' },
			vaultPath: vault.path,
			fn: ({ app, pluginId }) => {
				const pluginApp = app as PluginApp;
				return {
					enabled: pluginApp.plugins.enabledPlugins.has(pluginId),
					commandIds: pluginApp.commands
						.listCommands()
						.map((command) => command.id)
						.filter((id) => id.startsWith(`${pluginId}:`)),
				};
			},
		});

		expect(result.enabled).toBe(true);
		expect(result.commandIds).toContain('obsiman:open-sidebar');
		expect(result.commandIds).toContain('obsiman:open-main-view');
	});

	it('loads expected defaults in the plugin settings', async () => {
		const settings = await evalInObsidian({
			args: { pluginId: 'obsiman' },
			vaultPath: vault.path,
			fn: ({ app, pluginId }) => {
				const pluginApp = app as PluginApp;
				return pluginApp.plugins.plugins[pluginId]?.settings ?? null;
			},
		});

		expect(settings).not.toBeNull();
		expect(settings?.pageOrder).toEqual(['ops', 'statistics', 'filters']);
		expect(settings?.filtersShowTabLabels).toBe(true);
	});
});
