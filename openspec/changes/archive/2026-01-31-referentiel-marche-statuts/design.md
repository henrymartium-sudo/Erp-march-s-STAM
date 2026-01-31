## Context

Ce changement constitue la **première implémentation** de l'application ERP Marchés Publics. Il n'existe actuellement aucun code source - seulement de la documentation (PRD.md, ARCHITECTURE.md).

**État actuel** :
- Projet vierge sans package.json ni structure de dossiers
- Documentation complète définissant l'architecture Next.js 15 full-stack
- Schéma Prisma défini dans ARCHITECTURE.md mais incomplet (4 statuts au lieu de 11)

**Contraintes** :
- Utiliser obligatoirement Context7 pour la documentation des bibliothèques (règle PRD.md)
- Tester avec Playwright après chaque développement UI
- Pas de mode sombre pour le MVP
- Valider toutes les entrées avec Zod côté serveur
- Ne jamais exposer les clés API au client

**Stakeholders** :
- Utilisateurs finaux : équipe marchés publics (4 niveaux de rôles)
- Dépendances futures : toutes les fonctionnalités MVP dépendent de ce référentiel

## Goals / Non-Goals

**Goals:**
- ✅ Initialiser un projet Next.js 15 fonctionnel avec toute la stack technique
- ✅ Créer un modèle de données Marche complet et extensible
- ✅ Implémenter les 11 statuts du cycle de vie définis dans le PRD (pas les 4 de l'ARCHITECTURE.md)
- ✅ Fournir une interface CRUD complète pour gérer les marchés
- ✅ Établir les patterns de base (Server Actions, validation Zod, composants shadcn/ui)
- ✅ Permettre le filtrage de base (statut, période, type)
- ✅ Préparer le terrain pour les relations futures (cautions, documents, véhicules)

**Non-Goals:**
- ❌ Authentification (sera implémentée dans un changement séparé)
- ❌ Gestion des cautions, documents ou véhicules (fonctionnalités MVP ultérieures)
- ❌ Tableaux de bord et visualisations avancées
- ❌ Système d'alertes et notifications
- ❌ Import/export de données
- ❌ Rapports PDF/Excel

## Decisions

### 1. Architecture Next.js 15 Full-Stack

**Décision** : Utiliser Next.js 15 avec App Router, React Server Components et Server Actions.

**Rationale** :
- Type-safety de bout en bout (TypeScript partagé frontend/backend)
- Pas de duplication API/Frontend (développement 40% plus rapide)
- Performance native avec RSC (réduction JavaScript client)
- Écosystème riche (20,000+ exemples disponibles)

**Alternatives considérées** :
- ❌ **Next.js API Routes séparées** : Plus de code, duplication de logique, moins type-safe
- ❌ **Backend séparé (Express/Fastify)** : Complexité déploiement, duplication TypeScript, perte DX

**Référence** : Architecture définie dans ARCHITECTURE.md section "Justification de l'Architecture"

---

### 2. Modèle de Données Prisma - 11 Statuts vs 4 Statuts

**Décision** : Implémenter les **11 statuts** définis dans le PRD, pas les 4 de l'ARCHITECTURE.md.

**Rationale** :
- Le PRD est la source de vérité métier (section 9 : Cycle de vie du marché)
- Les 4 statuts de l'ARCHITECTURE.md sont trop simplistes pour le cas d'usage réel
- Le cycle complet de 11 statuts reflète le processus réel de gestion des marchés publics

**Enum `StatutMarche`** :
```prisma
enum StatutMarche {
  OPPORTUNITE_IDENTIFIEE       // 1. Veille
  DOSSIER_EN_PREPARATION       // 2. Préparation offre
  OFFRE_DEPOSEE                // 3. Soumission
  EN_ATTENTE_ATTRIBUTION       // 4. Attente résultat
  ATTRIBUE_PROVISOIREMENT      // 5. Attribution provisoire
  ATTRIBUE_DEFINITIVEMENT      // 6. Attribution définitive
  EN_ATTENTE_LIVRAISON_OS      // 7. Attente ordre de service
  EN_EXECUTION                 // 8. Exécution active
  EXECUTE_ATTENTE_GARANTIES    // 9. Exécuté, en période de garantie
  CLOTURE                      // 10. Clôturé définitivement
  RESILIE_ANNULE_INFRUCTUEUX   // 11. Échec ou résiliation
}
```

**Alternatives considérées** :
- ❌ **4 statuts simplifiés** : Insuffisant pour tracer le cycle de vie réel
- ❌ **Table `Statut` séparée** : Over-engineering, les statuts sont fixes et connus

**Migration future** : Si besoin de statuts dynamiques, migration possible vers table relationnelle

---

### 3. Champs Métier du Modèle `Marche`

**Décision** : Utiliser le schéma Prisma défini dans ARCHITECTURE.md avec ajustements.

**Champs clés** :
- `numero` (String, unique) : Identifiant métier du marché
- `objet` (String) : Description du marché
- `type` (TypeMarche enum) : TRAVAUX, FOURNITURES, SERVICES, PRESTATIONS_INTELLECTUELLES
- `montant` (Decimal) : Montant en dirhams (précision 15,2)
- `dateNotification`, `dateOrdreService`, `dateFinPrevue`, `dateReception` : Dates importantes
- `delaiExecution` (Int) : Délai en jours
- `statut` (StatutMarche enum) : Cycle de vie
- `fournisseur*` : Informations du fournisseur (nom, contact, email, tel)
- `userId` : Relation avec l'utilisateur responsable

**Ajustement** : Retirer temporairement `userId` car le modèle User n'existe pas encore (sera ajouté avec l'authentification).

