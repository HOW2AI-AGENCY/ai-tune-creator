import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { fixupPluginRules } from '@eslint/compat';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: compat.extends('eslint:recommended'),

    plugins: {
        'react-hooks': fixupPluginRules(reactHooks),
        'react-refresh': reactRefresh,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        ecmaVersion: 2020,
        sourceType: 'module',

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    settings: {
        react: {
            version: 'detect',
        },
    },

    rules: {
        'no-unused-vars': ['warn', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
        }],

        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',

        'react-refresh/only-export-components': ['warn', {
            allowConstantExport: true,
        }],

        'no-console': 'warn',
        'no-debugger': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
        'no-duplicate-imports': 'error',
        'no-unused-expressions': 'error',
        'no-undef-init': 'error',
        'object-shorthand': 'error',
        'prefer-template': 'error',

        eqeqeq: ['error', 'always', {
            null: 'ignore',
        }],

        quotes: ['warn', 'single', {
            avoidEscape: true,
        }],

        semi: ['warn', 'always'],
        'comma-dangle': ['warn', 'only-multiline'],
    },
}, {
    files: ['supabase/functions/**/*.ts'],

    rules: {
        'no-console': 'off',
    },
}, {
    files: ['**/*.config.{js,ts}', '**/vite.config.ts', '**/tailwind.config.ts'],

    rules: {
        'no-unused-vars': 'off',
    },
}]);