import type { App } from 'obsidian';
import type { IPropsIndex, PropNode } from '../types/typeContracts';
import { createNodeIndex } from './indexNodeCreate';

export function createPropsIndex(app: App): IPropsIndex {
	return createNodeIndex<PropNode>({
		build: () => {
			const acc = new Map<string, { values: Set<string>; files: Set<string> }>();
			for (const file of app.vault.getMarkdownFiles()) {
				const fm = app.metadataCache.getFileCache(file)?.frontmatter;
				if (!fm) continue;
				for (const [key, val] of Object.entries(fm)) {
					if (key === 'position') continue;
					let entry = acc.get(key);
					if (!entry) {
						entry = { values: new Set(), files: new Set() };
						acc.set(key, entry);
					}
					entry.files.add(file.path);
					if (Array.isArray(val)) {
						for (const v of val) entry.values.add(String(v));
					} else if (val !== null && val !== undefined) {
						entry.values.add(String(val));
					}
				}
			}
			return Array.from(acc.entries()).map(([property, e]) => ({
				id: property,
				property,
				values: Array.from(e.values),
				fileCount: e.files.size,
			}));
		},
	});
}
