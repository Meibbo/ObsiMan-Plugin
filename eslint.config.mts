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
			"test",
			"coverage",
			"vitest.config.ts",
			"wdio.conf.mts",
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
	{
		files: ['src/**/*.ts'],
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'no-restricted-syntax': [
				'error',
				{
					selector: "TSAsExpression > TSAnyKeyword.typeAnnotation",
					message: "Cast to `any` is forbidden. Use a typed wrapper from src/types/obsidian-extended.ts or refine the type.",
				},
				{
					selector: "TSAsExpression[expression.type='Identifier'][expression.name='app'] > TSAnyKeyword",
					message: "(app as any) is forbidden. Use src/types/obsidian-extended.ts.",
				},
			],
		},
	},
	{
		files: ['package.json'],
		rules: {
			'depend/ban-dependencies': 'off',
		},
	},
);
