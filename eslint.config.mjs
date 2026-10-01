import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

// Gate qualité : zéro ERREUR exigé ; les avertissements historiques (any explicites, variables inutilisées)
// sont plafonnés par `--max-warnings` dans le script `lint` : le plafond ne peut que baisser.
const config = [
  {
    ignores: [
      '.next/**', 'node_modules/**', '.superpowers/**', '.worktrees/**', '.claude/**', '.agents/**', '.codex/**',
      '.vercel/**', 'test-results/**', 'playwright-report/**', 'next-env.d.ts', 'tsconfig.tsbuildinfo',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Interface en français : les apostrophes du texte JSX sont rendues correctement, la règle n'apporte rien.
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Scripts Node CommonJS et configuration : `require` est légitime.
    files: ['**/*.js', '**/*.cjs', 'scripts/**', 'tailwind.config.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]

export default config
