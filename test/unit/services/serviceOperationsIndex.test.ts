import { describe, it, expect, vi } from 'vitest';
import { createOperationsIndex } from '../../../src/index/indexOperations';
import type { IOperationQueue } from '../../../src/types/typeContracts';
import type { PendingChange, VirtualFileState } from '../../../src/types/typeOps';

function stubQueue(
	initial: PendingChange[] = [],
): IOperationQueue & { _set(p: PendingChange[]): void } {
	let list = initial;
	const subs = new Set<() => void>();
	return {
		get pending() {
			return list;
		},
		get size() {
			return list.length;
		},
		add: (c) => {
			list = [...list, c];
			for (const s of subs) s();
		},
		remove: (id) => {
			list = list.filter((c) => c.id !== id);
			for (const s of subs) s();
		},
		clear: () => {
			list = [];
			for (const s of subs) s();
		},
		execute: async () => ({ ok: true }) as never,
		subscribe: (cb) => {
			subs.add(cb);
			return () => subs.delete(cb);
		},
		_set: (p) => {
			list = p;
			for (const s of subs) s();
		},
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

	it('uses staged transaction ops when the concrete queue exposes them', async () => {
		const file = { path: 'a.md' };
		const tx: VirtualFileState = {
			file: file as never,
			originalPath: 'a.md',
			fm: {},
			body: '',
			ops: [
				{
					id: 'op-1',
					kind: 'rename_file',
					action: 'rename',
					details: 'Rename file',
					apply: vi.fn(),
				},
			],
			fmInitial: {},
			bodyInitial: '',
			bodyLoaded: true,
		};
		const q = Object.assign(stubQueue([{ id: 'legacy', type: 'property' } as never]), {
			listTransactions: () => [tx],
		});
		const idx = createOperationsIndex(q);
		await idx.refresh();
		expect(idx.nodes).toHaveLength(1);
		expect(idx.nodes[0].id).toBe('op-1');
		expect(idx.nodes[0].change.type).toBe('file_rename');
		expect(idx.nodes[0].group).toBe('rename_file');
	});
});
