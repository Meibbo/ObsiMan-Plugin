import { describe, it, expect } from 'vitest';
import { evalInObsidian } from 'obsidian-integration-testing';
import type { App } from 'obsidian';

const TEST_FILE = 'vaultman-queue-test.md';
const INITIAL_CONTENT = '---\nstatus: draft\n---\n# Test\n';

describe('File-Centric Queue', () => {
  it('collapses 2 ops on the same file into 1 entry with opCount=2', async () => {
    // Setup: create test file
    await evalInObsidian({
      args: { path: TEST_FILE, content: INITIAL_CONTENT },
      fn: async ({ app, path, content }: { app: App; path: string; content: string }) => {
        const existing = app.vault.getAbstractFileByPath(path);
        if (existing) await app.vault.delete(existing as any);
        await app.vault.create(path, content);
      }
    });

    // Stage 2 property ops on the same file
    const counts = await evalInObsidian({
      args: { path: TEST_FILE },
      fn: async ({ app, path }: { app: App; path: string }) => {
        const plugin = (app as any).plugins.plugins.vaultman;
        const svc = plugin.queueService;
        const file = app.vault.getAbstractFileByPath(path);
        if (!file) throw new Error('test file not found');

        svc.clear(); // start fresh

        const makeChange = (prop: string, val: string) => ({
          type: 'property' as const,
          files: [file],
          action: 'set',
          details: `${prop}=${val}`,
          logicFunc: (_f: any, _fm: any) => ({ [prop]: val }),
        });

        await svc.add(makeChange('author', 'Alice'));
        await svc.add(makeChange('version', '1.0'));

        return {
          fileCount: svc.fileCount,
          opCount: svc.opCount,
        };
      }
    });

    expect(counts.fileCount).toBe(1);
    expect(counts.opCount).toBe(2);

    // Execute and verify both properties were written
    await evalInObsidian({
      args: { path: TEST_FILE },
      fn: async ({ app }: { app: App; path: string }) => {
        const plugin = (app as any).plugins.plugins.vaultman;
        await plugin.queueService.execute();
      }
    });

    const content = await evalInObsidian({
      args: { path: TEST_FILE },
      fn: async ({ app, path }: { app: App; path: string }) => {
        const file = app.vault.getAbstractFileByPath(path);
        if (!file) return '';
        return await app.vault.read(file as any);
      }
    });

    expect(content).toContain('author: Alice');
    expect(content).toContain('version: 1.0');

    // Cleanup
    await evalInObsidian({
      args: { path: TEST_FILE },
      fn: async ({ app, path }: { app: App; path: string }) => {
        const file = app.vault.getAbstractFileByPath(path);
        if (file) await app.vault.delete(file as any);
      }
    });
  });

  it('removeOp re-materializes VFS correctly', async () => {
    await evalInObsidian({
      args: { path: TEST_FILE, content: INITIAL_CONTENT },
      fn: async ({ app, path, content }: { app: App; path: string; content: string }) => {
        const existing = app.vault.getAbstractFileByPath(path);
        if (existing) await app.vault.delete(existing as any);
        await app.vault.create(path, content);
      }
    });

    const result = await evalInObsidian({
      args: { path: TEST_FILE },
      fn: async ({ app, path }: { app: App; path: string }) => {
        const plugin = (app as any).plugins.plugins.vaultman;
        const svc = plugin.queueService;
        const file = app.vault.getAbstractFileByPath(path);
        if (!file) throw new Error('test file not found');

        svc.clear();

        await svc.add({ type: 'property', files: [file], action: 'set', details: 'x=1', logicFunc: () => ({ x: '1' }) });
        await svc.add({ type: 'property', files: [file], action: 'set', details: 'y=2', logicFunc: () => ({ y: '2' }) });

        // Remove the first op
        const vfs = svc.getTransaction(path);
        const firstOpId = vfs.ops[0].id;
        svc.removeOp(path, firstOpId);

        const vfsAfter = svc.getTransaction(path);
        return {
          opCount: svc.opCount,
          fmHasX: 'x' in vfsAfter.fm,
          fmHasY: 'y' in vfsAfter.fm,
        };
      }
    });

    expect(result.opCount).toBe(1);
    expect(result.fmHasX).toBe(false); // x was removed
    expect(result.fmHasY).toBe(true);  // y remains

    // Cleanup
    await evalInObsidian({
      args: { path: TEST_FILE },
      fn: async ({ app, path }: { app: App; path: string }) => {
        const file = app.vault.getAbstractFileByPath(path);
        if (file) await app.vault.delete(file as any);
      }
    });
  });
});
