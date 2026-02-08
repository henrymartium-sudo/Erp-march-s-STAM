# ⚠️ ROADMAP ARCHIVÉE - COMPLÉTÉE LE 2026-02-08

> **STATUT** : ✅ **OBSOLÈTE - MVP 100% TERMINÉ**
>
> Cette roadmap a été **entièrement complétée** entre le 2026-02-03 et le 2026-02-08.
>
> **Tous les objectifs ont été atteints** :
> - ✅ Cautions & Garanties (100%)
> - ✅ Dossier Administratif (100%)
> - ✅ Exécution Véhicules (100%)
> - ✅ Documents & Médias (100%)
> - ✅ Système d'Alertes (version basique)
> - ✅ UI Admin (100%)
> - ✅ Exports Excel (version basique)
> - ✅ Déploiement Production (actif)
>
> **MVP 100% OPÉRATIONNEL** : https://erp-marches-stam.vercel.app
>
> **Nouvelle roadmap active** : `ROADMAP_AMELIORATIONS_MVP.md`
> - 26 améliorations planifiées
> - 3 sprints (10 jours)
> - Objectif : MVP+ production-grade
>
> **Date d'archivage** : 2026-02-08
> **Raison** : Objectifs atteints, remplacée par roadmap améliorations

---

# 🎯 ROADMAP MVP - ERP Marchés Publics

**Dernière mise à jour** : 2026-02-03
**Durée totale** : 10-12 jours
**Objectif** : MVP 100% Opérationnel en Production

---

## 📊 Vue d'Ensemble

```
État Actuel  : 78% MVP complété
État Cible   : 100% MVP opérationnel
Temps restant: 10-12 jours (développement solo)
```

### Modules Déjà Terminés ✅
- [x] Référentiel Marché (100%)
- [x] Statuts essentiels (100%)
- [x] Authentification & Permissions (100%)
- [x] Documents & Médias (95% - tests E2E restants)
- [x] Tableaux de bord simples (80%)

### Modules À Développer 🎯
- [ ] **Cautions & Garanties** (Jours 1-3) 🔴 URGENT
- [ ] **Dossier Administratif** (Jour 3) 🟡 INTÉGRÉ
- [ ] **Exécution Véhicules** (Jours 5-6) 🟡 CORE BUSINESS
- [ ] **Système d'Alertes** (Jours 8-9) 🟢 AUTOMATISATION
- [ ] **Finitions MVP** (Jours 10-11) 🟢 POLISH

---

## 🗓️ Planning Jour par Jour

### 🔴 PHASE 1 : Cautions URGENTES + Dossier Admin (Jours 1-3)

#### **Jour 1 : Backend Cautions Complet** ⏱️ 8h

**Matin (4h) - Validation + Server Actions**

```bash
# Setup
mkdir -p lib/validations lib/actions lib/utils lib/constants
```

- [ ] Créer `lib/validations/caution.ts`
  - Schema `createCautionSchema` (9 champs)
  - Schema `updateCautionSchema` (partial)
  - Schema `cautionFiltersSchema` (6 filtres)
  - Types TypeScript générés

- [ ] Créer `lib/actions/cautions.ts`
  - `createCaution()` - CREATE avec permissions
  - `updateCaution()` - UPDATE avec permissions
  - `deleteCaution()` - DELETE (Admin/Avance only)
  - `getCaution()` - GET ONE avec relations
  - `getAllCautions()` - GET ALL avec filtres
  - Type `ActionResult<T>` pour gestion erreurs

**Après-midi (4h) - Utilitaires + Constants**

- [ ] Créer `lib/utils/caution.ts`
  - Labels français (TYPE_CAUTION_LABELS, STATUT_CAUTION_LABELS)
  - Couleurs badges (getCautionStatutColor, getCautionTypeColor)
  - Calculs (calculateDaysUntilExpiration, isCautionExpireSoon)
  - Formatage (formatMontantCaution)

