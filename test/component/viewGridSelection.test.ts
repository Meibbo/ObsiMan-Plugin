import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import type { TreeNode } from '../../src/types/typeNode';

function nodes(): TreeNode[] {
	return [
		{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
		{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-tag' },
	];
}

describe('ViewNodeGrid selection gestures', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'PointerEvent',
			class extends MouseEvent {
				pointerId: number;

				constructor(type: string, init: PointerEventInit = {}) {
					super(type, init);
					this.pointerId = init.pointerId ?? 1;
				}
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

	function renderGrid(
		props: Partial<{
			selectedIds: Set<string>;
			focusedId: string | null;
			onTileClick: (id: string, e: MouseEvent) => void;
			onPrimaryAction: (id: string, e: MouseEvent) => void;
			onContextMenu: (id: string, e: MouseEvent) => void;
			onBoxSelect: (ids: string[], e: PointerEvent) => void;
		}> = {},
	) {
		const defaults = {
			selectedIds: new Set<string>(),
			onTileClick: vi.fn(),
			onPrimaryAction: vi.fn(),
			onContextMenu: vi.fn(),
			onBoxSelect: vi.fn(),
			icon: vi.fn(() => ({ update: vi.fn() })),
		};
		app = mount(ViewNodeGrid as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: nodes(),
				...defaults,
				...props,
			},
		});
		flushSync();
		return {
			onTileClick: props.onTileClick ?? defaults.onTileClick,
			onPrimaryAction: props.onPrimaryAction ?? defaults.onPrimaryAction,
			onContextMenu: props.onContextMenu ?? defaults.onContextMenu,
			onBoxSelect: props.onBoxSelect ?? defaults.onBoxSelect,
		};
	}

	it('renders generic tree nodes without Obsidian file props', () => {
		renderGrid();

		expect(target.querySelector('[data-id="alpha"]')?.textContent).toContain('Alpha');
		expect(target.querySelector('[data-id="beta"]')?.textContent).toContain('Beta');
		expect(target.querySelectorAll('.vm-node-grid-icon')).toHaveLength(2);
	});

	it('clicking a tile reports selection intent without running the primary action', () => {
		const handlers = renderGrid();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();

		expect(handlers.onTileClick).toHaveBeenCalledOnce();
		expect(handlers.onTileClick).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
		expect(handlers.onPrimaryAction).not.toHaveBeenCalled();
	});

	it('clicking the tile label reports primary action intent', () => {
		const handlers = renderGrid();

		(target.querySelector('[data-id="beta"] .vm-node-grid-label') as HTMLElement).click();

		expect(handlers.onPrimaryAction).toHaveBeenCalledOnce();
		expect(handlers.onPrimaryAction).toHaveBeenCalledWith('beta', expect.any(MouseEvent));
		expect(handlers.onTileClick).not.toHaveBeenCalled();
	});

	it('forwards modifier state with tile selection events', () => {
		const handlers = renderGrid();

		(target.querySelector('[data-id="beta"]') as HTMLElement).dispatchEvent(
			new MouseEvent('click', {
				bubbles: true,
				ctrlKey: true,
				shiftKey: true,
			}),
		);

		const event = (handlers.onTileClick as ReturnType<typeof vi.fn>).mock.calls[0][1];
		expect(event.ctrlKey).toBe(true);
		expect(event.shiftKey).toBe(true);
	});

	it('forwards context menu intent from the target tile', () => {
		const handlers = renderGrid();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true }),
		);

		expect(handlers.onContextMenu).toHaveBeenCalledOnce();
		expect(handlers.onContextMenu).toHaveBeenCalledWith('alpha', expect.any(MouseEvent));
	});

	it('reports rectangle-selected tile ids in visual order', () => {
		const handlers = renderGrid();
		const grid = target.querySelector('.vm-node-grid') as HTMLElement;
		const alpha = target.querySelector('[data-id="alpha"]') as HTMLElement;
		const beta = target.querySelector('[data-id="beta"]') as HTMLElement;
		Object.assign(grid, {
			setPointerCapture: vi.fn(),
			releasePointerCapture: vi.fn(),
			hasPointerCapture: vi.fn(() => true),
		});
		vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 240, 120));
		vi.spyOn(alpha, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 80));
		vi.spyOn(beta, 'getBoundingClientRect').mockReturnValue(rect(120, 0, 220, 80));

		grid.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
		grid.dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, clientX: 230, clientY: 90 }),
		);
		grid.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 230, clientY: 90 }));

		expect(handlers.onBoxSelect).toHaveBeenCalledOnce();
		expect(handlers.onBoxSelect).toHaveBeenCalledWith(['alpha', 'beta'], expect.any(PointerEvent));
	});
});

function rect(left: number, top: number, right: number, bottom: number): DOMRect {
	return {
		x: left,
		y: top,
		left,
		top,
		right,
		bottom,
		width: right - left,
		height: bottom - top,
		toJSON: () => ({}),
	} as DOMRect;
}
