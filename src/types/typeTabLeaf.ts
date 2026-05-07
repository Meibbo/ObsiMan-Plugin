/**
 * Generic ItemView shell for an independent vaultman tab leaf.
 *
 * Phase 6, multifacet wave 2: each detachable TabId gets its own
 * registered view-type (`viewTypeFor(tabId)`). The leaf hosts a
 * placeholder element marked with the canonical TabId. Future phases
 * will swap the placeholder for the same Svelte component the in-panel
 * tab uses (the spec mandates "the same component"); the wiring is kept
 * minimal here so phase 6 can land without monkey-patching private
 * Obsidian APIs.
 */
import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { TabId } from '../registry/tabRegistry';
import { viewTypeFor } from '../registry/tabRegistry';

export class VaultmanTabLeafView extends ItemView {
	private readonly tabId: TabId;

	constructor(leaf: WorkspaceLeaf, tabId: TabId) {
		super(leaf);
		this.tabId = tabId;
	}

	getViewType(): string {
		return viewTypeFor(this.tabId);
	}

	getDisplayText(): string {
		return `Vaultman: ${this.tabId}`;
	}

	getIcon(): string {
		return 'lucide-dessert';
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vm-tab-leaf');
		contentEl.setAttribute('data-vm-tab-id', this.tabId);
		const slot = contentEl.createDiv({ cls: 'vm-tab-leaf-slot' });
		slot.setText(`Vaultman ${this.tabId} (independent leaf)`);
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}
