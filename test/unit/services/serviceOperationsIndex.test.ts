import { describe, it, expect, vi } from 'vitest';
import { createOperationsIndex } from '../../../src/services/serviceOperationsIndex';
import type { IOperationQueue } from '../../../src/types/contracts';
import type { PendingChange } from '../../../src/types/typeOps';

function stubQueue(
	initial: PendingChange[] = [],
): IOperationQueue & { _set(p: PendingChange[]): void } {
	let list = initial;
	const subs = new Set<() => void>();
	return {
		get pending() { return list; },
		get size() { return list.length; },
		add: (c) => { list = [...list, c]; for (const s of subs) s(); },
		remove: (id) => { list = list.filter((c) => c.id !== id); for (const s of subs) s(); },
		clear: () => { list = []; for (const s of subs) s(); },
		execute: async () => ({ ok: true } as never),
		subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
		_set: (p) => { list = p; for (const s of subs) s(); },
	};
}

describe('serviceOperationsIndex', () => {
	it('mirrors queue.pending into nodes', async () => {
		const q = stubQueue([{ id: '1', type: 'property' } as never]);
		const idx = createOperationsIndex(q);
		await idx.refresh();
		expect(idx.nodes.length).toBe(1);
		expect(idx.byId('1')?.change.id).toBe('1');
	});

	it('nodes are empty when queue is empty', async () => {
		const q = stubQueue([]);
		const idx = createOperationsIndex(q);
		await idx.refresh();
		expect(idx.nodes.length).toBe(0);
	});

	it('refreshes when queue notifies', async () => {
		const q = stubQueue([]);
		const idx = createOperationsIndex(q);
		await idx.refresh();
		const cb = vi.fn();
		idx.subscribe(cb);
		q._set([{ id: '2', type: 'file_rename' } as never]);
		await idx.refresh();
		expect(idx.nodes.length).toBe(1);
	});

	it('sets group from change.type', async () => {
		const q = stubQueue([{ id: 'x', type: 'property' } as never]);
		const idx = createOperationsIndex(q);
		await idx.refresh();
		expect(idx.nodes[0].group).toBe('property');
	});

	it('byId returns undefined for unknown id', async () => {
		const q = stubQueue([{ id: 'a', type: 'property' } as never]);
		const idx = createOperationsIndex(q);
		await idx.refresh();
		expect(idx.byId('z')).toBeUndefined();
	});
});
