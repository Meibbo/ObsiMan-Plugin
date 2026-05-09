import type { App } from 'obsidian';
import type { IPropsIndex, PropNode } from '../types/typeContracts';
import { createNodeIndex } from './indexNodeCreate';

export function createPropsIndex(app: App): IPropsIndex {
	return createNodeIndex<PropNode>({
		build: () => {
			const acc = new Map<string, { values: Map<string, number>; files: Set<string> }>();
			for (const file of app.vault.getMarkdownFiles()) {
				const fm = app.metadataCache.getFileCache(file)?.frontmatter;
				if (!fm) continue;
				for (const [key, val] of Object.entries(fm)) {
					if (key === 'position') continue;
					let entry = acc.get(key);
					if (!entry) {
						entry = { values: new Map(), files: new Set() };
						acc.set(key, entry);
					}
					entry.files.add(file.path);
					const vals = Array.isArray(val) ? val : [val];
					for (const v of vals) {
						if (v == null) continue;
						const str = String(v);
						entry.values.set(str, (entry.values.get(str) ?? 0) + 1);
					}
				}
			}
			return Array.from(acc.entries()).map(([property, e]) => ({
				id: property,
				property,
				values: Array.from(e.values.keys()),
				valueFrequencies: Object.fromEntries(e.values),
				fileCount: e.files.size,
			}));
		},
	});
}
