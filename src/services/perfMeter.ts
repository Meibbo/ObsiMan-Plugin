/**
 * PerfMeter — minimal sync/async timing helper used by `serviceOpsLog`.
 *
 * Records are emitted to subscribers as plain `OpsLogRecord` objects so
 * downstream consumers (the ops-log buffer service) can decide on
 * retention, batching, and rendering. No new deps; uses
 * `performance.now()` when available.
 *
 * Spec: docs/work/hardening/specs/2026-05-07-multifacet-2/02-hover-badges-and-ops-log.md
 */
export type OpsLogKind = 'queue' | 'plugin' | 'command' | 'service' | 'mark';

export interface OpsLogRecord {
	ts: number;
	label: string;
	durationMs?: number;
	kind: OpsLogKind;
	meta?: Record<string, unknown>;
}

export type OpsLogHandler = (record: OpsLogRecord) => void;

function nowMs(): number {
	if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
		return performance.now();
	}
	return Date.now();
}

function realtimeMs(): number {
	return Date.now();
}

export class PerfMeter {
	private static handlers: Set<OpsLogHandler> = new Set();

	/** Time a synchronous function and emit a record. */
	static time<T>(label: string, fn: () => T, kind: OpsLogKind = 'service', meta?: Record<string, unknown>): T {
		const start = nowMs();
		try {
			return fn();
		} finally {
			const durationMs = nowMs() - start;
			PerfMeter.emit({ ts: realtimeMs(), label, durationMs, kind, meta });
		}
	}

	/** Time an async function and emit a record once it settles. */
	static async timeAsync<T>(
		label: string,
		fn: () => Promise<T>,
		kind: OpsLogKind = 'service',
		meta?: Record<string, unknown>,
	): Promise<T> {
		const start = nowMs();
		try {
			return await fn();
		} finally {
			const durationMs = nowMs() - start;
			PerfMeter.emit({ ts: realtimeMs(), label, durationMs, kind, meta });
		}
	}

	/** Emit a zero-duration mark. */
	static mark(label: string, kind: OpsLogKind = 'mark', meta?: Record<string, unknown>): void {
		PerfMeter.emit({ ts: realtimeMs(), label, kind, meta });
	}

	/** Subscribe to PerfMeter records. Returns an unsubscribe function. */
	static subscribe(handler: OpsLogHandler): () => void {
		PerfMeter.handlers.add(handler);
		return () => {
			PerfMeter.handlers.delete(handler);
		};
	}

	/** Test-only: drop all subscribers. */
	static __resetForTests(): void {
		PerfMeter.handlers.clear();
	}

	/** Forward to all current subscribers. Errors in individual handlers
	 * are swallowed so a misbehaving consumer cannot bring down the
	 * timing path. */
	static emit(record: OpsLogRecord): void {
		for (const handler of PerfMeter.handlers) {
			try {
				handler(record);
			} catch {
				// swallow
			}
		}
	}
}
