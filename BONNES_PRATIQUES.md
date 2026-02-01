# Bonnes Pratiques de Développement - ERP Marchés Publics

**Date de création**: 2026-02-01
**Version**: 1.0
**Objectif**: Garantir la scalabilité, performance et efficacité du développement

---

## 📋 Table des Matières

1. [Principes Fondamentaux](#principes-fondamentaux)
2. [Architecture & Scalabilité](#architecture--scalabilité)
3. [Performance & Optimisation](#performance--optimisation)
4. [Sécurité](#sécurité)
5. [Qualité du Code](#qualité-du-code)
6. [Workflow de Développement](#workflow-de-développement)
7. [Tests & Validation](#tests--validation)
8. [Documentation](#documentation)
9. [Déploiement & Monitoring](#déploiement--monitoring)
10. [Checklist par Feature](#checklist-par-feature)

---

## 🎯 Principes Fondamentaux

### 1. **YAGNI (You Aren't Gonna Need It)**

> Ne pas coder de fonctionnalités tant qu'elles ne sont pas nécessaires

**✅ BON**:
```typescript
// Créer un simple formulaire de marché
export function MarcheForm({ marche }: { marche?: Marche }) {
  const form = useForm({ ... })
  return <Form {...form}><FormFields /></Form>
}
```

**❌ MAUVAIS**:
```typescript
// Ajouter des abstractions prématurées
export interface BaseForm<T> { ... }
export class FormBuilder<T> extends BaseForm<T> { ... }
export const MarcheFormFactory = FormBuilder.create(...)
```

**Application pratique**:
- Créer un composant basique PUIS refactorer si duplication réelle
- Éviter les "helpers" pour une seule utilisation
- Ne pas créer de système de configuration pour 2 valeurs

---

### 2. **DRY (Don't Repeat Yourself)** - Mais Intelligent

> Ne dupliquer du code que s'il est réellement identique ET changera ensemble

**✅ Centraliser les constantes métier**:
```typescript
// lib/constants/marche.ts
export const TYPE_MARCHE_LABELS = {
  TRAVAUX: 'Travaux',
  FOURNITURES: 'Fournitures',
  // ...
} as const
```

**❌ Abstraire trop tôt**:
```typescript
// Mauvais : créer une abstraction pour 2 composants similaires
function useGenericDataFetcher<T>(...) // Trop générique !
```

**Règle** : Dupliquer **3 fois** avant d'abstraire

---

### 3. **Composition > Héritage**

Utiliser la composition de composants React plutôt que l'héritage de classes.

**✅ BON**:
```typescript
<Card>
  <CardHeader>
    <StatutBadge statut={marche.statut} />
  </CardHeader>
  <CardContent>
    <MarcheDetails marche={marche} />
  </CardContent>
</Card>
```

**❌ MAUVAIS**:
```typescript
class BaseCard extends Component { ... }
class MarcheCard extends BaseCard { ... }
```

---

## 🏗️ Architecture & Scalabilité

### 1. **Pattern Repository (Pour Scalabilité)**

Actuellement, les Server Actions appellent directement Prisma. Pour faciliter la maintenance future:

**Structure recommandée**:
```
lib/
├── repositories/          # Couche d'accès aux données
│   ├── marche.repository.ts
│   ├── caution.repository.ts
│   └── user.repository.ts
├── services/              # Logique métier complexe
│   ├── marche.service.ts
│   └── caution.service.ts
└── actions/               # Server Actions (orchestration)
    ├── marches.ts
    └── cautions.ts
```

**Exemple de Repository**:
```typescript
// lib/repositories/marche.repository.ts
import { prisma } from '@/lib/db/prisma'
import type { Marche, Prisma } from '@prisma/client'

export class MarcheRepository {
  async findAll(where?: Prisma.MarcheWhereInput): Promise<Marche[]> {
    return prisma.marche.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id: string): Promise<Marche | null> {
    return prisma.marche.findUnique({
      where: { id },
      include: { user: true, cautions: true },
    })
  }

  async create(data: Prisma.MarcheCreateInput): Promise<Marche> {
    return prisma.marche.create({ data })
  }

  async update(id: string, data: Prisma.MarcheUpdateInput): Promise<Marche> {
    return prisma.marche.update({ where: { id }, data })
  }

  async delete(id: string): Promise<Marche> {
    return prisma.marche.delete({ where: { id } })
  }
}

export const marcheRepository = new MarcheRepository()
```

**Server Action utilisant le Repository**:
```typescript
// lib/actions/marches.ts
import { marcheRepository } from '@/lib/repositories/marche.repository'

export async function createMarche(data: unknown) {
  const session = await requireMarcheWrite()
  const validated = createMarcheSchema.parse(data)

  const marche = await marcheRepository.create({
    ...validated,
    userId: session.user.id,
  })

  revalidatePath('/marches')
  return { success: true, data: marche }
}
```

**Avantages**:
- ✅ Facile de changer d'ORM (Prisma → Drizzle) sans toucher aux actions
- ✅ Requêtes réutilisables (include user/cautions)
- ✅ Tests plus simples (mock du repository)

---

### 2. **React Server Components (RSC) - Best Practices**

**Règle d'or** : Par défaut, TOUT est Server Component sauf si besoin d'interactivité

**✅ Server Component** (aucune directive):
```typescript
// app/(dashboard)/marches/page.tsx
export default async function MarchesPage() {
  const marches = await getAllMarches() // Direct DB call
  return <MarcheList marches={marches} />
}
```

**✅ Client Component** (avec `'use client'`):
```typescript
// components/marches/marche-form.tsx
'use client'

export function MarcheForm() {
  const [isPending, startTransition] = useTransition()
  const form = useForm(...)
  // ...
}
```

**Performance**:
- RSC = 0 KB JavaScript envoyé au client
- Client Component = Tout le code est bundlé

**Astuce**: Extraire les parties interactives en petits Client Components

```typescript
// ✅ BON : Seulement le bouton est client
'use server' // page.tsx
export default async function Page() {
  const data = await getData()
  return <InteractiveButton data={data} />
}

// components/interactive-button.tsx
'use client'
export function InteractiveButton({ data }) {
  return <button onClick={...}>{data.label}</button>
}
```

---

### 3. **Caching & Revalidation**

Next.js 15 met en cache les RSC par défaut. Utiliser `revalidatePath()` pour invalider:

```typescript
import { revalidatePath } from 'next/cache'

export async function createMarche(...) {
  const marche = await prisma.marche.create(...)

  // ✅ Revalider les pages affectées
  revalidatePath('/marches')              // Liste
  revalidatePath(`/marches/${marche.id}`) // Détail (si créé)
  revalidatePath('/')                     // Dashboard (si stats)

  return { success: true, data: marche }
}
```

**Attention**: `revalidatePath()` est ASYNCHRONE → utiliser `await` si besoin de garantie

---

## ⚡ Performance & Optimisation

### 1. **Requêtes Base de Données**

#### ❌ **N+1 Queries** (À ÉVITER ABSOLUMENT)

```typescript
// MAUVAIS : 1 + N requêtes
const marches = await prisma.marche.findMany()
for (const marche of marches) {
  const cautions = await prisma.caution.findMany({
    where: { marcheId: marche.id }
  })
}
```

#### ✅ **Solution : Eager Loading avec `include`**

```typescript
// BON : 1 seule requête
const marches = await prisma.marche.findMany({
  include: {
    cautions: true,
    user: { select: { id: true, name: true } },
  },
})
```

---

### 2. **Pagination & Limit**

Toujours paginer les listes pour éviter de charger 10,000+ enregistrements:

```typescript
export async function getAllMarches(options: {
  page?: number
  pageSize?: number
}) {
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? 20

  const [marches, totalCount] = await Promise.all([
    prisma.marche.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.marche.count(),
  ])

  return {
    marches,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  }
}
```

---

### 3. **Index Base de Données**

Les index définis dans le schéma Prisma accélèrent les requêtes:

```prisma
model Marche {
  // ...

  @@index([statut])        // Pour filter par statut
  @@index([numero])        // Pour recherche
  @@index([dateFinPrevue]) // Pour tri/filtrage dates
  @@index([userId])        // Pour filter par utilisateur
}
```

**Règle**: Créer un index pour chaque colonne utilisée dans `WHERE`, `ORDER BY`, ou jointure fréquente

---

### 4. **Code Splitting Dynamique**

Pour les composants lourds (charts, modals complexes):

```typescript
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/charts/marche-stats'), {
  loading: () => <Skeleton className="h-96" />,
  ssr: false, // Ne pas render côté serveur
})

export function Dashboard() {
  return (
    <div>
      <SimpleStats />
      <HeavyChart />  {/* Chargé seulement côté client */}
    </div>
  )
}
```

---

### 5. **Optimisation Images**

Toujours utiliser `next/image` au lieu de `<img>`:

```typescript
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority      // Pour images above-the-fold
  quality={90}  // 75 par défaut
/>
```

**Avantages**:
- Lazy loading automatique
- WebP/AVIF automatique
- Responsive automatique

---

## 🔐 Sécurité

### 1. **Validation Systématique avec Zod**

**JAMAIS faire confiance aux données client**. Toujours valider côté serveur:

```typescript
'use server'

import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  montant: z.number().positive(),
})

export async function createData(input: unknown) {
  // ✅ Validation OBLIGATOIRE
  const validated = schema.parse(input) // Throw si invalide

  // OU avec safeParse pour gérer l'erreur:
  const result = schema.safeParse(input)
  if (!result.success) {
    return { success: false, error: result.error.message }
  }

  // Utiliser validated.data
}
```

---

### 2. **Vérification Permissions**

**TOUJOURS** vérifier les permissions dans les Server Actions:

```typescript
'use server'

import { requireAuth, requireRole } from '@/lib/utils/permissions'

export async function createMarche(data: unknown) {
  // ✅ 1. Vérifier authentification
  const session = await requireAuth()

  // ✅ 2. Vérifier rôle
  if (session.user.role === 'VISITEUR') {
    return { success: false, error: 'Non autorisé' }
  }

  // OU utiliser requireRole directement:
  await requireRole(['ADMIN', 'AVANCE'])

  // 3. Logique métier...
}
```

**Helpers de permissions** (déjà créés):
```typescript
await requireAuth()                    // Authentifié
await requireRole(['ADMIN'])          // Admin seulement
await requireMarcheWrite()            // ADMIN ou AVANCE
await requireDelete()                 // ADMIN ou AVANCE
```

---

### 3. **Injection SQL - Protection Prisma**

Prisma protège automatiquement contre l'injection SQL:

```typescript
// ✅ Sûr : Prisma échappe automatiquement
const user = await prisma.user.findUnique({
  where: { email: userInput }  // Échappé automatiquement
})

// ❌ JAMAIS utiliser de requêtes SQL brutes avec input utilisateur
// Si vraiment nécessaire, utiliser des paramètres:
await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`
```

---

### 4. **XSS (Cross-Site Scripting) - Protection React**

React échappe automatiquement le contenu:

```typescript
// ✅ Sûr : React échappe automatiquement
<div>{userInput}</div>

// ❌ DANGEREUX : Ne jamais utiliser dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

---

### 5. **Variables d'Environnement Sensibles**

**Règle**: Les clés API doivent TOUJOURS rester côté serveur

```env
# ✅ Côté serveur uniquement (pas de NEXT_PUBLIC_)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
SMTP_PASSWORD="..."

# ✅ Côté client (publiques)
NEXT_PUBLIC_SUPABASE_URL="https://..."
```

**En code**:
```typescript
// ✅ Server Action (côté serveur - OK)
'use server'
const secret = process.env.NEXTAUTH_SECRET

// ❌ Client Component (côté client - ERREUR)
'use client'
const secret = process.env.NEXTAUTH_SECRET // undefined !
```

---

## 📝 Qualité du Code

### 1. **Nommage Cohérent**

**Conventions**:
- Composants: `PascalCase` (`MarcheForm`, `StatutBadge`)
- Fonctions: `camelCase` (`createMarche`, `formatMontant`)
- Constantes: `UPPER_SNAKE_CASE` (`TYPE_MARCHE_LABELS`)
- Fichiers: `kebab-case` (`marche-form.tsx`, `statut-badge.tsx`)

**Être descriptif** :
```typescript
// ✅ BON
function calculateMarcheFinPrevue(dateDebut: Date, delaiJours: number): Date

// ❌ MAUVAIS
function calc(d: Date, n: number): Date
```

---

### 2. **Types TypeScript Stricts**

Activer `strict: true` dans `tsconfig.json` (déjà fait):

```typescript
// ✅ Types explicites
function formatMontant(montant: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(montant)
}

// ❌ any interdit
function doSomething(data: any) { ... } // À éviter absolument !
```

**Utiliser les types générés par Prisma**:
```typescript
import type { Marche, StatutMarche } from '@prisma/client'

// ✅ Type-safe
function getStatutLabel(statut: StatutMarche): string {
  return STATUT_LABELS[statut]
}
```

---

### 3. **Gestion d'Erreurs Cohérente**

**Pattern recommandé** : `ActionResult<T>`

```typescript
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// Usage:
export async function createMarche(...): Promise<ActionResult<Marche>> {
  try {
    const marche = await prisma.marche.create(...)
    return { success: true, data: marche }
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: 'Validation échouée' }
    }
    return { success: false, error: 'Erreur serveur' }
  }
}
```

**Client-side**:
```typescript
'use client'

const onSubmit = async (data) => {
  const result = await createMarche(data)

  if (result.success) {
    toast.success('Marché créé')
    router.push(`/marches/${result.data.id}`)
  } else {
    toast.error(result.error)
  }
}
```

---

### 4. **Éviter les Composants Monolithes**

**Règle** : Si un composant dépasse **300 lignes**, le décomposer

**Exemple** : `marche-form.tsx` (1123 lignes actuellement) :

```
Décomposer en:
├── marche-form.tsx (orchestration, <200 lignes)
├── marche-form-base-fields.tsx
├── marche-form-statut-fields.tsx
└── marche-form-autorite-fields.tsx
```

---

## 🔄 Workflow de Développement

### 1. **Cycle de Développement d'une Feature**

```
1. Spécification (OpenSpec)
   ├─> Créer openspec/changes/<feature>/spec.yaml
   └─> Définir Purpose, Requirements, Scenarios

2. Design Technique
   ├─> Identifier les modèles Prisma nécessaires
   ├─> Définir les schémas Zod
   └─> Planifier les Server Actions

3. Implémentation (Bottom-up)
   ├─> a. Schéma Prisma + migration
   ├─> b. Validations Zod
   ├─> c. Server Actions (CRUD)
   ├─> d. Composants UI (Server puis Client)
   └─> e. Pages (composition)

4. Tests
   ├─> Tester manuellement toutes les interactions
   ├─> Vérifier les permissions (tous les rôles)
   └─> Valider responsive (desktop/tablet/mobile)

5. Documentation
   ├─> Mettre à jour CHANGELOG.md
   └─> Ajouter des commentaires si logique complexe

6. Review & Merge
   ├─> Commit avec message descriptif
   └─> Push vers main (ou créer PR si équipe)
```

---

### 2. **Messages de Commit Conventionnels**

Format: `<type>(<scope>): <description>`

**Types**:
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `refactor`: Refactoring (sans changement fonctionnel)
- `perf`: Optimisation de performance
- `docs`: Documentation uniquement
- `style`: Formatting, indentation
- `test`: Ajout de tests
- `chore`: Maintenance (dépendances, config)

**Exemples**:
```bash
feat(marches): add dynamic status management
fix(cautions): correct expiration date calculation
refactor(components): extract DateFormField component
perf(db): add index on marches.statut
docs(readme): update installation instructions
```

---

### 3. **Branches Git**

**Stratégie recommandée** :

```
main                      (production-ready)
 ├── feat/nom-feature     (features)
 ├── fix/nom-bug          (corrections)
 └── refactor/nom-code    (refactoring)
```

**Workflow** :
```bash
# Créer une branche feature
git checkout -b feat/module-cautions

# Développer...
git add .
git commit -m "feat(cautions): implement CRUD operations"

# Pusher
git push origin feat/module-cautions

# Merger (après tests)
git checkout main
git merge feat/module-cautions
git push origin main
```

---

## 🧪 Tests & Validation

### 1. **Tests Manuels Systématiques**

Avant de considérer une feature terminée:

**Checklist**:
- [ ] ✅ Créer un nouvel élément
- [ ] ✅ Modifier un élément existant
- [ ] ✅ Supprimer un élément
- [ ] ✅ Tester avec chaque rôle (ADMIN, AVANCE, EXPLOITATION, VISITEUR)
- [ ] ✅ Tester les validations (champs requis, formats)
- [ ] ✅ Tester les cas d'erreur (ID inexistant, permissions)
- [ ] ✅ Vérifier responsive (desktop, tablet, mobile)
- [ ] ✅ Vérifier l'accessibilité (navigation clavier, Tab)

---

### 2. **Tests Playwright (Recommandé)**

Pour automatiser les tests E2E:

```bash
npm install -D @playwright/test
npx playwright install
```

**Exemple de test**:
```typescript
// tests/marches.spec.ts
import { test, expect } from '@playwright/test'

test('should create a new marché', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'admin@erp-marches.local')
  await page.fill('[name="password"]', 'Admin123!')
  await page.click('button[type="submit"]')

  await page.goto('/marches/nouveau')
  await page.fill('[name="numero"]', 'TEST-001')
  await page.fill('[name="objet"]', 'Test marché')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/marches\/[a-z0-9]+/)
})
```

---

### 3. **Validation des Permissions**

Pour chaque Server Action créée, tester:

```typescript
// Test manuel dans Next.js DevTools Console
await fetch('/api/action', {
  method: 'POST',
  body: JSON.stringify({ /* ... */ })
})
```

**Vérifier**:
1. Utilisateur non authentifié → Erreur
2. Utilisateur VISITEUR → Erreur (si action d'écriture)
3. Utilisateur AVANCE → Succès
4. Utilisateur ADMIN → Succès

---

## 📚 Documentation

### 1. **Documentation du Code**

**Commenter seulement si la logique n'est PAS évidente**:

```typescript
// ❌ Mauvais : commentaire inutile
// Créer un marché
const marche = await prisma.marche.create(...)

// ✅ Bon : commentaire utile
// Recalcul de dateFinPrevue car le délai peut changer même sans OS
if (updateData.delaiExecution && !updateData.dateOrdreService) {
  dateFinPrevue = addDays(marche.dateNotification, updateData.delaiExecution)
}
```

**JSDoc pour fonctions publiques**:
```typescript
/**
 * Formate un montant en devise marocaine (MAD)
 * @param montant - Montant numérique à formater
 * @returns Chaîne formatée (ex: "1 234,56 MAD")
 */
export function formatMontant(montant: number): string {
  // ...
}
```

---

### 2. **README.md par Module**

Créer un README.md dans chaque module complexe:

```
lib/
└── repositories/
    └── README.md   (Expliquer le pattern Repository)

openspec/
└── changes/
    └── module-cautions/
        └── README.md   (Résumer les décisions techniques)
```

---

### 3. **Changelog**

Maintenir un `CHANGELOG.md` pour tracker les changements:

```markdown
# Changelog

## [Unreleased]
### Added
- Authentification NextAuth.js v5
- Vérification permissions dans toutes les Server Actions
- Module Cautions (CRUD complet)

### Fixed
- Connexion PostgreSQL SSL en production
- Duplication des labels TYPE_MARCHE

### Changed
- Refactoring formulaire marché (1123 → 400 lignes)
```

---

## 🚀 Déploiement & Monitoring

### 1. **Variables d'Environnement (Production)**

**Fichier `.env.production`**:
```env
# Base de données (Supabase Production)
DATABASE_URL="postgresql://..."

# NextAuth (générer avec openssl rand -base64 32)
NEXTAUTH_URL="https://erp-marches.yourdomain.com"
NEXTAUTH_SECRET="..."

# SMTP Production
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="noreply@yourdomain.com"
SMTP_PASSWORD="..."
```

---

### 2. **Déploiement Vercel**

**Steps**:
1. Connecter GitHub repo à Vercel
2. Configurer les variables d'environnement
3. Activer Vercel Cron (pour alertes futures)
4. Déployer

**Configuration Vercel** (`vercel.json`):
```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "regions": ["cdg1"]
}
```

---

### 3. **Monitoring & Logs**

**En production, utiliser**:
- **Vercel Analytics** (inclus gratuitement)
- **Sentry** (tracking d'erreurs) - optionnel
- **Supabase Logs** (logs PostgreSQL)

**Logger les erreurs importantes**:
```typescript
try {
  // ...
} catch (error) {
  console.error('[CRITICAL] Marche creation failed:', {
    error,
    userId: session.user.id,
    timestamp: new Date().toISOString(),
  })

  // En production, envoyer à Sentry
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error)
  }
}
```

---

## ✅ Checklist par Feature

Avant de considérer une feature terminée:

### 📋 Checklist Développement

- [ ] **Spec OpenSpec créée** (Purpose, Requirements, Scenarios)
- [ ] **Schéma Prisma mis à jour** (si nouveau modèle)
- [ ] **Migration créée** (`npx prisma migrate dev`)
- [ ] **Schémas Zod définis** (validation client + serveur)
- [ ] **Server Actions créées** (CRUD complet)
- [ ] **Permissions vérifiées** (requireAuth, requireRole)
- [ ] **Gestion d'erreurs** (try/catch avec ActionResult)
- [ ] **Composants UI créés** (Server + Client si nécessaire)
- [ ] **Pages créées** (composition de composants)
- [ ] **Constants centralisées** (si labels/config)

### 🧪 Checklist Tests

- [ ] **Test Create** (formulaire + validation)
- [ ] **Test Read** (liste + détail)
- [ ] **Test Update** (modification)
- [ ] **Test Delete** (suppression)
- [ ] **Test Permissions** (ADMIN, AVANCE, EXPLOITATION, VISITEUR)
- [ ] **Test Validations** (champs requis, formats)
- [ ] **Test Responsive** (desktop 1920, tablet 768, mobile 375)
- [ ] **Test Accessibilité** (navigation clavier, Tab, Shift+Tab)
- [ ] **Test Erreurs** (404, 500, permissions)

### 📝 Checklist Documentation

- [ ] **Code commenté** (si logique complexe)
- [ ] **Types TypeScript** (aucun `any`)
- [ ] **README mis à jour** (si nouveau module)
- [ ] **CHANGELOG mis à jour**
- [ ] **Commit message** (conventionnel)

### 🚀 Checklist Déploiement

- [ ] **Tests passés**
- [ ] **Pas de warnings TypeScript** (`npm run build`)
- [ ] **Migrations Prisma appliquées**
- [ ] **Variables d'environnement configurées** (production)
- [ ] **Seed data adapté** (si nécessaire)

---

## 📊 Métriques de Qualité

### Objectifs à Maintenir

| Métrique | Objectif | Actuel |
|----------|----------|--------|
| **Couverture de tests** | > 70% | 0% (à implémenter) |
| **Taille max composant** | < 300 lignes | ⚠️ 1123 lignes (marche-form.tsx) |
| **Temps build** | < 60s | ✅ ~30s |
| **Type safety** | 100% (aucun `any`) | ⚠️ 3 occurrences à corriger |
| **Performance Lighthouse** | > 90 | À mesurer |
| **Accessibilité (a11y)** | > 95 | À mesurer |

---

## 🎓 Ressources & Formation

### Documentation Officielle

- **Next.js 15**: https://nextjs.org/docs
- **React 19**: https://react.dev
- **Prisma 7**: https://www.prisma.io/docs
- **NextAuth.js v5**: https://authjs.dev
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com/docs

### Patterns Avancés

- **Repository Pattern**: https://martinfowler.com/eaaCatalog/repository.html
- **Server Actions**: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations

---

## 📌 Résumé des Règles d'Or

1. **YAGNI** : Ne pas coder tant que non nécessaire
2. **DRY après 3 duplications** : Pas avant
3. **Type safety strict** : Aucun `any`
4. **Validation systématique** : Zod côté serveur obligatoire
5. **Permissions partout** : Vérifier dans toutes les Server Actions
6. **RSC par défaut** : Client Component seulement si interactivité
7. **Éviter N+1** : Toujours utiliser `include` Prisma
8. **Pagination** : Pour toutes les listes
9. **Tester manuellement** : Tous les rôles, responsive, accessibilité
10. **Documenter si complexe** : Sinon le code doit être self-explanatory

---

**Dernière mise à jour** : 2026-02-01
**Prochaine revue** : Après implémentation module Cautions

---

## 🤝 Contribution

Pour contribuer au projet:

1. Lire ce guide en entier
2. Suivre les conventions de nommage
3. Respecter la checklist avant de merger
4. Demander une review si changement majeur

---

**🎯 Objectif Final** : Construire un ERP scalable, performant et maintenable sur le long terme, en évitant la dette technique et la sur-ingénierie.
