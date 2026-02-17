# Plan V1 - Professionnaliser
## ERP Marchés Publics - Version 1.0

**Date de création** : 2026-02-16
**Statut MVP** : ✅ 98% Complete (Production ready)
**Objectif V1** : Professionnaliser l'application avec outils avancés de gestion

---

## 📋 Vue d'Ensemble V1

### Rappel : Ce qui est déjà fait (MVP)

✅ **Modules fonctionnels complets** :
- Marchés (CRUD + recherche + pagination + exports Excel)
- Cautions (CRUD + recherche + pagination + exports Excel)
- Documents (Upload Supabase + métadonnées PostgreSQL)
- Véhicules (CRUD + gestion)
- Dashboard enrichi (KPI + Recharts Donut/Bar charts)
- Alertes email automatiques (Nodemailer + Vercel Cron)
- Auth & Permissions (NextAuth v5 + 4 rôles RBAC)

✅ **Patterns établis** :
- Server Actions pour mutations
- React Server Components pour data fetching
- Validation Zod côté serveur
- shadcn/ui pour composants
- Pagination (10 items/page, seuil 10)
- Recherche textuelle (debounce 300ms)
- Exports Excel (ExcelJS)

### Ce qui manque pour la V1 (PRD.md)

| Fonctionnalité | Statut MVP | Priorité V1 | Estimation |
|----------------|------------|-------------|------------|
| Alertes email automatiques | ✅ FAIT | N/A | 0h |
| Exports PDF | ❌ Manquant | HAUTE | 12h |
| Filtres avancés | ⚠️ Basique | HAUTE | 16h |
| Facturation (traçabilité) | ⚠️ Backend only | HAUTE | 20h |
| Veille & opportunités | ❌ Manquant | MOYENNE | 24h |
| Montage de l'offre | ❌ Manquant | MOYENNE | 28h |
| Statuts avancés | ⚠️ Basique | BASSE | 16h |

**Total estimé V1** : **116 heures** (~3 semaines à 40h/semaine)

---

## 🎯 Objectifs Stratégiques V1

### Objectif 1 : Professionnaliser les rapports
- Exports PDF pour marchés, cautions, documents
- Templates PDF professionnels avec logo et mise en page soignée
- Exports Excel multi-feuilles avec filtres avancés

### Objectif 2 : Affiner la recherche et les filtres
- Filtres combinés (statut + période + autorité + montant)
- Recherche avancée avec opérateurs (AND, OR, NOT)
- Sauvegarde de filtres favoris
- Exports respectant les filtres actifs

### Objectif 3 : Tracer la facturation
- Module facturation complet (CRUD)
- Associations marché → factures
- Suivi des paiements et échéances
- Rapports de facturation par période

### Objectif 4 : Gérer la veille et les opportunités
- Module veille d'opportunités (leads)
- Workflow opportunité → marché
- Critères de qualification d'opportunités
- Statistiques de conversion

### Objectif 5 : Structurer le montage d'offre
- Module montage d'offre (préparation soumission)
- Documents requis par type d'offre
- Checklist de préparation
- Historique des offres déposées

### Objectif 6 : Enrichir le cycle de vie
- Sous-statuts pour phases critiques
- Transitions de statuts avec validation
- Historique des changements de statut
- Notifications de changements

---

## 📅 Organisation en Sprints

### Sprint 1 : Exports PDF (Semaine 1) - HAUTE PRIORITÉ
**Durée** : 12h
**Objectif** : Générer des rapports PDF professionnels pour tous les modules

**Tâches** :
1. **Setup @react-pdf/renderer (1h)**
   - Installer dépendance : `@react-pdf/renderer@^3.4.0`
   - Créer `lib/utils/pdf.ts` avec helpers PDF
   - Configurer templates de base

2. **Template PDF Marché (3h)**
   - Component `lib/pdf/marche-pdf.tsx`
   - Sections : En-tête, Infos marché, Cautions, Documents, Véhicules
   - Logo et mise en page professionnelle
   - Server Action `generateMarchePDF(marcheId)`

3. **Template PDF Caution (2h)**
   - Component `lib/pdf/caution-pdf.tsx`
   - Sections : Détails caution, Marché associé, Échéances
   - Server Action `generateCautionPDF(cautionId)`

