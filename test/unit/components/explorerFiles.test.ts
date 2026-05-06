import { describe, expect, it, vi } from 'vitest';
import { explorerFiles } from '../../../src/components/containers/explorerFiles';
import { DecorationManager } from '../../../src/services/serviceDecorate';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../../src/main';
import type { FnRRenameHandoff } from '../../../src/types/typeFnR';
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

	it('queues file deletion from the registered context menu action', async () => {
		const { plugin, files } = makePlugin();
		const trashFile = vi.spyOn(plugin.app.fileManager, 'trashFile');
		const explorer = new explorerFiles(plugin);
		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);
		const deleteAction = (plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>).mock.calls.find(
			([action]) => action.id === 'file.delete',
		)?.[0];

		expect(fileNode).toBeTruthy();
		expect(deleteAction).toBeTruthy();

		await deleteAction.run({
			nodeType: 'file',
			node: fileNode,
			surface: 'panel',
		});

		expect(plugin.queueService.add).toHaveBeenCalledOnce();
		expect(trashFile).not.toHaveBeenCalled();
		const change = (plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change.type).toBe('file_delete');
		expect(change.action).toBe('delete');
		expect(change.files).toEqual([files[0]]);
	});

	it('starts a file rename handoff from selected registered context menu nodes', async () => {
		const { plugin, files } = makePlugin();
		const startRenameHandoff = vi.fn<(handoff: FnRRenameHandoff) => void>();
		const explorer = new explorerFiles(plugin, { startRenameHandoff });
		const fileNodes = explorer.getTree()[0].children?.filter((node) => node.meta.file) ?? [];
		const renameAction = (plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>).mock.calls.find(
			([action]) => action.id === 'file.rename',
		)?.[0];

		expect(fileNodes.length).toBe(2);
		expect(renameAction).toBeTruthy();

		await renameAction.run({
			nodeType: 'file',
			node: fileNodes[0],
			selectedNodes: fileNodes,
			surface: 'panel',
			file: files[0],
		});

		expect(plugin.queueService.add).not.toHaveBeenCalled();
		expect(startRenameHandoff).toHaveBeenCalledWith({
			status: 'editing',
			sourceKind: 'file',
			original: files[0].name,
			replacement: '',
			files,
			scope: 'selected',
		});
	});
});
