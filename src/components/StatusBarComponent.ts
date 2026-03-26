import { t } from '../i18n/index';

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
		const leftEl = this.containerEl.createDiv({ cls: 'obsiman-statusbar-left' });

		leftEl.createSpan({
			cls: 'obsiman-statusbar-item',
			text: t('statusbar.files', { count: data.total }),
		});

		this.addSep(leftEl, '|');

		leftEl.createSpan({
			cls: 'obsiman-statusbar-item',
			text: t('statusbar.filtered_label', { count: data.filtered }),
		});

		this.addSep(leftEl, '|');

		const selCls = data.selected > 0
			? 'obsiman-statusbar-item obsiman-statusbar-selected'
			: 'obsiman-statusbar-item';
		leftEl.createSpan({
			cls: selCls,
			text: t('statusbar.selected', { count: data.selected }),
		});

		this.addSep(leftEl, '|');

		const qCls = data.queued > 0
			? 'obsiman-statusbar-item obsiman-statusbar-queued'
			: 'obsiman-statusbar-item';
		leftEl.createSpan({
			cls: qCls,
			text: t('statusbar.pending', { count: data.queued }),
		});

		// Right group: props · values
		const rightEl = this.containerEl.createDiv({ cls: 'obsiman-statusbar-right' });

		rightEl.createSpan({
			cls: 'obsiman-statusbar-item',
			text: t('statusbar.props_label', { count: data.propertyCount }),
		});

		this.addSep(rightEl, '·');

		rightEl.createSpan({
			cls: 'obsiman-statusbar-item',
			text: t('statusbar.values_label', { count: data.valueCount }),
		});
	}

	private addSep(parent: HTMLElement, char: string): void {
		parent.createSpan({
			cls: 'obsiman-statusbar-separator',
			text: ` ${char} `,
		});
	}
}
