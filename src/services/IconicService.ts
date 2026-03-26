import type { App } from 'obsidian';

interface IconEntry {
	icon?: string;
	color?: string;
}

/**
 * Reads property icons from the Iconic plugin's data.json.
 * Gracefully handles missing plugin.
 */
export class IconicService {
	private propertyIcons = new Map<string, IconEntry>();
	private loaded = false;

	async load(app: App): Promise<void> {
		try {
			const path = '.obsidian/plugins/iconic/data.json';
			const raw = await app.vault.adapter.read(path);
			const data = JSON.parse(raw);
			if (data.propertyIcons && typeof data.propertyIcons === 'object') {
				for (const [name, entry] of Object.entries(data.propertyIcons)) {
					this.propertyIcons.set(name, entry as IconEntry);
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
