import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		fileParallelism: false,
		include: ['test/integration/**/*.test.ts'],
		globalSetup: ['obsidian-integration-testing/obsidian-plugin-vitest-setup'],
		testTimeout: 60_000,
		hookTimeout: 60_000,
	},
});
