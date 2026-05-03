import type { IActiveFiltersIndex, ActiveFilterEntry, IFilterService } from '../types/contracts';
import type { FilterGroup, FilterRule } from '../types/typeFilter';
import { createNodeIndex } from './createNodeIndex';

function flatten(group: FilterGroup): FilterRule[] {
	const out: FilterRule[] = [];
	const walk = (g: FilterGroup): void => {
		for (const child of g.children) {
			if (child.type === 'rule') out.push(child);
			else walk(child);
		}
	};
	walk(group);
	return out;
}

export function createActiveFiltersIndex(filter: IFilterService): IActiveFiltersIndex {
	const base = createNodeIndex<ActiveFilterEntry>({
		build: () =>
			flatten(filter.activeFilter).map((rule, i) => ({
				id: rule.id ?? `rule-${i}`,
				rule,
			})),
	});
	filter.subscribe(() => { void base.refresh(); });
	return base;
}
