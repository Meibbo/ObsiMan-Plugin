import type { TFile } from 'obsidian';
import type { PendingChange } from '../types/typeOps';
import { APPEND_LINKS, DELETE_FILE, MOVE_FILE, RENAME_FILE } from '../types/typeOps';

export function buildFileRenameChange(file: TFile, newName: string): PendingChange | null {
	const targetName = normalizeFileRenameTarget(file, newName);
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

export function normalizeFileRenameTarget(file: TFile, requestedName: string): string {
	const targetName = requestedName.trim();
	if (!targetName) return '';
	if (!file.extension) return targetName;
	const originalExtension = `.${file.extension}`;
	if (targetName.toLowerCase().endsWith(originalExtension.toLowerCase())) return targetName;
	const stem = stripTrailingExtension(targetName);
	if (!stem) return '';
	return `${stem}${originalExtension}`;
}

function stripTrailingExtension(name: string): string {
	const slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
	const dot = name.lastIndexOf('.');
	if (dot > slash) return name.slice(0, dot);
	return name;
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

/**
 * Phase 7: append wikilinks to a file's body. The change writes only
 * those wikilinks not already present in the body of each target file
 * so re-running the same op is a no-op (idempotent).
 *
 * `links` is a list of pre-rendered wikilink fragments such as
 * `[[Some Note]]` or `[[Path/To/Note|Alias]]`.
 */
export function buildAppendLinksChange(files: TFile[], links: string[]): PendingChange | null {
	const cleaned = links.map((l) => l.trim()).filter((l) => l.length > 0);
	if (files.length === 0 || cleaned.length === 0) return null;
	return {
		type: 'content_replace',
		find: '',
		replace: '',
		isRegex: false,
		caseSensitive: true,
		action: 'append-links',
		details: `Append ${cleaned.length} link(s) to ${files.length} file(s)`,
		files,
		customLogic: true,
		logicFunc: () => ({ [APPEND_LINKS]: cleaned }),
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
