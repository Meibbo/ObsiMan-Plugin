import type { FilterGroup, FilterNode } from '../../types/typeFilter';
import type { IFilterService } from '../../types/typeContracts';

export type ActiveFilterRule = {
	id: string;
	description: string;
	node: FilterNode;
	parent: FilterGroup;
	enabled: boolean;
};

export function countFilterLeaves(group: FilterGroup): number {
	let count = 0;
	for (const child of group.children) {
		if (child.type === 'rule') count++;
		else if (child.type === 'group') count += countFilterLeaves(child);
	}
	return count;
}

export function countActiveFilterEntries(filter: IFilterService): number {
	return countFilterLeaves(filter.activeFilter) + (filter.getSearchFilterRules?.().length ?? 0);
}

export function collectActiveFilterRules(group: FilterGroup): ActiveFilterRule[] {
	const rules: ActiveFilterRule[] = [];
	let counter = 0;

	function walk(current: FilterGroup): void {
		for (const child of current.children) {
			if (child.type === 'rule') {
				rules.push({
					id: `rule-${counter++}`,
					description: describeFilterNode(child),
					node: child,
					parent: current,
					enabled: child.enabled !== false,
				});
			} else if (child.type === 'group') {
				walk(child);
			}
		}
	}

	walk(group);
	return rules;
}

export function describeFilterNode(node: FilterNode): string {
	if (node.type !== 'rule') return 'Group';
	const prop = node.property ?? '';
	const vals = node.values ?? [];
	switch (node.filterType) {
		case 'has_property':
			return `has: ${prop}`;
		case 'specific_value':
			return `${prop}: ${vals[0] ?? ''}`;
		case 'has_tag':
			return `has tag: ${vals[0] ?? ''}`;
		case 'folder':
			return `folder: ${vals[0] ?? ''}`;
		case 'file_name':
			return `name: ${vals[0] ?? ''}`;
		case 'file_path':
			return `file: ${vals[0] ?? ''}`;
		case 'file_folder':
			return `folder: ${vals[0] ?? ''}`;
		default:
			return prop || 'filter';
	}
}
