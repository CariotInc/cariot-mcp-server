import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  prettierConfig,
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'vitest.config.ts', 'tests/**/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        process: 'readonly',
        fetch: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'object-shorthand': 'error',
      'no-useless-rename': 'error',
      'no-unused-vars': 'off',
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',

      // Other useful rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'error',
    },
  },
];
