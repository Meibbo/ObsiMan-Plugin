import { Component, type WorkspaceLeaf } from 'obsidian';

export class BasesCheckboxInjector extends Component {
	private observer: MutationObserver | null = null;
	readonly selectedPaths = new Set<string>();

	attach(baseLeaf: WorkspaceLeaf): void {
		this.detach();
		const container = (baseLeaf.view as { containerEl?: HTMLElement }).containerEl;
		if (!container) return;

		this.observer = new MutationObserver(() => this.injectCheckboxes(container));
		this.observer.observe(container, { childList: true, subtree: true });
		this.injectCheckboxes(container);
	}

	detach(): void {
		this.observer?.disconnect();
		this.observer = null;
	}

	onunload(): void {
		this.detach();
	}

	private injectCheckboxes(container: HTMLElement): void {
		const rows = container.querySelectorAll('tr:not([data-obsiman])');
		for (const row of Array.from(rows)) {
			const tr = row as HTMLElement;

			// Skip header rows (th children)
			if (tr.querySelector('th')) {
				tr.setAttribute('data-obsiman', 'header');
				// Add header checkbox
				if (!tr.querySelector('th.obsiman-bases-th-check')) {
					const th = document.createElement('th');
					th.className = 'obsiman-bases-th-check';
					const headerCb = document.createElement('input');
					headerCb.type = 'checkbox';
					th.appendChild(headerCb);
					tr.insertBefore(th, tr.firstChild);

					headerCb.addEventListener('click', (e) => {
						e.preventDefault();
						// Select/deselect all based on current state
						const allCbs = container.querySelectorAll<HTMLInputElement>('td.obsiman-bases-td-check input');
						const allChecked = Array.from(allCbs).every(cb => cb.checked);
						for (const cb of Array.from(allCbs)) {
							const path = (cb.closest('tr') as HTMLElement)?.dataset.obsimanPath ?? '';
							cb.checked = !allChecked;
							if (cb.checked && path) {
								this.selectedPaths.add(path);
							} else if (path) {
								this.selectedPaths.delete(path);
							}
							const rowEl = cb.closest('tr') as HTMLElement;
							if (rowEl) rowEl.classList.toggle('is-selected', cb.checked);
						}
					});
				}
				continue;
			}

			tr.setAttribute('data-obsiman', 'true');

			// Extract file path from row
			const nameLink = tr.querySelector('a[data-href], .internal-link') as HTMLAnchorElement | null;
			const filePath = nameLink?.getAttribute('data-href') ?? nameLink?.getAttribute('href') ?? '';
			if (filePath) tr.dataset.obsimanPath = filePath;

			// Inject checkbox cell
			if (!tr.querySelector('td.obsiman-bases-td-check')) {
				const td = document.createElement('td');
				td.className = 'obsiman-bases-td-check';
				const cb = document.createElement('input');
				cb.type = 'checkbox';
				cb.checked = filePath ? this.selectedPaths.has(filePath) : false;

				if (cb.checked) tr.classList.add('is-selected');

				cb.addEventListener('change', (e) => {
					e.stopPropagation();
					if (!filePath) return;
					if (cb.checked) {
						this.selectedPaths.add(filePath);
						tr.classList.add('is-selected');
					} else {
						this.selectedPaths.delete(filePath);
						tr.classList.remove('is-selected');
					}
					this.updateHeaderCheckbox(container);
				});

				td.appendChild(cb);
				tr.insertBefore(td, tr.firstChild);
			}
		}
	}

	private updateHeaderCheckbox(container: HTMLElement): void {
		const headerCb = container.querySelector<HTMLInputElement>('th.obsiman-bases-th-check input');
		if (!headerCb) return;
		const allCbs = Array.from(container.querySelectorAll<HTMLInputElement>('td.obsiman-bases-td-check input'));
		const checkedCount = allCbs.filter(cb => cb.checked).length;
		headerCb.checked = checkedCount === allCbs.length && allCbs.length > 0;
		headerCb.indeterminate = checkedCount > 0 && checkedCount < allCbs.length;
	}
}
