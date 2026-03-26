import { Modal, Setting, type App, type TFile } from 'obsidian';
import type { PropertyAction, PropertyType, PendingChange } from '../types/operation';
import { DELETE_PROP } from '../types/operation';
import type { PropertyIndexService } from '../services/PropertyIndexService';
import { PropertySuggest } from '../utils/autocomplete';
import { t } from '../i18n/index';

type QueueCallback = (change: PendingChange) => void;

/**
 * Modal for creating property operations (set, rename, delete, clean, change type).
 * Operations are queued — not executed immediately.
 *
 * Port of Python's PropertyManagerWindow.
 */
export class PropertyManagerModal extends Modal {
	private propertyIndex: PropertyIndexService;
	private targetFiles: TFile[];
	private onQueue: QueueCallback;

	// Form state
	private action: PropertyAction = 'set';
	private property = '';
	private value = '';
	private newName = '';
	private propertyType: PropertyType = 'text';
	private asWikilink = false;
	private appendToList = false;

	constructor(
		app: App,
		propertyIndex: PropertyIndexService,
		targetFiles: TFile[],
		onQueue: QueueCallback
	) {
		super(app);
		this.propertyIndex = propertyIndex;
		this.targetFiles = targetFiles;
		this.onQueue = onQueue;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-modal');

		contentEl.createEl('h3', { text: t('prop.title') });
		contentEl.createEl('p', {
			cls: 'obsiman-modal-subtitle',
			text: `${this.targetFiles.length} files`,
		});

		// Action selector
		new Setting(contentEl)
			.setName(t('prop.action'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						set: t('prop.action.set'),
						rename: t('prop.action.rename'),
						delete: t('prop.action.delete'),
						clean_empty: t('prop.action.clean'),
						change_type: t('prop.action.change_type'),
					})
					.setValue(this.action)
					.onChange((v) => {
						this.action = v as PropertyAction;
						this.renderForm();
					})
			);

