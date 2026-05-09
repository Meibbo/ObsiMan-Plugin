import { describe, it, expect } from 'vitest';
import { evalInObsidian, TempVault } from 'obsidian-integration-testing';

describe('Explicit TempVault Test', () => {
	it('should work when creating a vault inside the test', async () => {
		const vault = await TempVault.create({
			files: {
				'test.md': '# Test content',
			},
		});

		try {
			await vault.register();

			const content = await evalInObsidian({
				vault: vault.path,
				fn: async ({ app }) => {
					const file = app.vault.getFileByPath('test.md');
					if (!file) return 'not found';
					return await app.vault.read(file);
				},
			});

			console.log('File content from Obsidian:', content);
			expect(content).toBe('# Test content');
		} finally {
			await vault.destroy();
		}
	});
});
