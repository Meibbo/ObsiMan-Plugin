import { describe, expect, it } from 'vitest';
import { mockTFile } from '../../helpers/obsidian-mocks';
import { FIND_REPLACE_CONTENT } from '../../../src/types/typeOps';
import {
	buildContentReplaceChange,
	createFnRState,
	normalizeAntReplacement,
	resolveFnRPattern,
} from '../../../src/services/serviceFnR.svelte';

describe('serviceFnR', () => {
	it('creates a conservative default advanced FnR state', () => {
		const state = createFnRState();

		expect(state).toMatchObject({
			expanded: false,
			replace: '',
			syntax: 'plain',
			caseSensitive: false,
			wholeWord: false,
		});
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
