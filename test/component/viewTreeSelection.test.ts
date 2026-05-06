import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeNode';

describe('ViewTree selection gestures', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	function renderTree(
		nodes: TreeNode[],
		props: Partial<{
			expandedIds: Set<string>;
			selectedIds: Set<string>;
			activeFilterIds: Set<string>;
			onToggle: (id: string) => void;
			onRowClick: (id: string, e: MouseEvent) => void;
			onPrimaryAction: (id: string, e: MouseEvent) => void;
			onContextMenu: (id: string, e: MouseEvent) => void;
			onBadgeDoubleClick: (queueIndex: number) => void;
		}> = {},
	) {
		const defaults = {
			expandedIds: new Set<string>(),
			onToggle: vi.fn(),
			onRowClick: vi.fn(),
			onPrimaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			icon: vi.fn(() => ({ update: vi.fn() })),
		};
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				...defaults,
				...props,
			},
		});
		flushSync();
		return {
			onToggle: props.onToggle ?? defaults.onToggle,
			onRowClick: props.onRowClick ?? defaults.onRowClick,
			onPrimaryAction: props.onPrimaryAction ?? defaults.onPrimaryAction,
		};
	}

	it('clicking the chevron only toggles expansion', () => {
		const handlers = renderTree(
			[
				{
					id: 'parent',
					label: 'Parent',
					depth: 0,
					meta: {},
					children: [{ id: 'child', label: 'Child', depth: 1, meta: {} }],
				},
			],
			{ expandedIds: new Set(['parent']) },
		);

		(target.querySelector('.vm-tree-toggle') as HTMLElement).click();

		expect(handlers.onToggle).toHaveBeenCalledOnce();
		expect(handlers.onToggle).toHaveBeenCalledWith('parent');
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('clicking an actionable badge only runs the badge action', () => {
		const onBadgeAction = vi.fn();
		const handlers = renderTree([
			{
				id: 'status',
				label: 'Status',
				depth: 0,
				meta: {},
				badges: [
					{
						text: 'Add',
						icon: 'lucide-plus',
						quickAction: true,
						onClick: onBadgeAction,
					},
				],
			},
		]);

		(target.querySelector('.vm-badge.is-quick-action') as HTMLElement).click();

		expect(onBadgeAction).toHaveBeenCalledOnce();
		expect(handlers.onRowClick).not.toHaveBeenCalled();
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('selects the same node from apparent gaps in the virtual slot', () => {
		const handlers = renderTree([
			{
				id: 'status',
				label: 'Status',
				depth: 0,
				meta: {},
			},
		]);
		const row = target.querySelector('.vm-tree-virtual-row') as HTMLElement;
		vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
			x: 0,
			y: 10,
			left: 0,
			top: 10,
			right: 200,
			bottom: 42,
			width: 200,
			height: 32,
			toJSON: () => ({}),
		} as DOMRect);

		row.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 12, clientY: 12 }));
		row.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 12, clientY: 40 }));

		expect(handlers.onRowClick).toHaveBeenCalledTimes(2);
		expect(handlers.onRowClick).toHaveBeenNthCalledWith(1, 'status', expect.any(MouseEvent));
		expect(handlers.onRowClick).toHaveBeenNthCalledWith(2, 'status', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('clicking the label runs the primary action without using row-slot selection', () => {
		const handlers = renderTree([
			{
				id: 'status',
				label: 'Status',
				depth: 0,
				meta: {},
			},
		]);

		(target.querySelector('.vm-tree-label') as HTMLElement).click();

		expect(handlers.onPrimaryAction).toHaveBeenCalledOnce();
		expect(handlers.onPrimaryAction).toHaveBeenCalledWith('status', expect.any(MouseEvent));
		expect(handlers.onRowClick).not.toHaveBeenCalled();
	});

	it('marks selectable treeitems selected without treating active filters as selected', () => {
		renderTree(
			[
				{ id: 'selected', label: 'Selected', depth: 0, meta: {} },
				{ id: 'active-filter', label: 'Active filter', depth: 0, meta: {} },
			],
			{
				selectedIds: new Set(['selected']),
				activeFilterIds: new Set(['active-filter']),
			},
		);

		expect(target.querySelector('[role="tree"]')?.getAttribute('aria-multiselectable')).toBe('true');
		expect(
			target.querySelector('[data-id="selected"]')?.getAttribute('aria-selected'),
		).toBe('true');
		expect(
			target.querySelector('[data-id="active-filter"]')?.getAttribute('aria-selected'),
		).toBe('false');
	});
});
