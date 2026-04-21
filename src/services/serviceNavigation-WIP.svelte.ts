/* global $state, $derived */
/**
 * Service to manage hierarchical navigation (Pages and Tabs).
 * Ensures scalability for future "LogicLayout" integrations.
 */
export class NavigationService {
  // Primary navigation (PillFab / Bottom)
  activePage = $state("");
  pageOrder = $state<string[]>([]);
  
  // Secondary navigation (NavbarPages / Top)
  activeTab = $state("");
  tabOrder = $state<string[]>([]);

  // Derived indices for layout calculations
  pageIndex = $derived(this.pageOrder.indexOf(this.activePage));
  tabIndex = $derived(this.tabOrder.indexOf(this.activeTab));

  constructor() {
    // Initialize with the requested "Swap" configuration
    // Default Data Order (Bottom)
    this.pageOrder = ["props", "files", "tags"];
    this.activePage = this.pageOrder[0];

    // Default Tool Order (Top)
    this.tabOrder = ["filters", "statistics", "ops"];
    this.activeTab = this.tabOrder[0];
  }

  /**
   * Safe navigation to a specific page.
   */
  navigateToPage(id: string) {
    if (this.pageOrder.includes(id)) {
      this.activePage = id;
    }
  }

  /**
   * Safe navigation to a specific tab.
   */
  navigateToTab(id: string) {
    if (this.tabOrder.includes(id)) {
      this.activeTab = id;
    }
  }

  /**
   * Swaps items in the page order (Drag and Drop logic).
   */
  reorderPage(fromIdx: number, toIdx: number) {
    const newOrder = [...this.pageOrder];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    this.pageOrder = newOrder;
    
    // Future: Persist order to settings
    // this.#plugin.settings.pageOrder = newOrder;
    // this.#plugin.saveSettings();
  }
}
