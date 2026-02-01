## Context

Le module Cautions & Garanties s'intègre dans l'architecture Next.js 15 full-stack existante de l'ERP Marchés Publics. Le projet utilise déjà Prisma pour la gestion de la base de données PostgreSQL (Supabase), NextAuth pour l'authentification, et shadcn/ui pour les composants UI.

**État actuel :**
- Le modèle `Marche` existe déjà avec CRUD complet fonctionnel
- L'infrastructure Prisma est configurée avec le pattern singleton
- Le schéma de navigation et le dashboard principal sont en place
- Les Server Actions sont utilisées pour toutes les mutations

**Contraintes :**
- Pas de nouvelles dépendances UI (utiliser shadcn/ui existant)
- Suivre le pattern existant des Server Actions avec validation Zod
- Maintenir la cohérence avec le module Marchés
- Préparer le système d'alertes pour intégration future Vercel Cron
- Interface responsive obligatoire (desktop, tablette, mobile)

**Stakeholders :**
- Équipe de soumissionnaires (utilisateurs principaux - gestion quotidienne)
- Direction financière (monitoring des garanties mobilisées)
- Service comptable (libération des cautions, reporting)

## Goals / Non-Goals

**Goals:**
- Implémenter un système complet de gestion du cycle de vie des cautions bancaires
- Fournir des alertes automatiques pour éviter l'expiration des cautions
- Offrir une vue consolidée des cautions par marché et globalement
- Permettre le suivi précis des montants mobilisés en garanties
- Assurer la traçabilité complète des cautions (création, modification, libération)
- Préparer l'infrastructure pour l'envoi automatique d'emails d'alerte (MVP : logique métier seulement)

**Non-Goals:**
- Envoi automatique d'emails (Vercel Cron + Nodemailer) - sera implémenté en V1
- Gestion des documents scannés des cautions - sera dans le module Documents
- Workflow d'approbation multi-niveaux pour libération de cautions
- Intégration bancaire directe pour vérification du statut des cautions
- Génération automatique de courriers de demande de caution
- Analytics avancées et prédictions ML sur les risques de caution

## Decisions

### 1. Architecture de Base de Données

**Décision :** Utiliser le schéma Prisma défini dans ARCHITECTURE.md avec relations strictes et cascade deletion.

**Rationale :**
- **Pour :** Le schéma est déjà documenté et validé, inclut tous les champs métier nécessaires, relations bidirectionnelles Marche ↔ Caution garantissent la cohérence
- **Contre :** Suppression en cascade peut être risquée (mais nécessaire pour éviter orphelins)
- **Alternative considérée :** Soft delete avec flag `deleted` → Rejeté car complexifie les requêtes et le schéma n'est pas requis pour le MVP

**Implémentation :**
```prisma
model Caution {
  id                String         @id @default(cuid())
  reference         String         @unique
  type              TypeCaution
  montant           Decimal        @db.Decimal(15, 2)
  dateEmission      DateTime
  dateEcheance      DateTime
  statut            StatutCaution  @default(ACTIVE)

  // Relations avec cascade
  marcheId          String
  marche            Marche         @relation(fields: [marcheId], references: [id], onDelete: Cascade)

  userId            String
  user              User           @relation(fields: [userId], references: [id])

  // Index pour performance
  @@index([dateEcheance])
  @@index([statut])
  @@index([marcheId])
  @@map("cautions")
}
```

### 2. Gestion des Statuts et Transitions

**Décision :** Transitions de statut gérées par Server Actions avec validation stricte des transitions autorisées.

**Rationale :**
- **Pour :** Validation côté serveur garantit l'intégrité, logique métier centralisée réutilisable
- **Contre :** Pas de state machine explicite (mais suffisant pour 4 statuts simples)
- **Alternative considérée :** State machine library (XState) → Rejeté car over-engineering pour ce cas d'usage

**Matrice de transitions autorisées :**
```
ACTIVE → EXPIREE (automatique via calcul de date)
ACTIVE → LIBEREE (manuelle par utilisateur)
ACTIVE → APPELEE (manuelle par utilisateur)
EXPIREE → LIBEREE (manuelle, si libération tardive)
Tous autres transitions → REJETÉES
```

