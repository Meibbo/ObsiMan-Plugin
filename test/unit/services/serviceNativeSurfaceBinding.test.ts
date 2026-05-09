import { Component } from 'obsidian';
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { NodeBindingService } from '../../../src/services/serviceNodeBinding';
import {
	NativeSurfaceBindingService,
	NATIVE_SURFACE_HOVER_SOURCE,
	handleNativeBindingClick,
	handleNativeBindingHover,
	resolveNativeBindingTarget,
} from '../../../src/services/serviceNativeSurfaceBinding';
import { mockApp, mockTFile } from '../../helpers/obsidian-mocks';

type FakeElementOptions = {
	text?: string;
	dataset?: Record<string, string>;
	attr?: Record<string, string>;
	selectors?: string[];
	parent?: FakeElement;
};

class FakeElement {
	textContent: string;
	dataset: Record<string, string>;
	parentElement: FakeElement | null;
	private readonly attr: Record<string, string>;
	private readonly selectors: Set<string>;

	constructor(options: FakeElementOptions = {}) {
		this.textContent = options.text ?? '';
		this.dataset = options.dataset ?? {};
		this.attr = options.attr ?? {};
		this.selectors = new Set(options.selectors ?? []);
		this.parentElement = options.parent ?? null;
	}

	closest(selector: string): FakeElement | null {
		if (this.selectors.has(selector)) return this;
		return this.parentElement?.closest(selector) ?? null;
	}

	getAttribute(name: string): string | null {
		return this.attr[name] ?? null;
	}
}

function fakeMouseEvent(target: FakeElement, init: Partial<MouseEvent> = {}) {
	return {
		target,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		button: 0,
		preventDefault: vi.fn(),
		stopImmediatePropagation: vi.fn(),
		...init,
	} as unknown as MouseEvent & {
		preventDefault: ReturnType<typeof vi.fn>;
		stopImmediatePropagation: ReturnType<typeof vi.fn>;
	};
}

describe('resolveNativeBindingTarget', () => {
	it('resolves native tag pane rows to tag binding inputs', () => {
		const el = new FakeElement({
			text: 'project/active',
			selectors: ['.tag-pane-tag'],
		});

		expect(resolveNativeBindingTarget(el as unknown as EventTarget)?.node).toEqual({
			kind: 'tag',
			label: 'project/active',
			tagPath: 'project/active',
		});
	});

	it('resolves metadata tag pills to tag binding inputs', () => {
		const el = new FakeElement({
			text: '#project/active',
			selectors: ['.metadata-property[data-property-key="tags"] .multi-select-pill'],
		});

		expect(resolveNativeBindingTarget(el as unknown as EventTarget)?.node).toEqual({
			kind: 'tag',
			label: 'project/active',
			tagPath: 'project/active',
		});
	});

	it('resolves reading-view tag links from href values', () => {
		const el = new FakeElement({
			text: '#display/ignored',
			attr: { href: '#project%2Factive' },
			selectors: ['a.tag[href^="#"]'],
		});

		expect(resolveNativeBindingTarget(el as unknown as EventTarget)?.node).toEqual({
			kind: 'tag',
			label: 'project/active',
			tagPath: 'project/active',
		});
	});

	it('resolves native folder rows by vault path', () => {
		const el = new FakeElement({
			text: 'Alpha',
			dataset: { path: 'Projects/Alpha' },
			selectors: ['.nav-folder-title'],
		});

		expect(resolveNativeBindingTarget(el as unknown as EventTarget)?.node).toEqual({
			kind: 'folder',
			label: 'Projects/Alpha',
		});
	});

	it('resolves breadcrumbs by vault path', () => {
		const el = new FakeElement({
			text: 'Alpha',
			dataset: { path: 'Projects/Alpha' },
			selectors: ['.view-header-breadcrumb[data-path]'],
		});

		expect(resolveNativeBindingTarget(el as unknown as EventTarget)?.node).toEqual({
			kind: 'folder',
			label: 'Projects/Alpha',
		});
	});

	it('ignores unrelated elements', () => {
		const el = new FakeElement({ text: 'plain' });
		expect(resolveNativeBindingTarget(el as unknown as EventTarget)).toBeNull();
	});
});