4. **Template PDF Liste (3h)**
   - Component `lib/pdf/liste-pdf.tsx`
   - Export liste marchés avec filtres actifs
   - Export liste cautions avec filtres actifs
   - Server Actions `exportMarchesListPDF(filters)`, `exportCautionsListPDF(filters)`

5. **Intégration UI (2h)**
   - Boutons "Exporter PDF" dans pages détail
   - Boutons "Exporter la liste en PDF" dans pages liste
   - Loader pendant génération
   - Download automatique du fichier

6. **Tests & Validation (1h)**
   - Tester génération PDF pour chaque type
   - Vérifier responsive print (A4)
   - Valider styles et mise en page

**Dépendances** :
- `@react-pdf/renderer@^3.4.0`

**Critères de validation** :
- [x] PDF marché avec toutes les sections
- [x] PDF caution avec marché associé
- [x] PDF listes avec filtres respectés
- [x] Download fonctionnel dans navigateur
- [x] Mise en page professionnelle A4

---

### Sprint 2 : Filtres Avancés (Semaine 2) - HAUTE PRIORITÉ
**Durée** : 16h
**Objectif** : Améliorer les filtres existants avec combinaisons et sauvegarde

**Tâches** :
1. **Backend : Logique filtres avancés (4h)**
   - Créer `lib/utils/filters.ts` avec helpers filtres
   - Fonction `buildPrismaWhere(filters)` pour générer conditions Prisma
   - Support filtres combinés (ET/OU)
   - Fonction `parseFilterParams(searchParams)` pour URL

2. **Composant FilterBar universel (4h)**
   - Component `components/shared/filter-bar.tsx`
   - Inputs : Statut (multi-select), Période (date range), Autorité, Montant (min/max)
   - Bouton "Appliquer", "Réinitialiser"
   - Synchronisation URL (searchParams)

3. **Filtres sauvegardés (4h)**
   - Schéma Prisma : `SavedFilter` (userId, name, module, filters JSON)
   - Server Actions : `createSavedFilter()`, `deleteSavedFilter()`, `applySavedFilter()`
   - Component `components/filters/saved-filters.tsx`
   - Dropdown "Mes filtres" avec liste et actions

4. **Intégration modules Marchés/Cautions/Documents (3h)**
   - Remplacer searchBar simple par FilterBar
   - Ajouter FilterBar dans pages liste
   - Tester combinaisons de filtres
   - Exports Excel/PDF respectent filtres

5. **Tests & Validation (1h)**
   - Tester toutes combinaisons de filtres
   - Vérifier synchronisation URL
   - Valider sauvegarde/restauration filtres
   - Tester exports avec filtres actifs

**Dépendances** :
- Aucune (utilise patterns existants)

**Critères de validation** :
- [x] Filtres combinés fonctionnels (statut + période + montant)
- [x] Synchronisation URL bidirectionnelle
- [x] Sauvegarde et restauration de filtres
- [x] Exports respectent filtres actifs
- [x] UI responsive et intuitive

**Schéma Prisma à ajouter** :
```prisma
model SavedFilter {
  id        String   @id @default(cuid())
  name      String
  module    String   // "marches", "cautions", "documents"
  filters   Json     // { statut: [], dateDebut: "", dateFin: "", ... }
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([module])
  @@map("saved_filters")
}
```

---

### Sprint 3 : Module Facturation (Semaine 3) - HAUTE PRIORITÉ
**Durée** : 20h
**Objectif** : Activer le module facturation avec CRUD complet et traçabilité

**Tâches** :
1. **Backend : Server Actions Facturation (4h)**
   - File `lib/actions/factures.ts`
   - Actions : `createFacture()`, `updateFacture()`, `deleteFacture()`, `getFactureById()`, `getFacturesByMarche()`
   - Validation Zod : `lib/validations/facture.ts`
   - Support pagination et recherche

