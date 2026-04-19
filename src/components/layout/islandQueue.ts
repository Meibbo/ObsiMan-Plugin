import { mount, unmount } from 'svelte';
import type { Component } from 'svelte';
import type { OperationQueueService } from '../../services/serviceQueue';
import { translate } from '../../i18n/index';
import BtnSelection from '../btnSelection.svelte';
import type { BtnSelectionItem } from '../../types/typeUI';

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

	private bodyMode: 'list' | 'diff' = 'list';

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
				isActive: this.bodyMode === 'diff',
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
		this.bodyMode = this.bodyMode === 'list' ? 'diff' : 'list';
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
		this.listEl.empty();

		if (this.bodyMode === 'diff') {
			this.listEl.createDiv({
				cls: 'vm-viewdiff-placeholder',
				text: translate('queue.file_diff_coming'),
			});
			return;
		}

		const entries = this.queueService.listTransactions();
		if (entries.length === 0) {
			this.listEl.createDiv({ cls: 'vaultman-queue-island-empty', text: translate('queue.island.empty') });
			return;
		}

		for (const vfs of entries) {
			const rowEl = this.listEl.createDiv({ cls: 'vaultman-queue-island-row' });
			rowEl.createSpan({
				cls: 'vaultman-queue-island-row-files',
				text: translate('queue.file_row', { ops: vfs.ops.length }),
			});
			rowEl.createSpan({
				cls: 'vaultman-queue-island-row-detail',
				text: vfs.originalPath.split('/').pop() ?? vfs.originalPath,
			});
		}
	}

	render(): void {
		if (!this.listEl || !this.headerEl) return;
		this.headerEl.setText(`${this.queueService.fileCount} ${translate('queue.island.pending')}`);
		this.renderBody();
	}

	destroy(): void {
		if (this.btnComponent) {
			void unmount(this.btnComponent);
			this.btnComponent = null;
		}
		this.islandEl?.remove();
		this.islandEl = null;
		this.btnRowEl = null;
		this.listEl = null;
		this.headerEl = null;
	}
}
