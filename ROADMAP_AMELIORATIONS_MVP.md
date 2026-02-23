# 🗺️ Roadmap Professionnelle - Améliorations MVP ERP Marchés STAM

**Version** : 2.0
**Date de création** : 2026-02-08
**Dernière mise à jour** : 2026-02-21
**Avancement** : 13/26 priorités terminées ✅
**Durée estimée** : 10 jours ouvrés / 80 heures

---

## 📋 Table des Matières

1. [Vue d'Ensemble Exécutive](#vue-densemble-exécutive)
2. [Objectifs et KPIs](#objectifs-et-kpis)
3. [Architecture des Sprints](#architecture-des-sprints)
4. [Diagramme de Gantt](#diagramme-de-gantt)
5. [Dépendances Critiques](#dépendances-critiques)
6. [Plan de Déploiement](#plan-de-déploiement)
7. [Gestion des Risques](#gestion-des-risques)
8. [Critères d'Acceptation](#critères-dacceptation)
9. [Suivi et Reporting](#suivi-et-reporting)

---

## 🎯 Vue d'Ensemble Exécutive

### Contexte

Le MVP ERP Marchés STAM est **100% fonctionnel** en production avec 7 modules opérationnels. Cette roadmap vise à améliorer l'**expérience utilisateur**, combler les **lacunes fonctionnelles critiques** et renforcer la **robustesse technique** de l'application.

### Périmètre

**26 améliorations** réparties en **3 sprints** de complexité croissante :

| Catégorie | Nombre | Priorité | Statut |
|-----------|--------|----------|--------|
| **Fonctionnalités Critiques** | 8 | 🔴 HAUTE | 8/8 ✅ TERMINÉ |
| **Améliorations UX/UI** | 10 | 🟠 MOYENNE | 5/10 ✅ — 5 restants |
| **Robustesse Technique** | 8 | 🟡 BASSE | 0/8 à faire |

### Valeur Métier

1. **Automatisation alertes** → Réduction risque dépassement échéances (ROI immédiat) ✅
2. **Recherche textuelle** → Gain productivité 30% (temps de navigation réduit) ✅
3. **Exports PDF** → Professionnalisation communication externe *(en cours)*
4. **Upload 50MB** → Support documents haute qualité (plans, scans HD) ✅
5. **Sauvegarde brouillon** → Zéro perte de données (satisfaction utilisateur +40%) ✅

### Stratégie de Livraison

- ✅ **Livraison incrémentale** : Valeur à chaque sprint
- ✅ **Testing collaboratif** : Validation utilisateur à chaque jalon
- ✅ **Déploiement progressif** : Preview → Production
- ✅ **Rollback garanti** : Chaque sprint peut être annulé indépendamment

---

## 📊 Objectifs et KPIs

### Objectifs Stratégiques

| # | Objectif | Métrique | Cible | Statut |
|---|----------|----------|-------|--------|
| **O1** | Automatiser la surveillance des échéances | Alertes envoyées automatiquement | 100% | ✅ Manuel OK / Cron désactivé |
| **O2** | Réduire le temps de recherche d'information | Temps moyen de recherche | < 10s | ✅ Livré |
| **O3** | Éliminer les pertes de données de saisie | Incidents perte données/mois | 0 | ✅ Auto-save livré |
| **O4** | Professionnaliser les exports | Documents PDF générés/mois | > 50 | ⏳ En cours |
| **O5** | Améliorer la performance perçue | Score Lighthouse Performance | > 90 | ⏳ À faire |
| **O6** | Renforcer la sécurité utilisateur | Récupérations mot de passe/mois | Support | ✅ Livré |

### KPIs de Succès

#### Sprint 1 (Fondations) — ✅ TERMINÉ

| KPI | Cible | Statut |
|-----|-------|--------|
| Alertes envoyées avec succès | 100% | ✅ Manuel OK |
| Recherche fonctionnelle sur 4 modules | 100% | ✅ |
| Upload 50MB réussi | > 95% | ✅ |
| Récupérations mot de passe réussies | 100% | ✅ |
| Build sans erreurs | 100% | ✅ |

#### Sprint 2 (Expérience) — ⏳ En cours

| KPI | Cible | Mesure |
|-----|-------|--------|
| Exports PDF générés sans erreur | > 98% | Tests génération |
| Brouillons restaurés avec succès | 100% | ✅ Tests LocalStorage |
| Timeline affichées correctement | 100% | Tests visuels |
| Permissions EXPLOITATION validées | 100% | ✅ Tests RBAC |
| Score UX utilisateur | > 8/10 | Feedback tests |

#### Sprint 3 (Robustesse) — ⏳ À faire

| KPI | Cible | Mesure |
|-----|-------|--------|
| Tests E2E passants | 100% | CI Playwright |
| Couverture tests critiques | > 70% | Rapport coverage |
| Score Lighthouse Performance | > 90 | Audit automatique |
| Score Lighthouse Accessibility | > 90 | Audit automatique |
| Bugs production Sprint 1-2 | 0 | Issue tracker |

---

## 🏗️ Architecture des Sprints

### Principe d'Optimisation

Les sprints sont organisés selon le modèle **"Fondations → Expérience → Robustesse"** pour :

1. **Livrer de la valeur métier rapidement** (alertes dès Sprint 1)
2. **Minimiser les dépendances bloquantes** (tâches parallélisables)
3. **Permettre le testing continu** (validation progressive)
4. **Réduire les risques techniques** (alertes SMTP testées tôt)

---

## 🚀 Sprint 1 : Fondations Critiques ✅ TERMINÉ

**Objectif** : Implémenter les fonctionnalités critiques bloquantes pour l'usage métier quotidien

**Valeur livrée** : Automatisation alertes + Recherche opérationnelle + Sécurité renforcée

---

#### 🔴 PRIORITÉ 1 : Alertes Automatiques (6h)

**Statut : ⚠️ PARTIEL** — Envoi manuel fonctionnel. Vercel Cron désactivé (Hobby plan).

**Délivrables livrés** :
- ✅ Emails alertes via envoi manuel (`/admin/alertes`)
- ✅ Page administration alertes
- ⚠️ Cron hebdomadaire désactivé (à réactiver si upgrade plan Vercel)

---

#### 🔴 PRIORITÉ 2 : Envoi Manuel Alertes (2h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ ADMIN peut déclencher envoi à la demande
- ✅ Feedback utilisateur immédiat (toast)

---

#### 🟠 PRIORITÉ 3 : Recherche Textuelle (2h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ Barre recherche opérationnelle sur 4 modules (Marchés, Cautions, Documents, Véhicules)
- ✅ Résultats instantanés avec debounce 300ms

---

#### 🟠 PRIORITÉ 4 : Pagination (3h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ Pagination sur toutes les listes (25 items/page)
- ✅ Performance optimisée

---

#### 🔴 PRIORITÉ 5 : Upload Premium 50MB (5h)

**Statut : ✅ TERMINÉ** (commit `fb0ec20`)

**Délivrables** :
- ✅ Upload 50 MB fonctionnel (upload direct client → Supabase)
- ✅ Progress bar visuelle (XMLHttpRequest)
- ✅ Upload multiple (5 fichiers max)

---

#### 🔴 PRIORITÉ 6 : Récupération Mot de Passe (4h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ Workflow complet récupération password (`/forgot-password` + `/reset-password`)
- ✅ Token crypto-safe, expiration 1h, table `password_resets` en DB

---

#### 🔴 PRIORITÉ 7 : Error Boundaries (2h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ `app/error.tsx`, `app/global-error.tsx`, `app/(dashboard)/error.tsx`
- ✅ UX dégradée gracieusement

---

#### 🟠 PRIORITÉ 8 : Validation Workflow Statuts (2h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ `lib/utils/workflow-statuts.ts` (isTransitionValid / getAvailableStatuts / isTerminal)
- ✅ Validation dans `updateMarche()`, Select filtré dans `marche-form.tsx`

---

### 🎯 Jalon Sprint 1 — ✅ VALIDÉ

**Critères d'acceptation** :
- ✅ Alertes configurées (envoi manuel validé)
- ✅ Recherche opérationnelle sur 4 modules
- ✅ Pagination fonctionnelle (25 items/page)
- ✅ Upload 50 MB avec progress bar
- ✅ Récupération password testée
- ✅ Error boundaries déployées
- ✅ Validation workflow implémentée
- ✅ Build production réussi

---

## 🎨 Sprint 2 : Expérience Utilisateur (4 jours) — ⏳ En cours

**Objectif** : Améliorer l'expérience utilisateur et professionnaliser les exports

**Valeur livrée** : Exports PDF professionnels + Brouillons auto-save + Timeline visuelles

### Jour 4 : Exports PDF (Part 1)

#### 🟠 PRIORITÉ 9 : Fiche Marché PDF (4h)

**Tâches** :
- [ ] **4.1** Créer template PDF marché (2h)
  ```tsx
  // lib/pdf/templates/marche-template.tsx
  import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

  export const MarchePDFDocument = ({ marche }) => (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header avec logo */}
        {/* Informations marché */}
        {/* Section cautions */}
        {/* Section documents */}
        {/* Section véhicules */}
      </Page>
    </Document>
  )
  ```

- [ ] **4.2** Créer Server Action `generateMarchePDF()` (1h)
  - Récupération marché + relations (include)
  - Génération PDF via `pdf().toBuffer()`
  - Retour blob base64

- [ ] **4.3** Intégrer bouton sur `/marches/[id]` (30min)
  - Bouton "📄 Exporter en PDF"
  - Toast pendant génération
  - Téléchargement automatique

- [ ] **4.4** Tests génération (30min)
  - Marché avec 5+ cautions
  - Marché avec 10+ documents
  - Validation pagination PDF

**Délivrables** :
- ✅ Fiche marché PDF professionnelle
- ✅ Bouton export opérationnel

---

#### 🟠 PRIORITÉ 10 : Fiche Caution PDF (2h)

**Tâches** :
- [ ] **4.5** Template PDF caution compact (1h)
  - Format A4 portrait
  - Informations caution
  - Marché associé
  - Alerte échéance si < 30j

- [ ] **4.6** Server Action `generateCautionPDF()` (30min)
- [ ] **4.7** Bouton sur `/cautions/[id]` (30min)

**Délivrables** :
- ✅ Fiche caution PDF
- ✅ Export fonctionnel

---

#### 🧪 Tests E2E Exports PDF (2h)

**Tâches** :
- [ ] **4.8** Test E2E génération marché PDF (1h)
  ```typescript
  test('générer PDF marché', async ({ page }) => {
    await page.goto('/marches/[id]')
    const downloadPromise = page.waitForEvent('download')
    await page.click('text=Exporter en PDF')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('marche-')
  })
  ```

- [ ] **4.9** Test E2E génération caution PDF (1h)

**Délivrables** :
- ✅ Tests automatisés exports PDF

---

### Jour 5 : Exports (Part 2) + Excel Multi-Sheets

#### 🟠 PRIORITÉ 11 : Bon Livraison Véhicule PDF (2h)

**Tâches** :
- [ ] **5.1** Template bon de livraison (1h)
  - Format A4 paysage
  - Header entreprise
  - Informations véhicule
  - Dates livraison/réception
  - Réserves éventuelles
  - Zone signature

- [ ] **5.2** Server Action + Bouton (1h)

**Délivrables** :
- ✅ Bon de livraison PDF

---

#### 🟠 PRIORITÉ 12 : Rapport Global Excel Multi-Sheets (4h)

**Tâches** :
- [ ] **5.3** Créer Server Action `exportGlobalExcel()` (2h)
  ```typescript
  import ExcelJS from 'exceljs'

  const workbook = new ExcelJS.Workbook()

  // Sheet 1 : Marchés
  const sheetMarches = workbook.addWorksheet('Marchés')
  sheetMarches.columns = [
    { header: 'Numéro', key: 'numero', width: 15 },
    { header: 'Objet', key: 'objet', width: 40 },
    // ...
  ]
  sheetMarches.addRows(marches)

  // Sheet 2 : Cautions
  const sheetCautions = workbook.addWorksheet('Cautions')
  // ...

  // Sheet 3 : Véhicules
  const sheetVehicules = workbook.addWorksheet('Véhicules')
  // ...

  // Styling
  [sheetMarches, sheetCautions, sheetVehicules].forEach(sheet => {
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
  })

  return await workbook.xlsx.writeBuffer()
  ```

- [ ] **5.4** Ajouter bouton sur dashboard (1h)
  - Bouton "📊 Rapport Global Excel"
  - Position : En-tête dashboard
  - Toast pendant génération (peut prendre 5-10s)

- [ ] **5.5** Appliquer filtres actuels (1h)
  - Si utilisateur a filtré marchés EN_EXECUTION → export uniquement ceux-là
  - Respect filtres de chaque module

**Délivrables** :
- ✅ Export Excel avec 3 onglets
- ✅ Styling professionnel
- ✅ Filtres respectés

---

#### 🧪 Tests Exports (2h)

**Tâches** :
- [ ] **5.6** Test bon livraison PDF (30min)
- [ ] **5.7** Test rapport global Excel (1h)
  - Validation 3 sheets
  - Validation données complètes
  - Validation styling
- [ ] **5.8** Test performance (500 marchés) (30min)

**Délivrables** :
- ✅ Tests exports validés

---

### Jour 6 : Brouillons & Permissions

#### 🟠 PRIORITÉ 13 : Sauvegarde Brouillon LocalStorage (4h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ Hook `useDraftSave` (`hooks/use-draft-save.ts`) — auto-save 30s
- ✅ Intégré dans 4 formulaires (marché, caution, véhicule, document)
- ✅ Restauration fonctionnelle, effacement après soumission

---

#### 🟠 PRIORITÉ 14 : Permissions EXPLOITATION (2h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ `lib/utils/permissions.ts` (canWrite / isExploitation)
- ✅ Marchés filtrés EN_EXECUTION pour rôle EXPLOITATION
- ✅ Boutons créer/modifier/supprimer cachés sur 4 modules

---

#### 🔔 PRIORITÉ 15 : Configuration Notifications (2h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ `lib/utils/toast.ts` wrapper (success 3s / error 5s / warning Infinity / info 4s)
- ✅ 13 fichiers migrés (import depuis `@/lib/utils/toast`, PAS `sonner` directement)

---

### Jour 7 : Timeline & Polish

#### 🟡 PRIORITÉ 16 : Timeline Visuelles (4h)

**Tâches** :
- [ ] **7.1** Créer composant `<Timeline />` réutilisable (2h)
  ```tsx
  // components/ui/timeline.tsx
  interface TimelineItem {
    date: Date
    title: string
    description?: string
    icon?: React.ReactNode
    variant?: 'default' | 'success' | 'warning' | 'error'
  }

  export function Timeline({ items }: { items: TimelineItem[] }) {
    return (
      <div className="relative space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex gap-4">
            {/* Icône + ligne verticale */}
            {/* Contenu */}
          </div>
        ))}
      </div>
    )
  }
  ```

- [ ] **7.2** Timeline Marché (historique statuts) (1h)
  - Calculer depuis `updatedAt`
  - Afficher transitions statuts avec dates
  - Intégrer dans page détail marché

- [ ] **7.3** Timeline Véhicule (livraison → réception) (1h)
  - Dates : livraison, réception provisoire, définitive
  - Icônes : 🚚 📦 ✅
  - Intégrer dans page détail véhicule

**Délivrables** :
- ✅ Timeline réutilisable
- ✅ Timeline marché opérationnelle
- ✅ Timeline véhicule opérationnelle

---

#### 🟡 PRIORITÉ 17 : Skeleton Loaders (2h)

**Tâches** :
- [ ] **7.4** Créer composants skeleton (1h)
  ```tsx
  // components/ui/skeleton-table.tsx
  export function SkeletonTable({ rows = 5, cols = 6 }) {
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-8 flex-1" />
            ))}
          </div>
        ))}
      </div>
    )
  }
  ```

- [ ] **7.5** Intégrer skeletons (1h)
  - Dashboard : skeletons KPI pendant chargement stats
  - Listes : skeleton tableau pendant chargement

**Délivrables** :
- ✅ Skeletons partout
- ✅ Perception performance améliorée

---

#### 🧪 Tests Manuels Sprint 2 (2h avec utilisateur)

**Tâches** :
- [ ] **7.6** Session validation utilisateur (2h)
  - Test exports PDF (3 types)
  - Test export Excel multi-sheets
  - Test brouillon (interruption intentionnelle)
  - Test timeline visuelles
  - Test permissions EXPLOITATION
  - Feedback UX général

**Délivrables** :
- ✅ Validation utilisateur Sprint 2
- ✅ Liste bugs/ajustements identifiés

---

### 🎯 Jalon Sprint 2

**Date** : J+7
**Livrable** : **MVP+ avec UX professionnelle**

**Critères d'acceptation** :
- ✅ 3 types exports PDF fonctionnels (Marché, Caution, Véhicule)
- ✅ Rapport Excel multi-sheets opérationnel
- ✅ Brouillons auto-save validés ✅ déjà livré
- ✅ Timeline visuelles intégrées
- ✅ Permissions EXPLOITATION correctes ✅ déjà livré
- ✅ Skeleton loaders déployés
- ✅ Notifications configurées (durées) ✅ déjà livré
- ✅ Tests utilisateur réussis (score UX > 8/10)

**Session Validation** : **2h avec utilisateur**
- Démo exports (PDF + Excel)
- Test workflow complet avec brouillon
- Validation timeline (compréhension)
- Test permissions EXPLOITATION

---

## 🧪 Sprint 3 : Robustesse & Tests (3 jours) — ⏳ En cours

**Objectif** : Finaliser le polish UI/UX et implémenter une couverture de tests solide

**Valeur livrée** : Interface professionnelle + Tests E2E + Performance optimisée

### Jour 8 : UI/UX Polish

#### 🟡 PRIORITÉ 18 : Tri Colonnes Tableaux (3h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ Hook `useSortable` (`hooks/use-sortable.ts`)
- ✅ Composant `<SortableHeader />` (`components/shared/SortableHeader.tsx`)
- ✅ Intégré dans tableaux Marchés, Cautions, Véhicules

---

#### 🟡 PRIORITÉ 19 : Breadcrumb Systématique (2h)

**Tâches** :
- [ ] **8.4** Vérifier couverture `<BreadcrumbNav />` (composant existant depuis refonte) (30min)
  - Composant `components/shared/BreadcrumbNav` déjà créé
  - Vérifier intégration sur toutes les pages détail/édition

- [ ] **8.5** Compléter breadcrumb sur pages manquantes (1h30)
  - `/marches/[id]/edit` : Dashboard → Marchés → [Numéro] → Modifier
  - `/cautions/[id]`, `/cautions/[id]/edit`
  - `/vehicules/[id]`, `/vehicules/[id]/edit`
  - `/documents/[id]`

**Délivrables** :
- ✅ Breadcrumb partout
- ✅ Navigation améliorée

---

#### 🟡 PRIORITÉ 20 : Indicateur Rôle Utilisateur (1h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ Badge rôle dans sidebar + topbar (`components/layout/dashboard-shell.tsx`)
- ✅ Couleur par rôle (ADMIN red / AVANCE blue / EXPLOITATION green / VISITEUR gray)

---

#### 🟡 PRIORITÉ 21 : Profil Utilisateur (2h)

**Statut : ✅ TERMINÉ**

**Délivrables** :
- ✅ Page `/profil` (`app/(dashboard)/profil/page.tsx` + `ProfilClient.tsx`)
- ✅ Server Action `changePassword` (`lib/actions/auth/change-password.ts`)
- ✅ Lien sidebar dans dashboard-shell

---

### Jour 9 : Tests E2E Critiques

#### 🧪 PRIORITÉ 22 : Setup Playwright (1h)

**Tâches** :
- [ ] **9.1** Vérifier configuration `playwright.config.ts` (30min)
  ```typescript
  export default defineConfig({
    testDir: './tests/e2e',
    use: {
      baseURL: 'http://localhost:3000',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure'
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } }
    ]
  })
  ```

- [ ] **9.2** Exécuter les 30 tests E2E existants (`npm run test:exports`) (30min)

**Délivrables** :
- ✅ Playwright configuré
- ✅ Tests existants passants

---

#### 🧪 PRIORITÉ 23 : Tests Auth (1h)

**Tâches** :
- [ ] **9.3** Test login/logout (1h)
  ```typescript
  // tests/e2e/auth.spec.ts
  test('login avec ADMIN', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name=email]', 'admin@erp-marches.local')
    await page.fill('[name=password]', 'Admin123!')
    await page.click('button[type=submit]')
    await expect(page).toHaveURL('/dashboard')
  })
  ```

**Délivrables** :
- ✅ Tests auth passants

---

#### 🧪 PRIORITÉ 24 : Tests Marchés (2h)

**Tâches** :
- [ ] **9.4** Test création marché complet (1h)
  ```typescript
  test('créer marché avec workflow complet', async ({ page }) => {
    await page.goto('/marches/nouveau')
    await page.fill('[name=numero]', 'M-TEST-E2E-001')
    await page.fill('[name=objet]', 'Test E2E Marché')
    await page.selectOption('[name=type]', 'FOURNITURES')
    await page.click('button[type=submit]')
    await expect(page).toHaveURL(/\/marches\/[a-z0-9]+/)
    await expect(page.locator('h1')).toContainText('M-TEST-E2E-001')
  })
  ```

- [ ] **9.5** Test modification statut avec validation workflow (1h)

**Délivrables** :
- ✅ Tests CRUD marchés

---

#### 🧪 PRIORITÉ 25 : Tests Alertes (2h)

**Tâches** :
- [ ] **9.6** Test envoi manuel alertes (1h)
  ```typescript
  test('envoi manuel alertes', async ({ page }) => {
    await page.goto('/admin/alertes')
    await page.click('text=Envoyer alertes maintenant')
    await page.click('button:has-text("Confirmer")')
    await expect(page.locator('.sonner-toast')).toContainText('Alertes envoyées')
  })
  ```

- [ ] **9.7** Test email reçu via service SMTP test (1h)

**Délivrables** :
- ✅ Tests alertes validés

---

#### 🧪 PRIORITÉ 26 : Tests Exports (2h)

**Tâches** :
- [ ] **9.8** Test export Excel (1h)
  ```typescript
  test('export Excel marches', async ({ page }) => {
    await page.goto('/marches')
    const downloadPromise = page.waitForEvent('download')
    await page.click('text=Exporter en Excel')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/marches-.*\.xlsx/)
  })
  ```

- [ ] **9.9** Test export PDF marché (1h)

**Délivrables** :
- ✅ Tests exports validés

---

### Jour 10 : Tests Manuels Finaux & Corrections

#### 🎯 Session Tests Manuels Collaborative (3h avec utilisateur)

**Tâches** :
- [ ] **10.1** Exécution plan de test complet (2h)
  - Tester sur 3 résolutions (mobile, tablette, desktop)
  - Tester sur 2 navigateurs (Chrome, Safari)
  - Valider tous les workflows métier
  - Identifier bugs résiduels

- [ ] **10.2** Documentation bugs trouvés (1h)
  - Créer issues GitHub
  - Priorisation bugs (bloquants vs mineurs)

**Délivrables** :
- ✅ Plan test exécuté à 100%
- ✅ Issues créées pour bugs

---

#### 🐛 Corrections Bugs Trouvés (4h)

**Tâches** :
- [ ] **10.3** Correction bugs BLOQUANTS (3h)
- [ ] **10.4** Création backlog bugs MINEURS (1h)

**Délivrables** :
- ✅ Bugs bloquants corrigés
- ✅ Backlog organisé

---

#### ✅ Validation Finale (1h avec utilisateur)

**Tâches** :
- [ ] **10.5** Re-test fonctionnalités corrigées (30min)
- [ ] **10.6** Validation déploiement production (30min)

**Délivrables** :
- ✅ MVP+ validé en production
- ✅ Utilisateur satisfait (sign-off)

---

### 🎯 Jalon Sprint 3

**Date** : J+10
**Livrable** : **MVP+ Production-Ready**

**Critères d'acceptation** :
- ✅ UI cohérente et professionnelle (tri ✅, breadcrumb, profil ✅)
- ✅ Tests E2E critiques passants (> 70% couverture)
- ✅ Plan test manuel exécuté à 100%
- ✅ Bugs bloquants corrigés
- ✅ Score Lighthouse Performance > 90
- ✅ Score Lighthouse Accessibility > 90
- ✅ Documentation mise à jour
- ✅ Déploiement production validé

---

## 📅 Diagramme de Gantt

```
Jour   | Sprint 1 : Fondations      | Sprint 2 : Expérience      | Sprint 3 : Robustesse
-------|----------------------------|----------------------------|---------------------------
J1     | ✅ Alertes Auto            |                            |
       | ✅ Envoi Manuel            |                            |
       | ✅ Recherche               |                            |
-------|----------------------------|----------------------------|---------------------------
J2     | ✅ Pagination              |                            |
       | ✅ Upload 50MB             |                            |
-------|----------------------------|----------------------------|---------------------------
J3     | ✅ Récup Password          |                            |
       | ✅ Error Boundaries        |                            |
       | ✅ Workflow Statuts        |                            |
-------|----------------------------|----------------------------|---------------------------
       | 🎯 JALON 1 ✅              |                            |
-------|----------------------------|----------------------------|---------------------------
J4     |                            | ████████ Fiche Marché PDF  |
       |                            | ████ Fiche Caution PDF     |
       |                            | ████ Tests PDF             |
-------|----------------------------|----------------------------|---------------------------
J5     |                            | ████ Bon Livraison PDF     |
       |                            | ████████ Excel Multi-Sheets|
       |                            | ████ Tests Exports         |
-------|----------------------------|----------------------------|---------------------------
J6     |                            | ✅ Brouillons              |
       |                            | ✅ Permissions EXPLOIT     |
       |                            | ✅ Config Notifications    |
-------|----------------------------|----------------------------|---------------------------
J7     |                            | ████████ Timeline          |
       |                            | ████ Skeleton Loaders      |
       |                            | ████ Tests Manuels S2      |
-------|----------------------------|----------------------------|---------------------------
       |                            | 🎯 JALON 2                 |
-------|----------------------------|----------------------------|---------------------------
J8     |                            |                            | ✅ Tri Colonnes
       |                            |                            | ████ Breadcrumb
       |                            |                            | ✅ Badge Rôle
       |                            |                            | ✅ Profil User
-------|----------------------------|----------------------------|---------------------------
J9     |                            |                            | ██ Setup Playwright
       |                            |                            | ██ Tests Auth
       |                            |                            | ████ Tests Marchés
       |                            |                            | ████ Tests Alertes
       |                            |                            | ████ Tests Exports
-------|----------------------------|----------------------------|---------------------------
J10    |                            |                            | ██████ Tests Manuels
       |                            |                            | ████████ Corrections
       |                            |                            | ██ Validation Finale
-------|----------------------------|----------------------------|---------------------------
       |                            |                            | 🎯 JALON 3 - LIVRAISON
```

**Légende** :
- `█` = 1 heure de travail restant
- `✅` = livré
- `🎯` = Jalon avec validation utilisateur

---

## 🔗 Dépendances Critiques

### Dépendances Bloquantes

```
Exports PDF (J4-J5)
  ↓ (librairie commune)
Tests E2E Exports (J9)

─────────────────────────────

Breadcrumb (J8)
  → (composant BreadcrumbNav déjà existant depuis refonte — à étendre)

─────────────────────────────

Tri Colonnes ✅
Profil User ✅
Badge Rôle ✅
  → (UI polish terminés)
```

### Dépendances Optionnelles (Non-Bloquantes)

- Skeleton Loaders (J7) → Performance perçue (amélioration, pas critique)
- Timeline (J7) → UX améliorée (peut être livrée post-MVP+)

---

## 🚀 Plan de Déploiement

### Environnements

| Env | URL | Usage | Auto-Deploy |
|-----|-----|-------|-------------|
| **Local** | `http://localhost:3000` | Développement | Non |
| **Preview** | `https://erp-marches-stam-[hash].vercel.app` | Tests utilisateur | Oui (push feature branch) |
| **Production** | `https://erp-marches-stam.vercel.app` | Utilisateurs finaux | Oui (merge main) |

### Checklist Déploiement (par Sprint)

#### Avant Merge Production

- [ ] ✅ Build local réussi (`npm run build`)
- [ ] ✅ Tests E2E passants (si sprint 3)
- [ ] ✅ Tests manuels validés par utilisateur
- [ ] ✅ Variables d'environnement vérifiées
- [ ] ✅ Pas de `console.log` / `debugger`
- [ ] ✅ Documentation mise à jour

#### Après Merge Production

- [ ] ✅ Vérifier build Vercel réussi
- [ ] ✅ Smoke tests production (5 min)
  - Login ADMIN
  - Créer marché
  - Export Excel
  - Envoi manuel alertes
  - Export PDF (sprint 2)
- [ ] ✅ Monitoring erreurs (Vercel logs)

### Rollback Plan

**Si problème critique en production** :

1. **Détection** : Monitoring Vercel / Utilisateur reporte bug bloquant
2. **Décision** : Évaluation impact (< 5 min)
3. **Rollback** : Vercel Dashboard → Redéployer version précédente (< 2 min)
4. **Post-mortem** : Analyse cause + correctif + re-test

**Conditions Rollback** :
- ❌ Alertes ne s'envoient plus
- ❌ Impossible de créer/modifier marchés
- ❌ Exports plantent systématiquement
- ❌ Build Vercel échoue

---

## ⚠️ Gestion des Risques

### Risques Techniques

| # | Risque | Impact | Probabilité | Mitigation | Contingence |
|---|--------|--------|-------------|------------|-------------|
| **R1** | SMTP rate limits (alertes) | 🔴 Élevé | 🟠 Moyen | Tests emails réels + logs détaillés | Service SMTP alternatif (SendGrid) |
| **R2** | Upload 50MB timeout Vercel | ~~🔴 Élevé~~ | ~~🟡 Faible~~ | ✅ **Résolu** — upload direct Supabase | — |
| **R3** | Génération PDF lente (> 10s) | 🟠 Moyen | 🟡 Faible | Optimiser templates + cache | Progress indicator + async |
| **R4** | ExcelJS crash (1000+ lignes) | 🟠 Moyen | 🟡 Faible | Tests charge J5 | Pagination export (500 lignes max) |
| **R5** | LocalStorage plein (> 10MB) | ~~🟡 Faible~~ | ~~🟢 Très faible~~ | ✅ **Résolu** — 1 brouillon/formulaire + cleanup 7j | — |
| **R6** | Tests E2E instables (flaky) | 🟡 Faible | 🟠 Moyen | Retry logic + waits explicites | Tests manuels renforcés |
| **R7** | Lighthouse score < 90 | 🟡 Faible | 🟠 Moyen | Optimisations J8-J9 | Report optimisations post-MVP+ |

### Risques Projet

| # | Risque | Impact | Probabilité | Mitigation | Contingence |
|---|--------|--------|-------------|------------|-------------|
| **R8** | Indisponibilité utilisateur (tests) | 🟠 Moyen | 🟡 Faible | Planifier sessions à l'avance | Tests manuels autonomes |
| **R9** | Changement requirements mi-sprint | 🟠 Moyen | 🟠 Moyen | Validation specs avant J1 | Backlog ajustements post-sprint |
| **R10** | Bugs bloquants J10 (pas le temps) | 🔴 Élevé | 🟡 Faible | Tests continus J1-J9 | Livraison partielle (fonctionnalités OK uniquement) |
| **R11** | Surcharge effort (> 80h) | 🟠 Moyen | 🟠 Moyen | Estimations réalistes + buffer | Priorisation : Sprint 1 ✅ > Sprint 2 > Sprint 3 |

---

## ✅ Critères d'Acceptation

### Sprint 1 : Fondations Critiques — ✅ VALIDÉ

#### Alertes
- ✅ Envoi manuel via bouton ADMIN (`/admin/alertes`)
- ⚠️ Vercel Cron désactivé (Hobby plan) — à réactiver si upgrade

#### Recherche Textuelle
- ✅ Barre recherche sur 4 modules (Marchés, Cautions, Documents, Véhicules)
- ✅ Debounce 300ms + insensible casse/accents

#### Pagination
- ✅ 25 items/page sur toutes les listes

#### Upload Premium 50MB
- ✅ Upload direct client → Supabase Storage
- ✅ Progress bar + upload multiple (max 5)

#### Récupération Mot de Passe
- ✅ Workflow complet récupération password

#### Sécurité & Validation
- ✅ Error boundaries déployées
- ✅ Validation workflow statuts implémentée

---

### Sprint 2 : Expérience Utilisateur — ⏳ En cours

#### Exports PDF
- [ ] Fiche Marché PDF générée (toutes sections)
- [ ] Fiche Caution PDF générée (compact)
- [ ] Bon Livraison Véhicule PDF généré (format standard)
- [ ] Design professionnel (logo, styling, pagination)
- [ ] **Test acceptance** : PDF marché ouvert sans erreur, contenu complet

#### Rapport Excel Multi-Sheets
- [ ] 3 onglets (Marchés, Cautions, Véhicules)
- [ ] Styling header (bold, background)
- [ ] **Test acceptance** : Excel ouvert dans Excel/LibreOffice, 3 sheets visibles

#### Brouillons Auto-Save — ✅ Livré
- ✅ Auto-save LocalStorage toutes les 30s
- ✅ Message restauration au retour sur formulaire
- ✅ Effacement après soumission réussie

#### Permissions EXPLOITATION — ✅ Livré
- ✅ Filtrage marchés EN_EXECUTION uniquement
- ✅ Masquage boutons créer/modifier/supprimer

#### Timeline & Polish
- [ ] Timeline marché (historique statuts)
- [ ] Timeline véhicule (livraison → réception)
- [ ] Skeleton loaders (dashboard, listes)
- [ ] **Test acceptance** : Timeline affichée chronologiquement avec dates

---

### Sprint 3 : Robustesse & Tests — ⏳ En cours

#### UI/UX Polish
- ✅ Tri colonnes fonctionnel (asc/desc)
- [ ] Breadcrumb sur toutes les pages détail/édition
- ✅ Badge rôle affiché dans menu utilisateur
- ✅ Page profil avec changement mot de passe

#### Tests E2E
- [ ] Setup Playwright configuré (30 tests existants à exécuter)
- [ ] Tests auth (login/logout) passants
- [ ] Tests CRUD marchés passants
- [ ] Tests alertes (envoi manuel) passants
- [ ] Tests exports (Excel, PDF) passants

#### Performance & Accessibilité
- [ ] Score Lighthouse Performance > 90
- [ ] Score Lighthouse Accessibility > 90

---

## 📈 Suivi et Reporting

### Rapports de Jalon (Fin de Sprint)

**Format rapport** :

```markdown
# 🎯 Rapport Jalon Sprint X

**Date** : J+X
**Statut** : ✅ VALIDÉ / ⚠️ PARTIEL / ❌ BLOQUÉ

## Objectifs Atteints

| Objectif | Statut | Notes |
|----------|--------|-------|
| ... | ... | ... |

## KPIs Mesurés

| KPI | Cible | Réel | Statut |
|-----|-------|------|--------|
| ... | ... | ... | ... |

## Bugs Identifiés

| # | Description | Priorité | ETA |
|---|-------------|----------|-----|
| ... | ... | ... | ... |

## Conclusion
Sprint X ✅ RÉUSSI / ⚠️ PARTIEL. Prochaines étapes...
```

---

## 🎓 Bonnes Pratiques & Conventions

### Git Commits

**Format** : `<type>(<scope>): <description>`

**Types** :
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction bug
- `refactor` : Refactoring sans changement fonctionnel
- `test` : Ajout/modification tests
- `docs` : Documentation
- `chore` : Tâches maintenance (deps, config)

**Exemples** :
```bash
git commit -m "feat(pdf): add marche PDF export template"
git commit -m "feat(timeline): add vehicle delivery timeline component"
git commit -m "test(e2e): run existing Playwright exports tests suite"
```

---

### Code Style

- ✅ **TypeScript strict mode** : `strict: true`
- ✅ **Imports absolus** : `@/lib/...` (éviter `../../../`)
- ✅ **Toast** : TOUJOURS depuis `@/lib/utils/toast` (PAS `sonner` directement)
- ✅ **Prisma client** : import depuis `@/lib/db/prisma`
- ✅ **Nomenclature** :
  - Composants : PascalCase (`MarcheForm.tsx`)
  - Hooks : camelCase avec `use` (`useDraftSave.ts`)
  - Utils : camelCase (`formatDate.ts`)

---

### Testing

**Stratégie** :
- 🧪 **E2E (Playwright)** : Workflows critiques uniquement (Sprint 3)
- 🔧 **Manuels** : UX/UI + validation métier (Sprints 1-3)
- 📊 **Performance** : Lighthouse audits (Sprint 3)

---

## 🏁 Critères de Livraison Finale

### Checklist Acceptance Globale

- [x] ✅ **Sprint 1 complet** (13/13 tâches fondations)
- [ ] ✅ **Exports PDF/Excel** (Sprint 2 — en cours)
- [ ] ✅ **Timeline & Skeleton** (Sprint 2 — à faire)
- [ ] ✅ **Tests E2E critiques passants** (> 70% couverture)
- [ ] ✅ **Plan test manuel exécuté à 100%**
- [ ] ✅ **Score Lighthouse** Performance + Accessibility > 90
- [ ] ✅ **Validation utilisateur** : Score UX > 8/10
- [ ] ✅ **Déploiement production stable**

### Définition of Done (DoD) par Tâche

Une tâche est considérée **TERMINÉE** si :

1. ✅ Code écrit et testé localement
2. ✅ Build réussi (`npm run build`)
3. ✅ Commit avec message clair
4. ✅ Push sur main
5. ✅ Déploiement Vercel réussi
6. ✅ Tests manuels passants (si applicable)
7. ✅ Tests E2E passants (si Sprint 3)

---

## 📚 Annexes

### Annexe A : Glossaire

| Terme | Définition |
|-------|------------|
| **MVP** | Minimum Viable Product - Version minimale fonctionnelle |
| **MVP+** | MVP enrichi avec améliorations UX/UI |
| **E2E** | End-to-End - Tests automatisés complets |
| **RBAC** | Role-Based Access Control - Permissions par rôle |
| **SMTP** | Simple Mail Transfer Protocol - Envoi emails |
| **Jalon** | Milestone - Point de validation projet |
| **DoD** | Definition of Done - Critères de complétude |

### Annexe B : Références

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Playwright Documentation](https://playwright.dev)
- [@react-pdf/renderer Documentation](https://react-pdf.org)
- [ExcelJS Documentation](https://github.com/exceljs/exceljs)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [shadcn/ui Components](https://ui.shadcn.com)

---

## 🎯 Conclusion

Cette roadmap garantit :

1. ✅ **Sprint 1 livré** : Alertes, Recherche, Pagination, Upload, Auth, Error Boundaries, Workflow
2. ⏳ **Sprint 2 en cours** : Exports PDF/Excel (principal) + Timeline + Skeleton
3. ⏳ **Sprint 3 à démarrer** : Tests E2E, Breadcrumb, Performance

**Priorité suivante** : P9 — Fiche Marché PDF

---

**Document vivant** - Mise à jour au fur et à mesure de l'avancement.

**Version** : 2.0
**Dernière modification** : 2026-02-21

---

**🚀 Sprint 2 en cours — prochain livrable : Exports PDF**
