import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import skipFormatting from 'eslint-config-prettier/flat';

export default defineConfig([
	{
		name: 'app/files-to-lint',
		files: ['**/*.{js,mjs}'],
	},

	globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

	{
		files: ['*.{js,mjs}', 'scripts/**'],
		languageOptions: {
			globals: {
				...globals.nodeBuiltin,
			},
		},
	},
	{
		ignores: ['*.{js,mjs}', 'scripts/**'],
		languageOptions: {
			globals: {
				...globals.browser,
			},
		},
	},

	js.configs.recommended,
	skipFormatting,
]);
