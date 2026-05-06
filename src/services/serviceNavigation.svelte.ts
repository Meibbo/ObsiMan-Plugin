/* global $state, $derived */
import type { IRouter } from '../types/typeContracts';

/**
 * Service to manage hierarchical navigation (Pages and Tabs).
 * Ensures scalability for future "LogicLayout" integrations.
 * Implements IRouter contract.
 */
export class NavigationService implements IRouter {
	// Primary navigation (PillFab / Bottom)
	activePage = $state('');
	pageOrder = $state<string[]>([]);

	// Secondary navigation (NavbarPages / Top)
	activeTab = $state('');
	tabOrder = $state<string[]>([]);

	// Derived indices for layout calculations
	pageIndex = $derived(this.pageOrder.indexOf(this.activePage));
	tabIndex = $derived(this.tabOrder.indexOf(this.activeTab));

	constructor() {
		// Default Page Order (AGENTS.md §7)
		this.pageOrder = ['ops', 'statistics', 'filters'];
		this.activePage = this.pageOrder[0];

		// Default Tab Order (Top)
		this.tabOrder = ['props', 'files', 'tags'];
		this.activeTab = this.tabOrder[0];
	}

	/**
	 * Safe navigation to a specific page.
	 */
	navigateToPage(id: string): void {
		if (this.pageOrder.includes(id)) {
			this.activePage = id;
		}
	}

	/**
	 * Safe navigation to a specific tab.
	 */
	navigateToTab(id: string): void {
		if (this.tabOrder.includes(id)) {
			this.activeTab = id;
		}
	}

	/**
	 * Swaps items in the page order (Drag and Drop logic).
	 */
	reorderPage(fromIdx: number, toIdx: number): void {
		const newOrder = [...this.pageOrder];
		const [moved] = newOrder.splice(fromIdx, 1);
		newOrder.splice(toIdx, 0, moved);
		this.pageOrder = newOrder;

		// Future: Persist order to settings
		// this.#plugin.settings.pageOrder = newOrder;
		// this.#plugin.saveSettings();
	}

	/**
	 * Swaps items in the tab order (Drag and Drop logic).
	 */
	reorderTab(fromIdx: number, toIdx: number): void {
		const newOrder = [...this.tabOrder];
		const [moved] = newOrder.splice(fromIdx, 1);
		newOrder.splice(toIdx, 0, moved);
		this.tabOrder = newOrder;
	}
}
