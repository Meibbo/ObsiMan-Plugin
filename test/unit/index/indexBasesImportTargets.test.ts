import { describe, expect, it } from 'vitest';
import { createBasesImportTargetsIndex } from '../../../src/index/indexBasesImportTargets';
import { mockApp, mockTFile } from '../../helpers/obsidian-mocks';

describe('indexBasesImportTargets', () => {
	it('discovers only compatible Bases import targets', async () => {
		const files = [mockTFile('A.base'), mockTFile('B.md'), mockTFile('C.md')];
		const app = mockApp({
			files,
			adapterFiles: new Map([
				[
					'A.base',
					[
						'views:',
						'  - type: table',
						'    name: Main',
						'    filters:',
						'      and:',
						'        - status == "open"',
					].join('\n'),
				],
				['B.md', ['```bases', 'views:', '  - type: table', '    name: Inline', '```'].join('\n')],
				['C.md', 'plain note'],
			]),
		});

		const index = createBasesImportTargetsIndex(app);
		await index.refresh();

		expect(index.nodes.map((node) => node.path)).toEqual(['A.base', 'B.md']);
	});
});
