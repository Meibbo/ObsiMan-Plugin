import { FIND_REPLACE_CONTENT, type ContentChange } from '../types/typeOps';
import type {
	BuildContentReplaceChangeInput,
	FnRPattern,
	FnRState,
	FnRSyntax,
	FnRSyntaxOption,
} from '../types/typeFnR';

export const FNR_SYNTAX_OPTIONS: FnRSyntaxOption[] = [
	{
		id: 'plain',
		label: 'Plain',
		description: 'Literal text matching.',
		canReplaceContent: true,
	},
	{
		id: 'regex',
		label: 'Regex',
		description: 'JavaScript regular expression matching.',
		canReplaceContent: true,
	},
	{
		id: 'obsidian-search',
		label: 'Obsidian',
		description: 'Core Search operators such as file:, path:, tag:, and property filters.',
		canReplaceContent: false,
	},
	{
		id: 'obsidian-bases',
		label: 'Bases',
		description: 'Bases filter/formula expressions.',
		canReplaceContent: false,
	},
	{
		id: 'dataview-dql',
		label: 'Dataview',
		description: 'Dataview DQL expressions.',
		canReplaceContent: false,
	},
	{
		id: 'ant-renamer',
		label: 'Ant',
		description: 'Ant Renamer style regex with numbered replacement groups.',
		canReplaceContent: true,
	},
];

export function createFnRState(): FnRState {
	return {
		expanded: false,
		replace: '',
		syntax: 'plain',
		caseSensitive: false,
		wholeWord: false,
		scope: 'filtered',
	};
}

export function resolveFnRPattern(find: string, state: Pick<FnRState, 'syntax' | 'wholeWord'>): FnRPattern {
	const trimmed = find.trim();
	if (state.syntax === 'regex' || state.syntax === 'ant-renamer') {
		return { pattern: trimmed, isRegex: true };
	}
	if (state.wholeWord) {
		return { pattern: String.raw`\b${escapeRegex(trimmed)}\b`, isRegex: true };
	}
	return { pattern: trimmed, isRegex: false };
}

export function normalizeAntReplacement(replacement: string): string {
	return replacement.replace(/\$0+([1-9]\d?)/g, '$$$1');
}

export function canReplaceContent(syntax: FnRSyntax): boolean {
	return FNR_SYNTAX_OPTIONS.find((option) => option.id === syntax)?.canReplaceContent ?? false;
}

export function buildContentReplaceChange(input: BuildContentReplaceChangeInput): ContentChange | null {
	const find = input.find.trim();
	if (!find || input.files.length === 0 || !canReplaceContent(input.state.syntax)) return null;

	const pattern = resolveFnRPattern(find, input.state);
	const replacement =
		input.state.syntax === 'ant-renamer'
			? normalizeAntReplacement(input.state.replace)
			: input.state.replace;
	const files = [...input.files];
	const fileCount = files.length;

	return {
		type: 'content_replace',
		action: 'replace',
		details: `Replace "${find}" with "${replacement}" in ${fileCount} ${fileCount === 1 ? 'file' : 'files'}`,
		files,
		find,
		replace: replacement,
		isRegex: pattern.isRegex,
		caseSensitive: input.state.caseSensitive,
		customLogic: true,
		logicFunc: () => ({
			[FIND_REPLACE_CONTENT]: {
				pattern: pattern.pattern,
				replacement,
				isRegex: pattern.isRegex,
				caseSensitive: input.state.caseSensitive,
			},
		}),
	};
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
