import { auth } from '@/lib/auth/auth.config'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Routes publiques (login, register, etc.)
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')

  // Rediriger vers login si non authentifié et tentative d'accès à une page protégée
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Rediriger vers dashboard si déjà authentifié et tentative d'accès aux pages auth
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Protection des routes admin
  if (pathname.startsWith('/utilisateurs')) {
    if (req.auth?.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
})

// Configuration des routes à protéger
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
