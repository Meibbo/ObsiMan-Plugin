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
	setSelectedFiles: ReturnType<typeof vi.fn>;
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
	const setSelectedFiles = vi.fn();
	const decorationManager = new DecorationManager(app);

	return {
		files,
		openLinkText,
		setSelectedFiles,
		plugin: {
			app,
			contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
			queueService: { add: vi.fn() },
			operationsIndex: { nodes: [], refresh: vi.fn(), subscribe: vi.fn(), byId: vi.fn() },
			activeFiltersIndex: { nodes: [], refresh: vi.fn(), subscribe: vi.fn(), byId: vi.fn() },
			filterService: {
				filteredFiles: files,
				selectedFiles: [],
				setSelectedFiles,
			},
			decorationManager,
			viewService: new ViewService({ decorationManager }),
			propertyIndex: {},
		} as unknown as VaultmanPlugin,
	};
}

describe('explorerFiles interactions', () => {
	it('turns a file node click into selected files instead of filtering or opening the note', () => {
		const { plugin, files, openLinkText, setSelectedFiles } = makePlugin();
		const explorer = new explorerFiles(plugin);
		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);

		expect(fileNode).toBeTruthy();

		explorer.handleNodeClick(fileNode!);

		expect(setSelectedFiles).toHaveBeenCalledWith([files[0]]);
		expect(openLinkText).not.toHaveBeenCalled();
	});

	it('opens a file from the secondary node action', () => {
		const { plugin, files, openLinkText, setSelectedFiles } = makePlugin();
		const explorer = new explorerFiles(plugin);
		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);

		expect(fileNode).toBeTruthy();

		explorer.handleNodeSecondaryAction?.(fileNode!);

		expect(openLinkText).toHaveBeenCalledWith(files[0].path, '', false);
		expect(setSelectedFiles).not.toHaveBeenCalled();
	});

	it('queues file deletion from the registered context menu action', async () => {
		const { plugin, files } = makePlugin();
		const trashFile = vi.spyOn(plugin.app.fileManager, 'trashFile');
		const explorer = new explorerFiles(plugin);
		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'file.delete')?.[0];

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

	it('queues file deletion for all selected file context nodes', async () => {
		const { plugin, files } = makePlugin();
		const explorer = new explorerFiles(plugin);
		const fileNodes = explorer.getTree()[0].children?.filter((node) => node.meta.file) ?? [];
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'file.delete')?.[0];

		expect(fileNodes.length).toBe(2);
		expect(deleteAction).toBeTruthy();

		await deleteAction.run({
			nodeType: 'file',
			node: fileNodes[0],
			selectedNodes: fileNodes,
			surface: 'panel',
			file: files[0],
		});

		expect(plugin.queueService.add).toHaveBeenCalledTimes(2);
		expect(
			(plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls.map(
				([change]) => change.files[0],
			),
		).toEqual(files);
	});

	it('can show only the selected files without changing the active filter', () => {
		const { plugin, files, setSelectedFiles } = makePlugin();
		(plugin.filterService as unknown as { selectedFiles: TFile[] }).selectedFiles = [files[1]];
		const explorer = new explorerFiles(plugin);

		explorer.setShowSelectedOnly(true);

		expect(explorer.getFiles()).toEqual([files[1]]);
		expect(setSelectedFiles).not.toHaveBeenCalled();
	});

	it('shows non-markdown vault files when no active filter tree is narrowing the explorer', () => {
		const { plugin, files } = makePlugin();
		const pdf = mockTFile('Assets/manual.pdf');
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [...files, pdf];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);

		expect(explorer.getFiles()).toEqual([...files, pdf]);
		expect(explorer.getTree().some((node) => node.id === 'folder:Assets')).toBe(true);
	});

	it('shows root image files with an image icon', () => {
		const { plugin, files } = makePlugin();
		const png = mockTFile('cover.png');
		(plugin.app.vault as unknown as { getFiles: () => TFile[] }).getFiles = () => [...files, png];
		(plugin.filterService as unknown as { activeFilter: { children: unknown[] } }).activeFilter = {
			children: [],
		};
		const explorer = new explorerFiles(plugin);

		const pngNode = explorer.getTree().find((node) => node.id === 'cover.png');

		expect(pngNode).toBeTruthy();
		expect(pngNode?.icon).toBe('lucide-image');
	});

	it('starts a file rename handoff from selected registered context menu nodes', async () => {
		const { plugin, files } = makePlugin();
		const startRenameHandoff = vi.fn<(handoff: FnRRenameHandoff) => void>();
		const explorer = new explorerFiles(plugin, { startRenameHandoff });
		const fileNodes = explorer.getTree()[0].children?.filter((node) => node.meta.file) ?? [];
		const renameAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'file.rename')?.[0];

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

	it('routes set and delete hover badges to file queue operations', () => {
		const { plugin, files } = makePlugin();
		const explorer = new explorerFiles(plugin) as explorerFiles & {
			handleHoverBadge?: (node: ReturnType<explorerFiles['getTree']>[number], kind: string) => void;
		};
		const fileNode = explorer.getTree()[0].children?.find((node) => node.meta.file === files[0]);

		expect(fileNode).toBeTruthy();
		expect(typeof explorer.handleHoverBadge).toBe('function');

		explorer.handleHoverBadge?.(fileNode!, 'set');
		explorer.handleHoverBadge?.(fileNode!, 'delete');

		expect(plugin.queueService.add).toHaveBeenCalledTimes(2);
		expect(
			(plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls.map(
				([change]) => change.action,
			),
		).toEqual(['append-links', 'delete']);
	});
});
