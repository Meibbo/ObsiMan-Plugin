import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NavbarExplorer from '../../src/components/layout/navbarExplorer.svelte';
import { FnRIslandService } from '../../src/services/serviceFnRIsland.svelte';

function baseProps(service: FnRIslandService) {
	return {
		activeTab: 'tags',
		filtersSearch: '',
		filtersSearchCategory: { tags: 0, props: 0, files: 0, content: 0 },
		onSearchChange: vi.fn(),
		searchHistory: [],
		onSearchHistoryCommit: vi.fn(),
		sortBy: 'name',
		sortDirection: 'asc' as const,
		viewMode: 'tree',
		addMode: false,
		operationScope: 'auto' as const,
		filesShowSelectedOnly: false,
		tagsExplorer: undefined,
		propExplorer: undefined,
		fileList: undefined,
		nodeExpansionSummary: { canToggle: false, hasExpandedParents: false },
		icon: vi.fn(() => ({ update: vi.fn() })),
		addOpCount: 0,
		fnrIslandService: service,
		onCrear: vi.fn(),
	};
}

describe('NavbarExplorer searchbox-mounted island', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
	});

	it('renders the mode pill bound to FnRIslandService.mode', () => {
		const service = new FnRIslandService();
		app = mount(NavbarExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service),
		});
		flushSync();

		const pill = target.querySelector<HTMLButtonElement>('.vm-filters-search-modepill');
		expect(pill).toBeTruthy();
		expect(pill!.dataset.mode).toBe('search');
		expect(pill!.textContent?.trim()).toBe('search');

		// Cycling the pill swaps modes via the service.
		pill!.click();
		flushSync();
		expect(service.snapshot().mode).toBe('rename');
		expect(target.querySelector<HTMLButtonElement>('.vm-filters-search-modepill')!.dataset.mode).toBe(
			'rename',
		);
	});

	it('applies vm-toolbar-takeover when the island expands', () => {
		const service = new FnRIslandService();
		app = mount(NavbarExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service),
		});
		flushSync();

		const root = target.querySelector('.vm-navbar-filters');
		expect(root).toBeTruthy();
		expect(root!.classList.contains('vm-toolbar-takeover')).toBe(false);

		service.expand();
		flushSync();

		expect(root!.classList.contains('vm-toolbar-takeover')).toBe(true);
	});

	it('collapses the island on Escape inside the searchbox', () => {
		const service = new FnRIslandService();
		app = mount(NavbarExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps(service),
		});
		flushSync();

		service.expand();
		flushSync();
		expect(service.snapshot().expanded).toBe(true);

		const searchWrap = target.querySelector('.vm-filters-header-search-wrap');
		expect(searchWrap).toBeTruthy();
		searchWrap!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
		);
		flushSync();

		expect(service.snapshot().expanded).toBe(false);
	});
});
