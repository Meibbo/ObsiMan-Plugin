import { Component, type App, type Plugin } from 'obsidian';
import type { BindingNodeInput, NodeBindingService } from './serviceNodeBinding';
import { computeAliasToken, findNotesByAlias } from './serviceNodeBinding';

export const NATIVE_SURFACE_HOVER_SOURCE = 'vaultman-native-surface';

const TAG_SELECTORS = [
	'.tag-pane-tag',
	'a.tag[href^="#"]',
	'.metadata-property[data-property-key="tags"] .multi-select-pill',
	'span.cm-hashtag',
] as const;

const FOLDER_SELECTORS = [
	'.nav-folder-title',
	'[data-path][data-type="folder"]',
	'.view-header-breadcrumb[data-path]',
	'.view-header-breadcrumb-separator + .view-header-breadcrumb[data-path]',
] as const;

const HOVER_PARENT_SELECTOR = [
	'.workspace-leaf-content',
	'.markdown-preview-view',
	'.markdown-source-view',
	'.metadata-properties',
	'.nav-files-container',
	'.view-header',
	'.workspace-leaf',
].join(', ');

export interface NativeBindingTarget {
	element: HTMLElement;
	node: BindingNodeInput;
	hoverParent: HTMLElement;
}

export interface NativeBindingClickDeps {
	bindingService: Pick<NodeBindingService, 'bindOrCreate'>;
}

export interface NativeBindingHoverDeps {
	app: App;
}

export interface NativeSurfaceBindingServiceDeps {
	plugin: Plugin;
	app: App;
	bindingService: NodeBindingService;
	doc?: Document;
}

type ClosableElement = HTMLElement & {
	closest(selector: string): HTMLElement | null;
	querySelector?(selector: string): Element | null;
	getAttribute?(name: string): string | null;
	dataset?: DOMStringMap | Record<string, string | undefined>;
};

export function resolveNativeBindingTarget(target: EventTarget | null): NativeBindingTarget | null {
	const base = asElement(target);
	if (!base) return null;
	const tagElement = closestAny(base, TAG_SELECTORS);
	if (tagElement) return resolveTagTarget(tagElement);
	const folderElement = closestAny(base, FOLDER_SELECTORS);
	if (folderElement) return resolveFolderTarget(folderElement);
	return null;
}

export async function handleNativeBindingClick(
	event: MouseEvent,
	deps: NativeBindingClickDeps,
): Promise<boolean> {
	if (!isBindingClick(event)) return false;
	const target = resolveNativeBindingTarget(event.target);
	if (!target) return false;
	event.preventDefault();
	event.stopImmediatePropagation();
	await deps.bindingService.bindOrCreate(target.node);
	return true;
}

export function handleNativeBindingHover(
	event: MouseEvent,
	deps: NativeBindingHoverDeps,
): boolean {
	const target = resolveNativeBindingTarget(event.target);
	if (!target) return false;
	const token = computeAliasToken(target.node);
	const matches = findNotesByAlias(deps.app, token);
	if (matches.length !== 1) return false;
	deps.app.workspace.trigger('hover-link', {
		event,
		source: NATIVE_SURFACE_HOVER_SOURCE,
		targetEl: target.element,
		linktext: matches[0].path,
		hoverParent: target.hoverParent,
	});
	return true;
}

export class NativeSurfaceBindingService extends Component {
	constructor(private readonly deps: NativeSurfaceBindingServiceDeps) {
		super();
	}

	onload(): void {
		this.deps.plugin.registerHoverLinkSource(NATIVE_SURFACE_HOVER_SOURCE, {
			display: 'Vaultman native surfaces',
			defaultMod: true,
		});
		const doc = this.deps.doc ?? activeDocument;
		this.registerDomEvent(
			doc,
			'click',
			(event) => {
				void handleNativeBindingClick(event, { bindingService: this.deps.bindingService });
			},
			{ capture: true },
		);
		this.registerDomEvent(
			doc,
			'auxclick',
			(event) => {
				void handleNativeBindingClick(event, { bindingService: this.deps.bindingService });
			},
			{ capture: true },
		);
		this.registerDomEvent(
			doc,
			'mouseover',
			(event) => {
				handleNativeBindingHover(event, { app: this.deps.app });
			},
			{ capture: false },
		);
	}
}

function resolveTagTarget(element: HTMLElement): NativeBindingTarget | null {
	const raw = tagText(element);
	const tagPath = raw.replace(/^#/, '').trim();
	if (!tagPath) return null;
	return {
		element,
		node: {
			kind: 'tag',
			label: tagPath,
			tagPath,
		},
		hoverParent: closestHoverParent(element),
	};
}

function resolveFolderTarget(element: HTMLElement): NativeBindingTarget | null {
	const folderPath = folderPathFor(element);
	if (!folderPath) return null;
	return {
		element,
		node: {
			kind: 'folder',
			label: folderPath,
		},
		hoverParent: closestHoverParent(element),
	};
}

function tagText(element: HTMLElement): string {
	const attrHref = element.getAttribute?.('href');
	if (attrHref?.startsWith('#')) return decodeURIComponent(attrHref.slice(1));
	const inner = element.querySelector?.(
		'.tag-pane-tag-text, .tree-item-inner-text, .multi-select-pill-content',
	);
	return (inner?.textContent ?? element.textContent ?? '').trim();
}

function folderPathFor(element: HTMLElement): string {
	const datasetPath = element.dataset?.path;
	if (datasetPath) return datasetPath.trim();
	const attrPath = element.getAttribute?.('data-path');
	if (attrPath) return attrPath.trim();
	return (element.textContent ?? '').trim();
}

function closestHoverParent(element: HTMLElement): HTMLElement {
	return asHtmlElement(element.closest?.(HOVER_PARENT_SELECTOR)) ?? element;
}

function closestAny(
	element: ClosableElement,
	selectors: readonly string[],
): HTMLElement | null {
	for (const selector of selectors) {
		const match = asHtmlElement(element.closest(selector));
		if (match) return match;
	}
	return null;
}

function asElement(target: EventTarget | null): ClosableElement | null {
	if (!target || typeof (target as ClosableElement).closest !== 'function') return null;
	return target as ClosableElement;
}

function asHtmlElement(value: unknown): HTMLElement | null {
	if (!value || typeof (value as { closest?: unknown }).closest !== 'function') return null;
	return value as HTMLElement;
}

function isBindingClick(event: MouseEvent): boolean {
	return event.metaKey || event.ctrlKey || event.altKey || event.button === 1;
}
