import type { App } from 'obsidian';

/**
 * Typed access to Obsidian's internal/undocumented APIs.
 * All `(app as any)` casts in src/ MUST migrate to this wrapper.
 * See ADR-004.
 */

type MaybePromise<T> = T | Promise<T>;

export interface ObsidianCustomCss {
	snippets?: string[];
	enabledSnippets?: Set<string>;
	setCssEnabledStatus?: (snippet: string, enabled: boolean) => MaybePromise<void>;
	getSnippetsFolder?: () => string;
	getSnippetPath?: (snippet: string) => string;
	requestLoadSnippets?: () => MaybePromise<void>;
}

export interface ObsidianCommunityPluginManifest {
	id: string;
	name: string;
	version?: string;
	author?: string;
	description?: string;
	isDesktopOnly?: boolean;
	minAppVersion?: string;
}

export interface ObsidianCommunityPluginInstance {
	_loaded?: boolean;
	manifest?: ObsidianCommunityPluginManifest;
}

export interface ObsidianCommunityPlugins {
	manifests?: Record<string, ObsidianCommunityPluginManifest>;
	enabledPlugins?: Set<string>;
	plugins?: Record<string, ObsidianCommunityPluginInstance>;
	getPlugin?: (id: string) => unknown;
	enablePlugin?: (id: string) => MaybePromise<void>;
	enablePluginAndSave?: (id: string) => MaybePromise<void>;
	disablePluginAndSave?: (id: string) => MaybePromise<void>;
}

export interface ExtendedApp extends App {
	customCss?: ObsidianCustomCss;
	setting?: {
		open?: () => void;
		openTabById?: (id: string) => void;
	};
	commands?: {
		executeCommandById?: (id: string) => boolean;
		listCommands?: () => Array<{ id: string; name: string }>;
	};
	internalPlugins?: {
		plugins: Record<string, { instance?: unknown; enabled: boolean }>;
	};
	plugins?: ObsidianCommunityPlugins;
}

export function extApp(app: App): ExtendedApp {
	// App is structurally compatible with ExtendedApp (which only adds optional fields),
	// but we need an explicit cast to expose the internal API surface.
	return app;
}

/** Open the Obsidian Settings modal at a specific tab. */
export function openPluginSettings(app: App, tabId: string): void {
	const ext = extApp(app);
	ext.setting?.open?.();
	ext.setting?.openTabById?.(tabId);
}

/** Run an Obsidian command by id. Returns true if it dispatched. */
export function runCommand(app: App, id: string): boolean {
	return extApp(app).commands?.executeCommandById?.(id) ?? false;
}

/** Probe Obsidian's internal custom CSS/snippets surface. */
export function getCustomCss(app: App): ObsidianCustomCss | undefined {
	return extApp(app).customCss;
}

/** Toggle a CSS snippet through Obsidian's internal custom CSS service. */
export async function setCssSnippetEnabled(
	app: App,
	snippet: string,
	enabled: boolean,
): Promise<boolean> {
	const customCss = getCustomCss(app);
	if (!customCss?.setCssEnabledStatus) return false;
	await customCss.setCssEnabledStatus(snippet, enabled);
	await customCss.requestLoadSnippets?.();
	return true;
}

/** Probe an internal plugin by id. */
export function getInternalPlugin<T = unknown>(app: App, id: string): T | undefined {
	return extApp(app).internalPlugins?.plugins[id]?.instance as T | undefined;
}

/** Probe a community plugin by id. */
export function getCommunityPlugin<T = unknown>(app: App, id: string): T | undefined {
	return extApp(app).plugins?.plugins?.[id] as T | undefined;
}

/** Probe Obsidian's internal community plugin manager. */
export function getCommunityPlugins(app: App): ObsidianCommunityPlugins | undefined {
	return extApp(app).plugins;
}

/** Read a community plugin manifest by stable plugin id. */
export function getCommunityPluginManifest(
	app: App,
	id: string,
): ObsidianCommunityPluginManifest | undefined {
	return getCommunityPlugins(app)?.manifests?.[id];
}

/** Return whether a community plugin is enabled in Obsidian settings. */
export function isCommunityPluginEnabled(app: App, id: string): boolean {
	return getCommunityPlugins(app)?.enabledPlugins?.has(id) ?? false;
}

/** Return whether a community plugin is currently loaded in this session. */
export function isCommunityPluginLoaded(app: App, id: string): boolean {
	return getCommunityPlugins(app)?.plugins?.[id]?._loaded ?? false;
}

/** Toggle a community plugin through Obsidian's internal plugin manager. */
export async function setCommunityPluginEnabled(
	app: App,
	id: string,
	enabled: boolean,
): Promise<boolean> {
	const plugins = getCommunityPlugins(app);
	if (!plugins) return false;
	if (enabled) {
		if (plugins.enablePluginAndSave) {
			await plugins.enablePluginAndSave(id);
			return true;
		}
		if (plugins.enablePlugin) {
			await plugins.enablePlugin(id);
			return true;
		}
		return false;
	}
	if (!plugins.disablePluginAndSave) return false;
	await plugins.disablePluginAndSave(id);
	return true;
}
