import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware simplifié pour Vercel Edge Runtime
 * La vérification d'authentification complète se fait dans requireAuth() côté serveur
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Routes publiques autorisées
  const publicRoutes = ['/login', '/register']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Vérifier si un cookie de session existe (vérification basique)
  const sessionCookie = req.cookies.get('authjs.session-token') || req.cookies.get('__Secure-authjs.session-token')
  const hasSession = !!sessionCookie

  // Rediriger vers login si pas de session et route protégée
  if (!hasSession && !isPublicRoute && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Rediriger vers dashboard si session existe et tentative d'accès au login
  if (hasSession && isPublicRoute) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

// Configuration des routes à protéger
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
