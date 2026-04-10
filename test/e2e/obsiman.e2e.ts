import { browser, expect } from '@wdio/globals';

describe('ObsiMan e2e', () => {
	it('loads the plugin into sandboxed Obsidian', async () => {
		const state = await browser.execute(() => {
			const app = (window as typeof window & {
				app: {
					commands: { commands: Record<string, unknown> };
					plugins: {
						enabledPlugins: Set<string>;
					};
				};
			}).app;

			return {
				enabled: app.plugins.enabledPlugins.has('obsiman'),
				commandIds: Object.keys(app.commands.commands).filter((id) => id.startsWith('obsiman:')),
			};
		});

		expect(state.enabled).toBe(true);
		expect(state.commandIds).toContain('obsiman:open-sidebar');
	});

	it('can open the sidebar view through the registered command', async () => {
		const leafCount = await browser.execute(async () => {
			const app = (window as typeof window & {
				app: {
					commands: { executeCommandById(id: string): Promise<boolean> };
					workspace: { getLeavesOfType(type: string): unknown[] };
				};
			}).app;

			await app.commands.executeCommandById('obsiman:open-sidebar');
			return app.workspace.getLeavesOfType('obsiman-view').length;
		});

		expect(leafCount).toBeGreaterThan(0);
	});
});
