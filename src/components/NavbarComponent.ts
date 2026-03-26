import { setIcon } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import type { PropertyExplorerComponent } from './PropertyExplorerComponent';
import { FileFilterPopoverComponent } from './FileFilterPopoverComponent';
import { t } from '../i18n/index';

export interface NavbarCallbacks {
	onToggleExplorer: () => void;
	onToggleOperations: () => void;
	onFiltersChanged: () => void;
}

/**
 * Dual-orientation navbar with 7 buttons.
 * Vertical (36px strip) when explorer is closed, horizontal bar when open.
 */
export class NavbarComponent {
	private containerEl: HTMLElement;
	private plugin: ObsiManPlugin;
	private explorer: PropertyExplorerComponent;
	private callbacks: NavbarCallbacks;
	private filterPopover: FileFilterPopoverComponent;

	private filterBadge: HTMLElement | null = null;
	private filterPopoverEl!: HTMLElement;

	constructor(
		containerEl: HTMLElement,
		popoverAnchorEl: HTMLElement,
		plugin: ObsiManPlugin,
		explorer: PropertyExplorerComponent,
		callbacks: NavbarCallbacks
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.explorer = explorer;
		this.callbacks = callbacks;

		// Filter popover lives outside the navbar so it can overlay
		this.filterPopoverEl = popoverAnchorEl.createDiv();
		this.filterPopover = new FileFilterPopoverComponent(
			this.filterPopoverEl,
			plugin,
			() => {
				this.refreshFilterBadge();
				callbacks.onFiltersChanged();
			}
		);

		this.render();
	}

	private render(): void {
		this.containerEl.empty();
		this.containerEl.addClass('obsiman-navbar');

		// 1. Explorer toggle
		this.addButton('lucide-panel-left', t('explorer.toggle'), () => {
			this.callbacks.onToggleExplorer();
		});

		// 2. File filter
		const filterBtn = this.addButton('lucide-filter', t('toolbar.filters'), () => {
			this.filterPopover.toggle();
		});
		this.filterBadge = filterBtn.createSpan({ cls: 'obsiman-navbar-badge' });
		this.refreshFilterBadge();

		// 3. Property search
		this.addButton('lucide-search', t('explorer.btn.search'), () => {
			this.explorer.toggleSearch();
		});

		// 4. Property filter (scope + type)
		this.addButton('lucide-list-filter', t('explorer.btn.filter'), (e) => {
			this.explorer.showFilterMenu(e);
		});

		// 5. Sort
		this.addButton('lucide-arrow-up-down', t('explorer.btn.sort'), (e) => {
			this.explorer.showSortMenu(e);
		});

		// 6. Create property
		this.addButton('lucide-plus', t('explorer.btn.create'), () => {
			this.explorer.openCreateProperty();
		});

		// 7. Operations panel toggle
		this.addButton('lucide-wrench', t('ops.panel.title'), () => {
			this.callbacks.onToggleOperations();
		});
	}

	private addButton(icon: string, label: string, onClick: (e: MouseEvent) => void): HTMLElement {
		const btn = this.containerEl.createDiv({
			cls: 'clickable-icon',
			attr: { 'aria-label': label },
		});
		setIcon(btn, icon);
		btn.addEventListener('click', onClick);
		return btn;
	}

	setOrientation(mode: 'vertical' | 'horizontal'): void {
		if (mode === 'horizontal') {
			this.containerEl.addClass('is-horizontal');
		} else {
			this.containerEl.removeClass('is-horizontal');
		}
	}

	refreshFilterBadge(): void {
		if (!this.filterBadge) return;
		const count = this.filterPopover.getActiveCount();
		if (count > 0) {
			this.filterBadge.setText(String(count));
			this.filterBadge.removeClass('obsiman-hidden');
		} else {
			this.filterBadge.setText('');
			this.filterBadge.addClass('obsiman-hidden');
		}
	}
}
