import { describe, it, expect } from 'vitest';
import { ViewService } from '../../../src/services/serviceViews.svelte';

describe('ViewService "Zombie Runes" Audit', () => {
	it("fires notifications even if the selection hasn't effectively changed (add existing)", () => {
		const svc = new ViewService();
		const explorerId = 'test-explorer';

		svc.select(explorerId, 'node-1', 'add');
		const countAfterFirst = svc._notificationCount;

		// Adding the same node again
		svc.select(explorerId, 'node-1', 'add');

		// In a true signal/rune-based system, if the state is the same,
		// subscribers shouldn't be notified.
		expect(svc._notificationCount).toBeGreaterThan(countAfterFirst);
	});

	it('fires notifications for toggling expanded state without checking if anything changed', () => {
		const svc = new ViewService();
		const explorerId = 'test-explorer';

		const initial = svc._notificationCount;
		svc.toggleExpanded(explorerId, 'node-1');
		svc.toggleExpanded(explorerId, 'node-1'); // Should be back to initial state

		// Fired 2 notifications for a net-zero change
		expect(svc._notificationCount).toBe(initial + 2);
	});
});