**Indexes** :
- `@@index([numero])` : Recherche rapide par numéro
- `@@index([statut])` : Filtrage par statut (usage fréquent)
- `@@index([dateFinPrevue])` : Pour alertes et tri chronologique

---

### 4. Server Actions vs API Routes

**Décision** : Utiliser exclusivement les **Server Actions** pour les mutations CRUD.

**Rationale** :
- Type-safety automatique entre client et serveur
- Pas de routes à définir manuellement
- Intégration native avec React (useTransition, useFormState)
- Revalidation de cache Next.js simplifiée (`revalidatePath`)

**Pattern** :
```tsx
// lib/actions/marches.ts
'use server';

export async function createMarche(data: unknown) {
  // 1. Validation Zod
  // 2. Mutation Prisma
  // 3. Revalidation cache
  // 4. Return résultat
}
```

**Alternatives considérées** :
- ❌ **API Routes** : Plus verbeux, nécessite fetch() côté client, perte type-safety

**Référence** : ARCHITECTURE.md section "Patterns et Conventions"

---

### 5. Validation avec Zod - Double Validation

**Décision** : Valider avec Zod **côté client ET côté serveur** avec le même schéma.

**Rationale** :
- Sécurité : la validation client peut être contournée
- UX améliorée : feedback immédiat avant soumission
- DRY : un seul schéma Zod partagé

**Pattern** :
```tsx
// lib/validations/marche.ts
export const marcheSchema = z.object({
  numero: z.string().min(1, 'Numéro requis'),
  objet: z.string().min(10, 'Description trop courte'),
  type: z.enum(['TRAVAUX', 'FOURNITURES', 'SERVICES', 'PRESTATIONS_INTELLECTUELLES']),
  montant: z.number().positive('Montant doit être positif'),
  // ... autres champs
});
```

**Usage** :
- Client : React Hook Form avec `zodResolver`
- Serveur : `marcheSchema.parse(data)` dans Server Actions

---

### 6. Structure des Composants - RSC vs Client

**Décision** : Maximiser les **React Server Components** (RSC), minimiser les Client Components.

**Règle** : Par défaut, tout est RSC. Utiliser Client Components uniquement pour :
- Interactivité (useState, useEffect, event handlers)
- Formulaires (React Hook Form)
- Composants shadcn/ui interactifs (Dialog, DropdownMenu, etc.)

**Architecture des pages** :
```
app/(dashboard)/marches/
├── page.tsx                 → RSC (fetch data, affiche liste)
├── nouveau/
│   └── page.tsx             → RSC (wrapper)
│       └── MarcheForm       → Client Component (formulaire)
├── [id]/
│   ├── page.tsx             → RSC (fetch marché, affiche détail)
│   └── edit/
│       └── page.tsx         → RSC (wrapper)
│           └── MarcheForm   → Client Component (formulaire)
```

**Bénéfices** :
- JavaScript client minimal (seulement les formulaires et interactions)
- Accès direct à Prisma dans les RSC (pas de fetch API)
- Performance optimale

---

### 7. Configuration Prisma et PostgreSQL

**Décision** : Utiliser le client Prisma singleton pattern.

**Rationale** :
- Évite la création de multiples instances en développement (hot reload)
- Pattern recommandé par la documentation Prisma

