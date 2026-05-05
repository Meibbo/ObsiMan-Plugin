import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeTree';

describe('ViewTree decorations', () => {
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

	it('renders DecorationManager highlight ranges in node labels', () => {
		const nodes: TreeNode[] = [
			{
				id: 'status',
				label: 'status',
				depth: 0,
				meta: {},
				highlights: [{ start: 0, end: 6 }],
			},
		];

		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		expect(target.querySelector('mark.vm-highlight')?.textContent).toBe('status');
	});

	it('renders duplicate-looking badges without duplicate keyed-each errors', () => {
		const nodes: TreeNode[] = [
			{
				id: 'status',
				label: 'status',
				depth: 0,
				meta: {},
				badges: [
					{ text: 'delete', icon: 'lucide-trash-2', color: 'red' },
					{ text: 'delete', icon: 'lucide-trash-2', color: 'red' },
				],
			},
		];

		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		expect(target.querySelectorAll('.vm-badge')).toHaveLength(2);
	});
});
