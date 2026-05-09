import { describe, it, expect, beforeAll } from 'vitest';
import { evalInObsidian, registerVault } from 'obsidian-integration-testing';
import type { App } from 'obsidian';
import path from 'node:path';

interface ExtendedApp extends App {
	plugins: {
		plugins: Record<string, any>;
	};
}

const STRESS_VAULT_PATH = path.resolve('./test/vaults/stress-vault');

describe('Vaultman Stress Test', () => {
	beforeAll(async () => {
		await registerVault(STRESS_VAULT_PATH);
		console.log('Registered stress vault at:', STRESS_VAULT_PATH);
	});

	it('should handle 10,000 files with acceptable latency', async () => {
		const metrics = await evalInObsidian({
			vault: STRESS_VAULT_PATH,
			fn: async ({ app }) => {
				const extendedApp = app as ExtendedApp;
				const plugin = extendedApp.plugins.plugins.vaultman;
				if (!plugin) return { error: 'plugin not found' };
				if (!plugin.filesIndex) {
					return {
						error: 'filesIndex missing',
						pluginKeys: Object.keys(plugin),
						allPluginProps: Object.getOwnPropertyNames(plugin),
						isPluginInitialized: typeof plugin.onload === 'function'
					};
				}

				const timings: Record<string, number> = {};
				
				const startFiles = performance.now();
				await plugin.filesIndex.refresh();
				timings.filesIndexMs = performance.now() - startFiles;

				const startProps = performance.now();
				await plugin.propsIndex.refresh();
				timings.propsIndexMs = performance.now() - startProps;

				const startTags = performance.now();
				await plugin.tagsIndex.refresh();
				timings.tagsIndexMs = performance.now() - startTags;

				return {
					fileCount: plugin.filesIndex.nodes.length,
					timings,
					refreshTimeMs: timings.filesIndexMs + timings.propsIndexMs + timings.tagsIndexMs
				};
			},
		});

		console.log('Detailed Stress Metrics:', JSON.stringify(metrics, null, 2));
		if ('error' in metrics) throw new Error(metrics.error);

		expect(metrics.fileCount).toBeGreaterThanOrEqual(10000);
		// If indexing local files takes > 3s, something is architecturally wrong (e.g. serial Object.entries/Object.fromEntries)
		expect(metrics.refreshTimeMs).toBeLessThan(3500); 
	});

	it('should maintain low search latency for FULL SCAN of 10,000 files', async () => {
		const searchMetrics = await evalInObsidian({
			vault: STRESS_VAULT_PATH,
			fn: async ({ app }) => {
				const extendedApp = app as ExtendedApp;
				const plugin = extendedApp.plugins.plugins.vaultman;
				if (!plugin) return { error: 'plugin not found' };

				const start = performance.now();
				// Use a term that forces a full scan (e.g. non-existent or regex)
				plugin.filterService.setSearchFilter('NON_EXISTENT_FILE_PATTERN_XYZ', ''); 
				const results = plugin.filterService.filteredFiles;
				const searchTime = performance.now() - start;

				return {
					resultCount: results.length,
					searchTimeMs: searchTime,
				};
			},
		});

		console.log('Full Scan Search Metrics:', JSON.stringify(searchMetrics, null, 2));
		if ('error' in searchMetrics) throw new Error(searchMetrics.error);

		// Even a full scan should be fast (O(N) with string contains is sub-millisecond for 10k)
		expect(searchMetrics.searchTimeMs).toBeLessThan(100);
	});

	it('should generate render model for 10,000 files efficiently', async () => {
		const renderMetrics = await evalInObsidian({
			fn: async ({ app }) => {
				const extendedApp = app as ExtendedApp;
				const plugin = extendedApp.plugins.plugins.vaultman;
				if (!plugin) return { error: 'plugin not found' };

				const nodes = plugin.filesIndex.nodes;
				const start = performance.now();
				
				// Simulate the work ViewService.getModel does
				const model = plugin.viewService.getModel({
					explorerId: 'files',
					mode: 'tree',
					nodes: nodes,
					operations: plugin.operationsIndex.nodes,
					activeFilters: plugin.activeFiltersIndex.nodes,
					getLabel: (n: any) => n.label
				});

				const renderTime = performance.now() - start;

				return {
					rowCount: model.rows.length,
					renderTimeMs: renderTime,
				};
			},
		});

		console.log('Render Stress Metrics:', JSON.stringify(renderMetrics, null, 2));
		if ('error' in renderMetrics) throw new Error(renderMetrics.error);

		// With pre-indexing of operations, this should be very fast.
		expect(renderMetrics.renderTimeMs).toBeLessThan(500); 
	});
});
