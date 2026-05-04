import { describe, expect, it, vi } from 'vitest';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../../helpers/obsidian-mocks';
import { explorerProps } from '../../../src/components/containers/explorerProps';
import { DecorationManager } from '../../../src/services/serviceDecorate';
import type { VaultmanPlugin } from '../../../src/main';

function makePlugin(): VaultmanPlugin {
	const a = mockTFile('a.md', { frontmatter: { status: 'draft', owner: 'vic' } });
	const b = mockTFile('b.md', { frontmatter: { status: 'done' } });
	const files = [a, b] as TFile[];
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', owner: 'vic' } }],
		[b.path, { frontmatter: { status: 'done' } }],
	]);
	const app = mockApp({ files, metadata: meta });
	(app.metadataCache as unknown as { getAllPropertyInfos: () => Record<string, { type: string }> })
		.getAllPropertyInfos = () => ({
		status: { type: 'text' },
		owner: { type: 'text' },
	});

	return {
		app,
		contextMenuService: { registerAction: vi.fn() },
		queueService: { queue: [], add: vi.fn() },
		filterService: {
			filteredFiles: files,
			addNode: vi.fn(),
		},
		decorationManager: new DecorationManager(app),
		iconicService: { getIcon: vi.fn(() => null) },
	} as unknown as VaultmanPlugin;
}

describe('explorerProps search', () => {
	it('filters property nodes by the shared filter search term', () => {
		const explorer = new explorerProps(makePlugin());

		explorer.setSearchTerm('owner', 'all');
		const tree = explorer.getTree();

		expect(tree.map((node) => node.id)).toEqual(['owner']);
		expect(tree[0].highlights).toEqual([{ start: 0, end: 5 }]);
	});

	it('filters value nodes when search mode is leaf', () => {
		const explorer = new explorerProps(makePlugin());

		explorer.setSearchTerm('draft', 'leaf');
		const tree = explorer.getTree();

		expect(tree.map((node) => node.id)).toEqual(['status']);
		expect(tree[0].children?.map((node) => node.label)).toEqual(['draft']);
	});
});
