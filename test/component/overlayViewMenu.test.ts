import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewModePopup from '../../src/components/layout/overlays/overlayViewMenu.svelte';

describe('ViewModePopup', () => {
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

	function renderViewModePopup(props: Record<string, unknown> = {}) {
		app = mount(ViewModePopup as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				activeTab: 'props',
				onClose: vi.fn(),
				viewMode: 'tree',
				addMode: false,
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
	}

	it('offers table mode and marks it active when selected', () => {
		renderViewModePopup();

		const tableButton = target.querySelector<HTMLElement>('.vm-squircle[aria-label="Table"]');
		expect(tableButton).not.toBeNull();

		tableButton!.click();
		flushSync();

		expect(tableButton!.classList.contains('is-accent')).toBe(true);
	});
});
