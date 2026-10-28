import globals from 'globals';

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.webextensions,
			},
		},
		rules: {
			'unicorn/better-regex': 'off',
			// `[/]` is intentional and must not be rewritten
			'regexp/no-useless-character-class': 'off',
			'unicorn/prefer-string-replace-all': 'off',
		},
	},
	{
		// Tests need to cover `http:` patterns
		files: ['source/**/*.test.ts'],
		rules: {
			'unicorn/prefer-https': 'off',
			// `node:test` registers tests, no need to await them
			'@typescript-eslint/no-floating-promises': 'off',
		},
	},
];

export default xoConfig;
