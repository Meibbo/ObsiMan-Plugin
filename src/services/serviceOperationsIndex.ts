import type { IOperationQueue, IOperationsIndex, QueueChange } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';
import type { PendingChange, StagedOp, VirtualFileState } from '../types/typeOps';

type QueueWithTransactions = IOperationQueue & {
	listTransactions?: () => VirtualFileState[];
};

function opType(op: StagedOp): PendingChange['type'] {
	if (op.kind === 'find_replace_content') return 'content_replace';
	if (op.kind === 'rename_file') return 'file_rename';
	if (op.kind === 'move_file') return 'file_move';
	if (op.kind === 'set_tag' || op.kind === 'delete_tag' || op.kind === 'add_tag') return 'tag';
	if (op.kind === 'apply_template') return 'template';
	return 'property';
}

function stagedOps(queue: IOperationQueue): QueueChange[] | null {
	const txs = (queue as QueueWithTransactions).listTransactions?.();
	if (!txs) return null;
	return txs.flatMap((vfs) =>
		vfs.ops.map((op) => ({
			id: op.id,
			change: {
				id: op.id,
				type: opType(op),
				action: op.action,
				details: op.details,
				files: [vfs.file],
				customLogic: true,
				logicFunc: () => null,
			} as PendingChange,
			group: op.kind,
		})),
	);
}

export function createOperationsIndex(queue: IOperationQueue): IOperationsIndex {
	let counter = 0;
	const base = createNodeIndex<QueueChange>({
		build: () => {
			const staged = stagedOps(queue);
			if (staged) return staged;
			return queue.pending.map((change) => ({
				id: change.id ?? `queue-${++counter}`,
				change,
				group: change.type ?? 'unknown',
			}));
		},
	});
	queue.subscribe(() => {
		void base.refresh();
	});
	return base;
}
