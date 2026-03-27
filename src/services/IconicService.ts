import { Component, type App } from 'obsidian';

interface IconEntry {
	icon?: string;
	color?: string;
}

interface IconicData {
	propertyIcons?: Record<string, IconEntry>;
}

/**
 * Reads property icons from the Iconic plugin's data.json.
 * Gracefully handles missing plugin.
 */
export class IconicService extends Component {
	private app: App;
	private propertyIcons = new Map<string, IconEntry>();
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
			if (data.propertyIcons && typeof data.propertyIcons === 'object') {
				for (const [name, entry] of Object.entries(data.propertyIcons)) {
					this.propertyIcons.set(name, entry);
				}
			}
			this.loaded = true;
		} catch {
			// Iconic not installed or data unreadable
			this.loaded = false;
		}
	}

	getIcon(propName: string): { icon: string; color?: string } | null {
		const entry = this.propertyIcons.get(propName);
		if (!entry?.icon) return null;
		return { icon: entry.icon, color: entry.color };
	}

	isAvailable(): boolean {
		return this.loaded;
	}
}
