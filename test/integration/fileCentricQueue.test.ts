import { describe, it, expect } from 'vitest';
import { evalInObsidian } from 'obsidian-integration-testing';
import type { App, TFile } from 'obsidian';
import type { OperationQueueService } from '../../src/services/serviceQueue';
import type { PendingChange } from '../../src/types/typeOps';

const TEST_FILE = 'vaultman-queue-test.md';
const INITIAL_CONTENT = '---\nstatus: draft\n---\n# Test\n';

type VaultmanTestPlugin = {
	queueService: OperationQueueService;
};

function makePropertyChange(file: TFile, prop: string, val: string): PendingChange {
	return {
		type: 'property',
		files: [file],
		action: 'set',
		details: `${prop}=${val}`,
		logicFunc: () => ({ [prop]: val }),
		customLogic: false,
		property: prop,
		value: val,
	};
}

describe('File-Centric Queue', () => {
	it('collapses 2 ops on the same file into 1 entry with opCount=2', async () => {
		// Setup: create test file
		await evalInObsidian({
			args: { path: TEST_FILE, content: INITIAL_CONTENT },
			fn: async ({ app, path, content }: { app: App; path: string; content: string }) => {
				const existing = app.vault.getFileByPath(path);
				if (existing) await app.fileManager.trashFile(existing);
				await app.vault.create(path, content);
			},
		});

		// Stage 2 property ops on the same file
		const counts = await evalInObsidian({
			args: { path: TEST_FILE },
			fn: async ({ app, path }: { app: App; path: string }) => {
				const plugin = (app as App & { plugins: { plugins: { vaultman?: VaultmanTestPlugin } } })
					.plugins.plugins.vaultman;
				if (!plugin) throw new Error('vaultman plugin not found');
				const svc = plugin.queueService;
				const file = app.vault.getFileByPath(path);
				if (!file) throw new Error('test file not found');

				svc.clear(); // start fresh

				await svc.add(makePropertyChange(file, 'author', 'Alice'));
				await svc.add(makePropertyChange(file, 'version', '1.0'));

				return {
					fileCount: svc.fileCount,
					opCount: svc.opCount,
				};
			},
		});

		expect(counts.fileCount).toBe(1);
		expect(counts.opCount).toBe(2);

		// Execute and verify both properties were written
		await evalInObsidian({
			args: { path: TEST_FILE },
			fn: async ({ app }: { app: App; path: string }) => {
				const plugin = (app as App & { plugins: { plugins: { vaultman?: VaultmanTestPlugin } } })
					.plugins.plugins.vaultman;
				if (!plugin) throw new Error('vaultman plugin not found');
				await plugin.queueService.execute();
			},
		});

		const content = await evalInObsidian({
			args: { path: TEST_FILE },
			fn: async ({ app, path }: { app: App; path: string }) => {
				const file = app.vault.getFileByPath(path);
				if (!file) return '';
				return await app.vault.read(file);
			},
		});

		expect(content).toContain('author: Alice');
		expect(content).toContain('version: 1.0');

		// Cleanup
		await evalInObsidian({
			args: { path: TEST_FILE },
			fn: async ({ app, path }: { app: App; path: string }) => {
				const file = app.vault.getFileByPath(path);
				if (file) await app.fileManager.trashFile(file);
			},
		});
	});

	it('removeOp re-materializes VFS correctly', async () => {
		await evalInObsidian({
			args: { path: TEST_FILE, content: INITIAL_CONTENT },
			fn: async ({ app, path, content }: { app: App; path: string; content: string }) => {
				const existing = app.vault.getFileByPath(path);
				if (existing) await app.fileManager.trashFile(existing);
				await app.vault.create(path, content);
			},
		});

		const result = await evalInObsidian({
			args: { path: TEST_FILE },
			fn: async ({ app, path }: { app: App; path: string }) => {
				const plugin = (app as App & { plugins: { plugins: { vaultman?: VaultmanTestPlugin } } })
					.plugins.plugins.vaultman;
				if (!plugin) throw new Error('vaultman plugin not found');
				const svc = plugin.queueService;
				const file = app.vault.getFileByPath(path);
				if (!file) throw new Error('test file not found');

				svc.clear();

				await svc.add(makePropertyChange(file, 'x', '1'));
				await svc.add(makePropertyChange(file, 'y', '2'));

				// Remove the first op
				const vfs = svc.getTransaction(path);
				if (!vfs) throw new Error('missing transaction');
				const firstOpId = vfs.ops[0].id;
				svc.removeOp(path, firstOpId);

				const vfsAfter = svc.getTransaction(path);
				if (!vfsAfter) throw new Error('missing transaction after removeOp');
				return {
					opCount: svc.opCount,
					fmHasX: 'x' in vfsAfter.fm,
					fmHasY: 'y' in vfsAfter.fm,
				};
			},
		});

		expect(result.opCount).toBe(1);
		expect(result.fmHasX).toBe(false); // x was removed
		expect(result.fmHasY).toBe(true); // y remains

		// Cleanup
		await evalInObsidian({
			args: { path: TEST_FILE },
			fn: async ({ app, path }: { app: App; path: string }) => {
				const file = app.vault.getFileByPath(path);
				if (file) await app.fileManager.trashFile(file);
			},
		});
	});
});
