import { en } from './en';
import { es } from './es';

type ResolvedLanguage = 'en' | 'es';

const translations: Record<ResolvedLanguage, Record<string, string>> = { en, es };

const currentLang: ResolvedLanguage = 'en';

/**
 * Translate a key, optionally interpolating {placeholder} values.
 * Falls back to English, then to the raw key.
 */
export function translate(key: string, vars?: Record<string, string | number>): string {
	let text = translations[currentLang]?.[key] ?? translations['en']?.[key] ?? key;

	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			text = text.replace(`{${k}}`, String(v));
		}
	}
	return text;
}
