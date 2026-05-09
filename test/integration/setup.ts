import { beforeAll } from 'vitest';

beforeAll(async () => {
	// Reverted manual registration to avoid conflict with global setup
	console.log('Integration setup: Global setup should handle temp vault.');
});