describe('handleNativeBindingClick', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('ignores normal primary clicks without preventing native behavior', async () => {
		const bindOrCreate = vi.fn();
		const el = new FakeElement({ text: 'project', selectors: ['.tag-pane-tag'] });
		const event = fakeMouseEvent(el);

		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate } as unknown as NodeBindingService,
		});

		expect(handled).toBe(false);
		expect(bindOrCreate).not.toHaveBeenCalled();
		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
	});

	it('handles ctrl clicks on native tags through NodeBindingService', async () => {
		const bindOrCreate = vi.fn().mockResolvedValue({ outcome: 'opened' });
		const el = new FakeElement({ text: 'project', selectors: ['.tag-pane-tag'] });
		const event = fakeMouseEvent(el, { ctrlKey: true });

		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate } as unknown as NodeBindingService,
		});

		expect(handled).toBe(true);
		expect(bindOrCreate).toHaveBeenCalledWith({
			kind: 'tag',
			label: 'project',
			tagPath: 'project',
		});
		expect(event.preventDefault).toHaveBeenCalledOnce();
		expect(event.stopImmediatePropagation).toHaveBeenCalledOnce();
	});

	it('handles middle clicks on native folders through NodeBindingService', async () => {
		const bindOrCreate = vi.fn().mockResolvedValue({ outcome: 'opened' });
		const el = new FakeElement({
			text: 'Alpha',
			dataset: { path: 'Projects/Alpha' },
			selectors: ['.nav-folder-title'],
		});
		const event = fakeMouseEvent(el, { button: 1 });

		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate } as unknown as NodeBindingService,
		});

		expect(handled).toBe(true);
		expect(bindOrCreate).toHaveBeenCalledWith({
			kind: 'folder',
			label: 'Projects/Alpha',
		});
		expect(event.preventDefault).toHaveBeenCalledOnce();
		expect(event.stopImmediatePropagation).toHaveBeenCalledOnce();
	});

	it('ignores modifier clicks outside supported native surfaces', async () => {
		const bindOrCreate = vi.fn();
		const el = new FakeElement({ text: 'plain' });
		const event = fakeMouseEvent(el, { metaKey: true });

		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate } as unknown as NodeBindingService,
		});

		expect(handled).toBe(false);
		expect(bindOrCreate).not.toHaveBeenCalled();
		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
	});
});

describe('handleNativeBindingHover', () => {
	it('triggers hover-link when exactly one binding note alias matches', () => {
		const note = mockTFile('Bindings/project.md');
		const metadata = new Map([[note.path, { frontmatter: { aliases: ['#project'] } }]]);
		const app = mockApp({ files: [note], metadata });
		const trigger = vi.fn();
		app.workspace.trigger = trigger;
		const el = new FakeElement({ text: 'project', selectors: ['.tag-pane-tag'] });
		const event = fakeMouseEvent(el);

		const handled = handleNativeBindingHover(event, { app });

		expect(handled).toBe(true);
		expect(trigger).toHaveBeenCalledWith('hover-link', {
			event,
			source: NATIVE_SURFACE_HOVER_SOURCE,
			targetEl: el,
			linktext: 'Bindings/project.md',
			hoverParent: el,
		});
	});

	it('does not trigger hover-link when no binding note alias matches', () => {
		const app = mockApp();
		const trigger = vi.fn();
		app.workspace.trigger = trigger;
		const el = new FakeElement({ text: 'project', selectors: ['.tag-pane-tag'] });

		expect(handleNativeBindingHover(fakeMouseEvent(el), { app })).toBe(false);
		expect(trigger).not.toHaveBeenCalled();
	});

	it('does not trigger hover-link when multiple binding notes match', () => {
		const a = mockTFile('A.md');
		const b = mockTFile('B.md');
		const metadata = new Map([
			[a.path, { frontmatter: { aliases: ['#project'] } }],
			[b.path, { frontmatter: { aliases: ['#project'] } }],
		]);
		const app = mockApp({ files: [a, b], metadata });
		const trigger = vi.fn();
		app.workspace.trigger = trigger;
		const el = new FakeElement({ text: 'project', selectors: ['.tag-pane-tag'] });

		expect(handleNativeBindingHover(fakeMouseEvent(el), { app })).toBe(false);
		expect(trigger).not.toHaveBeenCalled();
	});
});

describe('NativeSurfaceBindingService', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('registers the hover source and capture event handlers on load', () => {
		const app = mockApp();
		const registerHoverLinkSource = vi.fn();
		const registerDomEvent = vi.spyOn(Component.prototype as never, 'registerDomEvent');
		const plugin = {
			app,
			registerHoverLinkSource,
		};
		const service = new NativeSurfaceBindingService({
			plugin: plugin as never,
			app,
			bindingService: { bindOrCreate: vi.fn() } as unknown as NodeBindingService,
			doc: {} as Document,
		});

		service.load();

		expect(registerHoverLinkSource).toHaveBeenCalledWith(NATIVE_SURFACE_HOVER_SOURCE, {
			display: 'Vaultman native surfaces',
			defaultMod: true,
		});
		expect(registerDomEvent).toHaveBeenCalledWith(
			{} as Document,
			'click',
			expect.any(Function),
			{ capture: true },
		);
		expect(registerDomEvent).toHaveBeenCalledWith(
			{} as Document,
			'auxclick',
			expect.any(Function),
			{ capture: true },
		);
		expect(registerDomEvent).toHaveBeenCalledWith(
			{} as Document,
			'mouseover',
			expect.any(Function),
			{ capture: false },
		);
		service.unload();
	});
});
