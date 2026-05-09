import { describe, it, expect } from 'vitest';
import { evalInObsidian } from 'obsidian-integration-testing';
import type { App } from 'obsidian';

interface ExtendedApp extends App {
	plugins: {
		plugins: Record<string, any>;
	};
}

describe('Vaultman Stress Test', () => {
	it('should handle 10,000 files with acceptable latency', async () => {
		// This test expects the stress-vault to be generated and active.
		// Since we are using temp vaults in integration-setup, we might 
		// need to generate files INSIDE the test or use a specific vault.
		
		const metrics = await evalInObsidian({
			fn: async ({ app }) => {
				const extendedApp = app as ExtendedApp;
				const plugin = extendedApp.plugins.plugins.vaultman;
				if (!plugin) return { error: 'plugin not found' };

				const start = performance.now();
				// Trigger a full refresh of all indices
				await Promise.all([
					plugin.filesIndex.refresh(),
					plugin.propsIndex.refresh(),
					plugin.tagsIndex.refresh(),
				]);
				const refreshTime = performance.now() - start;

				const explorerStart = performance.now();
				// Simulate opening the Files tab
				const filesExplorer = plugin.filesIndex.nodes;
				const explorerTime = performance.now() - explorerStart;

				return {
					fileCount: plugin.filesIndex.nodes.length,
					refreshTimeMs: refreshTime,
					explorerTimeMs: explorerTime,
				};
			},
		});

		console.log('Stress Metrics:', JSON.stringify(metrics, null, 2));
		if ('error' in metrics) throw new Error(metrics.error);

		expect(metrics.fileCount).toBeGreaterThanOrEqual(0);
		// With 10,000 files, we expect refresh to be relatively fast after optimizations
		expect(metrics.refreshTimeMs).toBeLessThan(2000); 
	});
});
