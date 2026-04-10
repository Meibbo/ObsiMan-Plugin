import { Component, setIcon } from 'obsidian';
import type { ObsiManPlugin } from '../../main';

interface TagNode {
	name: string;     // full tag path e.g. "parent/child"
	label: string;    // display label e.g. "child"
	count: number;    // occurrences in vault
	children: TagNode[];
}

export class TagsExplorerComponent extends Component {
	private containerEl: HTMLElement;
	private plugin: ObsiManPlugin;
	private treeEl: HTMLElement | null = null;
	private expandedNodes = new Set<string>();
	private searchTerm = '';
	private searchMode: 'all' | 'leaf' = 'all';

	constructor(containerEl: HTMLElement, plugin: ObsiManPlugin) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
	}

	onload(): void {
		this.treeEl = this.containerEl.createDiv({ cls: 'obsiman-tags-tree' });
		this.render();
		this.registerEvent(
			this.plugin.app.metadataCache.on('resolved', () => this.render())
		);
	}

	onunload(): void {
		this.treeEl?.remove();
		this.treeEl = null;
	}

	render(): void {
		if (!this.treeEl) return;
		this.treeEl.empty();
		const root = this.buildTree();
		if (this.searchMode === 'leaf') {
			for (const node of this.collectLeafNodes(root)) {
				const depth = node.name.split('/').length - 1;
				this.renderNode(this.treeEl, node, depth);
			}
			return;
		}

		for (const node of root) {
			this.renderNode(this.treeEl, node, 0);
		}
	}

	/** Set an external search term (from the Filters header search pill) and re-render.
	 *  @param mode 'all' shows all tags, 'leaf' shows only true leaf tags in the hierarchy.
	 */
	setSearchTerm(term: string, mode: 'all' | 'leaf' = 'all'): void {
		this.searchTerm = term;
		this.searchMode = mode;
		this.render();
	}

	private buildTree(): TagNode[] {
		// getTags() exists at runtime but is not in the official TS types
		const rawTags = (this.plugin.app.metadataCache as unknown as { getTags(): Record<string, number> }).getTags() ?? {};
		// rawTags: { '#parent/child': count, ... }
		const root: TagNode[] = [];
		const nodeMap = new Map<string, TagNode>();

		const allEntries = Object.entries(rawTags).sort(([a], [b]) => a.localeCompare(b));

		for (const [tagWithHash, count] of allEntries) {
			const fullPath = tagWithHash.replace(/^#/, '');
			const parts = fullPath.split('/');

			let currentPath = '';
			let currentLevel = root;

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				currentPath = currentPath ? `${currentPath}/${part}` : part;

				if (!nodeMap.has(currentPath)) {
					const node: TagNode = {
						name: currentPath,
						label: part,
						count: i === parts.length - 1 ? count : 0,
						children: [],
					};
					nodeMap.set(currentPath, node);
					currentLevel.push(node);
				} else if (i === parts.length - 1) {
					// update count for leaf
					const existing = nodeMap.get(currentPath)!;
					existing.count += count;
				}

				currentLevel = nodeMap.get(currentPath)!.children;
			}
		}

		return root;
	}

	private collectLeafNodes(nodes: TagNode[]): TagNode[] {
		const term = this.searchTerm.toLowerCase();
		const leaves: TagNode[] = [];

		for (const node of nodes) {
			if (node.children.length === 0) {
				if (!term || node.name.toLowerCase().includes(term)) {
					leaves.push({ ...node, children: [] });
				}
				continue;
			}

			leaves.push(...this.collectLeafNodes(node.children));
		}

		return leaves;
	}

	private renderNode(parent: HTMLElement, node: TagNode, depth: number): void {
		const isExpanded = this.expandedNodes.has(node.name);
		const hasChildren = node.children.length > 0;
		const isActiveFilter = this.plugin.filterService.hasTagFilter(node.name);

		const row = parent.createDiv({ cls: 'obsiman-tags-row' });
		if (isActiveFilter) row.addClass('is-active-filter');
		row.style.setProperty('--depth', String(depth));

		// Pulse animation if matching search term
		if (this.searchTerm && node.name.toLowerCase().includes(this.searchTerm.toLowerCase())) {
			row.addClass('obsiman-search-highlight');
			setTimeout(() => { if (row && row.parentElement) row.removeClass('obsiman-search-highlight'); }, 800);
		}

		// Toggle chevron
		const toggleSpan = row.createSpan({ cls: 'obsiman-tags-toggle' });
		if (hasChildren) {
			setIcon(toggleSpan, isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right');
			toggleSpan.addEventListener('click', (e) => {
				e.stopPropagation();
				if (this.expandedNodes.has(node.name)) {
					this.expandedNodes.delete(node.name);
				} else {
					this.expandedNodes.add(node.name);
				}
				this.render();
			});
		} else {
			setIcon(toggleSpan, 'lucide-dot');
		}

		// Tag icon
		const iconSpan = row.createSpan({ cls: 'obsiman-tags-icon' });
		setIcon(iconSpan, 'lucide-tag');

		// Label
		row.createSpan({ cls: 'obsiman-tags-label', text: node.label });

		// Count badge
		if (node.count > 0) {
			row.createSpan({ cls: 'obsiman-tags-count', text: String(node.count) });
		}

		// Click → add has_tag filter
		row.addEventListener('click', () => {
			void this.plugin.filterService.addNode({
				type: 'rule',
				filterType: 'has_tag',
				property: '',
				values: [`#${node.name}`],
			});
		});

		// Render children if expanded
		if (hasChildren && isExpanded) {
			const childrenEl = parent.createDiv({ cls: 'obsiman-tags-children' });
			for (const child of node.children) {
				this.renderNode(childrenEl, child, depth + 1);
			}
		}
	}
}
