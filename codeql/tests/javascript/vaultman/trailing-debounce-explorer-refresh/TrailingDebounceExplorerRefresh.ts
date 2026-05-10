import { debounce, leadingDebounce } from '../../../src/utils/utilDebounce';

declare const activeWindow: Window;
declare const plugin: {
	filesIndex: { refresh(): void };
	propsIndex: { refresh(): void };
	tagsIndex: { refresh(): void };
	contentIndex: { refresh(): void };
	activeFiltersIndex: { refresh(): void };
};

debounce(() => void plugin.filesIndex.refresh(), 250);

debounce(() => {
	void plugin.propsIndex.refresh();
	void plugin.tagsIndex.refresh();
}, 250);

activeWindow.setTimeout(() => void plugin.contentIndex.refresh(), 250);

setTimeout(() => void plugin.activeFiltersIndex.refresh(), 250);

leadingDebounce(() => void plugin.filesIndex.refresh(), 250);

debounce(() => {
	refreshActiveFiltersPopup();
}, 250);

activeWindow.setTimeout(() => {
	refreshCssTransition();
}, 250);

function refreshActiveFiltersPopup(): void {}

function refreshCssTransition(): void {}
