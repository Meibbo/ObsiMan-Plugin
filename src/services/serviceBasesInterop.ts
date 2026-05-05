import yaml from 'js-yaml';
import type { FilterRule } from '../types/typeFilter';
import type {
	BasesAppliedExpression,
	BasesFencedBlock,
	BasesGroupLogic,
	BasesImportedFilterGroup,
	BasesImportedFilterNode,
	BasesImportPreview,
	BasesImportSource,
	BasesInteropReport,
	BasesParseError,
	BasesUnsupportedExpression,
	PreviewBasesImportInput,
} from '../types/typeBasesInterop';

type UnknownRecord = Record<string, unknown>;

const GROUP_KEYS = new Set<BasesGroupLogic>(['and', 'or', 'not']);

export function previewBasesImport(input: PreviewBasesImportInput): BasesImportPreview {
	const source: BasesImportSource = {
		sourcePath: input.sourcePath,
		kind: input.kind ?? (input.targetViewName ? 'base-view' : 'base-file'),
		blockIndex: input.blockIndex,
		lineStart: input.lineStart,
		targetViewName: input.targetViewName,
	};
	const report: BasesInteropReport = { applied: [], unsupported: [], parseErrors: [] };
	const rawConfig = parseYamlObject(input.content, source, report);
	if (report.parseErrors.length > 0) {
		return { source, rawConfig, filter: undefined, report };
	}

	const globalFilter = convertFilter(rawConfig.filters, source, report);
	const viewFilter = convertFilter(findViewFilters(rawConfig, input.targetViewName), source, report);
	const filter = combineFilters(globalFilter, viewFilter);

	return { source, rawConfig, filter, report };
}

export function extractBasesFencedBlocks(content: string): BasesFencedBlock[] {
	const lines = content.split(/\r?\n/);
	const blocks: BasesFencedBlock[] = [];
	let currentStart: number | undefined;
	let currentLines: string[] = [];

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		if (currentStart === undefined) {
			if (/^\s*```\s*bases(?:\s+\w+)?\s*$/.test(line)) {
				currentStart = index + 1;
				currentLines = [];
			}
			continue;
		}

		if (/^\s*```\s*$/.test(line)) {
			blocks.push({
				blockIndex: blocks.length,
				lineStart: currentStart,
				rawContent: currentLines.join('\n'),
			});
			currentStart = undefined;
			currentLines = [];
			continue;
		}

		currentLines.push(line);
	}

	return blocks;
}

function parseYamlObject(
	content: string,
	source: BasesImportSource,
	report: BasesInteropReport
): UnknownRecord {
	let parsed: unknown;
	try {
		parsed = yaml.load(content);
	} catch (error) {
		report.parseErrors.push(parseErrorFromUnknown(error, source));
		return {};
	}

	if (!isRecord(parsed)) return {};
	return parsed;
}

function parseErrorFromUnknown(error: unknown, source: BasesImportSource): BasesParseError {
	const message = error instanceof Error ? error.message : String(error);
	return {
		sourcePath: source.sourcePath,
		targetViewName: source.targetViewName,
		blockIndex: source.blockIndex,
		lineStart: source.lineStart,
		reason: 'YAML parse failed',
		message,
	};
}

function findViewFilters(config: UnknownRecord, targetViewName?: string): unknown {
	if (!targetViewName || !Array.isArray(config.views)) return undefined;
	const views: unknown[] = config.views;
	const view = views.find((candidate) =>
		isRecord(candidate) && candidate.name === targetViewName
	);
	return isRecord(view) ? view.filters : undefined;
}

function combineFilters(
	globalFilter: BasesImportedFilterNode | undefined,
	viewFilter: BasesImportedFilterNode | undefined
): BasesImportedFilterGroup | undefined {
	const children = [globalFilter, viewFilter].filter((node): node is BasesImportedFilterNode => node !== undefined);
	if (children.length === 0) return undefined;
	if (children.length === 1 && children[0].type === 'group') return children[0];
	return {
		type: 'group',
		logic: 'and',
		children,
		enabled: true,
	};
}

