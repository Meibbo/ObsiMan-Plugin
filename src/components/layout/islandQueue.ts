import { mount, unmount } from 'svelte';
import type { Component } from 'svelte';
import type { OperationQueueService } from '../../services/serviceQueue';
import type { OperationDiffContext } from '../../services/serviceDiff';
import { translate } from '../../i18n/index';
import BtnSelection from '../btnSelection.svelte';
import type { BtnSelectionItem } from '../../types/typeUI';
import { QueueListComponent } from '../componentQueueList';
import ViewDiff from '../views/viewDiff.svelte';

/**
 * In-frame floating island showing the pending operation queue.
 * Rendered above the bottom nav bar, slides up from below.
 *
 * Structure (top → bottom inside island):
 *   squircle buttons: Clear · Marks · FileDiff(toggle) · Execute
 *   header ("N pending changes")
 *   scrollable item list (or diff placeholder)
 */
export class QueueIslandComponent {
	private containerEl: HTMLElement;
	private queueService: OperationQueueService;
	private onClose: () => void;

	private islandEl: HTMLElement | null = null;
	private btnRowEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private headerEl: HTMLElement | null = null;
	private btnComponent: ReturnType<typeof mount> | null = null;
	private bodyComponent: ReturnType<typeof mount> | null = null;
	private queueListComponent: QueueListComponent | null = null;

	private bodyMode: 'list' | 'diff' = 'list';
	private expandedOpContext: OperationDiffContext | null = null;

	constructor(
		containerEl: HTMLElement,
		_app: unknown,
		queueService: OperationQueueService,
		onClose: () => void,
		_onOpenDetails: () => void
	) {
		this.containerEl = containerEl;
		this.queueService = queueService;
		this.onClose = onClose;
	}

	private buildButtons(): BtnSelectionItem[] {
		return [
			{
				icon: 'lucide-trash-2',
				label: translate('queue.clear'),
				onClick: () => {
					this.queueService.clear();
				},
			},
			{
				icon: 'lucide-stamp',
				label: translate('queue.marks'),
				onClick: () => {
					// Stub for future marks/templates feature
				},
			},
			{
				icon: 'lucide-git-compare',
				label: translate('queue.file_diff'),
				isToggle: true,
				isActive: this.expandedOpContext !== null || this.bodyMode === 'diff',
				disabled: this.expandedOpContext !== null,
				onClick: () => {
					this.toggleBodyMode();
				},
			},
			{
				icon: 'lucide-play',
				label: translate('queue.execute'),
				isActive: true,
				onClick: () => {
					void this.queueService.execute();
					this.onClose();
				},
			},
		];
	}

	private renderBtnRow(): void {
		if (!this.btnRowEl) return;
		if (this.btnComponent) {
			void unmount(this.btnComponent);
			this.btnComponent = null;
		}
		this.btnComponent = mount(
			BtnSelection as unknown as Component<{ buttons: BtnSelectionItem[]; ariaLabel?: string }>,
			{
				target: this.btnRowEl,
				props: { buttons: this.buildButtons() },
			}
		);
	}

	private toggleBodyMode(): void {
		if (this.expandedOpContext) return;
		this.bodyMode = this.bodyMode === 'list' ? 'diff' : 'list';
		this.renderBtnRow();
		this.renderBody();
	}

	private setExpandedOpContext(path: string, opId: string): void {
		this.expandedOpContext = { path, opId };
		this.renderBtnRow();
		this.renderBody();
	}

	private clearExpandedOpContext(): void {
		this.expandedOpContext = null;
		this.renderBtnRow();
		this.renderBody();
	}

	mount(): void {
		this.islandEl = this.containerEl.createDiv({ cls: 'vaultman-queue-island' });

		// 1. Squircle action buttons (D6 order: Clear · Marks · FileDiff · Execute)
		this.btnRowEl = this.islandEl.createDiv({ cls: 'vaultman-queue-island-btns' });
		this.renderBtnRow();

		// 2. Header — count label
		this.headerEl = this.islandEl.createDiv({ cls: 'vaultman-queue-island-header' });

		// 3. Scrollable item list / diff placeholder
		this.listEl = this.islandEl.createDiv({ cls: 'vaultman-queue-island-list' });

		this.render();

		// Slide in after next frame so CSS transition fires
		requestAnimationFrame(() => {
			this.islandEl?.addClass('is-open');
		});
	}

	private renderBody(): void {
		if (!this.listEl) return;
		this.queueListComponent = null;
		if (this.bodyComponent) {
			void unmount(this.bodyComponent);
			this.bodyComponent = null;
		}
		this.listEl.empty();

		if (this.expandedOpContext) {
			const tx = this.queueService.getTransaction(this.expandedOpContext.path);
			const hasOp = tx?.ops.some((op) => op.id === this.expandedOpContext?.opId) ?? false;
			if (!hasOp) {
				this.expandedOpContext = null;
			}
		}

		if (this.expandedOpContext) {
			this.bodyComponent = mount(
				ViewDiff as unknown as Component<{
					queueService: OperationQueueService;
					expandedOpContext: OperationDiffContext;
					mode: 'operation-focused';
				}>,
				{
					target: this.listEl,
					props: {
						queueService: this.queueService,
						expandedOpContext: this.expandedOpContext,
						mode: 'operation-focused',
					},
				}
			);
			return;
		}

		if (this.bodyMode === 'diff') {
			this.bodyComponent = mount(
				ViewDiff as unknown as Component<{
					queueService: OperationQueueService;
					mode: 'file-focused';
				}>,
				{
					target: this.listEl,
					props: {
						queueService: this.queueService,
						mode: 'file-focused',
					},
				}
			);
			return;
		}

		const entries = this.queueService.listTransactions();
		if (entries.length === 0) {
			this.listEl.createDiv({ cls: 'vaultman-queue-island-empty', text: translate('queue.island.empty') });
			return;
		}

		this.queueListComponent = new QueueListComponent(this.listEl, {
			onRemoveFile: (path) => {
				this.queueService.removeFile(path);
			},
			onRemoveOp: (path, opId) => {
				if (this.expandedOpContext?.path === path && this.expandedOpContext.opId === opId) {
					this.expandedOpContext = null;
				}
				this.queueService.removeOp(path, opId);
			},
			onExpandOp: (path, opId) => {
				this.setExpandedOpContext(path, opId);
			},
			onCollapseOp: () => {
				this.clearExpandedOpContext();
			},
			showHeader: false,
			expandedPath: null,
			expandedOpId: null,
		});
		this.queueListComponent.render(this.queueService);
	}

	render(): void {
		if (!this.listEl || !this.headerEl) return;
		this.headerEl.setText(translate('queue.summary', {
			ops: this.queueService.opCount,
			files: this.queueService.fileCount,
		}));
		this.renderBody();
	}

	destroy(): void {
		if (this.btnComponent) {
			void unmount(this.btnComponent);
			this.btnComponent = null;
		}
		if (this.bodyComponent) {
			void unmount(this.bodyComponent);
			this.bodyComponent = null;
		}
		this.islandEl?.remove();
		this.islandEl = null;
		this.btnRowEl = null;
		this.listEl = null;
		this.headerEl = null;
		this.queueListComponent = null;
		this.expandedOpContext = null;
	}
}
