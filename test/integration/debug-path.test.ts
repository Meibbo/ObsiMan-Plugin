import { describe, it, expect } from 'vitest';
import { evalInObsidian } from 'obsidian-integration-testing';

describe('Vault Path Debug', () => {
	it('should show the current vault path', async () => {
		const path = await evalInObsidian({
			fn: ({ app }) => {
				return (app.vault.adapter as any).basePath;
			},
		});
		console.log('Obsidian Vault Path:', path);
		expect(path).toBeDefined();
	});
});