		contentEl.createDiv({ cls: 'obsiman-prop-form' });
		this.renderForm();
	}

	private renderForm(): void {
		const formEl = this.contentEl.querySelector('.obsiman-prop-form');
		if (!formEl) return;
		formEl.empty();

		const propertyNames = this.propertyIndex.getPropertyNames();

		// Property selector with autosuggest
		new Setting(formEl as HTMLElement)
			.setName(t('prop.property'))
			.addText((text) => {
				text
					.setPlaceholder('property name...')
					.setValue(this.property)
					.onChange((v) => {
						this.property = v;
					});
				new PropertySuggest(
					this.app,
					text.inputEl,
					propertyNames,
					(val) => {
						this.property = val;
						text.setValue(val);
					}
				);
			});

		// Action-specific fields
		switch (this.action) {
			case 'set':
				this.renderSetFields(formEl as HTMLElement);
				break;
			case 'rename':
				this.renderRenameFields(formEl as HTMLElement);
				break;
			case 'delete':
				// No extra fields needed
				break;
			case 'clean_empty':
				// No extra fields needed
				break;
			case 'change_type':
				this.renderChangeTypeFields(formEl as HTMLElement);
				break;
		}

		// Submit button
		new Setting(formEl as HTMLElement).addButton((btn) =>
			btn
				.setButtonText(t('prop.add_to_queue'))
				.setCta()
				.onClick(() => {
					const change = this.buildChange();
					if (change) {
						this.onQueue(change);
						this.close();
					}
				})
		);
	}

	private renderSetFields(container: HTMLElement): void {
		// Type selector
		new Setting(container)
			.setName(t('prop.type'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						text: t('prop.type.text'),
						number: t('prop.type.number'),
						checkbox: t('prop.type.checkbox'),
						list: t('prop.type.list'),
						date: t('prop.type.date'),
					})
					.setValue(this.propertyType)
					.onChange((v) => {
						this.propertyType = v as PropertyType;
					})
			);

		// Value input with autosuggest
		new Setting(container)
			.setName(t('prop.value'))
			.addText((text) => {
				text
					.setPlaceholder('value')
					.setValue(this.value)
					.onChange((v) => {
						this.value = v;
					});
				if (this.property) {
					new PropertySuggest(
						this.app,
						text.inputEl,
						this.propertyIndex.getPropertyValues(this.property),
						(val) => {
							this.value = val;
							text.setValue(val);
						}
					);
				}
			});

		// Wikilink toggle
		new Setting(container)
			.setName(t('prop.option.wikilink'))
			.addToggle((toggle) =>
				toggle.setValue(this.asWikilink).onChange((v) => {
					this.asWikilink = v;
				})
			);

		// Append toggle (for list type)
		if (this.propertyType === 'list') {
			new Setting(container)
				.setName(t('prop.option.append'))
				.addToggle((toggle) =>
					toggle.setValue(this.appendToList).onChange((v) => {
						this.appendToList = v;
					})
				);
		}
	}

	private renderRenameFields(container: HTMLElement): void {
		new Setting(container)
			.setName(t('prop.new_name'))
			.addText((text) => {
				text
					.setPlaceholder('new property name')
					.setValue(this.newName)
					.onChange((v) => {
						this.newName = v;
					});
				new PropertySuggest(
					this.app,
					text.inputEl,
					this.propertyIndex.getPropertyNames(),
					(val) => {
						this.newName = val;
						text.setValue(val);
					}
				);
			});
	}

	private renderChangeTypeFields(container: HTMLElement): void {
		new Setting(container)
			.setName(t('prop.type'))
			.addDropdown((dd) =>
				dd
					.addOptions({
						text: t('prop.type.text'),
						number: t('prop.type.number'),
						checkbox: t('prop.type.checkbox'),
						list: t('prop.type.list'),
						date: t('prop.type.date'),
						wikilink: t('prop.type.wikilink'),
					})
					.setValue(this.propertyType)
					.onChange((v) => {
						this.propertyType = v as PropertyType;
					})
			);
	}

	private buildChange(): PendingChange | null {
		if (!this.property) return null;

		const files = [...this.targetFiles];

		switch (this.action) {
			case 'set': {
				const parsedValue = this.parseValue(this.value, this.propertyType);
				const finalValue = this.asWikilink ? `[[${parsedValue}]]` : parsedValue;
				return {
					property: this.property,
					action: 'set',
					details: `${this.property} = ${String(finalValue)}`,
					files,
					logicFunc: (_file, metadata) => {
						if (this.propertyType === 'list' && this.appendToList) {
							const existing = metadata[this.property];
							const list = Array.isArray(existing) ? [...existing] : [];
							if (Array.isArray(finalValue)) {
								list.push(...finalValue);
							} else {
								list.push(finalValue);
							}
							return { [this.property]: list };
						}
						return { [this.property]: finalValue };
					},
					customLogic: false,
				};
			}

			case 'rename': {
				if (!this.newName) return null;
				return {
					property: this.property,
					action: 'rename',
					details: `${this.property} → ${this.newName}`,
					files,
					logicFunc: (_file, metadata) => {
						if (!(this.property in metadata)) return null;
						const value = metadata[this.property];
						return {
							[this.newName]: value,
							[DELETE_PROP]: this.property,
						};
					},
					customLogic: false,
				};
			}

			case 'delete':
				return {
					property: this.property,
					action: 'delete',
					details: `delete ${this.property}`,
					files,
					logicFunc: () => ({ [DELETE_PROP]: this.property }),
					customLogic: false,
				};

			case 'clean_empty':
				return {
					property: this.property,
					action: 'clean_empty',
					details: `clean empty ${this.property}`,
					files,
					logicFunc: (_file, metadata) => {
						const val = metadata[this.property];
						if (
							val === null ||
							val === undefined ||
							val === '' ||
							(Array.isArray(val) && val.length === 0)
						) {
							return { [DELETE_PROP]: this.property };
						}
						return null;
					},
					customLogic: false,
				};

			case 'change_type':
				return {
					property: this.property,
					action: 'change_type',
					details: `${this.property} → ${this.propertyType}`,
					files,
					logicFunc: (_file, metadata) => {
						if (!(this.property in metadata)) return null;
						const current = metadata[this.property];
						return { [this.property]: this.convertType(current, this.propertyType) };
					},
					customLogic: false,
				};
		}
	}

	private parseValue(raw: string, type: PropertyType): unknown {
		switch (type) {
			case 'number': {
				const n = Number(raw);
				return isNaN(n) ? 0 : n;
			}
			case 'checkbox':
				return !['false', '0', 'no', 'none', 'null', ''].includes(
					raw.toLowerCase().trim()
				);
			case 'list':
				return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
			case 'date':
			case 'text':
			default:
				return raw;
		}
	}

	private convertType(value: unknown, targetType: PropertyType): unknown {
		switch (targetType) {
			case 'wikilink': {
				// Wrap in [[...]] if not already wrapped
				const toWikilink = (v: unknown): string => {
					const s = String(v ?? '').replace(/^\[\[|\]\]$/g, '');
					return s ? `[[${s}]]` : '';
				};
				if (Array.isArray(value)) return value.map(toWikilink);
				return toWikilink(value);
			}
			case 'text':
				if (Array.isArray(value)) return value.map(String).join(', ');
				// Strip wikilink brackets if present
				return String(value ?? '').replace(/^\[\[|\]\]$/g, '');
			case 'number': {
				if (Array.isArray(value)) {
					const first = value[0];
					const n = Number(first);
					return isNaN(n) ? 0 : n;
				}
				const n = Number(value);
				return isNaN(n) ? 0 : n;
			}
			case 'checkbox': {
				if (typeof value === 'string') {
					return !['false', '0', 'no', 'none', 'null', ''].includes(
						value.toLowerCase().trim()
					);
				}
				return Boolean(value);
			}
			case 'list':
				if (Array.isArray(value)) return value;
				if (typeof value === 'string') {
					return value.split(',').map((s) => s.trim()).filter(Boolean);
				}
				return value != null ? [String(value)] : [];
			case 'date': {
				if (Array.isArray(value)) return String(value[0] ?? '');
				const str = String(value ?? '');
				// Try to extract ISO date pattern
				const dateMatch = str.match(
					/(\d{4}-\d{2}-\d{2})(?:T|\s)?(\d{2}:\d{2}:\d{2})?/
				);
				if (dateMatch) {
					return dateMatch[2]
						? `${dateMatch[1]}T${dateMatch[2]}`
						: dateMatch[1];
				}
				return str;
			}
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
