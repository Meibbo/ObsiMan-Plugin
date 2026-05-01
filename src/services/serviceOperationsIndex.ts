import type { IOperationQueue, IOperationsIndex, QueueChange } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

export function createOperationsIndex(queue: IOperationQueue): IOperationsIndex {
	const base = createNodeIndex<QueueChange>({
		build: () =>
			queue.pending.map((change) => ({
				id: change.id,
				change,
				group: change.type ?? 'unknown',
			})),
	});
	queue.subscribe(() => { void base.refresh(); });
	return base;
}