- [ ] Créer `lib/constants/caution.ts`
  - TYPE_CAUTION_OPTIONS (4 types)
  - STATUT_CAUTION_OPTIONS (4 statuts)
  - DAYS_BEFORE_EXPIRATION_WARNING = 30
  - DAYS_BEFORE_EXPIRATION_CRITICAL = 7

- [ ] Tests backend
  - Tester chaque Server Action via console
  - Vérifier permissions (ADMIN, AVANCE, EXPLOITATION, VISITEUR)

**✅ Livrable** : Backend Cautions 100% fonctionnel

---

#### **Jour 2 : Frontend Cautions - Composants** ⏱️ 8h

**Matin (4h) - Composants de Base**

```bash
mkdir -p components/cautions
```

- [ ] `components/cautions/caution-badge.tsx`
  - Badge statut (ACTIVE, EXPIREE, LIBEREE, APPELEE)
  - Badge type (PROVISOIRE, DEFINITIVE, AVANCE, RETENUE_GARANTIE)
  - Couleurs selon constantes

- [ ] `components/cautions/caution-card.tsx`
  - Mode compact (liste)
  - Mode complet (détail)
  - Actions (voir, modifier, supprimer)
  - Affichage jours avant expiration

- [ ] `components/cautions/caution-filters.tsx`
  - Filtre par type
  - Filtre par statut
  - Filtre par marché
  - Filtre dates échéance (min/max)
  - Recherche texte (référence, banque)

- [ ] `components/cautions/caution-timeline.tsx`
  - Timeline visuelle échéances
  - Indicateur urgence (< 30j, < 7j)
  - Groupé par statut

**Après-midi (4h) - Formulaire + Liste**

- [ ] `components/cautions/caution-form.tsx`
  - React Hook Form + Zod resolver
  - Champs : référence, type, montant, dates, banque
  - Sélecteur marché
  - Validation temps réel
  - Calcul automatique jours avant expiration

- [ ] `components/cautions/caution-list.tsx`
  - Liste avec pagination
  - Tri par colonnes
  - Filtres intégrés
  - Actions en masse

- [ ] `components/cautions/caution-detail.tsx`
  - Vue complète métadonnées
  - Informations marché associé
  - Historique modifications
  - Actions (modifier, supprimer)

**✅ Livrable** : 6 composants UI Cautions opérationnels

---

#### **Jour 3 : Pages Cautions + Intégration + Dossier Admin** ⏱️ 8h

**Matin (4h) - Pages CRUD**

```bash
mkdir -p app/\(dashboard\)/cautions/nouvelle app/\(dashboard\)/cautions/\[id\]/edit
```

- [ ] `app/(dashboard)/cautions/page.tsx` - **Liste**
  - Server Component
  - Appel `getAllCautions()`
  - Pass data au Client Component

- [ ] `app/(dashboard)/cautions/_components/cautions-content.tsx`
  - Client Component
  - CautionList + CautionFilters
  - Gestion état filtres

- [ ] `app/(dashboard)/cautions/nouvelle/page.tsx` - **Création**
  - CautionForm en mode création
  - Redirect après succès

- [ ] `app/(dashboard)/cautions/[id]/page.tsx` - **Détail**
  - Server Component
  - Appel `getCaution(id)`
  - CautionDetail

- [ ] `app/(dashboard)/cautions/[id]/edit/page.tsx` - **Édition**
  - CautionForm en mode édition
  - Pré-remplissage données

**Après-midi (3h) - Intégration + Dossier Admin**

- [ ] Créer `components/marches/marche-cautions-section.tsx`
  - Afficher cautions du marché
  - Cards compactes
  - Bouton "Nouvelle caution"

- [ ] Modifier `components/marches/marche-detail.tsx`
  - Ajouter Tab "Cautions"
  - Intégrer MarcheCautionsSection

