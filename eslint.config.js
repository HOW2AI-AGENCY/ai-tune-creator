import js from '@eslint/js';
import globals from 'globals';

// Временная упрощенная конфигурация для совместимости
export default [
  {
    ignores: ['dist', 'node_modules', 'build', '.next', 'out', '**/*.ts', '**/*.tsx']
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
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
      'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
      'quotes': ['warn', 'single', { 'avoidEscape': true }],
      'semi': ['warn', 'always'],
      'comma-dangle': ['warn', 'only-multiline'],
      'no-undef': 'off' // Отключаем для совместимости
    },
  }
];
