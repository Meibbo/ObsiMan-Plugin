import type { App } from 'obsidian';
import type { ICSSSnippetsIndex, SnippetNode } from '../types/typeContracts';
import { getCustomCss } from '../types/typeObsidian';
import { createNodeIndex } from './indexNodeCreate';

export function createCSSSnippetsIndex(app?: App): ICSSSnippetsIndex {
	return createNodeIndex<SnippetNode>({
		debugName: 'snippets',
		build: async () => {
			if (!app) return [];
			const customCss = getCustomCss(app);
			const listed = customCss?.snippets;
			const names =
				Array.isArray(listed) && listed.length > 0
					? listed
					: await listSnippetNamesFromAdapter(app, customCss?.getSnippetsFolder?.());
			const enabled = customCss?.enabledSnippets ?? new Set<string>();
			return [...new Set(names)]
				.map((name) => name.trim())
				.filter(Boolean)
				.sort((a, b) => a.localeCompare(b))
				.map((name) => ({
					id: name,
					name,
					enabled: enabled.has(name),
				}));
		},
	});
}

async function listSnippetNamesFromAdapter(
	app: App,
	configuredFolder: string | undefined,
): Promise<string[]> {
	const folder = configuredFolder || `${app.vault.configDir}/snippets`;
	try {
		const listed = await app.vault.adapter.list(folder);
		return listed.files
			.filter((path) => path.toLowerCase().endsWith('.css'))
			.map((path) => path.split('/').pop() ?? path)
			.map((name) => name.replace(/\.css$/i, ''));
	} catch {
		return [];
	}
}
