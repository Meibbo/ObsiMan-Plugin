import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NavbarPillFab from '../../src/components/layout/navbarPillFab.svelte';
import type { FabDef } from '../../src/types/typePrimitives';

function baseProps(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		pageOrder: ['ops', 'statistics', 'filters'],
		activePage: 'filters',
		pageLabels: { ops: 'Ops', statistics: 'Stats', filters: 'Filters' },
		pageIcons: { ops: 'lucide-list', statistics: 'lucide-bar', filters: 'lucide-filter' },
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

describe('Navbar active-filters pill click weights', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		vi.useFakeTimers();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.useRealTimers();
	});

	it('single click invokes the toggle action only after the debounce window', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const rightFab: FabDef = {
			icon: 'lucide-sparkles',
			label: 'Active filters',
			action,
			onDoubleClick,
			badgeKind: 'filters',
		};
		app = mount(NavbarPillFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({ rightFab }),
		});
		flushSync();

		const fab = target.querySelectorAll<HTMLDivElement>('.vm-nav-fab')[0];
		expect(fab).toBeTruthy();
		fab.click();
		// Before the debounce expires, the single-click handler must not have fired.
		expect(action).not.toHaveBeenCalled();
		vi.advanceTimersByTime(260);
		expect(action).toHaveBeenCalledTimes(1);
		expect(onDoubleClick).not.toHaveBeenCalled();
	});

	it('double click within 250ms calls onDoubleClick and skips the single action', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const rightFab: FabDef = {
			icon: 'lucide-sparkles',
			label: 'Active filters',
			action,
			onDoubleClick,
			badgeKind: 'filters',
		};
		app = mount(NavbarPillFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({ rightFab }),
		});
		flushSync();

		const fab = target.querySelectorAll<HTMLDivElement>('.vm-nav-fab')[0];
		fab.click();
		vi.advanceTimersByTime(100);
		fab.click();
		vi.advanceTimersByTime(300);
		expect(onDoubleClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
	});

	it('alt click calls onTertiaryClick without waiting for the single-click debounce', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const onTertiaryClick = vi.fn();
		const rightFab: FabDef = {
			icon: 'lucide-sparkles',
			label: 'Active filters',
			action,
			onDoubleClick,
			onTertiaryClick,
			badgeKind: 'filters',
		};
		app = mount(NavbarPillFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({ rightFab }),
		});
		flushSync();

		const fab = target.querySelectorAll<HTMLDivElement>('.vm-nav-fab')[0];
		fab.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }));
		vi.advanceTimersByTime(300);

		expect(onTertiaryClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
		expect(onDoubleClick).not.toHaveBeenCalled();
	});
});
