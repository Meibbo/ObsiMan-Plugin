import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const obsidianMockPath = fileURLToPath(
	new URL('./test/helpers/obsidian-mocks.ts', import.meta.url),
);

export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'integration',
					fileParallelism: false,
					environment: 'node',
					include: ['test/integration/**/*.test.ts'],
					globalSetup: ['obsidian-integration-testing/vitest-global-setup'],
					testTimeout: 60_000,
					hookTimeout: 60_000,
				},
			},
			{
				extends: true,
				plugins: [svelte()],
				test: {
					name: 'unit',
					environment: 'node',
					include: ['test/unit/**/*.test.ts'],
					alias: {
						obsidian: obsidianMockPath,
					},
					coverage: {
						provider: 'v8',
						reporter: ['text', 'html'],
						include: ['src/utils/**', 'src/logic/**', 'src/services/**'],
						exclude: [
							'**/*-WIP*',
							'**/*_WIP*',
							'**/*.svelte',
							'src/services/serviceLayout-WIP.svelte.ts',
							'src/services/serviceNavigation-WIP.svelte.ts',
							'src/services/serviceStats-WIP.svelte.ts',
							'src/services/serviceDecorate_WIP.ts',
							'src/logic/logicQueue.ts',
							'src/logic/logicFilters.ts',
						],
						thresholds: {
							lines: 60,
							functions: 65,
							branches: 55,
							statements: 60,
						},
					},
				},
			},
		],
	},
});
