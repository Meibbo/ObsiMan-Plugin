// src/components/UnifiedTreeView.ts
import { setIcon } from 'obsidian';
import type { TreeNode } from '../types/tree';

export interface TreeViewOptions {
	nodes: TreeNode[];
	expandedIds: Set<string>;
	onToggle: (id: string) => void;
	onRowClick: (id: string) => void;
	onContextMenu: (id: string, e: MouseEvent) => void;
	activeFilterIds?: Set<string>;
	searchHighlightIds?: Set<string>;
	warningIds?: Set<string>;        // nodes with type-incompatible badge
	renderLimit?: number;
}

const RENDER_LIMIT = 200;

export class UnifiedTreeView {
	private containerEl: HTMLElement;
	private rowEls = new Map<string, HTMLElement>();
	private _pendingRaf: number | null = null;

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}

	render(opts: TreeViewOptions): void {
		if (this._pendingRaf !== null) {
			cancelAnimationFrame(this._pendingRaf);
		}

		this.containerEl.empty();
		this.rowEls.clear();
		let rendered = 0;
		const limit = opts.renderLimit ?? RENDER_LIMIT;

		const renderNodes = (nodes: TreeNode[], parent: HTMLElement) => {
			for (const node of nodes) {
				if (rendered >= limit) break;
				this._renderRow(node, parent, opts);
				rendered++;
				if (node.children?.length && opts.expandedIds.has(node.id)) {
					const childWrap = parent.createDiv({ cls: 'obsiman-tree-children' });
					renderNodes(node.children, childWrap);
				}
			}
		};

		this._pendingRaf = requestAnimationFrame(() => {
			renderNodes(opts.nodes, this.containerEl);
			this._pendingRaf = null;
			if (opts.nodes.length > limit) {
				this._renderShowMore(opts);
			}
		});
	}

	/** Toggle visibility of rows matching/not matching filtered IDs — no DOM rebuild */
	updateVisibility(visibleIds: Set<string>): void {
		for (const [id, el] of this.rowEls) {
			el.toggleClass('is-hidden', !visibleIds.has(id));
		}
	}

	private _renderRow(node: TreeNode, parent: HTMLElement, opts: TreeViewOptions): void {
		const hasChildren = (node.children?.length ?? 0) > 0;
		const isExpanded = opts.expandedIds.has(node.id);
		const isActive = opts.activeFilterIds?.has(node.id) ?? false;
		const isWarning = opts.warningIds?.has(node.id) ?? false;

		const row = parent.createDiv({ cls: 'obsiman-tree-row' });
		row.dataset.id = node.id;
		row.style.setProperty('--depth', String(node.depth));
		if (isActive) row.addClass('is-active-filter');
		if (isWarning) row.addClass('obsiman-badge-warning');

		this.rowEls.set(node.id, row);

		// Chevron / spacer
		const toggleSpan = row.createSpan({ cls: 'obsiman-tree-toggle' });
		if (hasChildren) {
			setIcon(toggleSpan, isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right');
			toggleSpan.addEventListener('click', (e) => {
				e.stopPropagation();
				opts.onToggle(node.id);
			});
		}
		// BUG-10: Leaf nodes leave toggleSpan empty (just a flex spacer)

		// Icon
		const iconSpan = row.createSpan({ cls: 'obsiman-tree-icon' });
		if (node.icon) setIcon(iconSpan, node.icon);

		// Label
		row.createSpan({ cls: 'obsiman-tree-label', text: node.label });

		// Count badge
		if (node.count != null && node.count > 0) {
			row.createSpan({ cls: 'obsiman-tree-count', text: String(node.count) });
		}

		// Click + context menu
		row.addEventListener('click', () => opts.onRowClick(node.id));
		row.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			e.stopPropagation(); // BUG-2: Stop propagation to prevent Obsidian's default menu override
			opts.onContextMenu(node.id, e);
		});
	}

	private _renderShowMore(opts: TreeViewOptions): void {
		const btn = this.containerEl.createEl('button', {
			cls: 'obsiman-btn-small obsiman-show-more',
			text: `Show all ${opts.nodes.length} items…`,
		});
		btn.addEventListener('click', () => {
			this.render({ ...opts, renderLimit: Infinity });
		});
	}
}
