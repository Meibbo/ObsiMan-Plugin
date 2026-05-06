import { describe, expect, it, vi } from 'vitest';
import {
	clearActivePerfProbe,
	createPerfProbe,
	getActivePerfProbe,
	setActivePerfProbe,
} from '../../../src/dev/perfProbe';

describe('perf probe contract', () => {
	it('counts events with payload totals', () => {
		const probe = createPerfProbe({ now: () => 10 });

		probe.count('panel.getTree', { nodes: 4 });
		probe.count('panel.getTree', { nodes: 6 });

		expect(probe.snapshot().counters['panel.getTree']).toMatchObject({
			count: 2,
			totalNodes: 10,
		});
	});

	it('measures synchronous work duration', () => {
		let now = 0;
		const probe = createPerfProbe({ now: () => now });
		const result = probe.measure('view.flatten', { nodes: 3 }, () => {
			now = 12;
			return 'ok';
		});

		expect(result).toBe('ok');
		expect(probe.snapshot().timings['view.flatten']).toMatchObject({
			count: 1,
			totalMs: 12,
			maxMs: 12,
			totalNodes: 3,
		});
	});

	it('measures async work duration', async () => {
		let now = 0;
		const probe = createPerfProbe({ now: () => now });
		const result = await probe.api.measureAsync('queue.ingest', { files: 2 }, async () => {
			now = 5;
			await Promise.resolve();
			now = 17;
			return 'done';
		});

		expect(result).toBe('done');
		expect(probe.snapshot().timings['queue.ingest']).toMatchObject({
			count: 1,
			totalMs: 17,
			maxMs: 17,
			totalFiles: 2,
		});
	});

	it('installs and restores a global hook', () => {
		const target = {} as { __vaultmanPerfProbe?: unknown };
		const probe = createPerfProbe({ now: () => 0 });
		const uninstall = probe.installGlobal(target);

		expect(target.__vaultmanPerfProbe).toBe(probe.api);

		uninstall();
		expect(target.__vaultmanPerfProbe).toBeUndefined();
	});

	it('exposes an optional active probe for hot path instrumentation', () => {
		const probe = createPerfProbe({ now: () => 0 });

		clearActivePerfProbe();
		expect(getActivePerfProbe()).toBeUndefined();

		setActivePerfProbe(probe.api);
		getActivePerfProbe()?.count('service.decorate', { nodes: 1 });

		expect(probe.snapshot().counters['service.decorate'].count).toBe(1);

		clearActivePerfProbe();
		expect(getActivePerfProbe()).toBeUndefined();
	});

	it('finishes scenarios when animation frames are not delivered', async () => {
		const requestAnimationFrame = vi.fn();
		const doc = {
			defaultView: {
				requestAnimationFrame,
				setTimeout: (cb: () => void) => {
					cb();
					return 0;
				},
			},
			querySelector: () => null,
		} as unknown as Document;
		const probe = createPerfProbe({ now: () => 0, doc });

		const result = await probe.api.run('tree-scroll');

		expect(requestAnimationFrame).toHaveBeenCalled();
		expect(result.scenario).toBe('tree-scroll');
	});
});
