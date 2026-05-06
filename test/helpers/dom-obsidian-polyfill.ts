// Obsidian augments Element/Document with helpers that jsdom lacks.
// Polyfill the minimal surface used by Vaultman components mounted in tests.

type ObsEl = Element & {
	addClass(cls: string): void;
	removeClass(cls: string): void;
	toggleClass(cls: string, force?: boolean): void;
	empty(): void;
	createDiv(opts?: { cls?: string; text?: string }): HTMLElement;
	createEl(tag: string, opts?: { cls?: string; text?: string }): HTMLElement;
	createSpan(opts?: { cls?: string; text?: string }): HTMLElement;
	setText(text: string): void;
};

export function installObsidianDomPolyfill(): void {
	if (typeof Element === 'undefined') return;
	const proto = Element.prototype as unknown as ObsEl;
	if (!proto.addClass) {
		proto.addClass = function (cls: string) {
			(this as Element).classList.add(cls);
		};
	}
	if (!proto.removeClass) {
		proto.removeClass = function (cls: string) {
			(this as Element).classList.remove(cls);
		};
	}
	if (!proto.toggleClass) {
		proto.toggleClass = function (cls: string, force?: boolean) {
			(this as Element).classList.toggle(cls, force);
		};
	}
	if (!proto.empty) {
		proto.empty = function () {
			const el = this as Element;
			while (el.firstChild) el.removeChild(el.firstChild);
		};
	}
	if (!proto.createEl) {
		proto.createEl = function (tag: string, opts?: { cls?: string; text?: string }) {
			const child = document.createElement(tag);
			if (opts?.cls) child.className = opts.cls;
			if (opts?.text) child.textContent = opts.text;
			(this as Element).appendChild(child);
			return child;
		};
	}
	if (!proto.createDiv) {
		proto.createDiv = function (opts?: { cls?: string; text?: string }) {
			return (this as ObsEl).createEl('div', opts);
		};
	}
	if (!proto.createSpan) {
		proto.createSpan = function (opts?: { cls?: string; text?: string }) {
			return (this as ObsEl).createEl('span', opts);
		};
	}
	if (!proto.setText) {
		proto.setText = function (text: string) {
			(this as Element).textContent = text;
		};
	}
}
