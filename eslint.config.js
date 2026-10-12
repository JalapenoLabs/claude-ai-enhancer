// Core
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.yarn'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      'semi': ['error', 'never'],
      'max-len': ['error', { code: 120, ignoreUrls: true, ignoreStrings: true }],
      'brace-style': ['error', 'stroustrup'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
)
