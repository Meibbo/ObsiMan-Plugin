import type { App, TFile } from 'obsidian';
import { createNodeIndex } from './indexNodeCreate';
import {
	extractBasesFencedBlocks,
	previewBasesImport,
} from '../services/serviceBasesInterop';
import type { BasesImportTarget } from '../types/typeBasesInterop';
import type {
	BasesImportTargetNode,
	IBasesImportTargetsIndex,
} from '../types/typeContracts';

type UnknownRecord = Record<string, unknown>;

export function createBasesImportTargetsIndex(app: App): IBasesImportTargetsIndex {
	return createNodeIndex<BasesImportTargetNode>({
		build: async () => discoverBasesImportTargetNodes(app),
	});
}

async function discoverBasesImportTargetNodes(app: App): Promise<BasesImportTargetNode[]> {
	const nodes: BasesImportTargetNode[] = [];

	for (const file of app.vault.getFiles()) {
		const extension = getExtension(file);
		if (extension !== 'base' && extension !== 'md') continue;

		const content = await app.vault.read(file);
		const targets = extension === 'base'
			? discoverBaseFileTargets(file, content)
			: discoverMarkdownFenceTargets(file, content);

		if (targets.length === 0) continue;
		nodes.push({
			id: `bases-import:source:${file.path}`,
			path: file.path,
			label: file.basename || file.name || file.path,
			file,
			targets,
		});
	}

	return nodes;
}

function discoverBaseFileTargets(file: TFile, content: string): BasesImportTarget[] {
	const sourcePreview = previewBasesImport({
		sourcePath: file.path,
		content,
		kind: 'base-file',
	});
	if (sourcePreview.report.parseErrors.length > 0) return [];

	const views = getNamedViews(sourcePreview.rawConfig);
	if (views.length === 0) {
		return isCompatiblePreview(sourcePreview)
			? [{
				sourcePath: file.path,
				kind: 'base-file',
				label: file.basename || file.name || file.path,
				compatible: true,
				reasons: [],
			}]
			: [];
	}

	return views
		.map((targetViewName): BasesImportTarget | undefined => {
			const preview = previewBasesImport({
				sourcePath: file.path,
				content,
				targetViewName,
				kind: 'base-view',
			});
			return isCompatiblePreview(preview)
				? {
					sourcePath: file.path,
					kind: 'base-view' as const,
					targetViewName,
					label: targetViewName,
					compatible: true,
					reasons: [],
				}
				: undefined;
		})
		.filter((target): target is BasesImportTarget => target !== undefined);
}

function discoverMarkdownFenceTargets(file: TFile, content: string): BasesImportTarget[] {
	return extractBasesFencedBlocks(content)
		.map((block): BasesImportTarget | undefined => {
			const preview = previewBasesImport({
				sourcePath: file.path,
				content: block.rawContent,
				kind: 'markdown-fence',
				blockIndex: block.blockIndex,
				lineStart: block.lineStart,
			});
			if (!isCompatiblePreview(preview)) return undefined;
			return {
				sourcePath: file.path,
				kind: 'markdown-fence' as const,
				blockIndex: block.blockIndex,
				lineStart: block.lineStart,
				label: getFenceLabel(preview.rawConfig, block.blockIndex),
				compatible: true,
				reasons: [],
			};
		})
		.filter((target): target is BasesImportTarget => target !== undefined);
}

function isCompatiblePreview(preview: ReturnType<typeof previewBasesImport>): boolean {
	if (preview.report.parseErrors.length > 0) return false;
	if (preview.filter) return true;
	return getNamedViews(preview.rawConfig).length > 0;
}

function getNamedViews(config: UnknownRecord): string[] {
	if (!Array.isArray(config.views)) return [];
	const views: unknown[] = config.views;
	return views
		.map((view) => isRecord(view) && typeof view.name === 'string' ? view.name : undefined)
		.filter((name): name is string => Boolean(name));
}

function getFenceLabel(config: UnknownRecord, blockIndex: number): string {
	const names = getNamedViews(config);
	if (names.length === 1) return names[0];
	return `Bases block ${blockIndex + 1}`;
}

function getExtension(file: TFile): string {
	const extension = file.extension || file.path.split('.').pop() || '';
	return extension.toLowerCase();
}

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
