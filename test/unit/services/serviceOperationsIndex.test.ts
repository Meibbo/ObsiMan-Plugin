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

	it('maps staged file delete ops back to file_delete queue changes', async () => {
		const file = { path: 'trash.md' };
		const tx: VirtualFileState = {
			file: file as never,
			originalPath: 'trash.md',
			deleted: true,
			fm: {},
			body: '',
			ops: [
				{
					id: 'op-delete-file',
					kind: 'delete_file',
					action: 'delete',
					details: 'Delete file',
					apply: vi.fn(),
				},
			],
			fmInitial: {},
			bodyInitial: '',
			bodyLoaded: false,
		};
		const q = Object.assign(stubQueue([]), {
			listTransactions: () => [tx],
		});
		const idx = createOperationsIndex(q);

		await idx.refresh();

		expect(idx.nodes[0].change.type).toBe('file_delete');
		expect(idx.nodes[0].group).toBe('delete_file');
	});

	it('collapses repeated staged ops from one logical change into one node with all touched files', async () => {
		const files = [{ path: 'a.md' }, { path: 'b.md' }, { path: 'c.md' }];
		const txs: VirtualFileState[] = files.map((file, index) => ({
			file: file as never,
			originalPath: file.path,
			fm: {},
			body: '',
			ops: [
				{
					id: `op-${index + 1}`,
					changeId: 'change-delete-status',
					kind: 'delete_prop',
					action: 'delete',
					details: 'delete status',
					property: 'status',
					apply: vi.fn(),
				},
			],
			fmInitial: {},
			bodyInitial: '',
			bodyLoaded: false,
		}));
		const q = Object.assign(stubQueue([]), {
			listTransactions: () => txs,
		});
		const idx = createOperationsIndex(q);

		await idx.refresh();

		expect(idx.nodes).toHaveLength(1);
		expect(idx.nodes[0].id).toBe('change-delete-status');
		expect(idx.nodes[0].change.files).toEqual(files);
		expect(idx.nodes[0].change).toMatchObject({ property: 'status' });
	});
});
