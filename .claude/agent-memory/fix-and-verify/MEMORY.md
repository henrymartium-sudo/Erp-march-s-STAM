# Agent Memory - Fix & Verify

## Bugs Critiques Resolus

### 1. page_client-reference-manifest.js ENOENT (Vercel Build)
- **Cause racine** : Conflit entre `app/page.tsx` et `app/(dashboard)/page.tsx` pour la route `/`
- `app/page.tsx` avait priorite et faisait une redirection statique vers `/marches`
- `app/(dashboard)/page.tsx` etait ignore mais le build generait quand meme des fichiers pour lui dans le route group, sans le manifest
- **Fix** : Supprimer `app/page.tsx`. Laisser `app/(dashboard)/page.tsx` etre la seule page racine `/`
- **Lecon** : Ne JAMAIS avoir `app/page.tsx` ET `app/(routeGroup)/page.tsx` -- cela cause des bugs de manifest sur Vercel
- Ref: [Issue #53569](https://github.com/vercel/next.js/issues/53569), [PR #73606](https://github.com/vercel/next.js/pull/73606)

### 2. Middleware MIDDLEWARE_INVOCATION_FAILED
- **Cause precedente** : L'ancien middleware importait des deps Node.js incompatibles Edge Runtime
- **Fix** : Middleware reecrit avec uniquement `NextResponse`/`NextRequest` de `next/server`
- Le middleware verifie uniquement la presence du cookie de session (pas de decode JWT)
- Les routes `/api/auth/*` sont exclues du middleware pour ne pas bloquer NextAuth
- **Pattern** : `authjs.session-token` ou `__Secure-authjs.session-token` (HTTPS)

### 3. DYNAMIC_SERVER_USAGE warning pendant le build
- **Cause** : Pages appelant `requireAuth()` (qui utilise `headers()`) sans `force-dynamic`
- **Fix** : Ajouter `export const dynamic = 'force-dynamic'` aux pages de listing
- Pages corrigees : `/marches`, `/documents`, `/cautions`, `/` (dashboard)

## Architecture Auth
- **Middleware** : Verifie PRESENCE du cookie (rapide, Edge-compatible)
- **Server Components** : Verifient la SESSION complete via `auth()` ou `requireAuth()`
- Double protection : middleware pour la rapidite, server-side pour la securite

## Patterns de Deploiement Vercel
- `vercel deploy --prod` (build distant) fonctionne mieux que `vercel build --prod` + `vercel deploy --prebuilt`
- `vercel build` local a un bug avec `Unable to find lambda for route` pour les pages statiques
- Le warning `@next/swc` mismatch (15.5.7 vs 15.5.11) est cosmetique, pas bloquant

## Fichiers Cles
- `middleware.ts` - Middleware Edge-compatible (cookie check only)
- `app/(dashboard)/page.tsx` - Dashboard principal (force-dynamic + auth)
- `lib/auth/auth.config.ts` - Config NextAuth (Prisma + bcrypt, Node.js only)
- `lib/db/prisma.ts` - Client Prisma avec PrismaPg adapter

### 4. Prisma Decimal non serialisable par RSC (Client-side exception sur Cautions)
- **Erreur** : "Application error: a client-side exception has occurred" en production
- **Cause racine** : `Prisma.Decimal` n'est PAS serialisable par React Server Components
- Les Server Components passaient des objets Caution avec `montant: Decimal` aux Client Components
- En dev : warning "Only plain objects can be passed to Client Components. Decimal objects are not supported."
- En production : crash client-side car le Decimal est corrompu lors de la serialisation
- **Fix** : Creer une fonction `serializeCaution()` dans le Server Component qui convertit :
  - `Decimal` -> `number` via `Number(caution.montant)`
  - `Date` -> `string ISO` via `date.toISOString()`
- **Type serialise** : `types/serialized.ts` avec `SerializedCaution` (number au lieu de Decimal, string au lieu de Date)
- **Fichiers corriges** : `page.tsx` (listing), `[id]/page.tsx` (detail), `[id]/edit/page.tsx` (edition),
  `caution-card.tsx`, `caution-list.tsx`, `caution-detail.tsx`, `caution-form.tsx`, `caution-timeline.tsx`,
  `marche-cautions-section.tsx`
- **Bugs secondaires corriges** :
  - `.toNumber()` sur des Decimal serialises -> `Number()` resilient
  - `.getTime()` sur des Date serialisees en string -> `new Date(str).getTime()`
  - `<SelectItem value="">` Radix UI crash -> `<SelectItem value="ALL">`
  - `search` param manquant dans ExportExcelButton URL construction
- **Lecon** : TOUJOURS serialiser les objets Prisma avec Decimal AVANT de les passer aux Client Components
- **Lecon** : Le module Marches a potentiellement le meme probleme (Decimal sur montant) -- a verifier

## URL Production
- https://erp-marches-stam.vercel.app