2. **Page Liste Factures (4h)**
   - Page `app/(dashboard)/factures/page.tsx`
   - Table DataTable avec colonnes : Numéro, Marché, Montant, Date émission, Échéance, Statut
   - Recherche textuelle (numéro, marché)
   - Filtres : Statut (EN_ATTENTE, VALIDEE, PAYEE, REJETEE), Période
   - Pagination 10 items/page
   - Bouton "Nouvelle facture"

3. **Page Détail Facture (3h)**
   - Page `app/(dashboard)/factures/[id]/page.tsx`
   - Affichage : Toutes infos facture + marché associé
   - Timeline des changements de statut
   - Actions : Modifier, Supprimer, Changer statut
   - Export PDF facture (template professionnel)

4. **Formulaire Facture (4h)**
   - Component `components/factures/facture-form.tsx`
   - Champs : Numéro, Montant, Date émission, Date échéance, Statut, Marché (select)
   - Validation temps réel avec Zod
   - Support création et édition
   - Toast succès/erreur

5. **Intégration dans Marché (3h)**
   - Section "Factures" dans page détail marché
   - Liste des factures du marché
   - Bouton "Créer facture pour ce marché"
   - KPI : Montant total facturé, Montant payé, Reste à payer

6. **Exports & Rapports (1h)**
   - Export Excel liste factures
   - Export PDF facture individuelle
   - Export PDF rapport facturation par période

7. **Tests & Validation (1h)**
   - Tester CRUD factures
   - Vérifier calculs montants
   - Valider changements de statut
   - Tester exports PDF/Excel

**Dépendances** :
- Aucune (schéma Facture existe déjà dans Prisma)

**Critères de validation** :
- [x] CRUD factures fonctionnel
- [x] Association marché → factures
- [x] Changements de statut tracés
- [x] Calculs montants corrects
- [x] Exports PDF/Excel professionnels
- [x] Filtres et recherche opérationnels

---

### Sprint 4 : Veille & Opportunités (Semaine 4) - MOYENNE PRIORITÉ
**Durée** : 24h
**Objectif** : Créer le module de veille d'opportunités (leads avant soumission)

**Tâches** :
1. **Schéma Prisma Opportunité (2h)**
   - Model `Opportunite` avec champs : titre, description, source, dateIdentification, dateClotureEstimee, montantEstime, autoriteConcernee, statut (IDENTIFIEE, EN_EVALUATION, QUALIFIEE, REJETEE, CONVERTIE_MARCHE)
   - Relations : User (créateur), Marche? (si convertie)
   - Migration Prisma

2. **Backend : Server Actions Opportunité (5h)**
   - File `lib/actions/opportunites.ts`
   - Actions : CRUD + `convertirEnMarche(opportuniteId)` (crée marché depuis opportunité)
   - Validation Zod : `lib/validations/opportunite.ts`
   - Fonction `getOpportunitesStats()` pour KPI

3. **Page Liste Opportunités (5h)**
   - Page `app/(dashboard)/opportunites/page.tsx`
   - Table DataTable avec colonnes : Titre, Source, Date identification, Montant estimé, Autorité, Statut
   - Filtres : Statut, Période, Montant min/max
   - Recherche textuelle
   - Bouton "Nouvelle opportunité"

4. **Page Détail Opportunité (4h)**
   - Page `app/(dashboard)/opportunites/[id]/page.tsx`
   - Affichage : Toutes infos + historique changements
   - Actions : Modifier, Supprimer, Changer statut, Convertir en marché
   - Modal confirmation conversion → marché (pré-remplit formulaire marché)

5. **Formulaire Opportunité (4h)**
   - Component `components/opportunites/opportunite-form.tsx`
   - Champs : Titre, Description, Source, Date identification, Date clôture estimée, Montant estimé, Autorité, Statut
   - Validation Zod temps réel
   - Support création et édition

6. **Dashboard : Widget Opportunités (2h)**
   - Widget dans dashboard principal
   - KPI : Nb opportunités actives, Taux de conversion, Montant total pipeline
   - Liste 5 dernières opportunités

7. **Exports & Statistiques (1h)**
   - Export Excel liste opportunités
   - Rapport statistiques (taux conversion, sources principales, montants)

8. **Tests & Validation (1h)**
   - Tester CRUD opportunités
   - Vérifier conversion opportunité → marché
   - Valider statistiques et KPI
   - Tester exports

