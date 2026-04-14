// src/components/containers/MenuCuratorPanel.ts
import { Component, setIcon } from 'obsidian';
import type { ObsiManPlugin } from '../../../main';
import type { MenuHideRule } from '../../types/context-menu';

type Surface = MenuHideRule['surface'];

const SURFACES: { id: Surface; label: string }[] = [
	{ id: 'file-menu', label: 'File menu' },
	{ id: 'editor-menu', label: 'Editor menu' },
	{ id: 'more-options', label: 'More options (···)' },
];

export class MenuCuratorPanel extends Component {
	private plugin: ObsiManPlugin;
	private containerEl: HTMLElement;

	constructor(containerEl: HTMLElement, plugin: ObsiManPlugin) {
		super();
		this.plugin = plugin;
		this.containerEl = containerEl;
	}

	onload(): void {
		this._render();
	}

	private _render(): void {
		this.containerEl.empty();

		const wrap = this.containerEl.createDiv({ cls: 'obsiman-curator-wrap' });

		// ── Header ────────────────────────────────────────────────────────────
		wrap.createEl('h4', { cls: 'obsiman-curator-title', text: 'Context menu curator' });
		wrap.createEl('p', {
			cls: 'obsiman-curator-desc',
			text: 'Hide any item from Obsidian workspace context menus. Matches by title substring (case-insensitive).',
		});

		// ── Rule list ─────────────────────────────────────────────────────────
		const rules = this.plugin.settings.contextMenuHideRules;
		const listEl = wrap.createDiv({ cls: 'obsiman-curator-list' });

		if (rules.length === 0) {
			listEl.createEl('p', { cls: 'obsiman-curator-empty', text: 'No hide rules yet. Add one below.' });
		} else {
			for (let i = 0; i < rules.length; i++) {
				this._renderRule(listEl, rules[i], i);
			}
		}

		// ── Add rule form ─────────────────────────────────────────────────────
		const form = wrap.createDiv({ cls: 'obsiman-curator-form' });
		const titleInput = form.createEl('input', {
			type: 'text',
			cls: 'obsiman-curator-input',
			placeholder: 'Item title (substring)',
		});

		const surfaceSelect = form.createEl('select', { cls: 'obsiman-curator-select' });
		for (const s of SURFACES) {
			const opt = surfaceSelect.createEl('option', { value: s.id, text: s.label });
			if (s.id === 'file-menu') opt.selected = true;
		}

		const addBtn = form.createEl('button', { cls: 'obsiman-curator-add-btn', text: 'Add rule' });
		addBtn.addEventListener('click', () => {
			const title = titleInput.value.trim();
			if (!title) return;
			const newRule: MenuHideRule = {
				surface: surfaceSelect.value as Surface,
				titleMatch: title,
				enabled: true,
			};
			this.plugin.settings.contextMenuHideRules.push(newRule);
			void this.plugin.saveSettings().then(() => this._render());
		});
	}

	private _renderRule(listEl: HTMLElement, rule: MenuHideRule, index: number): void {
		const row = listEl.createDiv({ cls: 'obsiman-curator-rule' });

		// Toggle
		const toggle = row.createEl('input', { type: 'checkbox', cls: 'obsiman-curator-toggle' });
		toggle.checked = rule.enabled;
		toggle.addEventListener('change', () => {
			this.plugin.settings.contextMenuHideRules[index].enabled = toggle.checked;
			void this.plugin.saveSettings();
		});

		// Label
		row.createEl('span', {
			cls: 'obsiman-curator-rule-text',
			text: `"${rule.titleMatch}" in ${rule.surface}`,
		});

		// Delete button
		const del = row.createEl('button', { cls: 'obsiman-curator-del-btn' });
		setIcon(del, 'lucide-trash-2');
		del.addEventListener('click', () => {
			this.plugin.settings.contextMenuHideRules.splice(index, 1);
			void this.plugin.saveSettings().then(() => this._render());
		});
	}
}
