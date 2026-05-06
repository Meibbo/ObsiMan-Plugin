import type { TFile } from 'obsidian';
import type { PendingChange } from '../types/typeOps';
import { DELETE_FILE, MOVE_FILE, RENAME_FILE } from '../types/typeOps';

export function buildFileRenameChange(file: TFile, newName: string): PendingChange | null {
	const targetName = newName.trim();
	if (!targetName || targetName === file.name) return null;
	return {
		type: 'file_rename',
		action: 'rename',
		details: `${file.name} -> ${targetName}`,
		files: [file],
		logicFunc: () => ({ [RENAME_FILE]: targetName }),
		customLogic: true,
	};
}

export function buildFileMoveChange(file: TFile, targetFolder: string): PendingChange | null {
	const folder = targetFolder.trim();
	const newPath = folder ? `${folder}/${file.name}` : file.name;
	if (newPath === file.path) return null;
	return {
		type: 'file_move',
		action: 'move',
		details: `${file.path} -> ${newPath}`,
		files: [file],
		logicFunc: () => ({ [MOVE_FILE]: folder }),
		customLogic: true,
	};
}

export function buildFileDeleteChange(file: TFile): PendingChange {
	return {
		type: 'file_delete',
		action: 'delete',
		details: `Delete file "${file.path}"`,
		files: [file],
		logicFunc: () => ({ [DELETE_FILE]: true }),
		customLogic: true,
	};
}
