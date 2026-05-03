import type { VaultmanPlugin } from '../../main';
import type { PopupType } from '../../types/typePrimitives';

export class FrameOverlayController {
	private readonly plugin!: VaultmanPlugin;
	private readonly queueComponent!: unknown;
	private readonly activeFiltersComponent!: unknown;

	activePopup = $state<PopupType | null>(null);
	popupOpen = $state(false);
	isIslandOpen = $derived.by(
		() =>
			this.plugin.overlayState.isOpen('queue') || this.plugin.overlayState.isOpen('active-filters'),
	);

	constructor(plugin: VaultmanPlugin, queueComponent: unknown, activeFiltersComponent: unknown) {
		this.plugin = plugin;
		this.queueComponent = queueComponent;
		this.activeFiltersComponent = activeFiltersComponent;
	}

	closePopup(): void {
		this.popupOpen = false;
		activeWindow.setTimeout(() => {
			this.activePopup = null;
		}, 320);
	}

	toggleQueueIsland(): void {
		this.closeFiltersIsland();
		if (this.activePopup === 'active-filters') this.closePopup();
		if (this.plugin.overlayState.isOpen('queue')) {
			this.closeQueueIsland();
		} else {
			this.openQueueIsland();
		}
	}

	openQueueIsland(): void {
		this.plugin.overlayState.push({
			id: 'queue',
			component: this.queueComponent,
			props: {
				plugin: this.plugin,
				onClose: () => this.plugin.overlayState.popById('queue'),
			},
			dismissOnOutsideClick: this.plugin.settings.islandDismissOnOutsideClick,
		});
	}

	closeQueueIsland(): void {
		this.plugin.overlayState.popById('queue');
	}

	toggleFiltersIsland(): void {
		this.closeQueueIsland();
		if (this.plugin.overlayState.isOpen('active-filters')) {
			this.closeFiltersIsland();
		} else {
			this.openFiltersIsland();
		}
	}

	openFiltersIsland(): void {
		this.plugin.overlayState.push({
			id: 'active-filters',
			component: this.activeFiltersComponent,
			props: {
				plugin: this.plugin,
				onClose: () => this.plugin.overlayState.popById('active-filters'),
			},
			dismissOnOutsideClick: this.plugin.settings.islandDismissOnOutsideClick,
		});
	}

	closeFiltersIsland(): void {
		this.plugin.overlayState.popById('active-filters');
	}
}
