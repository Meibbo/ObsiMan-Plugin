import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NavbarTabs from '../../src/components/layout/navbarTabs.svelte';
import { FTabs } from '../../src/types/typeTab';

describe('NavbarTabs', () => {
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

	it('keeps disabled faint tabs visible without switching active tab', () => {
		app = mount(NavbarTabs as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				tabs: FTabs,
				active: 'files',
				disabledTabIds: ['props', 'tags', 'content'],
				faintTabIds: ['props', 'tags', 'content'],
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const propsTab = target.querySelector<HTMLElement>('[aria-label="Props"]');
		const filesTab = target.querySelector<HTMLElement>('[aria-label="Files"]');

		expect(propsTab).toBeTruthy();
		expect(filesTab).toBeTruthy();
		expect(propsTab?.getAttribute('aria-disabled')).toBe('true');
		expect(propsTab?.classList.contains('is-disabled')).toBe(true);
		expect(propsTab?.classList.contains('is-faint')).toBe(true);
		expect(filesTab?.classList.contains('is-active')).toBe(true);

		propsTab!.click();
		flushSync();

		expect(filesTab?.classList.contains('is-active')).toBe(true);
		expect(propsTab?.classList.contains('is-active')).toBe(false);
	});
});
