import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { OperationsPanelComponent } from '../components/OperationsPanelComponent';

export const OBSIMAN_OPS_VIEW_TYPE = 'obsiman-ops';

export class ObsiManOpsView extends ItemView {
	private plugin: ObsiManPlugin;
	private panel!: OperationsPanelComponent;

	constructor(leaf: WorkspaceLeaf, plugin: ObsiManPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string { return OBSIMAN_OPS_VIEW_TYPE; }
	getDisplayText(): string { return 'ObsiMan Operations'; }
	getIcon(): string { return 'obsiman-icon'; }

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-ops-view');

		this.panel = new OperationsPanelComponent(contentEl, this.plugin, {});

		const queueChanged = () => this.panel.refreshQueue();
		this.plugin.queueService.on('changed', queueChanged);
		this.register(() => this.plugin.queueService.off('changed', queueChanged));
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}
