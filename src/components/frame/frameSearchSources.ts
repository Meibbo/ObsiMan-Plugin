export type SearchSemanticsSource = {
	id: string;
	label: string;
	href: string;
};

export const SEARCH_SEMANTICS_SOURCES: SearchSemanticsSource[] = [
	{
		id: 'obsidian-search',
		label: 'Obsidian Search',
		href: 'https://obsidian.md/help/Plugins/Search',
	},
	{
		id: 'obsidian-bases',
		label: 'Obsidian Bases',
		href: 'https://obsidian.md/help/bases/syntax',
	},
	{
		id: 'dataview-dql',
		label: 'Dataview DQL',
		href: 'https://blacksmithgu.github.io/obsidian-dataview/queries/dql-js-inline/',
	},
	{
		id: 'javascript-replace',
		label: 'JavaScript replace',
		href: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace',
	},
	{
		id: 'ant-renamer',
		label: 'Ant Renamer',
		href: 'https://www.antp.be/doc/renamer/regexp_en.html',
	},
	{
		id: 'notebook-navigator',
		label: 'Notebook Navigator',
		href: 'https://github.com/johansan/notebook-navigator',
	},
];