**Implémentation :**
- Server Action `updateCautionStatut(id, newStatut)` avec validation
- Utilitaire `isTransitionAllowed(currentStatut, newStatut): boolean`
- Calcul automatique ACTIVE → EXPIREE lors de l'affichage (pas de cron job pour MVP)

### 3. Système d'Alertes

**Décision :** Logique de génération d'alertes dans Server Actions, stockage en base, affichage UI uniquement pour MVP. Envoi email en V1.

**Rationale :**
- **Pour :** Séparation des préoccupations (génération vs envoi), infrastructure prête pour Vercel Cron, données persistées pour audit
- **Contre :** Alertes non envoyées automatiquement dans le MVP (mais acceptable, l'UI les affiche)
- **Alternative considérée :** Pas de stockage, calcul à la volée → Rejeté car perte de l'historique d'alertes

**Seuils d'alerte :**
- 30 jours avant échéance → Alerte INFO (badge jaune)
- 15 jours avant échéance → Alerte WARNING (badge orange)
- 7 jours avant échéance → Alerte CRITICAL (badge rouge)

**Implémentation :**
- Fonction `generateAlertsForCaution(cautionId)` appelée lors de l'affichage
- Vérification d'existence pour éviter doublons (par cautionId + type d'alerte)
- Table `alertes` existante utilisée avec champs `cautionId`, `type`, `message`, `envoyee`

### 4. Architecture Frontend - Routes et Navigation

**Décision :** Structure de routes Next.js App Router avec Server Components par défaut et Client Components uniquement pour interactivité.

**Rationale :**
- **Pour :** Performance optimale (moins de JS côté client), SEO friendly, pattern cohérent avec module Marchés
- **Contre :** Nécessite compréhension RSC/Client boundary (mais équipe déjà formée)
- **Alternative considérée :** Tout en Client Components → Rejeté car contre les best practices Next.js 15

**Structure de routes :**
```
app/
├── (dashboard)/
│   ├── cautions/
│   │   ├── page.tsx                 → Liste (RSC)
│   │   ├── nouveau/
│   │   │   └── page.tsx             → Formulaire création (RSC avec Client form)
│   │   └── [id]/
│   │       ├── page.tsx             → Détail (RSC)
│   │       └── edit/
│   │           └── page.tsx         → Formulaire édition (RSC avec Client form)
│   └── marches/
│       └── [id]/
│           └── page.tsx             → Modifié pour inclure section cautions
```

**Composants :**
- `caution-list.tsx` (Server Component) → Récupère données, délègue à Table client
- `caution-table.tsx` (Client Component) → Interactivité (tri, filtres, pagination)
- `caution-form.tsx` (Client Component) → React Hook Form + Zod validation
- `caution-detail.tsx` (Server Component) → Affichage données, délègue boutons à composant client
- `caution-card.tsx` (Server Component) → Carte résumé pour liste

### 5. Validation des Données

**Décision :** Double validation avec Zod - côté client (UX) et côté serveur (sécurité).

**Rationale :**
- **Pour :** Sécurité (validation serveur obligatoire), UX (feedback immédiat côté client)
- **Contre :** Duplication du schéma Zod (mais schéma partagé via import)
- **Alternative considérée :** Validation serveur uniquement → Rejeté car mauvaise UX

**Schémas Zod (lib/validations/caution.ts) :**
```typescript
export const cautionBaseSchema = z.object({
  reference: z.string().min(1, "Référence requise"),
  type: z.enum(["PROVISOIRE", "DEFINITIVE", "AVANCE", "RETENUE_GARANTIE"]),
  montant: z.number().positive("Montant doit être > 0"),
  dateEmission: z.date(),
  dateEcheance: z.date(),
  banqueNom: z.string().min(1, "Banque requise"),
  banqueContact: z.string().optional(),
  marcheId: z.string().cuid(),
}).refine(data => data.dateEcheance > data.dateEmission, {
  message: "Date d'échéance doit être après date d'émission",
  path: ["dateEcheance"]
});

export const createCautionSchema = cautionBaseSchema;
export const updateCautionSchema = cautionBaseSchema.extend({
  id: z.string().cuid()
});
```

