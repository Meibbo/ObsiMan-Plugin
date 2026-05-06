import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NavbarPillFab from '../../src/components/layout/navbarPillFab.svelte';
import type { FabDef } from '../../src/types/typePrimitives';

function baseProps(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		pageOrder: ['ops', 'statistics', 'filters'],
		activePage: 'ops',
		pageLabels: {
			ops: 'Operations',
			statistics: 'Statistics',
			filters: 'Filters',
		},
		pageIcons: {
			ops: 'lucide-settings-2',
			statistics: 'lucide-bar-chart-2',
			filters: 'lucide-filter',
		},
		leftFab: null,
		rightFab: null,
		navCollapsed: false,
		isReordering: false,
		reorderTargetIdx: -1,
		pillEl: null,
		selectedCount: 0,
		filterRuleCount: 0,
		queuedCount: 0,
		bindNav: vi.fn(() => ({ destroy: vi.fn() })),
		onCollapsedNavClick: vi.fn(),
		onNavIconPointerDown: vi.fn(),
		onPillPointerMove: vi.fn(),
		onPillPointerUp: vi.fn(),
		exitReorder: vi.fn(),
		navigateTo: vi.fn(),
		icon: vi.fn(() => ({ update: vi.fn() })),
		...overrides,
	};
}

describe('NavbarPillFab count badges', () => {
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

	it('shows queue and active filter counts only on matching FAB roles', () => {
		const leftFab: FabDef = {
			icon: 'lucide-list-checks',
			label: 'Queue',
			action: vi.fn(),
			badgeKind: 'queue',
		};
		const rightFab: FabDef = {
			icon: 'lucide-sparkles',
			label: 'Active filters',
			action: vi.fn(),
			badgeKind: 'filters',
		};

		app = mount(NavbarPillFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({
				leftFab,
				rightFab,
				queuedCount: 4,
				filterRuleCount: 2,
			}),
		});
		flushSync();

		expect(target.querySelector('[data-vm-badge-kind="queue"]')?.textContent).toBe('4');
		expect(target.querySelector('[data-vm-badge-kind="filters"]')?.textContent).toBe('2');
	});

	it('does not attach queue or filter counts to unrelated FABs', () => {
		app = mount(NavbarPillFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({
				leftFab: { icon: 'lucide-blocks', label: 'Add-ons', action: vi.fn() },
				rightFab: { icon: 'lucide-settings', label: 'Settings', action: vi.fn() },
				queuedCount: 4,
				filterRuleCount: 2,
			}),
		});
		flushSync();

		expect(target.querySelectorAll('.vm-fab-badge')).toHaveLength(0);
	});
});
