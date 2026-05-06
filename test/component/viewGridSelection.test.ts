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
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
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
});