- [ ] **Enrichir Documents pour Dossier Admin**
  - Modifier `prisma/schema.prisma` :
    ```prisma
    enum TypeDocument {
      // Existants
      CONTRAT, CAUTION, PV_RECEPTION, ...

      // Nouveaux Dossier Admin
      DAO
      DRP
      OFFRE_DEPOSEE
      COURRIER_ATTRIBUTION
      COURRIER_REJET
      COURRIER_RESILIATION
      ATTESTATION_FISCALE
      ATTESTATION_CNSS
      ATTESTATION_BONNE_FIN
    }

    enum PhaseMarche {
      PREPARATION, SOUMISSION, ATTRIBUTION, EXECUTION, CLOTURE,
      ADMINISTRATIF  // Nouveau
    }
    ```
  - Migration : `npx prisma migrate dev --name add_dossier_admin_docs`
  - Créer `app/(dashboard)/marches/[id]/dossier/page.tsx`
  - Vue dédiée documents administratifs (groupés par type)

**Fin Journée (1h) - Tests + Validation**

- [ ] Tester CRUD cautions complet
  - Créer, modifier, supprimer (Admin, Avance)
  - Consulter (tous rôles)
- [ ] Vérifier responsive (desktop/tablet/mobile)
- [ ] Tester filtres + timeline
- [ ] Tester intégration page marché

**✅ Livrable** : Module Cautions 100% + Dossier Admin intégré

---

### 🟡 PHASE 2 : Véhicules + Tests E2E (Jours 4-7)

#### **Jour 4 : Setup Playwright + Migration Véhicules** ⏱️ 8h

**Matin (4h) - Setup Tests E2E**

```bash
npm install -D @playwright/test
npx playwright install
```

- [ ] Créer `playwright.config.ts`
  - Configuration base URL
  - Timeouts
  - Browsers (chromium, firefox, webkit)

- [ ] Créer `tests/fixtures/auth.setup.ts`
  - Login utilisateur test
  - Storage state

- [ ] Créer `tests/fixtures/db.setup.ts`
  - Seed data test
  - Cleanup après tests

- [ ] Créer `tests/helpers/test-data.ts`
  - Factories marchés test
  - Factories cautions test

**Après-midi (4h) - Migration Véhicules + Backend**

- [ ] Enrichir `prisma/schema.prisma` :
  ```prisma
  model Vehicule {
    id              String   @id @default(cuid())
    immatriculation String   @unique
    marque          String
    modele          String
    annee           Int?

    // Tracking livraison
    dateLivraison           DateTime?
    bonLivraisonRef         String?
    dateReceptionProvisoire DateTime?
    dateReceptionDefinitive DateTime?
    reservesReception       String?
    statut                  StatutVehicule @default(EN_ATTENTE_LIVRAISON)

    marcheId        String?
    marche          Marche?  @relation(fields: [marcheId], references: [id])
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt

    @@index([marcheId])
    @@index([statut])
    @@map("vehicules")
  }

  enum StatutVehicule {
    EN_ATTENTE_LIVRAISON
    LIVRE
    RECEPTION_PROVISOIRE
    RECEPTION_DEFINITIVE
    GARANTIE
    HORS_SERVICE
  }
  ```

- [ ] Migration : `npx prisma migrate dev --name add_vehicule_tracking`
- [ ] Créer `lib/validations/vehicule.ts`
- [ ] Créer `lib/constants/vehicule.ts`

**✅ Livrable** : Tests E2E setup + Migration Véhicules

---

#### **Jours 5-6 : Module Véhicules Complet** ⏱️ 16h

**Même structure que Cautions** :

**Jour 5** (8h) :
- [ ] Backend complet (actions, utils)
- [ ] Composants de base (badge, card, filters, timeline)

**Jour 6** (8h) :
- [ ] Formulaire + Liste + Détail
- [ ] Pages CRUD complètes
- [ ] Intégration page marché
- [ ] Tests + validation

**✅ Livrable** : Module Véhicules 100% opérationnel

---

#### **Jour 7 : Tests E2E Documents + Cautions** ⏱️ 8h

```bash
mkdir -p tests/documents tests/cautions
```

- [ ] `tests/documents/upload.spec.ts`
  - Test upload simple
  - Test upload drag-and-drop
  - Test validation taille/type
  - Test barre progression

- [ ] `tests/documents/filters.spec.ts`
  - Test filtres type, phase, dates
  - Test recherche texte
  - Test reset filtres

