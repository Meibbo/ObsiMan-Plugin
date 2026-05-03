import type { IOperationQueue, IOperationsIndex, QueueChange } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

export function createOperationsIndex(queue: IOperationQueue): IOperationsIndex {
	let counter = 0;
	const base = createNodeIndex<QueueChange>({
		build: () =>
			queue.pending.map((change) => ({
				id: change.id ?? `queue-${++counter}`,
				change,
				group: change.type ?? 'unknown',
			})),
	});
	queue.subscribe(() => { void base.refresh(); });
	return base;
}
