import { describe, expect, it } from 'vitest';
import { mockTFile } from '../../helpers/obsidian-mocks';
import { FIND_REPLACE_CONTENT, NATIVE_RENAME_PROP, RENAME_FILE } from '../../../src/types/typeOps';
import {
	buildRenameHandoffChange,
	buildContentReplaceChange,
	cancelRenameHandoff,
	createFnRState,
	markRenameHandoffQueued,
	normalizeAntReplacement,
	resolveFnRPattern,
	startFileRenameHandoff,
	startPropRenameHandoff,
	startTagRenameHandoff,
	startValueRenameHandoff,
	updateRenameHandoffReplacement,
} from '../../../src/services/serviceFnR';

describe('serviceFnR', () => {
	it('creates a conservative default advanced FnR state', () => {
		const state = createFnRState();

		expect(state).toMatchObject({
			expanded: false,
			replace: '',
			syntax: 'plain',
			caseSensitive: false,
			wholeWord: false,
			rename: { status: 'inactive' },
		});
	});

	it('starts and builds a prop rename handoff using native rename semantics', () => {
		const files = [mockTFile('A.md')];
		let state = startPropRenameHandoff(createFnRState(), {
			propName: 'status',
			files,
			scope: 'filtered',
		});

		expect(state.expanded).toBe(true);
		expect(state.rename).toMatchObject({
			status: 'editing',
			sourceKind: 'prop',
			original: 'status',
			replacement: '',
			propName: 'status',
			files,
			scope: 'filtered',
		});

		state = updateRenameHandoffReplacement(state, 'state');
		expect(state.rename.status).toBe('ready');
		const change = buildRenameHandoffChange(state.rename);

		expect(change).toMatchObject({
			type: 'property',
			property: 'status',
			action: 'rename',
			files,
		});
		expect(change?.logicFunc(files[0], { status: 'draft' })).toEqual({
			[NATIVE_RENAME_PROP]: { oldName: 'status', newName: 'state' },
		});
	});

	it('starts and builds a value rename handoff matching existing value replacement behavior', () => {
		const files = [mockTFile('A.md')];
		let state = startValueRenameHandoff(createFnRState(), {
			propName: 'status',
			oldValue: 'draft',
			files,
			scope: 'selected',
		});
		state = updateRenameHandoffReplacement(state, 'done');
		const change = buildRenameHandoffChange(state.rename);

		expect(change).toMatchObject({
			type: 'property',
			property: 'status',
			action: 'set',
			files,
			value: 'done',
			oldValue: 'draft',
		});
		expect(change?.logicFunc(files[0], { status: ['draft', 'todo'] })).toEqual({
			status: ['done', 'todo'],
		});
		expect(change?.logicFunc(files[0], { status: 'draft' })).toEqual({ status: 'done' });
	});

	it('starts and builds a tag rename handoff using frontmatter tag replacement', () => {
		const files = [mockTFile('A.md')];
		let state = startTagRenameHandoff(createFnRState(), {
			tagPath: 'project',
			files,
			scope: 'filtered',
		});
		state = updateRenameHandoffReplacement(state, '#renamed');
		const change = buildRenameHandoffChange(state.rename);

		expect(change).toMatchObject({
			type: 'tag',
			tag: 'project',
			action: 'rename',
			files,
		});
		expect(change?.logicFunc(files[0], { tags: ['project', 'archive'] })).toEqual({
			tags: ['renamed', 'archive'],
		});
	});

	it('starts and builds a file rename handoff using RENAME_FILE semantics', () => {
		const files = [mockTFile('Notes/A.md')];
		let state = startFileRenameHandoff(createFnRState(), {
			files,
			scope: 'selected',
		});
		state = updateRenameHandoffReplacement(state, 'B.md');
		const change = buildRenameHandoffChange(state.rename);

		expect(change).toMatchObject({
			type: 'file_rename',
			action: 'rename',
			files,
		});
		expect(change?.logicFunc(files[0], {})).toEqual({ [RENAME_FILE]: 'B.md' });
	});

	it('keeps all selected files when building a file rename handoff change', () => {
		const files = [mockTFile('Notes/A.md'), mockTFile('Notes/B.md')];
		let state = startFileRenameHandoff(createFnRState(), {
			files,
			scope: 'selected',
		});
		state = updateRenameHandoffReplacement(state, 'Renamed.md');
		const change = buildRenameHandoffChange(state.rename);

		expect(change?.files).toEqual(files);
		expect(change?.logicFunc(files[0], {})).toEqual({ [RENAME_FILE]: 'Renamed.md' });
		expect(change?.logicFunc(files[1], {})).toEqual({ [RENAME_FILE]: 'Renamed.md' });
	});

	it('preserves each selected file extension when file rename handoff uses a bare basename', () => {
		const files = [mockTFile('Notes/A.md'), mockTFile('Assets/B.pdf')];
		let state = startFileRenameHandoff(createFnRState(), {
			files,
			scope: 'selected',
		});
		state = updateRenameHandoffReplacement(state, 'Renamed');
		const change = buildRenameHandoffChange(state.rename);

		expect(change?.files).toEqual(files);
		expect(change?.logicFunc(files[0], {})).toEqual({ [RENAME_FILE]: 'Renamed.md' });
		expect(change?.logicFunc(files[1], {})).toEqual({ [RENAME_FILE]: 'Renamed.pdf' });
	});

	it('does not build cancelled, queued, unchanged, or blank rename handoffs', () => {
		const files = [mockTFile('A.md')];
		let state = startPropRenameHandoff(createFnRState(), {
			propName: 'status',
			files,
			scope: 'filtered',
		});

		expect(buildRenameHandoffChange(state.rename)).toBeNull();
		expect(buildRenameHandoffChange(cancelRenameHandoff(state).rename)).toBeNull();
		expect(buildRenameHandoffChange(markRenameHandoffQueued(state).rename)).toBeNull();

		state = updateRenameHandoffReplacement(state, 'status');
		expect(state.rename.status).toBe('editing');
		expect(buildRenameHandoffChange(state.rename)).toBeNull();

		state = updateRenameHandoffReplacement(state, '   ');
		expect(state.rename.status).toBe('editing');
		expect(buildRenameHandoffChange(state.rename)).toBeNull();
	});

	it('builds one content replace change across the provided file scope', () => {
		const files = [mockTFile('A.md'), mockTFile('B.md')];
		const change = buildContentReplaceChange({
			find: 'foo',
			files,
			state: { ...createFnRState(), replace: 'bar' },
		});

		expect(change).toMatchObject({
			type: 'content_replace',
			find: 'foo',
			replace: 'bar',
			isRegex: false,
			caseSensitive: false,
			files,
			details: 'Replace "foo" with "bar" in 2 files',
		});
		expect(change?.logicFunc(files[0], {})).toEqual({
			[FIND_REPLACE_CONTENT]: {
				pattern: 'foo',
				replacement: 'bar',
				isRegex: false,
				caseSensitive: false,
			},
		});
	});

	it('returns null when find or scope is empty', () => {
		expect(
			buildContentReplaceChange({
				find: '   ',
				files: [mockTFile('A.md')],
				state: createFnRState(),
			}),
		).toBeNull();
		expect(
			buildContentReplaceChange({
				find: 'foo',
				files: [],
				state: createFnRState(),
			}),
		).toBeNull();
	});

	it('resolves regex and whole-word patterns explicitly', () => {
		expect(resolveFnRPattern('foo.bar', { ...createFnRState(), syntax: 'regex' })).toEqual({
			pattern: 'foo.bar',
			isRegex: true,
		});
		expect(resolveFnRPattern('foo.bar', { ...createFnRState(), wholeWord: true })).toEqual({
			pattern: String.raw`\bfoo\.bar\b`,
			isRegex: true,
		});
	});

	it('normalizes Ant Renamer numeric backreferences to JavaScript replacement syntax', () => {
		expect(normalizeAntReplacement('$01-$2-$12')).toBe('$1-$2-$12');
	});
});
