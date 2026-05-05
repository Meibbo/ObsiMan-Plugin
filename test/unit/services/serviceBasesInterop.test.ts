import { describe, expect, it } from 'vitest';
import { extractBasesFencedBlocks, previewBasesImport } from '../../../src/services/serviceBasesInterop';

describe('serviceBasesInterop', () => {
	it('imports global and view filters as an and group', () => {
		const preview = previewBasesImport({
			sourcePath: 'Projects.base',
			content: [
				'filters:',
				'  and:',
				'    - status == "open"',
				'views:',
				'  - type: table',
				'    name: Open',
				'    filters:',
				'      or:',
				'        - file.name.contains("Project")',
			].join('\n'),
			targetViewName: 'Open',
		});

		expect(preview.source.kind).toBe('base-view');
		expect(preview.rawConfig).toMatchObject({ views: [{ name: 'Open' }] });
		expect(preview.filter?.logic).toBe('and');
		expect(preview.filter?.children).toContainEqual(expect.objectContaining({
			type: 'rule',
			filterType: 'specific_value',
			property: 'status',
			values: ['open'],
		}));
		expect(preview.report.applied).toContainEqual(expect.objectContaining({
			expression: 'status == "open"',
			filterType: 'specific_value',
		}));
		expect(preview.report.unsupported).toContainEqual(expect.objectContaining({
			expression: 'file.name.contains("Project")',
			reason: expect.stringContaining('unsupported'),
			preserved: true,
		}));
	});

	it('combines supported global and supported view filters under a new and group', () => {
		const preview = previewBasesImport({
			sourcePath: 'Projects.base',
			content: [
				'filters:',
				'  and:',
				'    - status == "open"',
				'views:',
				'  - type: table',
				'    name: Projects',
				'    filters:',
				'      and:',
				'        - priority == "high"',
			].join('\n'),
			targetViewName: 'Projects',
		});

		expect(preview.filter).toMatchObject({
			type: 'group',
			logic: 'and',
			children: [
				expect.objectContaining({ type: 'group', logic: 'and' }),
				expect.objectContaining({ type: 'group', logic: 'and' }),
			],
		});
		expect(preview.filter?.children).toHaveLength(2);
		expect(preview.report.applied).toEqual([
			expect.objectContaining({ expression: 'status == "open"', property: 'status', values: ['open'] }),
			expect.objectContaining({ expression: 'priority == "high"', property: 'priority', values: ['high'] }),
		]);
	});

	it('represents a base view source distinctly from a whole base source', () => {
		const preview = previewBasesImport({
			sourcePath: 'Projects.base',
			content: [
				'views:',
				'  - type: table',
				'    name: Projects',
				'    filters:',
				'      and:',
				'        - status == "open"',
			].join('\n'),
			targetViewName: 'Projects',
		});

		expect(preview.source).toMatchObject({
			sourcePath: 'Projects.base',
			kind: 'base-view',
			targetViewName: 'Projects',
		});
	});

	it('applies supported children from a mixed group and preserves unsupported children in the report', () => {
		const preview = previewBasesImport({
			sourcePath: 'Mixed.base',
			content: [
				'filters:',
				'  and:',
				'    - status == "open"',
				'    - date <= today()',
			].join('\n'),
		});

		expect(preview.filter).toMatchObject({
			type: 'group',
			logic: 'and',
			children: [
				expect.objectContaining({ type: 'rule', property: 'status', values: ['open'] }),
			],
		});
		expect(preview.filter?.children).toHaveLength(1);
		expect(preview.report.applied).toEqual([
			expect.objectContaining({ expression: 'status == "open"' }),
		]);
		expect(preview.report.unsupported).toEqual([
			expect.objectContaining({ expression: 'date <= today()', preserved: true }),
		]);
	});

	it('uses and or not group logic names in imported output', () => {
		const preview = previewBasesImport({
			sourcePath: 'Flags.base',
			content: [
				'filters:',
				'  or:',
				'    - type == "project"',
				'    - not:',
				'        - status == "done"',
			].join('\n'),
		});

		expect(preview.filter).toMatchObject({
			type: 'group',
			logic: 'or',
			children: [
				expect.objectContaining({ type: 'rule', property: 'type', values: ['project'] }),
				expect.objectContaining({ type: 'group', logic: 'not' }),
			],
		});
	});

	it('reports unsupported expressions without applying them', () => {
		const preview = previewBasesImport({
			sourcePath: 'Advanced.base',
			content: [
				'filters:',
				'  and:',
				'    - date <= today()',
				'    - status != "done"',
			].join('\n'),
		});

		expect(preview.filter).toBeUndefined();
		expect(preview.report.applied).toEqual([]);
		expect(preview.report.unsupported).toEqual([
			expect.objectContaining({ expression: 'date <= today()', preserved: true }),
			expect.objectContaining({ expression: 'status != "done"', preserved: true }),
		]);
	});

	it('returns a preview report instead of throwing on invalid YAML', () => {
		const readPreview = () => previewBasesImport({
			sourcePath: 'Broken.base',
			content: [
				'filters:',
				'  and:',
				'    - status == "open"',
				'    bad: [',
			].join('\n'),
		});

		expect(readPreview).not.toThrow();
		const preview = readPreview();
		expect(preview.rawConfig).toEqual({});
		expect(preview.filter).toBeUndefined();
		expect(preview.report.applied).toEqual([]);
		expect(preview.report.unsupported).toEqual([]);
		expect(preview.report.parseErrors).toEqual([
			expect.objectContaining({
				sourcePath: 'Broken.base',
				reason: expect.stringContaining('YAML'),
			}),
		]);
	});

	it('extracts fenced markdown bases blocks with block index and start line', () => {
		const blocks = extractBasesFencedBlocks([
			'# Dashboard',
			'',
			'```bases',
			'filters:',
			'  and:',
			'    - status == "open"',
			'```',
			'',
			'```bases yaml',
			'views: []',
			'```',
		].join('\n'));

		expect(blocks).toEqual([
			{ blockIndex: 0, lineStart: 3, rawContent: 'filters:\n  and:\n    - status == "open"' },
			{ blockIndex: 1, lineStart: 9, rawContent: 'views: []' },
		]);
	});
});