**Implémentation** :
```tsx
// lib/db/prisma.ts
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Base de données** : PostgreSQL via Supabase (plan gratuit suffisant pour MVP)

---

### 8. shadcn/ui pour l'Interface Utilisateur

**Décision** : Utiliser shadcn/ui pour tous les composants UI.

**Rationale** :
- Composants copiés dans le projet (contrôle total, pas de dépendance externe)
- Basé sur Radix UI (accessibilité native)
- Personnalisables avec Tailwind CSS
- Pas de mode sombre nécessaire pour MVP (retirer le toggle)

**Composants nécessaires** :
- Form, Input, Select, Button (formulaires)
- Table, Card (listes et affichage)
- Dialog, DropdownMenu (interactions)
- Badge (statuts)
- Calendar, Popover (sélection de dates)

**Installation** :
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input select form table card dialog badge calendar
```

---

### 9. Gestion des Dates - date-fns

**Décision** : Utiliser `date-fns` pour la manipulation des dates.

**Rationale** :
- Léger (importation modulaire)
- API intuitive en français possible
- Pas de mutation (immutabilité)

**Alternatives considérées** :
- ❌ **Moment.js** : Déprécié, lourd
- ❌ **Day.js** : Plus léger mais moins de fonctionnalités

**Usage typique** :
```tsx
import { addDays, format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const dateFinPrevue = addDays(dateOrdreService, delaiExecution);
const formattedDate = format(dateFinPrevue, 'dd MMMM yyyy', { locale: fr });
```

---

### 10. TypeScript Configuration

**Décision** : Configuration stricte avec les options recommandées Next.js + Prisma.

**tsconfig.json clés** :
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Bénéfices** :
- `strict: true` : Maximum de sécurité de type
- `noUncheckedIndexedAccess` : Évite les erreurs d'accès tableau/objet
- `paths` : Imports absolus (`@/lib/...` au lieu de `../../lib/...`)

## Risks / Trade-offs

### 1. Pas d'Authentification dans ce Changement

**Risque** : Le système de marchés sera créé sans gestion des utilisateurs.

**Mitigation** :
- Le modèle Prisma `Marche` aura un champ `userId` optionnel (String?)
- Les Server Actions fonctionneront sans vérification de permissions pour ce changement
- Un changement OpenSpec ultérieur ajoutera NextAuth.js et les permissions
- Migration : ajouter NOT NULL constraint une fois User implémenté

**Trade-off accepté** : Permet de valider le CRUD marché rapidement avant d'ajouter la complexité auth

---

### 2. Base de Données Vide au Démarrage

**Risque** : Pas de données de test pour valider l'UI.

**Mitigation** :
- Créer un script seed Prisma (`prisma/seed.ts`) avec 10-15 marchés fictifs
- Couvrir tous les statuts pour valider la visualisation
- Inclure des dates variées (passées, futures, proches)

**Commande** : `npx prisma db seed`

---

### 3. Performance avec Prisma en Développement

**Risque** : Requêtes lentes en développement local (Supabase distant).

**Mitigation** :
- Utiliser PostgreSQL local en développement (`docker-compose`)
- Supabase seulement en production
- Variable d'environnement : `DATABASE_URL` différente par environnement

**Trade-off** : Accepter une latence légère en dev si pas de Docker disponible

---

### 4. Enum Prisma Non Modifiable Facilement

**Risque** : Si les statuts doivent changer après déploiement, modification d'enum = migration DB complexe.

**Mitigation actuelle** : Les 11 statuts sont fixes selon le PRD (peu de risque)

**Plan B futur** : Si besoin de statuts dynamiques → migrer vers table `Statut` relationnelle

**Trade-off accepté** : Simplicité enum > flexibilité pour le MVP

---

### 5. shadcn/ui Copié dans le Projet

**Risque** : Pas de mises à jour automatiques des composants shadcn/ui.

**Mitigation** :
- Les composants sont stables (Radix UI sous-jacent)
- Contrôle total = personnalisation sans limite
- Mises à jour manuelles si nécessaire (`npx shadcn-ui@latest add <component>`)

**Trade-off accepté** : Contrôle et customisation > mises à jour automatiques

---

### 6. Pas de Tests Automatisés Initialement

**Risque** : Régressions non détectées lors de modifications futures.

**Mitigation** :
- Tests Playwright manuels après chaque UI (règle CLAUDE.md)
- Tests unitaires automatisés dans un changement ultérieur (hors MVP)

**Trade-off accepté** : Livraison rapide du MVP > couverture de tests exhaustive

## Migration Plan

