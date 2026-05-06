import { describe, expect, it } from 'vitest';
import {
	buildFileDeleteChange,
	buildFileMoveChange,
	buildFileRenameChange,
} from '../../../src/services/serviceFileQueue';
import { DELETE_FILE, MOVE_FILE, RENAME_FILE } from '../../../src/types/typeOps';
import { mockTFile } from '../../helpers/obsidian-mocks';

describe('serviceFileQueue', () => {
	it('builds file rename changes with the RENAME_FILE sentinel', () => {
		const file = mockTFile('Notes/a.md');
		const change = buildFileRenameChange(file, 'b.md');

		expect(change?.type).toBe('file_rename');
		expect(change?.files).toEqual([file]);
		expect(change?.logicFunc(file, {})).toEqual({ [RENAME_FILE]: 'b.md' });
	});

	it('does not build no-op file rename changes', () => {
		const file = mockTFile('Notes/a.md');

		expect(buildFileRenameChange(file, 'a.md')).toBeNull();
		expect(buildFileRenameChange(file, '')).toBeNull();
	});

	it('builds file move changes with the MOVE_FILE sentinel', () => {
		const file = mockTFile('Notes/a.md');
		const change = buildFileMoveChange(file, 'Archive');

		expect(change?.type).toBe('file_move');
		expect(change?.files).toEqual([file]);
		expect(change?.logicFunc(file, {})).toEqual({ [MOVE_FILE]: 'Archive' });
	});

	it('does not build no-op file move changes', () => {
		const file = mockTFile('a.md');

		expect(buildFileMoveChange(file, '')).toBeNull();
	});

	it('builds file delete changes with the DELETE_FILE sentinel', () => {
		const file = mockTFile('Notes/a.md');
		const change = buildFileDeleteChange(file);

		expect(change.type).toBe('file_delete');
		expect(change.action).toBe('delete');
		expect(change.files).toEqual([file]);
		expect(change.logicFunc(file, {})).toEqual({ [DELETE_FILE]: true });
	});
});