**Dépendances** :
- Aucune (nouveau module indépendant)

**Critères de validation** :
- [x] CRUD opportunités fonctionnel
- [x] Conversion opportunité → marché
- [x] Statistiques et KPI cohérents
- [x] Filtres et recherche opérationnels
- [x] Widget dashboard intégré
- [x] Exports Excel professionnels

**Schéma Prisma à ajouter** :
```prisma
model Opportunite {
  id                    String            @id @default(cuid())
  titre                 String
  description           String?           @db.Text
  source                String            // "Veille web", "Contact direct", "Réseau", etc.
  dateIdentification    DateTime
  dateClotureEstimee    DateTime?
  montantEstime         Decimal?          @db.Decimal(15, 2)
  autoriteConcernee     String
  statut                StatutOpportunite @default(IDENTIFIEE)

  // Si convertie en marché
  marcheId              String?           @unique
  marche                Marche?           @relation(fields: [marcheId], references: [id], onDelete: SetNull)

  // Gestion
  userId                String
  user                  User              @relation(fields: [userId], references: [id])

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  @@index([statut])
  @@index([dateIdentification])
  @@index([userId])
  @@map("opportunites")
}

enum StatutOpportunite {
  IDENTIFIEE          // Détectée, pas encore évaluée
  EN_EVALUATION       // En cours d'analyse
  QUALIFIEE           // Validée, on va soumissionner
  REJETEE             // Écartée (hors périmètre, budget, délais, etc.)
  CONVERTIE_MARCHE    // Transformée en marché (offre déposée)
}
```

---

### Sprint 5 : Montage de l'Offre (Semaine 5) - MOYENNE PRIORITÉ
**Durée** : 28h
**Objectif** : Structurer la préparation des dossiers de soumission

**Tâches** :
1. **Schéma Prisma Montage Offre (2h)**
   - Model `DossierOffre` avec champs : marcheId, opportuniteId?, dateDebut, dateDepotPrevue, statut (EN_PREPARATION, PRET, DEPOSE, ABANDONNE), checklistCompleted
   - Model `PieceOffre` (documents requis) : dossierOffreId, type (DAO, TECHNIQUE, FINANCIERE, ADMINISTRATIVE), nom, obligatoire, documentId?, statut (MANQUANT, EN_COURS, COMPLETE)
   - Relations : Marche, Opportunite?, User, Documents
   - Migration Prisma

2. **Backend : Server Actions Dossier Offre (6h)**
   - File `lib/actions/dossiers-offre.ts`
   - Actions : CRUD dossiers + `createPieceOffre()`, `attachDocument()`, `validateChecklist()`, `marquerDepose()`
   - Logique checklist auto (% completion)
   - Validation Zod

3. **Page Liste Dossiers Offre (5h)**
   - Page `app/(dashboard)/dossiers-offre/page.tsx`
   - Table DataTable : Marché, Date début, Date dépôt, Statut, % Completion
   - Filtres : Statut, Période
   - Recherche textuelle
   - Bouton "Nouveau dossier"

4. **Page Détail Dossier Offre (6h)**
   - Page `app/(dashboard)/dossiers-offre/[id]/page.tsx`
   - Sections :
     - Infos dossier (marché, dates, statut)
     - Checklist pièces (tableau avec statut, documents attachés, actions)
     - Timeline préparation
     - Actions : Modifier, Supprimer, Marquer déposé
   - Drag & drop upload documents pour pièces

5. **Formulaire Dossier Offre (4h)**
   - Component `components/dossiers-offre/dossier-form.tsx`
   - Champs : Marché (select), Opportunité? (select), Date début, Date dépôt prévue, Statut
   - Génération automatique checklist type selon type marché
   - Validation Zod

6. **Templates Checklist (3h)**
   - Fichier `lib/templates/checklist-templates.ts`
   - Templates par type marché : FOURNITURES, TRAVAUX, SERVICES
   - Pièces obligatoires et optionnelles pré-configurées
   - Fonction `generateChecklistFromTemplate(typeMarche)`

7. **Intégration Marché (1h)**
   - Lien "Créer dossier offre" dans page détail marché
   - Section "Dossier offre" si existe (statut, % completion)

