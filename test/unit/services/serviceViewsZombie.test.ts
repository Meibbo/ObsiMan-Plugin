import { describe, it, expect } from 'vitest';
import { ViewService } from '../../../src/services/serviceViews.svelte';

describe('ViewService "Zombie Runes" Audit', () => {
	it("does not notify when the selection hasn't effectively changed", () => {
		const svc = new ViewService();
		const explorerId = 'test-explorer';
		let calls = 0;
		svc.subscribe(explorerId, () => {
			calls += 1;
		});

		svc.select(explorerId, 'node-1', 'add');
		svc.select(explorerId, 'node-1', 'add');

		expect(calls).toBe(1);
	});

	it('notifies subscribers for each expanded state transition', () => {
		const svc = new ViewService();
		const explorerId = 'test-explorer';
		let calls = 0;
		svc.subscribe(explorerId, () => {
			calls += 1;
		});

		svc.toggleExpanded(explorerId, 'node-1');
		svc.toggleExpanded(explorerId, 'node-1');

		expect(calls).toBe(2);
	});
});
