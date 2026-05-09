import { beforeAll } from 'vitest';
import { registerVault } from 'obsidian-integration-testing';

beforeAll(async () => {
	// No-op for now, just to see if it's loaded
	console.log('Integration setup loaded');
});