8. **Tests & Validation (1h)**
   - Tester CRUD dossiers offre
   - Vérifier génération checklist
   - Valider attachement documents
   - Tester calcul % completion

**Dépendances** :
- Module Documents (existe déjà)
- Module Opportunités (Sprint 4)

**Critères de validation** :
- [x] CRUD dossiers offre fonctionnel
- [x] Checklist générée automatiquement
- [x] Attachement documents aux pièces
- [x] Calcul % completion correct
- [x] Templates par type marché
- [x] Intégration avec marchés et opportunités

**Schéma Prisma à ajouter** :
```prisma
model DossierOffre {
  id                  String            @id @default(cuid())
  marcheId            String?
  marche              Marche?           @relation(fields: [marcheId], references: [id], onDelete: Cascade)
  opportuniteId       String?
  opportunite         Opportunite?      @relation(fields: [opportuniteId], references: [id], onDelete: SetNull)

  dateDebut           DateTime
  dateDepotPrevue     DateTime
  statut              StatutDossierOffre @default(EN_PREPARATION)

  // Checklist
  pieces              PieceOffre[]

  // Gestion
  userId              String
  user                User              @relation(fields: [userId], references: [id])

  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([marcheId])
  @@index([statut])
  @@map("dossiers_offre")
}

enum StatutDossierOffre {
  EN_PREPARATION
  PRET
  DEPOSE
  ABANDONNE
}

model PieceOffre {
  id                String            @id @default(cuid())
  dossierOffreId    String
  dossierOffre      DossierOffre      @relation(fields: [dossierOffreId], references: [id], onDelete: Cascade)

  type              TypePieceOffre
  nom               String
  obligatoire       Boolean           @default(true)
  statut            StatutPieceOffre  @default(MANQUANT)

  // Document attaché (optionnel)
  documentId        String?
  document          Document?         @relation(fields: [documentId], references: [id], onDelete: SetNull)

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([dossierOffreId])
  @@map("pieces_offre")
}

enum TypePieceOffre {
  DAO                 // Dossier d'appel d'offres
  TECHNIQUE           // Offre technique
  FINANCIERE          // Offre financière
  ADMINISTRATIVE      // Pièces administratives (attestations, etc.)
  AUTRE
}

enum StatutPieceOffre {
  MANQUANT
  EN_COURS
  COMPLETE
}
```

---

### Sprint 6 : Statuts Avancés (Semaine 6) - BASSE PRIORITÉ
**Durée** : 16h
**Objectif** : Enrichir le cycle de vie avec sous-statuts et transitions validées

**Tâches** :
1. **Schéma Prisma Historique Statuts (2h)**
   - Model `HistoriqueStatut` : marcheId, statutPrecedent, nouveauStatut, dateChangement, userId, commentaire
   - Relations : Marche, User
   - Migration Prisma

2. **Backend : Logique Transitions (4h)**
   - File `lib/utils/statut-transitions.ts`
   - Matrice de transitions autorisées (ex: OPPORTUNITE → DOSSIER_EN_PREPARATION → OFFRE_DEPOSEE)
   - Fonction `canTransitionTo(currentStatut, newStatut): boolean`
   - Fonction `getAvailableTransitions(currentStatut): StatutMarche[]`
   - Server Action `changeStatutMarche(marcheId, newStatut, commentaire)`

3. **Composant Changement Statut (4h)**
   - Component `components/marches/statut-selector.tsx`
   - Dropdown avec statuts autorisés seulement
   - Modal confirmation avec champ commentaire
   - Affichage visuel workflow (stepper ou timeline)
   - Validation avant changement (ex: ne pas clôturer si cautions actives)

4. **Historique Statuts UI (3h)**
   - Component `components/marches/statut-history.tsx`
   - Timeline des changements de statut
   - Affichage : Date, Statut précédent → nouveau, Utilisateur, Commentaire
   - Intégration dans page détail marché

5. **Notifications Changements (2h)**
   - Server Action `notifyStatutChange(marcheId, newStatut)`
   - Email automatique aux utilisateurs concernés (role ADMIN + AVANCE)
   - Template email `lib/email/templates/statut-change.tsx`

