import type { IOperationQueue, IOperationsIndex, QueueChange } from '../types/typeContracts';
import { createNodeIndex } from './indexNodeCreate';
import type { PendingChange, StagedOp, VirtualFileState } from '../types/typeOps';

type QueueWithTransactions = IOperationQueue & {
	listTransactions?: () => VirtualFileState[];
};

function opType(op: StagedOp): PendingChange['type'] {
	if (op.kind === 'find_replace_content') return 'content_replace';
	if (op.kind === 'rename_file') return 'file_rename';
	if (op.kind === 'move_file') return 'file_move';
	if (op.kind === 'delete_file') return 'file_delete';
	if (op.kind === 'set_tag' || op.kind === 'delete_tag' || op.kind === 'add_tag') return 'tag';
	if (op.kind === 'apply_template') return 'template';
	return 'property';
}

function stagedOps(queue: IOperationQueue): QueueChange[] | null {
	const txs = (queue as QueueWithTransactions).listTransactions?.();
	if (!txs) return null;
	const groups = new Map<string, { op: StagedOp; files: VirtualFileState['file'][] }>();
	for (const vfs of txs) {
		for (const op of vfs.ops) {
			const key = op.changeId ?? op.id;
			const group = groups.get(key);
			if (group) {
				group.files.push(vfs.file);
			} else {
				groups.set(key, { op, files: [vfs.file] });
			}
		}
	}
	return [...groups.entries()].map(([id, group]) => ({
		id,
		change: {
			id,
			type: opType(group.op),
			action: group.op.action,
			details: group.op.details,
			files: group.files,
			...(group.op.property ? { property: group.op.property } : {}),
			...(group.op.tag ? { tag: group.op.tag } : {}),
			customLogic: true,
			logicFunc: () => null,
		} as PendingChange,
		group: group.op.kind,
	}));
}

export function createOperationsIndex(queue: IOperationQueue): IOperationsIndex {
	let counter = 0;
	const base = createNodeIndex<QueueChange>({
		debugName: 'operations',
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
