import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'storybook-static', 'public/mockServiceWorker.js', 'playwright-report'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict, jsxA11y.flatConfigs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/organisms/*', '@/components/templates/*', '@/features/*'],
              message: 'Atomic rule: lower tiers must not import higher tiers (see PROMPT.md §4).',
            },
          ],
        },
      ],
    },
  },
  {
    // Organisms, templates, features and app may import upward-allowed tiers.
    files: [
      'src/components/organisms/**',
      'src/components/templates/**',
      'src/features/**',
      'src/app/**',
      'src/test/**',
      'e2e/**',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Fixture indexing under noUncheckedIndexedAccess; non-null is the readable choice here.
    files: ['**/*.test.{ts,tsx}', '**/*.stories.tsx', 'src/mocks/**', 'src/test/**', 'e2e/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off', 'no-restricted-imports': 'off' },
  },
);
