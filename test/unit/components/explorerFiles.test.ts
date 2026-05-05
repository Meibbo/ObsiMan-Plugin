import { describe, expect, it, vi } from 'vitest';
import { explorerFiles } from '../../../src/components/containers/explorerFiles';
import { DecorationManager } from '../../../src/services/serviceDecorate';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../../src/main';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../../helpers/obsidian-mocks';

function makePlugin(): {
	plugin: VaultmanPlugin;
	files: TFile[];
	openLinkText: ReturnType<typeof vi.fn>;
	setSelectedFileFilter: ReturnType<typeof vi.fn>;
} {
	const a = mockTFile('Notes/a.md', { frontmatter: { status: 'draft' } });
	const b = mockTFile('Notes/b.md', { frontmatter: { status: 'done' } });
	const files = [a, b] as TFile[];
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft' } }],
		[b.path, { frontmatter: { status: 'done' } }],
	]);
	const app = mockApp({ files, metadata: meta });
	const openLinkText = vi.fn();
	(app.workspace as unknown as { openLinkText: typeof openLinkText }).openLinkText = openLinkText;
	const setSelectedFileFilter = vi.fn();
	const decorationManager = new DecorationManager(app);

	return {
		files,
		openLinkText,
		setSelectedFileFilter,
		plugin: {
			app,
			contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
			queueService: { add: vi.fn() },
			filterService: {
				filteredFiles: files,
				setSelectedFileFilter,
			},
			decorationManager,
			viewService: new ViewService({ decorationManager }),
			propertyIndex: {},
		} as unknown as VaultmanPlugin,
	};
}

describe('explorerFiles interactions', () => {
	it('turns a file node click into a selected-files filter instead of opening the note', () => {
		const { plugin, files, openLinkText, setSelectedFileFilter } = makePlugin();
		const explorer = new explorerFiles(plugin);
		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);

		expect(fileNode).toBeTruthy();

		explorer.handleNodeClick(fileNode!);

		expect(setSelectedFileFilter).toHaveBeenCalledWith([files[0]]);
		expect(openLinkText).not.toHaveBeenCalled();
	});
});
