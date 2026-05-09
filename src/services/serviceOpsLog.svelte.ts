/**
 * serviceOpsLog — bounded in-memory ring buffer of PerfMeter records and
 * queue-lifecycle events. Powers the ops-log tab in `pageTools`.
 *
 * Spec: docs/work/hardening/specs/2026-05-07-multifacet-2/02-hover-badges-and-ops-log.md
 */
import { PerfMeter, type OpsLogRecord } from './perfMeter';

export const DEFAULT_OPS_LOG_RETENTION = 1000;

type Sub = (records: readonly OpsLogRecord[]) => void;

export interface QueueEventEmitter {
	on(event: 'changed', cb: () => void): () => void;
}

export class OpsLogService {
	private buffer: OpsLogRecord[] = [];
	private cap: number;
	private subscribers: Set<Sub> = new Set();
	private unsubscribers: (() => void)[] = [];
	private perfBound = false;
	private queueBound = false;

	constructor(opts?: { retention?: number }) {
		this.cap = Math.max(1, opts?.retention ?? DEFAULT_OPS_LOG_RETENTION);
	}

	/** Subscribe to PerfMeter and (optionally) a queue event source. */
	bind(opts?: { queue?: QueueEventEmitter | null }): void {
		if (!this.perfBound) {
			const offPerf = PerfMeter.subscribe((rec) => this.push(rec));
			this.unsubscribers.push(offPerf);
			this.perfBound = true;
		}
		if (opts?.queue?.on && !this.queueBound) {
			const offQueue = opts.queue.on('changed', () => {
				this.push({
					ts: Date.now(),
					label: 'queue:changed',
					kind: 'queue',
				});
			});
			this.unsubscribers.push(offQueue);
			this.queueBound = true;
		}
	}

	/** Update the cap. New cap < current size truncates from the front. */
	setRetention(cap: number): void {
		this.cap = Math.max(1, cap);
		if (this.buffer.length > this.cap) {
			this.buffer = this.buffer.slice(this.buffer.length - this.cap);
			this.fanOut();
		}
	}

	getRecords(): readonly OpsLogRecord[] {
		return this.buffer;
	}

	clear(): void {
		if (this.buffer.length === 0) return;
		this.buffer = [];
		this.fanOut();
	}

	subscribe(handler: Sub): () => void {
		this.subscribers.add(handler);
		// fire once with current snapshot
		try {
			handler(this.buffer);
		} catch {
			// swallow
		}
		return () => {
			this.subscribers.delete(handler);
		};
	}

	push(record: OpsLogRecord): void {
		this.buffer.push(record);
		if (this.buffer.length > this.cap) {
			this.buffer.splice(0, this.buffer.length - this.cap);
		}
		this.fanOut();
	}

	dispose(): void {
		for (const off of this.unsubscribers) {
			try {
				off();
			} catch {
				// swallow
			}
		}
		this.unsubscribers = [];
		this.subscribers.clear();
		this.perfBound = false;
		this.queueBound = false;
	}

	private fanOut(): void {
		for (const sub of this.subscribers) {
			try {
				sub(this.buffer);
			} catch {
				// swallow
			}
		}
	}
}
