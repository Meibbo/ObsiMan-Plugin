import { describe, it, expect } from 'vitest';
import { evalInObsidian } from 'obsidian-integration-testing';
import { TFile } from 'obsidian';
import type { App } from 'obsidian';

/**
 * Internal interface for Obsidian's plugin manager
 */
interface ObsidianPluginManager {
    enabledPlugins: Set<string>;
    plugins: Record<string, {
        propertyIndex?: unknown;
        filterService?: unknown;
        queueService?: unknown;
    }>;
}

/**
 * Extended App interface to access internal/undocumented properties safely in tests
 */
interface ExtendedApp extends App {
    plugins: ObsidianPluginManager;
}

describe('ObsiMan Integration Tests', () => {
    it('should be loaded by Obsidian', async () => {
        const isLoaded = await evalInObsidian({
            fn: ({ app }) => {
                const extendedApp = app as ExtendedApp;
                return extendedApp.plugins.enabledPlugins.has('obsiman');
            }
        });
        expect(isLoaded).toBe(true);
    });

    it('can access the vault and create a file', async () => {
        const fileName = 'integration-test-sample.md';
        
        await evalInObsidian({
            args: { fileName },
            fn: async ({ app, fileName }) => {
                if (typeof fileName !== 'string') return;
                await app.vault.create(fileName, '# Test Content\nCreated during integration test.');
            }
        });

        const fileExists = await evalInObsidian({
            args: { fileName },
            fn: ({ app, fileName }) => {
                if (typeof fileName !== 'string') return false;
                return !!app.vault.getAbstractFileByPath(fileName);
            }
        });
        expect(fileExists).toBe(true);

        await evalInObsidian({
            args: { fileName },
            fn: async ({ app, fileName }) => {
                if (typeof fileName !== 'string') return;
                const file = app.vault.getAbstractFileByPath(fileName);
                // Use instanceof TFile instead of casting to respect linter
                if (file instanceof TFile) {
                    await app.fileManager.trashFile(file);
                }
            }
        });
    });

    it('has core services initialized', async () => {
        const services = await evalInObsidian({
            fn: ({ app }) => {
                const extendedApp = app as ExtendedApp;
                const plugin = extendedApp.plugins.plugins.obsiman;
                return {
                    propertyIndex: !!plugin?.propertyIndex,
                    filterService: !!plugin?.filterService,
                    queueService: !!plugin?.queueService
                };
            }
        });
        
        expect(services.propertyIndex).toBe(true);
        expect(services.filterService).toBe(true);
        expect(services.queueService).toBe(true);
    });
});
