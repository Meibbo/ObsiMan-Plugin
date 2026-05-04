import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, type Component } from 'svelte';
import PopupIsland from '../../src/components/layout/overlays/overlayIsland.svelte';
import PopupIslandChild from './PopupIslandChild.svelte';
import { OverlayStateService } from '../../src/services/serviceOverlayState.svelte';

describe('PopupIsland mount', () => {
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

	it('renders the component on the overlay stack', () => {
		const overlayState = new OverlayStateService();
		overlayState.push({
			id: 'test-popup',
			component: PopupIslandChild,
		});

		app = mount(PopupIsland as unknown as Component<{ overlayState: OverlayStateService }>, {
			target,
			props: { overlayState },
		});
		flushSync();

		expect(target.querySelector('.vm-popup-island')).not.toBeNull();
		expect(target.querySelector('.vm-popup-test-child')?.textContent).toBe('popup child');
	});
});
