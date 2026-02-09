import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware Edge Runtime compatible.
 *
 * IMPORTANT: Ce middleware NE DOIT PAS importer Prisma, bcrypt, ou toute
 * dépendance Node.js. Il s'exécute dans Vercel Edge Runtime qui ne supporte
 * qu'un sous-ensemble des APIs Web standard.
 *
 * La vérification complète d'authentification se fait dans requireAuth()
 * côté serveur (Server Components / Server Actions).
 *
 * Ce middleware vérifie uniquement la PRÉSENCE d'un cookie de session
 * pour rediriger rapidement les utilisateurs non connectés vers /login.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques - pas de vérification nécessaire
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isApiAuthRoute = pathname.startsWith('/api/auth')
  const isApiDebugRoute = pathname.startsWith('/api/debug')
  const isApiCronRoute = pathname.startsWith('/api/cron') // Routes cron (authentification via CRON_SECRET)

  // Ne pas intercepter les routes API auth (NextAuth en a besoin)
  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  // Ne pas intercepter les routes API debug (diagnostics)
  if (isApiDebugRoute) {
    return NextResponse.next()
  }

  // Ne pas intercepter les routes API cron (authentification via CRON_SECRET)
  if (isApiCronRoute) {
    return NextResponse.next()
  }

  // Vérifier la présence du cookie de session (vérification basique, pas de JWT decode)
  const sessionToken =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value

  const hasSession = !!sessionToken

  // Utilisateur non connecté sur route protégée -> redirection vers /login
  if (!hasSession && !isAuthRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Utilisateur connecté essayant d'accéder à /login -> redirection vers dashboard
  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Matcher qui exclut les fichiers statiques et les routes API internes
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