- [ ] `tests/cautions/crud.spec.ts`
  - Test création caution
  - Test modification
  - Test suppression
  - Test permissions

- [ ] `tests/cautions/timeline.spec.ts`
  - Test affichage timeline
  - Test calcul jours expiration
  - Test indicateurs urgence

- [ ] Exécuter suite complète : `npx playwright test`

**✅ Livrable** : Tests E2E critiques OK

---

### 🟢 PHASE 3 : Alertes + Finitions (Jours 8-11)

#### **Jours 8-9 : Système d'Alertes Niveau 1** ⏱️ 16h

**Jour 8 (8h) - Backend Alertes**

- [ ] Créer `lib/actions/alertes.ts` :
  ```typescript
  export async function generateAlertes() {
    const now = new Date()
    const in30Days = addDays(now, 30)

    // 1. Cautions expirant dans 30 jours
    const cautionsExpireSoon = await prisma.caution.findMany({
      where: {
        dateEcheance: { gte: now, lte: in30Days },
        statut: 'ACTIVE',
      },
      include: { marche: true },
    })

    for (const caution of cautionsExpireSoon) {
      // Vérifier si alerte déjà créée
      const existing = await prisma.alerte.findFirst({
        where: {
          cautionId: caution.id,
          type: 'CAUTION_EXPIRE_BIENTOT',
          dateAlerte: { gte: addDays(now, -1) },
        },
      })

      if (!existing) {
        await prisma.alerte.create({
          data: {
            type: 'CAUTION_EXPIRE_BIENTOT',
            message: `Caution ${caution.reference} expire bientôt`,
            cautionId: caution.id,
            marcheId: caution.marcheId,
          },
        })
      }
    }

    // 2. Cautions expirées
    const cautionsExpirees = await prisma.caution.findMany({
      where: {
        dateEcheance: { lt: now },
        statut: 'ACTIVE',
      },
    })

    for (const caution of cautionsExpirees) {
      await prisma.caution.update({
        where: { id: caution.id },
        data: { statut: 'EXPIREE' },
      })

      await prisma.alerte.create({
        data: {
          type: 'CAUTION_EXPIREE',
          message: `Caution ${caution.reference} a expiré`,
          cautionId: caution.id,
        },
      })
    }

    // 3. Marchés en retard
    const marchesEnRetard = await prisma.marche.findMany({
      where: {
        dateFinPrevue: { lt: now },
        statut: { in: ['EN_EXECUTION', 'EN_ATTENTE_LIVRAISON_OS'] },
      },
    })

    for (const marche of marchesEnRetard) {
      // Alerte hebdomadaire
      const existing = await prisma.alerte.findFirst({
        where: {
          marcheId: marche.id,
          type: 'MARCHE_RETARD',
          dateAlerte: { gte: addDays(now, -7) },
        },
      })

      if (!existing) {
        await prisma.alerte.create({
          data: {
            type: 'MARCHE_RETARD',
            message: `Marché ${marche.numero} en retard`,
            marcheId: marche.id,
          },
        })
      }
    }

    return { success: true }
  }
  ```

**Jour 9 (8h) - Frontend Alertes**

```bash
mkdir -p app/\(dashboard\)/alertes components/alertes
```

- [ ] `components/alertes/alerte-badge.tsx`
  - Badge type alerte
  - Couleur selon criticité

- [ ] `components/alertes/alerte-card.tsx`
  - Card alerte
  - Actions (voir détail, marquer comme lue)

- [ ] `components/alertes/alerte-list.tsx`
  - Liste alertes
  - Filtres (type, lue/non lue, dates)
  - Tri par date

- [ ] `app/(dashboard)/alertes/page.tsx`
  - Server Component
  - Appel `getAllAlertes()`
  - Client Component pour liste

- [ ] Ajouter dans Dashboard :
  - Badge "Alertes non lues" (compte)
  - Lien vers centre alertes

**✅ Livrable** : Alertes consultables via UI

---

#### **Jour 10 : UI Admin + Dashboard Enrichi** ⏱️ 8h

**Matin (4h) - UI Admin Utilisateurs**

