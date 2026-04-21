import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		ignores: [
			"node_modules",
			"dist",
			"obsidian-sample-plugin",
			"esbuild.config.mjs",
			"svelte.config.js",
			"eslint.config.js",
			"version-bump.mjs",
			"versions.json",
			"main.js",
			".obsidian",
			".claude",
			"scripts",
		],
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mts',
						'manifest.json',
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...(obsidianmd as any).configs.recommended,
);
