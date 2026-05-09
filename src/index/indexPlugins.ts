import type { App } from 'obsidian';
import type { ICommunityPluginsIndex, PluginNode } from '../types/typeContracts';
import { getCommunityPlugins } from '../types/typeObsidian';
import { createNodeIndex } from './indexNodeCreate';

export function createCommunityPluginsIndex(app?: App): ICommunityPluginsIndex {
	return createNodeIndex<PluginNode>({
		debugName: 'plugins',
		build: () => {
			if (!app) return [];
			const plugins = getCommunityPlugins(app);
			const manifests = plugins?.manifests ?? {};
			const enabled = plugins?.enabledPlugins ?? new Set<string>();
			const runtime = plugins?.plugins ?? {};
			return Object.values(manifests)
				.map((manifest) => ({
					id: manifest.id,
					pluginId: manifest.id,
					name: manifest.name,
					version: manifest.version,
					author: manifest.author,
					description: manifest.description,
					isDesktopOnly: manifest.isDesktopOnly,
					enabled: enabled.has(manifest.id),
					loaded: runtime[manifest.id]?._loaded ?? false,
				}))
				.sort((a, b) => a.name.localeCompare(b.name) || a.pluginId.localeCompare(b.pluginId));
		},
	});
}
