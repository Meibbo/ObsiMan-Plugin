import type { App } from 'obsidian';

/**
 * Typed access to Obsidian's internal/undocumented APIs.
 * All `(app as any)` casts in src/ MUST migrate to this wrapper.
 * See ADR-004.
 */

export interface ExtendedApp extends App {
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
  plugins?: {
    plugins: Record<string, unknown>;
    getPlugin?: (id: string) => unknown;
  };
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

/** Probe an internal plugin by id. */
export function getInternalPlugin<T = unknown>(app: App, id: string): T | undefined {
  return extApp(app).internalPlugins?.plugins[id]?.instance as T | undefined;
}

/** Probe a community plugin by id. */
export function getCommunityPlugin<T = unknown>(app: App, id: string): T | undefined {
  return extApp(app).plugins?.plugins[id] as T | undefined;
}
