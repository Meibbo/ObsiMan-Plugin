import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewSvarFileManager from '../../src/components/views/ViewSvarFileManager.svelte';
import type { VaultmanPlugin } from '../../src/main';
import { mockApp, mockTFile } from '../helpers/obsidian-mocks';

vi.mock('@svar-ui/svelte-filemanager', async () => ({
	Filemanager: (await import('./fixtures/MockSvarFilemanager.svelte')).default,
	Willow: (await import('./fixtures/MockSvarWillow.svelte')).default,
	WillowDark: (await import('./fixtures/MockSvarWillowDark.svelte')).default,
}));

type Listener = (payload: unknown) => void;
type SvarMockState = {
	data: Array<{ id: string; name: string; type: string; data?: unknown[] }>;
	initCalls: number;
	listeners: Map<string, Listener>;
};
type SvarGlobal = typeof globalThis & {
	__vaultmanSvarMock?: SvarMockState;
};

function svarMock(): SvarMockState {
	const state = (globalThis as SvarGlobal).__vaultmanSvarMock;
	if (!state) throw new Error('SVAR mock was not mounted');
	return state;
}

function makePlugin() {
	const alpha = mockTFile('Projects/Alpha.md');
	const inbox = mockTFile('Inbox.md');
	const app = mockApp({ files: [alpha, inbox] });
	return {
		plugin: { app } as unknown as VaultmanPlugin,
		alpha,
	};
}

describe('ViewSvarFileManager', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		(globalThis as SvarGlobal).__vaultmanSvarMock = {
			data: [],
			initCalls: 0,
			listeners: new Map(),
		};
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		delete (globalThis as SvarGlobal).__vaultmanSvarMock;
		document.body.classList.remove('theme-dark');
		vi.restoreAllMocks();
	});

	it('mounts the SVAR filemanager with vault tree data and light theme by default', () => {
		const { plugin } = makePlugin();

		app = mount(ViewSvarFileManager as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin },
		});
		flushSync();

		expect(target.querySelector('[data-svar-theme="light"]')).toBeTruthy();
		expect(target.querySelector('[data-id="folder:Projects"]')?.textContent).toContain('Projects');
		expect(target.querySelector('[data-id="Projects/Alpha.md"]')?.textContent).toContain('Alpha');
		expect(target.querySelector('[data-id="Inbox.md"]')?.textContent).toContain('Inbox');
		expect(svarMock().data).toHaveLength(2);
		expect(svarMock().listeners.has('rename-file')).toBe(true);
		expect(svarMock().listeners.has('delete-files')).toBe(true);
	});

	it('routes SVAR rename and delete events through Obsidian fileManager', () => {
		const { plugin, alpha } = makePlugin();
		const renameFile = vi.spyOn(plugin.app.fileManager, 'renameFile');
		const trashFile = vi.spyOn(plugin.app.fileManager, 'trashFile');

		app = mount(ViewSvarFileManager as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin },
		});
		flushSync();

		svarMock().listeners.get('rename-file')?.({ id: 'Projects/Alpha.md', name: 'Beta.md' });
		svarMock().listeners.get('delete-files')?.({ ids: ['Projects/Beta.md'] });

		expect(renameFile).toHaveBeenCalledWith(alpha, 'Projects/Beta.md');
		expect(trashFile).toHaveBeenCalledWith(alpha);
	});

	it('cleans up vault event refs when the Svelte component unmounts', () => {
		const { plugin } = makePlugin();
		const originalOn = plugin.app.vault.on.bind(plugin.app.vault);
		const offFns: Array<() => void> = [];
		plugin.app.vault.on = vi.fn((event, cb) => {
			const ref = originalOn(event, cb);
			const off = vi.fn(ref.off);
			offFns.push(off);
			return { off };
		});

		app = mount(ViewSvarFileManager as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin },
		});
		flushSync();

		void unmount(app);
		app = null;

		expect(offFns).toHaveLength(4);
		for (const off of offFns) expect(off).toHaveBeenCalledTimes(1);
	});
});
