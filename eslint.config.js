import js from '@eslint/js';
import globals from 'globals';
import mdcs from 'eslint-config-mdcs';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
	// files to ignore
	{
		name: 'files to ignore',
		ignores: [
			'**/node_modules/**',
			'**/dist/**',
		],
	},

	// recommended
	js.configs.recommended,

	// base rules
	{
		name: 'base rules',
		files: [ '**/*.js' ],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		rules: {
			...mdcs.rules,
			'no-mixed-spaces-and-tabs': 'error',
			quotes: [ 'error', 'single' ],
			'no-unused-vars': [ 'error', {
				vars: 'all',
				args: 'none',
			} ],
			'template-curly-spacing': [ 'error', 'always' ],
		},
	},

	// jsdoc
	{
		name: 'jsdoc rules',
		files: [ '**/*.js' ],
		plugins: {
			jsdoc,
		},
		settings: {
			jsdoc: {
				preferredTypes: {
					Any: 'any',
					Boolean: 'boolean',
					Number: 'number',
					object: 'Object',
					String: 'string',
				},
				tagNamePreference: {
					return: 'returns',
					augments: 'extends',
					classdesc: false,
				},
			},
		},
		rules: {
			'jsdoc/check-tag-names': [ 'error', { definedTags: [ 'warn', 'note', 'section', 'category' ] } ],
			'jsdoc/check-types': 'error',
			'jsdoc/no-undefined-types': 'error',
			'jsdoc/require-param-type': 'error',
			'jsdoc/require-returns-type': 'error',
			'jsdoc/require-returns': 'off',
			'jsdoc/require-param-description': 'off',
			'jsdoc/require-returns-description': 'off',
		},
	},
];
