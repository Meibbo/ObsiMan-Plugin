/**
 * Centralized UI shell config: tab definitions for the Filters page.
 * `navbarPages.svelte` consumes this via props (kept agnostic, see A.4.2).
 */

export const FILTERS_TABS_CONFIG = [
  { id: 'props', icon: 'lucide-book-plus', labelKey: 'filter.tab.props' },
  { id: 'files', icon: 'lucide-files', labelKey: 'filter.tab.files' },
  { id: 'tags', icon: 'lucide-tags', labelKey: 'filter.tab.tags' },
  { id: 'content', icon: 'lucide-text-cursor-input', labelKey: 'filter.tab.content' },
] as const;

export type FiltersTab = typeof FILTERS_TABS_CONFIG[number]['id'];

export interface TabConfig {
  id: string;
  icon: string;
  labelKey: string;
}