6. **Tests & Validation (1h)**
   - Tester toutes transitions autorisées
   - Vérifier blocage transitions interdites
   - Valider historique complet
   - Tester notifications email

**Dépendances** :
- Aucune (améliore module Marché existant)

**Critères de validation** :
- [x] Transitions statuts validées
- [x] Historique complet tracé
- [x] Notifications email fonctionnelles
- [x] Workflow visuel clair
- [x] Blocages transitions interdites
- [x] Commentaires obligatoires pour certaines transitions

**Schéma Prisma à ajouter** :
```prisma
model HistoriqueStatut {
  id                String       @id @default(cuid())
  marcheId          String
  marche            Marche       @relation(fields: [marcheId], references: [id], onDelete: Cascade)

  statutPrecedent   StatutMarche
  nouveauStatut     StatutMarche
  dateChangement    DateTime     @default(now())
  commentaire       String?      @db.Text

  userId            String
  user              User         @relation(fields: [userId], references: [id])

  @@index([marcheId])
  @@index([dateChangement])
  @@map("historique_statuts")
}
```

**Matrice de transitions** :
```typescript
// lib/utils/statut-transitions.ts
export const TRANSITIONS_AUTORISEES: Record<StatutMarche, StatutMarche[]> = {
  OPPORTUNITE_IDENTIFIEE: ['DOSSIER_EN_PREPARATION', 'INFRUCTUEUX', 'ANNULE'],
  DOSSIER_EN_PREPARATION: ['OFFRE_DEPOSEE', 'ABANDONNE', 'OPPORTUNITE_IDENTIFIEE'],
  OFFRE_DEPOSEE: ['EN_ATTENTE_ATTRIBUTION', 'INFRUCTUEUX', 'REJETEE'],
  EN_ATTENTE_ATTRIBUTION: ['ATTRIBUE_PROVISOIREMENT', 'INFRUCTUEUX'],
  ATTRIBUE_PROVISOIREMENT: ['ATTRIBUE_DEFINITIVEMENT', 'ANNULE'],
  ATTRIBUE_DEFINITIVEMENT: ['EN_ATTENTE_LIVRAISON_OS', 'RESILIE'],
  EN_ATTENTE_LIVRAISON_OS: ['EN_EXECUTION', 'RESILIE'],
  EN_EXECUTION: ['EXECUTE_ATTENTE_GARANTIES', 'RESILIE'],
  EXECUTE_ATTENTE_GARANTIES: ['CLOTURE'],
  CLOTURE: [], // Statut terminal
  RESILIE: [], // Statut terminal
  ANNULE: [], // Statut terminal
  INFRUCTUEUX: [], // Statut terminal
};
```

---

## 📊 Récapitulatif Global V1

### Planning Temporel

| Sprint | Fonctionnalité | Durée | Semaine | Priorité |
|--------|----------------|-------|---------|----------|
| 1 | Exports PDF | 12h | S1 | HAUTE |
| 2 | Filtres Avancés | 16h | S2 | HAUTE |
| 3 | Module Facturation | 20h | S3 | HAUTE |
| 4 | Veille & Opportunités | 24h | S4 | MOYENNE |
| 5 | Montage de l'Offre | 28h | S5 | MOYENNE |
| 6 | Statuts Avancés | 16h | S6 | BASSE |

**Total** : **116 heures** (~3 semaines à 40h/semaine)

### Dépendances entre Sprints

```
Sprint 1 (PDF) ──┐
                 ├──> Sprint 2 (Filtres) ──> Sprint 3 (Facturation) ──> Sprint 4 (Opportunités) ──> Sprint 5 (Montage Offre)
                 └──────────────────────────────────────────────────────────────────────────────────> Sprint 6 (Statuts)
```

**Ordre recommandé** :
1. Sprint 1 (PDF) - Indépendant, haute priorité
2. Sprint 2 (Filtres) - Indépendant, haute priorité
3. Sprint 3 (Facturation) - Dépend de Filtres, haute priorité
4. Sprint 4 (Opportunités) - Indépendant, moyenne priorité
5. Sprint 5 (Montage Offre) - Dépend d'Opportunités, moyenne priorité
6. Sprint 6 (Statuts) - Indépendant, basse priorité

