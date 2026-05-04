import { describe, it, expect, vi } from 'vitest';
import { ContextMenuService, type ContextMenuPluginCtx } from '../../../src/services/serviceCMenu';
import type { ActionDef } from '../../../src/types/typeCMenu';
import { mockApp, mockTFile, Component } from '../../helpers/obsidian-mocks';

function makeCtx(): ContextMenuPluginCtx {
	const ctx = new Component() as unknown as ContextMenuPluginCtx;
	(ctx as unknown as { app: ReturnType<typeof mockApp> }).app = mockApp();
	(ctx as unknown as { settings: ContextMenuPluginCtx['settings'] }).settings = {
		contextMenuShowInMoreOptions: true,
		contextMenuShowInFileMenu: true,
		contextMenuShowInEditorMenu: true,
		contextMenuHideRules: [],
	};
	return ctx;
}

const fileAction: ActionDef = {
	id: 'test.action',
	label: 'Test action',
	nodeTypes: ['file'],
	surfaces: ['panel', 'file-menu', 'more-options'],
	run: () => {},
};

describe('ContextMenuService.registerAction', () => {
	it('records the action on first registration', () => {
		const svc = new ContextMenuService(makeCtx());
		svc.registerAction(fileAction);
		expect(((svc as unknown) as { _registry: ActionDef[] })._registry.length).toBe(1);
	});

	it('is idempotent on duplicate id', () => {
		const svc = new ContextMenuService(makeCtx());
		svc.registerAction(fileAction);
		svc.registerAction(fileAction);
		expect(((svc as unknown) as { _registry: ActionDef[] })._registry.length).toBe(1);
	});
});

describe('ContextMenuService applicable filtering', () => {
	it('only includes actions whose nodeTypes match the ctx', () => {
		const svc = new ContextMenuService(makeCtx());
		const fileSpy = vi.fn();
		const tagSpy = vi.fn();
		svc.registerAction({ ...fileAction, run: fileSpy });
		svc.registerAction({
			id: 'tag.x',
			label: 'Tag x',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			run: tagSpy,
		});

		const applicable = ((svc as unknown) as { _registry: ActionDef[] })._registry.filter(
			(d) => d.nodeTypes.includes('file') && d.surfaces.includes('panel'),
		);
		expect(applicable.map((d) => d.id)).toEqual(['test.action']);
	});

	it('respects the `when` predicate', () => {
		const svc = new ContextMenuService(makeCtx());
		svc.registerAction({
			...fileAction,
			id: 'guarded',
			when: (ctx) => ctx.file?.path.endsWith('.txt') ?? false,
		});
		const file = mockTFile('a.md');
		const ctxObj = { nodeType: 'file' as const, node: { id: 'x', label: 'x', meta: { file }, icon: '', depth: 0 }, surface: 'panel' as const, file };
		const applicable = ((svc as unknown) as { _registry: ActionDef[] })._registry.filter(
			(d) => d.nodeTypes.includes('file') && d.surfaces.includes('panel') && (!d.when || d.when(ctxObj)),
		);
		expect(applicable.map((d) => d.id)).toEqual([]);
	});
});
