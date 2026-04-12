import { Component, type App } from 'obsidian';

interface IconEntry {
	icon?: string;
	color?: string;
}

interface IconicData {
	propertyIcons?: Record<string, IconEntry>;
	tagIcons?: Record<string, IconEntry>;
}

export class IconicService extends Component {
	private app: App;
	private propertyIcons = new Map<string, IconEntry>();
	private tagIcons = new Map<string, IconEntry>();
	private loaded = false;

	constructor(app: App) {
		super();
		this.app = app;
	}

	onload(): void {
		void this.loadIcons();
	}

	private async loadIcons(): Promise<void> {
		try {
			const path = `${this.app.vault.configDir}/plugins/iconic/data.json`;
			const raw = await this.app.vault.adapter.read(path);
			const data = JSON.parse(raw) as IconicData;
			if (data.propertyIcons) {
				for (const [name, entry] of Object.entries(data.propertyIcons)) {
					this.propertyIcons.set(name, entry);
				}
			}
			if (data.tagIcons) {
				for (const [name, entry] of Object.entries(data.tagIcons)) {
					this.tagIcons.set(name, entry);
				}
			}
			this.loaded = true;
		} catch {
			this.loaded = false;
		}
	}

	/** Get custom icon for a property name. Returns null if not set. */
	getIcon(propName: string): { icon: string; color?: string } | null {
		const entry = this.propertyIcons.get(propName);
		if (!entry?.icon) return null;
		return { icon: entry.icon, color: entry.color };
	}

	/** Get custom icon for a tag path (without #). Returns null if not set. */
	getTagIcon(tagPath: string): { icon: string; color?: string } | null {
		const entry = this.tagIcons.get(tagPath) ?? this.tagIcons.get(`#${tagPath}`);
		if (!entry?.icon) return null;
		return { icon: entry.icon, color: entry.color };
	}

	isAvailable(): boolean {
		return this.loaded;
	}
}
