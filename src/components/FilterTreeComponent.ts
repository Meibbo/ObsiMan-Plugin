import type { FilterGroup, FilterNode, FilterRule } from '../types/filter';
import { translate } from '../i18n/index';

/**
 * Renders a boolean filter tree as nested DOM elements.
 * Supports add/remove/edit callbacks for interactive manipulation.
 */
export class FilterTreeComponent {
	private containerEl: HTMLElement;
	private onRemove: (node: FilterNode, parent: FilterGroup) => void;

	constructor(
		containerEl: HTMLElement,
		onRemove: (node: FilterNode, parent: FilterGroup) => void
	) {
		this.containerEl = containerEl;
		this.onRemove = onRemove;
	}

	render(root: FilterGroup): void {
		this.containerEl.empty();
		this.renderGroup(root, this.containerEl, null);
	}

	private renderGroup(
		group: FilterGroup,
		parentEl: HTMLElement,
		parentGroup: FilterGroup | null
	): void {
		const groupEl = parentEl.createDiv({ cls: 'obsiman-filter-group' });

		// Group header
		const headerEl = groupEl.createDiv({ cls: 'obsiman-filter-group-header' });

		const logicLabel = translate(`filter.logic.${group.logic}`);
		headerEl.createSpan({
			cls: 'obsiman-filter-logic-badge',
			text: logicLabel,
		});

		// Remove button (not for root group)
		if (parentGroup) {
			const removeBtn = headerEl.createEl('button', {
				cls: 'obsiman-filter-remove-btn clickable-icon',
				attr: { 'aria-label': 'Remove group' },
			});
			removeBtn.setText('×');
			removeBtn.addEventListener('click', () =>
				this.onRemove(group, parentGroup)
			);
		}

		// Children
		const childrenEl = groupEl.createDiv({ cls: 'obsiman-filter-children' });
		for (const child of group.children) {
			if (child.type === 'group') {
				this.renderGroup(child, childrenEl, group);
			} else {
				this.renderRule(child, childrenEl, group);
			}
		}

		if (group.children.length === 0) {
			childrenEl.createDiv({
				cls: 'obsiman-filter-empty',
				text: '(empty)',
			});
		}
	}

	private renderRule(
		rule: FilterRule,
		parentEl: HTMLElement,
		parentGroup: FilterGroup
	): void {
		const ruleEl = parentEl.createDiv({ cls: 'obsiman-filter-rule' });

		const typeLabel = translate(`filter.${rule.filterType}`);
		const detail =
			rule.filterType === 'folder' ||
			rule.filterType === 'folder_exclude' ||
			rule.filterType === 'file_name' ||
			rule.filterType === 'file_name_exclude'
				? rule.values[0] ?? ''
				: `${rule.property}${rule.values.length > 0 ? ' = ' + rule.values.join(', ') : ''}`;

		ruleEl.createSpan({
			cls: 'obsiman-filter-rule-type',
			text: typeLabel,
		});
		ruleEl.createSpan({
			cls: 'obsiman-filter-rule-detail',
			text: detail,
		});

		const removeBtn = ruleEl.createEl('button', {
			cls: 'obsiman-filter-remove-btn clickable-icon',
			attr: { 'aria-label': 'Remove filter' },
		});
		removeBtn.setText('×');
		removeBtn.addEventListener('click', () =>
			this.onRemove(rule, parentGroup)
		);
	}
}
