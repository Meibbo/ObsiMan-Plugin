/** Filter types matching the Python pkm_manager filter system */

export type FilterType =
	| 'has_property'
	| 'missing_property'
	| 'specific_value'
	| 'multiple_values'
	| 'folder'
	| 'folder_exclude'
	| 'file_name'
	| 'file_name_exclude'
	| 'file_path'
	| 'file_folder' // matches folder path only (not filename)
	| 'has_tag'; // matches files with a specific tag

export type GroupLogic = 'and' | 'or' | 'not';
export type LegacyGroupLogic = 'all' | 'any' | 'none';
export type AnyGroupLogic = GroupLogic | LegacyGroupLogic;

export function normalizeGroupLogic(logic: AnyGroupLogic): GroupLogic {
	if (logic === 'all') return 'and';
	if (logic === 'any') return 'or';
	if (logic === 'none') return 'not';
	return logic;
}

export interface FilterGroup {
	type: 'group';
	logic: AnyGroupLogic;
	children: FilterNode[];
	id?: string;
	label?: string;
	kind?: string;
	enabled?: boolean;
}

export interface FilterRule {
	type: 'rule';
	filterType: FilterType;
	property: string;
	values: string[];
	id?: string;
	enabled?: boolean;
}

export type FilterNode = FilterGroup | FilterRule;

export interface FilterTemplate {
	name: string;
	root: FilterGroup;
}