function convertFilter(
	filter: unknown,
	source: BasesImportSource,
	report: BasesInteropReport
): BasesImportedFilterNode | undefined {
	if (typeof filter === 'string') {
		return convertExpression(filter, source, report);
	}

	if (Array.isArray(filter)) {
		const children = filter
			.map((child) => convertFilter(child, source, report))
			.filter((node): node is BasesImportedFilterNode => node !== undefined);
		return children.length > 0 ? { type: 'group', logic: 'and', children, enabled: true } : undefined;
	}

	if (!isRecord(filter)) return undefined;

	const groupEntry = Object.entries(filter).find(([key]) => isGroupKey(key));
	if (!groupEntry) {
		reportUnsupported(JSON.stringify(filter), source, report, 'unsupported Bases filter object');
		return undefined;
	}

	const [logic, childrenValue] = groupEntry as [BasesGroupLogic, unknown];
	const childValues = Array.isArray(childrenValue) ? childrenValue : [childrenValue];
	const children = childValues
		.map((child) => convertFilter(child, source, report))
		.filter((node): node is BasesImportedFilterNode => node !== undefined);

	return children.length > 0 ? { type: 'group', logic, children, enabled: true } : undefined;
}

function convertExpression(
	expression: string,
	source: BasesImportSource,
	report: BasesInteropReport
): FilterRule | undefined {
	const trimmed = expression.trim();
	const equality = /^([A-Za-z_][\w.-]*)\s*==\s*(?:"([^"]*)"|'([^']*)')$/.exec(trimmed);
	if (equality && !equality[1].startsWith('file.')) {
		return appliedRule(trimmed, source, report, {
			type: 'rule',
			filterType: 'specific_value',
			property: equality[1],
			values: [equality[2] ?? equality[3] ?? ''],
			enabled: true,
		});
	}

	const hasTag = /^file\.hasTag\(\s*(?:"([^"]+)"|'([^']+)')\s*\)$/.exec(trimmed);
	if (hasTag) {
		return appliedRule(trimmed, source, report, {
			type: 'rule',
			filterType: 'has_tag',
			property: 'tags',
			values: [hasTag[1] ?? hasTag[2] ?? ''],
			enabled: true,
		});
	}

	const inFolder = /^file\.inFolder\(\s*(?:"([^"]+)"|'([^']+)')\s*\)$/.exec(trimmed);
	if (inFolder) {
		return appliedRule(trimmed, source, report, {
			type: 'rule',
			filterType: 'file_folder',
			property: 'file.folder',
			values: [inFolder[1] ?? inFolder[2] ?? ''],
			enabled: true,
		});
	}

	reportUnsupported(trimmed, source, report, 'unsupported Bases expression');
	return undefined;
}

function appliedRule(
	expression: string,
	source: BasesImportSource,
	report: BasesInteropReport,
	rule: FilterRule
): FilterRule {
	const applied: BasesAppliedExpression = {
		expression,
		sourcePath: source.sourcePath,
		targetViewName: source.targetViewName,
		blockIndex: source.blockIndex,
		filterType: rule.filterType,
		property: rule.property,
		values: rule.values,
	};
	report.applied.push(applied);
	return rule;
}

function reportUnsupported(
	expression: string,
	source: BasesImportSource,
	report: BasesInteropReport,
	reason: string
): void {
	const unsupported: BasesUnsupportedExpression = {
		expression,
		sourcePath: source.sourcePath,
		targetViewName: source.targetViewName,
		blockIndex: source.blockIndex,
		reason,
		preserved: true,
	};
	report.unsupported.push(unsupported);
}

function isGroupKey(key: string): key is BasesGroupLogic {
	return GROUP_KEYS.has(key as BasesGroupLogic);
}

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
