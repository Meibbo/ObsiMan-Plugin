/* global $state, $derived */
import type { VaultmanPlugin } from "../main";
import type { FilterGroup } from "../types/typeFilter";

/**
 * Service to manage reactive statistics across the plugin.
 * Follows Svelte 5 class-based state pattern.
 */
export class StatsService {
  #plugin: VaultmanPlugin;

  // Primary stats
  selectedCount = $state(0);
  queuedCount = $state(0);
  filterRuleCount = $state(0);

  // Derived stats
  addOpCount = $derived.by(() => {
    let count = 0;
    for (const vfs of this.#plugin.queueService.listTransactions()) {
      for (const op of vfs.ops) {
        if (op.action === "add") count++;
      }
    }
    return count;
  });

  constructor(plugin: VaultmanPlugin) {
    this.#plugin = plugin;
    this.refresh();
  }

  /**
   * Recalculates stats that are not automatically derived.
   */
  refresh() {
    this.queuedCount = this.#plugin.queueService.fileCount;
    const filter = this.#plugin.filterService.activeFilter;
    if (filter) {
      this.filterRuleCount = this.countFilterLeaves(filter);
    } else {
      this.filterRuleCount = 0;
    }
  }

  private countFilterLeaves(group: FilterGroup): number {
    if (!group || !group.children) return 0;
    let count = 0;
    for (const child of group.children) {
      if (child.type === "rule") count++;
      else if (child.type === "group") count += this.countFilterLeaves(child);
    }
    return count;
  }
}
