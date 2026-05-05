import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewEmptyLanding from '../../src/components/views/viewEmptyLanding.svelte';

describe('ViewEmptyLanding', () => {
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

	it('renders loading and empty explorer states', () => {
		const icon = vi.fn(() => ({ update: vi.fn() }));

		app = mount(ViewEmptyLanding as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				state: {
					kind: 'loading',
					label: 'Indexing Bases',
					detail: 'Scanning notes',
					icon: 'lucide-loader-circle',
				},
				icon,
			},
		});
		flushSync();

		expect(target.textContent).toContain('Indexing Bases');
		expect(target.textContent).toContain('Scanning notes');
		expect(target.querySelector('[data-empty-kind="loading"]')).not.toBeNull();
		expect(icon).toHaveBeenCalled();

		void unmount(app);
		app = mount(ViewEmptyLanding as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				state: {
					label: 'No import targets',
					detail: 'Compatible Bases files will appear here.',
				},
			},
		});
		flushSync();

		expect(target.textContent).toContain('No import targets');
		expect(target.textContent).toContain('Compatible Bases files will appear here.');
		expect(target.querySelector('[data-empty-kind="empty"]')).not.toBeNull();
	});
});