```bash
mkdir -p app/\(dashboard\)/utilisateurs
```

- [ ] `lib/actions/users.ts`
  - `createUser()` - Admin only
  - `updateUser()` - Admin only
  - `deleteUser()` - Soft delete
  - `updateUserRole()` - Admin only

- [ ] `app/(dashboard)/utilisateurs/page.tsx`
  - Liste utilisateurs
  - Actions CRUD

- [ ] `components/users/user-form.tsx`
  - Formulaire création/édition
  - Sélecteur rôle
  - Hash mot de passe (bcrypt)

**Après-midi (4h) - Dashboard Enrichi**

- [ ] Ajouter KPI dans Dashboard :
  - Montant total marchés actifs
  - Montant total cautions actives
  - Nombre alertes non lues
  - Taux de réussite marchés

- [ ] Ajouter graphique simple (Recharts) :
  - Marchés par statut (Bar chart)
  - Évolution marchés (Line chart)

**✅ Livrable** : Admin + Dashboard enrichis

---

#### **Jour 11 : Exports Excel** ⏱️ 8h

```bash
npm install exceljs
```

- [ ] Créer `lib/utils/excel.ts` :
  ```typescript
  import ExcelJS from 'exceljs'

  export async function generateMarchesExcel(marches) {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Marchés')

    worksheet.columns = [
      { header: 'N° Marché', key: 'numero', width: 15 },
      { header: 'Objet', key: 'objet', width: 40 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Montant (MAD)', key: 'montant', width: 15 },
      { header: 'Statut', key: 'statut', width: 20 },
      { header: 'Date Notification', key: 'dateNotification', width: 18 },
    ]

    marches.forEach((marche) => {
      worksheet.addRow({
        numero: marche.numero,
        objet: marche.objet,
        type: marche.type,
        montant: parseFloat(marche.montant),
        statut: marche.statut,
        dateNotification: marche.dateNotification,
      })
    })

    worksheet.getRow(1).font = { bold: true }

    const buffer = await workbook.xlsx.writeBuffer()
    return buffer
  }
  ```

- [ ] Créer `lib/actions/rapports.ts` :
  - `exportMarchesToExcel(filters)`
  - `exportCautionsToExcel(filters)`
  - `exportVehiculesToExcel(filters)`

- [ ] Ajouter boutons export dans UI :
  - Page liste marchés
  - Page liste cautions
  - Page liste véhicules

**✅ Livrable** : Exports Excel opérationnels

---

### ✅ PHASE 4 : Validation & Déploiement (Jour 12)

#### **Jour 12 : Tests Finaux + Déploiement Production** ⏱️ 8h

**Matin (4h) - Tests Complets**

- [ ] Tester tous modules (tous rôles) :
  - Marchés ✓
  - Cautions ✓
  - Véhicules ✓
  - Documents ✓
  - Alertes ✓

- [ ] Valider responsive complet :
  - Desktop 1920x1080 ✓
  - Tablet 768x1024 ✓
  - Mobile 375x667 ✓

- [ ] Exécuter suite tests E2E :
  ```bash
  npx playwright test --reporter=html
  ```

- [ ] Corriger bugs détectés

**Après-midi (4h) - Documentation + Déploiement**

- [ ] Mettre à jour documentation :
  - `SESSION.md` - Marquer MVP 100% complété
  - `CHANGELOG.md` - Ajouter toutes les features
  - `README.md` - Guide utilisateur basique

- [ ] Déploiement Vercel Production :
  ```bash
  # Vérifier build local
  npm run build

  # Appliquer migrations production
  npx prisma migrate deploy

  # Déployer
  vercel --prod
  ```

- [ ] Vérifier en production :
  - Variables d'environnement OK
  - Base de données connectée
  - Storage Supabase fonctionnel
  - Authentification OK
  - Toutes les routes accessibles

**✅ Livrable** : **MVP 100% OPÉRATIONNEL EN PRODUCTION** 🎉

---

## ✅ Checklist Finale MVP

