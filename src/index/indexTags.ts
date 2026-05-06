import type { App } from 'obsidian';
import type { TagNode, ITagsIndex } from '../types/typeContracts';
import { createNodeIndex } from './indexNodeCreate';

export function createTagsIndex(app: App): ITagsIndex {
	return createNodeIndex<TagNode>({
		build: () => {
			const counts = new Map<string, number>();
			for (const file of app.vault.getMarkdownFiles()) {
				const cache = app.metadataCache.getFileCache(file);
				if (!cache) continue;
				const tags = (cache.tags ?? []).map((t) => t.tag);
				for (const t of tags) {
					counts.set(t, (counts.get(t) ?? 0) + 1);
				}
			}
			return Array.from(counts.entries()).map(([tag, count]) => ({
				id: tag,
				tag,
				count,
				parent: tag.includes('/')
					? '#' + tag.slice(1).split('/').slice(0, -1).join('/')
					: undefined,
			}));
		},
	});
}
