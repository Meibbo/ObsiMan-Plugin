import type { TFile } from 'obsidian';
import { MOVE_FILE } from '../../types/typeOps';
import type { PendingChange } from '../../types/typeOps';

export type MovePreview = {
	oldPath: string;
	newPath: string;
};

export function createMovePreviews(files: readonly TFile[], targetFolder: string): MovePreview[] {
	const limit = Math.min(files.length, 8);
	return files.slice(0, limit).map((file) => ({
		oldPath: file.path,
		newPath: targetFolder ? `${targetFolder}/${file.name}` : file.name,
	}));
}

export function createMoveChanges(files: readonly TFile[], targetFolder: string): PendingChange[] {
	const changes: PendingChange[] = [];
	for (const file of files) {
		const newPath = targetFolder ? `${targetFolder}/${file.name}` : file.name;
		if (newPath === file.path) continue;
		changes.push({
			type: 'file_move',
			action: 'move',
			details: `${file.path} → ${newPath}`,
			files: [file],
			logicFunc: () => ({ [MOVE_FILE]: targetFolder }),
			customLogic: true,
			targetFolder,
		});
	}
	return changes;
}
