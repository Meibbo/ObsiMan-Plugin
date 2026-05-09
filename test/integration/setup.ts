import { beforeAll } from 'vitest';
import { registerVault } from 'obsidian-integration-testing';

beforeAll(async () => {
	// Register the current directory as a vault (if not already registered)
	// so that evalInObsidian can find the "active" vault during tests.
	await registerVault(process.cwd());
	console.log('Integration setup: Vault registered at', process.cwd());
});
