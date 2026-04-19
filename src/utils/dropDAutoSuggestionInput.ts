import { AbstractInputSuggest, type App } from 'obsidian';

export interface DropDSuggestionItem {
	value: string;   // canonical identifier (e.g. file path)
	label: string;   // display text shown in input after selection
	hint?: string;   // secondary info (e.g. folder, op count) shown in dropdown row
}

export interface DropDAutoSuggestionConfig {
	app: App;
	inputEl: HTMLInputElement;
	getItems: () => DropDSuggestionItem[];  // called each time dropdown opens/filters
	onSelect: (item: DropDSuggestionItem) => void;
	placeholder?: string;
}

/**
 * Attaches an auto-suggestion dropdown to an HTMLInputElement.
 * Returns { destroy } for cleanup on component teardown.
 */
export function attachDropDAutoSuggestionInput(
	cfg: DropDAutoSuggestionConfig,
): { destroy: () => void } {
	const suggest = new DropDSuggest(cfg.app, cfg);
	return {
		destroy: () => suggest.close(),
	};
}

/**
 * Private inner class extending AbstractInputSuggest for file-picker suggestions.
 */
class DropDSuggest extends AbstractInputSuggest<DropDSuggestionItem> {
	constructor(app: App, private cfg: DropDAutoSuggestionConfig) {
		super(app, cfg.inputEl);
		if (cfg.placeholder) cfg.inputEl.placeholder = cfg.placeholder;
	}

	getSuggestions(query: string): DropDSuggestionItem[] {
		const q = query.toLowerCase();
		return this.cfg.getItems().filter(
			(item) =>
				item.label.toLowerCase().includes(q) ||
				(item.hint?.toLowerCase().includes(q) ?? false)
		);
	}

	renderSuggestion(item: DropDSuggestionItem, el: HTMLElement): void {
		const row = el.createDiv({ cls: 'vaultman-dropd-suggestion-row' });
		row.createSpan({ cls: 'vaultman-dropd-suggestion-label', text: item.label });
		if (item.hint) {
			row.createSpan({ cls: 'vaultman-dropd-suggestion-hint', text: item.hint });
		}
	}

	selectSuggestion(item: DropDSuggestionItem): void {
		this.cfg.inputEl.value = item.label;
		this.cfg.onSelect(item);
		this.close();
	}
}