### 6. Filtrage et Recherche

**Décision :** Filtres côté serveur avec paramètres URL pour bookmarkability et partage.

**Rationale :**
- **Pour :** URLs partageables (ex: `/cautions?statut=ACTIVE&marcheId=xyz`), SEO, state persisté dans URL
- **Contre :** Requiert rechargement page pour chaque filtre (mais acceptable avec RSC)
- **Alternative considérée :** Filtres côté client uniquement → Rejeté car pas de persistance state

**Implémentation :**
- SearchParams Next.js pour récupération des filtres
- Server Action `getAllCautions(filters)` avec clause `where` Prisma dynamique
- Composant client pour les contrôles de filtres (Select, Input search)
- URL update via `useRouter().push()` avec nouveaux searchParams

### 7. Gestion des Dates et Calculs

**Décision :** Utiliser `date-fns` (déjà installé) pour tous les calculs et formatage de dates.

**Rationale :**
- **Pour :** Bibliothèque déjà présente, tree-shakable, API intuitive, support i18n français
- **Contre :** Bundle size (mais tree-shaking minimise l'impact)
- **Alternative considérée :** Luxon ou Day.js → Rejeté car ajout de dépendance inutile

**Fonctions utilitaires (lib/utils/caution.ts) :**
```typescript
// Calcul jours restants avant échéance
export function getJoursRestants(dateEcheance: Date): number

// Détermination du niveau d'alerte
export function getAlertLevel(joursRestants: number): 'info' | 'warning' | 'critical' | null

// Vérification si caution expirée
export function isCautionExpiree(dateEcheance: Date): boolean

// Formatage montant en euro
export function formatMontant(montant: Decimal): string

// Formatage date en français
export function formatDate(date: Date): string
```

### 8. Responsive Design

**Décision :** Mobile-first avec Tailwind breakpoints, transformation table → cards sur mobile.

**Rationale :**
- **Pour :** Meilleure UX mobile, pattern éprouvé, utilise Tailwind déjà présent
- **Contre :** Duplication markup (table + cards) → Acceptable car améliore lisibilité
- **Alternative considérée :** Table scroll horizontal sur mobile → Rejeté car mauvaise UX

**Breakpoints :**
- Mobile (< 768px) → Vue cards, navigation bottom sheet
- Tablet (768-1024px) → Table compacte, formulaire 1 colonne
- Desktop (≥ 1024px) → Table complète, formulaire 2 colonnes

### 9. Permissions et Sécurité

**Décision :** Vérification des permissions dans chaque Server Action basée sur le rôle utilisateur (session NextAuth).

**Rationale :**
- **Pour :** Sécurité côté serveur garantie, utilise infrastructure auth existante
- **Contre :** Vérifications répétées dans chaque action (mais nécessaire)
- **Alternative considérée :** Middleware de permissions → Rejeté car complexité non requise pour MVP

**Matrice de permissions :**
- ADMIN : Toutes opérations (CRUD complet, changement statut)
- AVANCE : CRUD complet, changement statut LIBEREE uniquement
- EXPLOITATION : Lecture seule + création limitée
- VISITEUR : Lecture seule uniquement

**Implémentation :**
- Helper `requireAuth(allowedRoles: UserRole[])` dans Server Actions
- Throw UnauthorizedError si rôle insuffisant
- UI adapte les boutons d'action selon le rôle (lecture du session côté serveur)

## Risks / Trade-offs

### Risque 1 : Suppression en cascade trop agressive
**Description :** Si un marché est supprimé par erreur, toutes ses cautions disparaissent.

**Mitigation :**
- Ajouter une confirmation explicite avec compteur de cautions lors de la suppression de marché
- Message d'avertissement : "Ce marché contient X caution(s). Elles seront également supprimées."
- Log de toutes les suppressions de marchés pour audit
- Considérer soft delete en V1 si demande utilisateur

### Risque 2 : Transition ACTIVE → EXPIREE non automatique
**Description :** Pour le MVP, le changement de statut à l'expiration n'est pas automatique (pas de cron job), risque d'incohérence.

**Mitigation :**
- Calcul à la volée lors de l'affichage (fonction `getCautionWithComputedStatus()`)
- Affichage visuel prioritaire (badge rouge EXPIREE) même si DB dit ACTIVE
- Dashboard affiche un compteur "Cautions expirées à vérifier"
- V1 implémentera Vercel Cron pour synchronisation automatique DB

### Risque 3 : Performance avec grand nombre de cautions
**Description :** Liste de cautions peut devenir lente avec > 1000 entrées.

**Mitigation :**
- Index Prisma sur `dateEcheance`, `statut`, `marcheId` déjà prévus
- Pagination serveur à 50 éléments par page
- Lazy loading des relations (ne charger `marche` que si nécessaire)
- Monitoring via Prisma query logs en développement

### Risque 4 : Alertes en double
**Description :** Génération d'alertes multiples pour même seuil (30j, 15j, 7j).

**Mitigation :**
- Vérification d'existence avant insertion : `WHERE cautionId = X AND type = 'CAUTION_EXPIRATION_30J'`
- Index unique composite sur `(cautionId, type)` en V1 si besoin
- Fonction `getOrCreateAlert()` pour idempotence

### Risque 5 : Dates timezone inconsistentes
**Description :** Calculs de dates peuvent différer entre serveur et client selon timezone.

**Mitigation :**
- Stocker toutes dates en UTC en base (comportement par défaut Prisma)
- Conversion en timezone locale uniquement pour affichage (date-fns `format()`)
- Utiliser `startOfDay()` pour comparaisons de dates sans heures

### Trade-off 1 : Pas d'envoi automatique d'emails dans MVP
**Justification :** Focus sur la logique métier d'abord, infrastructure email en V1.

**Impact :** Utilisateurs doivent consulter le dashboard pour voir les alertes (pas de notification proactive).

**Compensation :** Badge de notification dans menu Cautions avec compteur d'alertes actives.

### Trade-off 2 : Pas de versioning des cautions
**Justification :** Complexité non requise pour MVP, `updatedAt` timestamp suffit.

**Impact :** Pas d'historique des modifications (ancien montant, anciennes dates).

**Compensation :** Logs serveur conservent les modifications, V1 pourra ajouter table `caution_history`.

### Trade-off 3 : Export CSV basique
**Justification :** Fonctionnalité export existe mais sans mise en forme avancée.

**Impact :** Exports simples sans graphiques ou analyses.

**Compensation :** Suffisant pour reporting comptable basique, V1 ajoutera exports Excel avec formules.

## Migration Plan

### Étape 1 : Préparation Base de Données
1. Créer migration Prisma avec schéma Caution complet
2. Exécuter `prisma migrate dev --name add_caution_model`
3. Vérifier création des index sur dateEcheance, statut, marcheId
4. Vérifier contraintes FK vers marches et users
5. Régénérer Prisma Client : `prisma generate`

### Étape 2 : Seed Data
1. Étendre `prisma/seed.ts` avec données de test cautions
2. Créer 15-20 cautions réparties sur marchés existants
3. Couvrir tous types (PROVISOIRE, DEFINITIVE, AVANCE, RETENUE_GARANTIE)
4. Couvrir tous statuts (ACTIVE majorité, quelques EXPIREE/LIBEREE/APPELEE)
5. Générer dates variées (échéances passées, < 30j, < 15j, < 7j, futures)
6. Exécuter seed : `npm run db:seed`

### Étape 3 : Backend (Server Actions + Validations)
1. Créer `lib/validations/caution.ts` avec schémas Zod
2. Créer `lib/actions/cautions.ts` avec CRUD complet
3. Créer `lib/utils/caution.ts` avec fonctions de calcul dates/alertes
4. Tester chaque Server Action avec données seed
5. Vérifier gestion des erreurs (Prisma errors, Zod errors)

### Étape 4 : Frontend - Composants UI
1. Créer composants shadcn/ui manquants si nécessaire (Table déjà existant)
2. Créer `components/cautions/caution-form.tsx` (Client Component)
3. Créer `components/cautions/caution-table.tsx` (Client Component)
4. Créer `components/cautions/caution-card.tsx` (Server Component)
5. Créer `components/cautions/caution-filters.tsx` (Client Component)
6. Créer `components/cautions/caution-detail.tsx` (Server Component)

### Étape 5 : Frontend - Pages et Routes
1. Créer `app/(dashboard)/cautions/page.tsx` (liste)
2. Créer `app/(dashboard)/cautions/nouveau/page.tsx` (création)
3. Créer `app/(dashboard)/cautions/[id]/page.tsx` (détail)
4. Créer `app/(dashboard)/cautions/[id]/edit/page.tsx` (édition)
5. Modifier `app/(dashboard)/marches/[id]/page.tsx` pour section cautions
6. Ajouter item "Cautions" au menu dashboard (`components/layout/nav.tsx`)

### Étape 6 : Tests Playwright
1. Tester création de caution avec formulaire complet
2. Tester modification de caution existante
3. Tester suppression avec confirmation
4. Tester filtres (par statut, type, marché)
5. Tester responsive (desktop 1920x1080, tablet 768x1024, mobile 375x667)
6. Tester navigation breadcrumbs
7. Tester création depuis page marché

### Étape 7 : Déploiement
1. Commit et push sur branche `feat/module-cautions`
2. Vérification build Next.js : `npm run build`
3. Merge vers `main` après review
4. Migration Prisma en production : `npx prisma migrate deploy`
5. Vérification déploiement Vercel
6. Smoke test sur environnement de production

### Rollback Strategy
En cas de problème critique en production :
1. Revert du commit sur `main`
2. Redéploiement automatique Vercel
3. Si migration DB déjà appliquée : exécuter migration down (rare, Prisma ne génère pas de down automatique)
4. Alternative : Garder le code, désactiver menu "Cautions" temporairement

## Open Questions

### Question 1 : Faut-il limiter le nombre de cautions par marché ?
**Contexte :** Un marché peut-il avoir plusieurs cautions du même type (ex: 2 cautions DEFINITIVE) ?

**Options :**
- A) Pas de limite, permettre doublons de type
- B) Contrainte unique sur (marcheId, type) → Un seul type par marché

