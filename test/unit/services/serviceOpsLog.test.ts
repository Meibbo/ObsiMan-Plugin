import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerfMeter } from '../../../src/services/perfMeter';
import { OpsLogService } from '../../../src/services/serviceOpsLog.svelte';

describe('OpsLogService', () => {
	beforeEach(() => {
		PerfMeter.__resetForTests();
	});

	it('forwards PerfMeter records into the buffer', () => {
		const log = new OpsLogService({ retention: 100 });
		log.bind();
		PerfMeter.mark('one');
		PerfMeter.mark('two');
		expect(log.getRecords().map((r) => r.label)).toEqual(['one', 'two']);
		log.dispose();
	});

	it('respects the retention cap and drops the oldest record', () => {
		const log = new OpsLogService({ retention: 3 });
		log.bind();
		for (let i = 0; i < 5; i += 1) PerfMeter.mark(`m${i}`);
		expect(log.getRecords().map((r) => r.label)).toEqual(['m2', 'm3', 'm4']);
		log.dispose();
	});

	it('fans out to subscribers on push and on clear', () => {
		const log = new OpsLogService({ retention: 100 });
		log.bind();
		const sub = vi.fn();
		const off = log.subscribe(sub);
		// initial snapshot
		expect(sub).toHaveBeenCalledTimes(1);
		PerfMeter.mark('a');
		expect(sub).toHaveBeenCalledTimes(2);
		log.clear();
		expect(sub).toHaveBeenCalledTimes(3);
		expect(log.getRecords()).toHaveLength(0);
		off();
		log.dispose();
	});

	it('clear() purges the buffer only — does NOT touch any queue', () => {
		const log = new OpsLogService({ retention: 10 });
		log.bind();
		const queueClear = vi.fn();
		const queueStub = {
			on: vi.fn().mockImplementation((_event: string, _cb: () => void) => () => {}),
			clear: queueClear,
		};
		log.bind({ queue: queueStub });
		PerfMeter.mark('a');
		log.clear();
		expect(queueClear).not.toHaveBeenCalled();
		log.dispose();
	});

	it('subscribes to queue change events and emits a queue record', () => {
		const log = new OpsLogService({ retention: 10 });
		const listeners: Array<() => void> = [];
		const queueStub = {
			on: (event: 'changed', cb: () => void) => {
				if (event === 'changed') listeners.push(cb);
				return () => {};
			},
		};
		log.bind({ queue: queueStub });
		listeners.forEach((cb) => cb());
		const labels = log.getRecords().map((r) => r.label);
		expect(labels).toContain('queue:changed');
		log.dispose();
	});

	it('setRetention() truncates the buffer when the new cap is smaller', () => {
		const log = new OpsLogService({ retention: 10 });
		log.bind();
		for (let i = 0; i < 8; i += 1) PerfMeter.mark(`m${i}`);
		log.setRetention(3);
		expect(log.getRecords().map((r) => r.label)).toEqual(['m5', 'm6', 'm7']);
		log.dispose();
	});

	it('dispose() unsubscribes from PerfMeter so further marks do not buffer', () => {
		const log = new OpsLogService({ retention: 5 });
		log.bind();
		PerfMeter.mark('before');
		log.dispose();
		PerfMeter.mark('after');
		expect(log.getRecords().map((r) => r.label)).toEqual(['before']);
	});
});
