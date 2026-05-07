import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerfMeter, type OpsLogRecord } from '../../../src/services/perfMeter';

describe('PerfMeter', () => {
	beforeEach(() => {
		PerfMeter.__resetForTests();
	});

	it('time wraps a sync fn, returns the result, and emits one record', () => {
		const records: OpsLogRecord[] = [];
		PerfMeter.subscribe((r) => records.push(r));

		const result = PerfMeter.time('sync:thing', () => 42);

		expect(result).toBe(42);
		expect(records).toHaveLength(1);
		expect(records[0].label).toBe('sync:thing');
		expect(records[0].kind).toBe('service');
		expect(records[0].durationMs).toBeTypeOf('number');
		expect(records[0].durationMs!).toBeGreaterThanOrEqual(0);
	});

	it('timeAsync wraps an async fn and emits a single record after settle', async () => {
		const records: OpsLogRecord[] = [];
		PerfMeter.subscribe((r) => records.push(r));

		const value = await PerfMeter.timeAsync('async:thing', async () => {
			await Promise.resolve();
			return 'ok';
		});

		expect(value).toBe('ok');
		expect(records).toHaveLength(1);
		expect(records[0].label).toBe('async:thing');
		expect(records[0].durationMs).toBeTypeOf('number');
	});

	it('time still emits when the wrapped fn throws', () => {
		const records: OpsLogRecord[] = [];
		PerfMeter.subscribe((r) => records.push(r));

		expect(() =>
			PerfMeter.time('boom', () => {
				throw new Error('boom');
			}),
		).toThrow('boom');
		expect(records).toHaveLength(1);
		expect(records[0].label).toBe('boom');
	});

	it('mark emits a zero/missing-duration record', () => {
		const records: OpsLogRecord[] = [];
		PerfMeter.subscribe((r) => records.push(r));

		PerfMeter.mark('a-mark');
		expect(records).toHaveLength(1);
		expect(records[0].label).toBe('a-mark');
		expect(records[0].kind).toBe('mark');
		expect(records[0].durationMs).toBeUndefined();
	});

	it('subscribe returns an unsubscribe handle', () => {
		const handler = vi.fn();
		const off = PerfMeter.subscribe(handler);
		PerfMeter.mark('one');
		off();
		PerfMeter.mark('two');
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('emits to multiple subscribers and survives a throwing handler', () => {
		const a = vi.fn(() => {
			throw new Error('a-fail');
		});
		const b = vi.fn();
		PerfMeter.subscribe(a);
		PerfMeter.subscribe(b);
		PerfMeter.mark('x');
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
	});
});
