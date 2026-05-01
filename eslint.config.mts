import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import sveltePlugin from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
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
	// Block A: Svelte files — parse with svelte-eslint-parser
	{
		files: ['src/**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
				ecmaVersion: 'latest',
				sourceType: 'module',
				extraFileExtensions: ['.svelte'],
			},
		},
		plugins: {
			svelte: sveltePlugin,
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
		},
	},
	// Block B: TypeScript files — type-aware rules
	{
		files: ['src/**/*.ts'],
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
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