**Parallélisation possible** :
- Sprint 1 + Sprint 2 en parallèle (24h)
- Sprint 4 en parallèle avec Sprint 3 (44h au lieu de 44h)

### Nouvelles Dépendances à Installer

| Dépendance | Version | Usage | Sprint |
|------------|---------|-------|--------|
| `@react-pdf/renderer` | ^3.4.0 | Génération PDF | Sprint 1 |
| Aucune autre | N/A | Utilise stack existante | Tous |

### Nouveaux Schémas Prisma

1. **SavedFilter** (Sprint 2) - Filtres sauvegardés utilisateur
2. **Facture** (Sprint 3) - ✅ Existe déjà (à activer)
3. **Opportunite** (Sprint 4) - Veille opportunités
4. **DossierOffre** + **PieceOffre** (Sprint 5) - Montage d'offre
5. **HistoriqueStatut** (Sprint 6) - Traçabilité statuts

**Total migrations** : 5 nouvelles tables + 4 nouveaux enums

---

## ✅ Critères de Validation Globaux V1

### Fonctionnalité
- [x] Tous les sprints complétés
- [x] Tous les modules intégrés au dashboard
- [x] Exports PDF/Excel fonctionnels pour tous les modules
- [x] Filtres avancés opérationnels sur tous les modules
- [x] Facturation tracée et rapports disponibles
- [x] Veille opportunités avec statistiques
- [x] Montage offre avec checklists
- [x] Historique statuts complet

### Technique
- [x] Tous les tests E2E passent (>95% success rate)
- [x] Build production réussi (0 erreurs TypeScript)
- [x] Performance maintenue (First Load JS < 300 kB)
- [x] Migrations Prisma réussies en production
- [x] Documentation mise à jour (ARCHITECTURE.md, PRD.md)

### Utilisateur
- [x] Interface cohérente avec MVP (patterns shadcn/ui)
- [x] Responsive sur tous devices (mobile, tablet, desktop)
- [x] Messages d'erreur clairs et utiles
- [x] Navigation intuitive entre modules
- [x] Exports professionnels (logo, mise en page soignée)

---

## 🚀 Prochaines Étapes Immédiates

### 1. Validation du Plan
- [ ] Review du plan avec équipe/client
- [ ] Priorisation finale des sprints
- [ ] Estimation budget et ressources

### 2. Préparation Sprint 1
- [ ] Créer branche `feature/exports-pdf`
- [ ] Installer `@react-pdf/renderer`
- [ ] Créer structure `lib/pdf/`
- [ ] Commencer template PDF Marché

### 3. Communication
- [ ] Communiquer planning aux stakeholders
- [ ] Définir dates de démonstration par sprint
- [ ] Organiser revues de code hebdomadaires

---

## 📝 Notes Importantes

### Patterns à Respecter (depuis MVP)
- **Server Actions** : Toutes mutations via Server Actions
- **Validation Zod** : Côté serveur obligatoire
- **Pagination** : 10 items/page, seuil 10
- **Recherche** : Debounce 300ms
- **Exports** : Respecter filtres actifs
- **Permissions** : Vérifier rôle dans chaque action
- **TypeScript Strict** : Aucune erreur TS autorisée

### Nouveaux Patterns V1
- **PDF Templates** : Utiliser `@react-pdf/renderer` avec components React
- **Filtres Avancés** : JSON serializable dans URL + sauvegarde DB
- **Workflow Statuts** : Matrice de transitions + historique complet
- **Checklists** : Templates configurables par type
- **Opportunités** : Pipeline avec conversion automatique

### Points d'Attention
- **Performance** : Surveiller First Load JS (ne pas dépasser 300 kB)
- **Migrations** : Tester en local avant production
- **Tests E2E** : Maintenir >95% success rate
- **Exports** : Tester avec gros volumes de données (100+ items)
- **Filtres** : Valider comportement URL avec tous filtres combinés

---

**Document créé le** : 2026-02-16
**Auteur** : Équipe Développement ERP Marchés
**Version** : 1.0
**Prochaine révision** : Fin Sprint 1 (validation approche PDF)
