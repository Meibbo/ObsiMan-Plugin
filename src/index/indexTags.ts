import type { App } from 'obsidian';
import type { TagNode, ITagsIndex } from '../types/typeContracts';
import { createNodeIndex } from './indexNodeCreate';

type MetadataCacheWithTags = App['metadataCache'] & {
	getTags?: () => Record<string, number>;
};

export function createTagsIndex(app: App): ITagsIndex {
	return createNodeIndex<TagNode>({
		build: () => {
			const cache = app.metadataCache as MetadataCacheWithTags;
			const rawTags = typeof cache.getTags === 'function' ? cache.getTags() : {};

			let entries: [string, number][];
			if (Object.keys(rawTags).length > 0) {
				entries = Object.entries(rawTags);
			} else {
				// Fallback to manual scan if getTags() is empty or missing
				const counts = new Map<string, number>();
				for (const file of app.vault.getMarkdownFiles()) {
					const fileCache = app.metadataCache.getFileCache(file);
					if (!fileCache) continue;
					const tags = (fileCache.tags ?? []).map((t) => t.tag);
					for (const t of tags) {
						counts.set(t, (counts.get(t) ?? 0) + 1);
					}
				}
				entries = Array.from(counts.entries());
			}

			return entries.map(([tag, count]) => ({
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
