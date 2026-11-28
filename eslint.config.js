import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules', 'public/sw.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  { files: ['tools/**', 'e2e/**', '*.config.*'], rules: { 'no-console': 'off' } },
);
