import { describe, it, expect } from 'vitest';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import type { App } from 'obsidian';
import type { OpsLogRecord } from '../../src/services/perfMeter';

interface ExtendedApp extends App {
	plugins: {
		enabledPlugins: Set<string>;
		plugins: Record<string, any>;
	};
}

describe('Vaultman Performance Integration', () => {
	const vault = getTempVault();

	it('should have boot performance marks in OpsLogService', async () => {
		const records = await evalInObsidian({
			fn: ({ app }) => {
				const extendedApp = app as ExtendedApp;
				const plugin = extendedApp.plugins.plugins.vaultman;
				if (!plugin || !plugin.opsLogService) return [];
				return plugin.opsLogService.getRecords() as OpsLogRecord[];
			},
			vaultPath: vault.path,
		});

		expect(records.length).toBeGreaterThan(0);

		const labels = records.map((r) => r.label);
		expect(labels).toContain('vaultman:boot:start');
		expect(labels).toContain('vaultman:boot:settings-loaded');
		expect(labels).toContain('vaultman:boot:index-refresh:start');
		expect(labels).toContain('vaultman:boot:index-refresh:end');
		expect(labels).toContain('vaultman:boot:end');

		const startMark = records.find((r) => r.label === 'vaultman:boot:start');
		const endMark = records.find((r) => r.label === 'vaultman:boot:end');

		if (startMark && endMark) {
			const duration = endMark.ts - startMark.ts;
			console.log(`Plugin boot duration: ${duration}ms`);
			// We don't assert a strict limit here yet because it depends on the environment
			// but we verify the data is present and sane.
			expect(duration).toBeGreaterThanOrEqual(0);
		}
	});

	it('should measure index refresh duration', async () => {
		const records = await evalInObsidian({
			fn: ({ app }) => {
				const extendedApp = app as ExtendedApp;
				const plugin = extendedApp.plugins.plugins.vaultman;
				if (!plugin || !plugin.opsLogService) return [];
				return plugin.opsLogService.getRecords() as OpsLogRecord[];
			},
			vaultPath: vault.path,
		});

		const startMark = records.find((r) => r.label === 'vaultman:boot:index-refresh:start');
		const endMark = records.find((r) => r.label === 'vaultman:boot:index-refresh:end');

		if (startMark && endMark) {
			const duration = endMark.ts - startMark.ts;
			console.log(`Index refresh duration: ${duration}ms`);
			expect(duration).toBeGreaterThanOrEqual(0);
		} else {
			throw new Error('Index refresh marks not found');
		}
	});
});
