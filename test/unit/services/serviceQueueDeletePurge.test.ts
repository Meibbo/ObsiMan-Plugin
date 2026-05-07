import { describe, it, expect, vi } from 'vitest';
import { OperationQueueService } from '../../../src/services/serviceQueue.svelte';
import { mockApp } from '../../helpers/obsidian-mocks';

describe('OperationQueueService.requestDelete (delete-conflict purge)', () => {
	function setup() {
		const app = mockApp();
		const queue = new OperationQueueService(app);
		return queue;
	}

	it('queues delete directly when the node has no other ops bound', async () => {
		const queue = setup();
		const enqueueDelete = vi.fn();
		const opener = vi.fn();
		queue.deleteConflictModalOpener = opener;

		const result = await queue.requestDelete({
			nodeId: 'tag:foo',
			nodeLabel: 'foo',
			enqueueDelete,
		});

		expect(result).toBe('queued');
		expect(opener).not.toHaveBeenCalled();
		expect(enqueueDelete).toHaveBeenCalledTimes(1);
	});

	it('opens the modal and drops conflicting ops on confirm', async () => {
		const queue = setup();
		queue.bindOpToNode('tag:foo', { opId: 'op-1', kind: 'rename', label: 'foo→bar' });
		queue.bindOpToNode('tag:foo', { opId: 'op-2', kind: 'set', label: 'set color' });

		const opener = vi.fn().mockResolvedValue('confirm');
		queue.deleteConflictModalOpener = opener;
		const enqueueDelete = vi.fn();

		const result = await queue.requestDelete({
			nodeId: 'tag:foo',
			nodeLabel: 'foo',
			enqueueDelete,
		});

		expect(result).toBe('queued');
		expect(opener).toHaveBeenCalledTimes(1);
		const [params] = opener.mock.calls[0] as [
			{ nodeId: string; nodeLabel: string; conflictingOps: { opId: string; kind: string }[] },
		];
		expect(params.nodeId).toBe('tag:foo');
		expect(params.conflictingOps.map((o) => o.opId).sort()).toEqual(['op-1', 'op-2']);
		expect(enqueueDelete).toHaveBeenCalledTimes(1);
		expect(queue.listOpsForNode('tag:foo')).toHaveLength(0);
	});

	it('preserves conflicting ops on cancel', async () => {
		const queue = setup();
		queue.bindOpToNode('tag:foo', { opId: 'op-1', kind: 'rename', label: 'foo→bar' });

		const opener = vi.fn().mockResolvedValue('cancel');
		queue.deleteConflictModalOpener = opener;
		const enqueueDelete = vi.fn();

		const result = await queue.requestDelete({
			nodeId: 'tag:foo',
			nodeLabel: 'foo',
			enqueueDelete,
		});

		expect(result).toBe('cancelled');
		expect(enqueueDelete).not.toHaveBeenCalled();
		expect(queue.listOpsForNode('tag:foo')).toHaveLength(1);
	});

	it('fails closed (cancelled) when no modal opener is registered and conflicts exist', async () => {
		const queue = setup();
		queue.bindOpToNode('tag:foo', { opId: 'op-1', kind: 'rename', label: 'foo→bar' });
		const enqueueDelete = vi.fn();

		const result = await queue.requestDelete({
			nodeId: 'tag:foo',
			nodeLabel: 'foo',
			enqueueDelete,
		});

		expect(result).toBe('cancelled');
		expect(enqueueDelete).not.toHaveBeenCalled();
		expect(queue.listOpsForNode('tag:foo')).toHaveLength(1);
	});

	it('dropForNode with explicit kinds removes only the matching descriptors', () => {
		const queue = setup();
		queue.bindOpToNode('n', { opId: 'a', kind: 'rename', label: 'r' });
		queue.bindOpToNode('n', { opId: 'b', kind: 'set', label: 's' });
		queue.bindOpToNode('n', { opId: 'c', kind: 'filter', label: 'f' });

		const dropped = queue.dropForNode('n', ['rename', 'set']);
		expect(dropped.map((d) => d.opId).sort()).toEqual(['a', 'b']);
		expect(queue.listOpsForNode('n').map((d) => d.opId)).toEqual(['c']);
	});

	it('treats only non-delete ops as conflicting', async () => {
		const queue = setup();
		// A pre-existing delete is not itself a conflict — the delete-conflict
		// guard exists to protect rename/set/etc that delete will supersede.
		queue.bindOpToNode('n', { opId: 'd', kind: 'delete', label: 'del' });
		const enqueueDelete = vi.fn();
		queue.deleteConflictModalOpener = vi.fn();

		const result = await queue.requestDelete({
			nodeId: 'n',
			nodeLabel: 'n',
			enqueueDelete,
		});

		expect(result).toBe('queued');
		expect(queue.deleteConflictModalOpener).not.toHaveBeenCalled();
	});
});