### Phase 1 : Initialisation (Jour 1)

1. **Initialiser Next.js 15**
   ```bash
   npx create-next-app@latest erp-marches --typescript --tailwind --app --no-src-dir
   cd erp-marches
   ```

2. **Installer les dépendances**
   ```bash
   npm install @prisma/client prisma zod react-hook-form @hookform/resolvers date-fns
   npm install -D @types/node
   ```

3. **Initialiser Prisma**
   ```bash
   npx prisma init
   ```

4. **Configurer shadcn/ui**
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button input select form table card dialog badge calendar
   ```

### Phase 2 : Base de Données (Jour 1)

1. **Créer le schéma Prisma** avec modèle `Marche` et enums
2. **Configurer DATABASE_URL** dans `.env`
3. **Créer la migration initiale**
   ```bash
   npx prisma migrate dev --name init_marche_schema
   ```
4. **Générer le client Prisma**
   ```bash
   npx prisma generate
   ```
5. **Créer le seed script** avec données de test
6. **Seeder la DB**
   ```bash
   npx prisma db seed
   ```

### Phase 3 : Backend (Jour 2)

1. Créer `/lib/db/prisma.ts` (singleton client)
2. Créer `/lib/validations/marche.ts` (schémas Zod)
3. Créer `/lib/actions/marches.ts` (Server Actions CRUD)
4. Créer `/types/index.ts` (types TypeScript globaux)

### Phase 4 : UI Components (Jour 3)

1. Créer `/components/ui/*` (composants shadcn/ui)
2. Créer `/components/marches/marche-form.tsx` (Client Component)
3. Créer `/components/marches/marche-list.tsx` (RSC)
4. Créer `/components/marches/marche-card.tsx` (RSC)
5. Créer `/components/marches/marche-detail.tsx` (RSC)
6. Créer `/components/marches/statut-badge.tsx` (RSC - badge coloré)

### Phase 5 : Pages (Jour 4)

1. Créer `/app/(dashboard)/layout.tsx` (layout principal temporaire sans auth)
2. Créer `/app/(dashboard)/marches/page.tsx` (liste)
3. Créer `/app/(dashboard)/marches/nouveau/page.tsx` (création)
4. Créer `/app/(dashboard)/marches/[id]/page.tsx` (détail)
5. Créer `/app/(dashboard)/marches/[id]/edit/page.tsx` (édition)

### Phase 6 : Tests et Validation (Jour 5)

1. **Tests Playwright manuels** selon CLAUDE.md :
   - Desktop (1920x1080)
   - Tablette (768x1024)
   - Mobile (375x667)
2. Vérifier responsiveness de tous les écrans
3. Tester CRUD complet : créer, lire, modifier, supprimer
4. Valider filtres et recherche

### Rollback Strategy

**Si problème critique détecté** :
- Rollback Git : `git reset --hard <commit-before-change>`
- Rollback DB : `npx prisma migrate reset` (⚠️ perte de données)
- En production : `npx prisma migrate resolve --rolled-back <migration-name>`

**Prévention** :
- Tester en local avant déploiement
- Sauvegarder la DB avant migration prod

## Open Questions

### Q1 : Faut-il implémenter le filtrage avancé dès maintenant ?

**Options** :
- A) Filtres de base seulement (statut, type) - **RECOMMANDÉ pour MVP**
- B) Filtres avancés (période, fournisseur, montant)

**Décision** : À confirmer avec l'utilisateur, mais recommandation = Option A

---

### Q2 : Niveau de détail des informations fournisseur ?

**Actuellement** : `fournisseurNom`, `fournisseurContact`, `fournisseurEmail`, `fournisseurTel`

**Question** : Est-ce suffisant ou faut-il prévoir un modèle `Fournisseur` séparé ?

**Recommandation** : Garder simple pour MVP, modèle séparé dans V1 si besoin

---

### Q3 : Gestion des transitions de statut ?

**Question** : Faut-il valider les transitions de statut (ex: interdire de passer de CLOTURE à EN_EXECUTION) ?

**Options** :
- A) Pas de validation - l'utilisateur peut changer librement
- B) Matrice de transitions autorisées

**Recommandation** : Option A pour MVP, Option B dans un changement ultérieur

---

### Q4 : Format de `numero` de marché ?

**Question** : Y a-t-il un format imposé (ex: "MAR-2024-001") ou libre ?

**Impact** : Si format imposé → ajouter validation Zod avec regex

**Recommandation** : Laisser libre pour MVP, ajouter validation si format défini ultérieurement
