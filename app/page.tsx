import { redirect } from 'next/navigation'

/**
 * Page d'accueil - Redirige automatiquement vers le module Marchés
 * Plus tard, cette page contiendra l'authentification NextAuth
 */
export default function HomePage() {
  redirect('/marches')
}