### Modules Core (PRD.md)
- [x] Référentiel marché (100%)
- [x] Statuts essentiels (100%)
- [ ] Dossier administratif (Jour 3)
- [ ] Cautions & garanties (Jours 1-3)
- [ ] Exécution véhicules (Jours 5-6)
- [x] Documents & médias (tests Jour 7)
- [x] Tableaux de bord (enrichi Jour 10)
- [x] Gestion utilisateurs (UI admin Jour 10)
- [ ] Système d'alertes Niveau 1 (Jours 8-9)

### Bonus Inclus
- [ ] Tests E2E Playwright (Jours 4, 7)
- [ ] Exports Excel (Jour 11)
- [ ] Dashboard enrichi (Jour 10)

### Qualité & Production
- [ ] 0 erreurs TypeScript (vérifier quotidiennement)
- [ ] Responsive validé (tester chaque composant)
- [ ] Tests E2E suite complète (Jour 12)
- [ ] Déploiement Vercel production (Jour 12)
- [ ] Documentation à jour (Jour 12)

---

## 🚀 Commandes de Démarrage

### Jour 1 - Maintenant

```bash
# 1. Créer branche Git
git checkout -b feat/mvp-cautions-priorite

# 2. Créer structure fichiers
mkdir -p lib/validations lib/actions lib/utils lib/constants
touch lib/validations/caution.ts
touch lib/actions/cautions.ts
touch lib/utils/caution.ts
touch lib/constants/caution.ts

# 3. Ouvrir éditeur
code lib/validations/caution.ts

# 4. Copier le schéma Zod fourni dans SESSION.md (ligne ~920)
```

### Commits Recommandés

```bash
# Jour 1
git commit -m "feat(cautions): add backend validation and server actions"

# Jour 2
git commit -m "feat(cautions): add UI components (badge, card, filters, form)"

# Jour 3
git commit -m "feat(cautions): add CRUD pages and marché integration"
git commit -m "feat(documents): add dossier administratif document types"

# Jour 4
git commit -m "test: setup Playwright E2E testing infrastructure"
git commit -m "feat(vehicules): add schema and backend"

# Jour 5-6
git commit -m "feat(vehicules): add complete CRUD module"

# Jour 7
git commit -m "test: add E2E tests for documents and cautions"

# Jour 8-9
git commit -m "feat(alertes): add alerts generation and consultation UI"

# Jour 10
git commit -m "feat(users): add admin UI for user management"
git commit -m "feat(dashboard): add enriched KPIs and charts"

# Jour 11
git commit -m "feat(exports): add Excel export functionality"

# Jour 12
git commit -m "docs: update documentation for MVP completion"
git commit -m "chore: prepare production deployment"
```

---

## 📊 Suivi Quotidien

### Format Daily Update

À la fin de chaque journée, mettre à jour SESSION.md :

```markdown
### Jour X - [Date]

**Complété** :
- ✅ Tâche A
- ✅ Tâche B

**En cours** :
- 🚧 Tâche C (80%)

**Blocages** :
- ⚠️ Problème X - Solution Y testée demain

**Prochaine action** :
- Tâche D demain matin
```

---

## 🎯 Objectif Final

```
AVANT  : MVP 78% complété, direction pas claire
APRÈS  : MVP 100% opérationnel en production
DURÉE  : 10-12 jours de développement concentré
RÉSULTAT : Application production-ready pour gestion marchés publics
```

---

## 📞 Support

**Si blocage** :
1. Consulter SESSION.md (contexte complet)
2. Consulter ARCHITECTURE.md (patterns techniques)
3. Consulter BONNES_PRATIQUES.md (standards qualité)
4. Revenir vers Claude avec contexte précis

**Documentation Clés** :
- `SESSION.md` - État du projet + historique
- `ROADMAP_MVP.md` - Ce fichier (roadmap pure)
- `PRD.md` - Requirements métier
- `ARCHITECTURE.md` - Architecture technique
- `BONNES_PRATIQUES.md` - Standards & conventions

---

**🎯 Objectif** : Application production-ready pour gestion complète du cycle de vie des marchés publics

**🚀 C'est parti !** Commence dès maintenant par Jour 1 - Backend Cautions 💪
