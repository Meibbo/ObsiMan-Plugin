import { describe, expect, it } from 'vitest';
import {
	buildTagAddChange,
	buildTagDeleteChange,
	buildTagRenameChange,
} from '../../../src/services/serviceTagQueue';
import { mockTFile } from '../../helpers/obsidian-mocks';

describe('serviceTagQueue', () => {
	it('builds tag add changes that preserve existing tags', () => {
		const file = mockTFile('a.md');
		const change = buildTagAddChange('#project', [file]);

		expect(change?.type).toBe('tag');
		expect(change?.action).toBe('add');
		expect(change?.tag).toBe('project');
		expect(change?.logicFunc(file, { tags: ['archive'] })).toEqual({
			tags: ['archive', 'project'],
		});
		expect(change?.logicFunc(file, { tags: ['project'] })).toBeNull();
	});

	it('builds tag delete changes that remove normalized matches only', () => {
		const file = mockTFile('a.md');
		const change = buildTagDeleteChange('#project', [file]);

		expect(change?.action).toBe('delete');
		expect(change?.logicFunc(file, { tags: ['project', 'archive'] })).toEqual({
			tags: ['archive'],
		});
		expect(change?.logicFunc(file, { tags: ['other'] })).toBeNull();
	});

	it('builds tag rename changes that replace normalized matches', () => {
		const file = mockTFile('a.md');
		const change = buildTagRenameChange('#project', '#renamed', [file]);

		expect(change?.action).toBe('rename');
		expect(change?.tag).toBe('project');
		expect(change?.logicFunc(file, { tags: ['project', 'archive'] })).toEqual({
			tags: ['renamed', 'archive'],
		});
	});

	it('coalesces duplicate targets during tag rename', () => {
		const file = mockTFile('a.md');
		const change = buildTagRenameChange('project', 'archive', [file]);

		expect(change?.logicFunc(file, { tags: ['project', 'archive'] })).toEqual({
			tags: ['archive'],
		});
	});

	it('does not build blank or unchanged tag renames', () => {
		const file = mockTFile('a.md');

		expect(buildTagRenameChange('project', 'project', [file])).toBeNull();
		expect(buildTagRenameChange('project', '', [file])).toBeNull();
	});
});