**Recommandation :** Option A pour MVP (plus flexible), contrainte en V1 si besoin exprimé.

### Question 2 : Archivage des cautions libérées
**Contexte :** Doit-on déplacer les cautions LIBEREE vers une table archive après X mois ?

**Options :**
- A) Garder toutes cautions dans table principale (plus simple)
- B) Archivage automatique après 6 mois de libération

**Recommandation :** Option A pour MVP, archivage en V1 si performance dégradée.

### Question 3 : Notification des utilisateurs concernés
**Contexte :** Faut-il notifier uniquement le créateur de la caution ou tous les utilisateurs du rôle ADMIN/AVANCE ?

**Options :**
- A) Notification uniquement créateur (userId)
- B) Notification broadcast à tous ADMIN + AVANCE

**Recommandation :** Option B pour V1 (emails), Option A pour MVP (affichage dashboard uniquement).

### Question 4 : Export PDF des cautions
**Contexte :** Besoin d'exporter une caution en PDF pour archives/envoi banque ?

**Options :**
- A) Export CSV uniquement (simple)
- B) Export PDF formaté avec logo entreprise

**Recommandation :** Option A pour MVP, Option B en V1 avec @react-pdf/renderer.

### Question 5 : Gestion des cautions appelées (APPELEE)
**Contexte :** Workflow spécifique quand une caution est appelée par le maître d'ouvrage ?

**Options :**
- A) Simple changement de statut, pas de workflow
- B) Workflow dédié avec montant appelé, date règlement, justification

**Recommandation :** Option A pour MVP (changement statut suffit), Option B en V1 si besoin identifié.
