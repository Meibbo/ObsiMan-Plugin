import { describe, it, expect, beforeAll } from 'vitest';
import { evalInObsidian, registerVault } from 'obsidian-integration-testing';

describe('Manual Register Test', () => {
	beforeAll(async () => {
		// Register the current directory as a vault (even if it's not a real one)
		// so the preflight check passes.
		await registerVault(process.cwd());
	});

	it('should pass the preflight check', async () => {
		const result = await evalInObsidian({
			fn: () => {
				return 'ok';
			},
		});
		expect(result).toBe('ok');
	});
});
