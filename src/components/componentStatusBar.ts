import { translate } from '../i18n/index';

export interface StatusBarData {
	filtered: number;
	total: number;
	selected: number;
	queued: number;
	propertyCount: number;
	valueCount: number;
}

/**
 * Bottom status bar: left = file counts, right = property/value counts.
 */
export class StatusBarComponent {
	private containerEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}

	render(data: StatusBarData): void {
		this.containerEl.empty();

		// Left group: total | filtered | selected | pending
		const leftEl = this.containerEl.createDiv({ cls: 'vm-statusbar-left' });

		leftEl.createSpan({
			cls: 'vm-statusbar-item',
			text: translate('statusbar.files', { count: data.total }),
		});

		this.addSep(leftEl, '|');

		leftEl.createSpan({
			cls: 'vm-statusbar-item',
			text: translate('statusbar.filtered_label', { count: data.filtered }),
		});

		this.addSep(leftEl, '|');

		const selCls = data.selected > 0
			? 'vm-statusbar-item vm-statusbar-selected'
			: 'vm-statusbar-item';
		leftEl.createSpan({
			cls: selCls,
			text: translate('statusbar.selected', { count: data.selected }),
		});

		this.addSep(leftEl, '|');

		const qCls = data.queued > 0
			? 'vm-statusbar-item vm-statusbar-queued'
			: 'vm-statusbar-item';
		leftEl.createSpan({
			cls: qCls,
			text: translate('statusbar.pending', { count: data.queued }),
		});

		// Right group: props · values
		const rightEl = this.containerEl.createDiv({ cls: 'vm-statusbar-right' });

		rightEl.createSpan({
			cls: 'vm-statusbar-item',
			text: translate('statusbar.props_label', { count: data.propertyCount }),
		});

		this.addSep(rightEl, '·');

		rightEl.createSpan({
			cls: 'vm-statusbar-item',
			text: translate('statusbar.values_label', { count: data.valueCount }),
		});
	}

	private addSep(parent: HTMLElement, char: string): void {
		parent.createSpan({
			cls: 'vm-statusbar-separator',
			text: ` ${char} `,
		});
	}
}
