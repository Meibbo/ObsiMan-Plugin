import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NavbarPillFab from '../../src/components/layout/navbarPillFab.svelte';
import type { FabDef } from '../../src/types/typePrimitives';

function baseProps(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		pageOrder: ['ops', 'statistics', 'filters'],
		activePage: 'ops',
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

describe('Navbar queue badge click weights', () => {
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

	it('single click opens the queue popup', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const leftFab: FabDef = {
			icon: 'lucide-list-checks',
			label: 'Queue',
			action,
			onDoubleClick,
			badgeKind: 'queue',
		};
		app = mount(NavbarPillFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({ leftFab, queuedCount: 3 }),
		});
		flushSync();

		const fab = target.querySelector<HTMLDivElement>('.vm-nav-fab');
		expect(fab).toBeTruthy();
		fab!.click();
		vi.advanceTimersByTime(260);
		expect(action).toHaveBeenCalledTimes(1);
		expect(onDoubleClick).not.toHaveBeenCalled();
	});

	it('double click runs the secondary queue action without invoking the popup action', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const leftFab: FabDef = {
			icon: 'lucide-list-checks',
			label: 'Queue',
			action,
			onDoubleClick,
			badgeKind: 'queue',
		};
		app = mount(NavbarPillFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({ leftFab, queuedCount: 3 }),
		});
		flushSync();

		const fab = target.querySelector<HTMLDivElement>('.vm-nav-fab');
		fab!.click();
		vi.advanceTimersByTime(80);
		fab!.click();
		vi.advanceTimersByTime(300);
		expect(onDoubleClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
	});

	it('alt click runs the tertiary queue action immediately', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const onTertiaryClick = vi.fn();
		const leftFab: FabDef = {
			icon: 'lucide-list-checks',
			label: 'Queue',
			action,
			onDoubleClick,
			onTertiaryClick,
			badgeKind: 'queue',
		};
		app = mount(NavbarPillFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({ leftFab, queuedCount: 3 }),
		});
		flushSync();

		const fab = target.querySelector<HTMLDivElement>('.vm-nav-fab');
		fab!.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }));
		vi.advanceTimersByTime(300);

		expect(onTertiaryClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
		expect(onDoubleClick).not.toHaveBeenCalled();
	});

	it('middle click runs the tertiary queue action immediately', () => {
		const action = vi.fn();
		const onDoubleClick = vi.fn();
		const onTertiaryClick = vi.fn();
		const leftFab: FabDef = {
			icon: 'lucide-list-checks',
			label: 'Queue',
			action,
			onDoubleClick,
			onTertiaryClick,
			badgeKind: 'queue',
		};
		app = mount(NavbarPillFab as unknown as Component<Record<string, unknown>>, {
			target,
			props: baseProps({ leftFab, queuedCount: 3 }),
		});
		flushSync();

		const fab = target.querySelector<HTMLDivElement>('.vm-nav-fab');
		fab!.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
		vi.advanceTimersByTime(300);

		expect(onTertiaryClick).toHaveBeenCalledTimes(1);
		expect(action).not.toHaveBeenCalled();
		expect(onDoubleClick).not.toHaveBeenCalled();
	});
});
