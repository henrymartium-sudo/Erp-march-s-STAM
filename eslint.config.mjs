import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['playwright-report/**', '.next/**'],
  },
  {
    // Le lint n'avait jamais été configuré sur ce repo (aucun fichier de config
    // avant celui-ci). Deux règles remontent une dette préexistante sans rapport
    // avec la mise en place de la CI :
    // - no-explicit-any : ~50 usages existants → passé en warning plutôt que
    //   réécrit en masse dans du code métier (cautions, exports) sans tests.
    // - react/no-unescaped-entities : 49 apostrophes françaises non échappées
    //   dans du JSX ("l'utilisateur", "d'offre"...) → désactivé, sans impact
    //   fonctionnel ni sécurité (le texte JSX est rendu littéralement).
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'off',
    },
  },
]

export default eslintConfig
