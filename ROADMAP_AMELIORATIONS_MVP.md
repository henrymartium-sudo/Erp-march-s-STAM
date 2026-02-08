# 🗺️ Roadmap Professionnelle - Améliorations MVP ERP Marchés STAM

**Version** : 1.0
**Date de création** : 2026-02-08
**Durée estimée** : 10 jours ouvrés
**Effort total** : 80 heures
**Date de début prévue** : À définir
**Date de livraison cible** : J+10

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

| Catégorie | Nombre | Priorité |
|-----------|--------|----------|
| **Fonctionnalités Critiques** | 8 | 🔴 HAUTE |
| **Améliorations UX/UI** | 10 | 🟠 MOYENNE |
| **Robustesse Technique** | 8 | 🟡 BASSE |

### Valeur Métier

1. **Automatisation alertes** → Réduction risque dépassement échéances (ROI immédiat)
2. **Recherche textuelle** → Gain productivité 30% (temps de navigation réduit)
3. **Exports PDF** → Professionnalisation communication externe
4. **Upload 50MB** → Support documents haute qualité (plans, scans HD)
5. **Sauvegarde brouillon** → Zéro perte de données (satisfaction utilisateur +40%)

### Stratégie de Livraison

- ✅ **Livraison incrémentale** : Valeur à chaque sprint
- ✅ **Testing collaboratif** : Validation utilisateur à chaque jalon
- ✅ **Déploiement progressif** : Preview → Staging → Production
- ✅ **Rollback garanti** : Chaque sprint peut être annulé indépendamment

---

## 📊 Objectifs et KPIs

### Objectifs Stratégiques

| # | Objectif | Métrique | Cible | Actuel |
|---|----------|----------|-------|--------|
| **O1** | Automatiser la surveillance des échéances | Alertes envoyées automatiquement | 100% | 0% |
| **O2** | Réduire le temps de recherche d'information | Temps moyen de recherche | < 10s | ~2 min |
| **O3** | Éliminer les pertes de données de saisie | Incidents perte données/mois | 0 | ~3-5 |
| **O4** | Professionnaliser les exports | Documents PDF générés/mois | > 50 | 0 |
| **O5** | Améliorer la performance perçue | Score Lighthouse Performance | > 90 | ~75 |
| **O6** | Renforcer la sécurité utilisateur | Récupérations mot de passe/mois | Support | Manuel |

### KPIs de Succès

#### Sprint 1 (Fondations)

| KPI | Cible | Mesure |
|-----|-------|--------|
| Alertes envoyées avec succès | 100% | Logs SMTP |
| Recherche fonctionnelle sur 4 modules | 100% | Tests E2E |
| Upload 50MB réussi | > 95% | Tests uploads |
| Récupérations mot de passe réussies | 100% | Tests emails |
| Build sans erreurs | 100% | CI/CD |

#### Sprint 2 (Expérience)

| KPI | Cible | Mesure |
|-----|-------|--------|
| Exports PDF générés sans erreur | > 98% | Tests génération |
| Brouillons restaurés avec succès | 100% | Tests LocalStorage |
| Timeline affichées correctement | 100% | Tests visuels |
| Permissions EXPLOITATION validées | 100% | Tests RBAC |
| Score UX utilisateur | > 8/10 | Feedback tests |

#### Sprint 3 (Robustesse)

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

## 🚀 Sprint 1 : Fondations Critiques (3 jours)

**Objectif** : Implémenter les fonctionnalités critiques bloquantes pour l'usage métier quotidien

**Valeur livrée** : Automatisation alertes + Recherche opérationnelle + Sécurité renforcée

### Jour 1 : Alertes & Recherche

#### 🔴 PRIORITÉ 1 : Alertes Automatiques (6h)

**Tâches** :
- [ ] **1.1** Créer route API `/api/cron/alertes` (2h)
  - Validation CRON_SECRET
  - Gestion erreurs et timeouts
  - Logging structured (Winston)

- [ ] **1.2** Implémenter logique détection échéances (2h)
  ```typescript
  // Détection :
  // - Cautions < 7j (CRITIQUE)
  // - Cautions < 30j (ATTENTION)
  // - Marchés fin < 60j (INFO)
  ```

- [ ] **1.3** Créer templates email HTML (1h)
  - Header professionnel avec logo
  - Sections par niveau d'alerte
  - Liens directs vers entités
  - Footer contact

- [ ] **1.4** Intégrer Nodemailer et tester envoi (1h)
  - Configuration SMTP
  - Tests emails réels
  - Gestion erreurs SMTP (retry logic)

- [ ] **1.5** Configurer Vercel Cron Job (30min)
  ```json
  // vercel.json
  {
    "crons": [{
      "path": "/api/cron/alertes",
      "schedule": "0 7 * * 1"  // Lundis 7h
    }]
  }
  ```

**Délivrables** :
- ✅ Emails alertes envoyés automatiquement chaque lundi
- ✅ Logs SMTP structurés
- ✅ Documentation configuration

---

#### 🔴 PRIORITÉ 2 : Envoi Manuel Alertes (2h)

**Tâches** :
- [ ] **1.6** Ajouter bouton "📧 Envoyer alertes maintenant" dans `/admin/alertes` (1h)
  - Server Action `sendAlertsManually()`
  - Confirmation utilisateur (AlertDialog)
  - Toast succès/erreur avec détails

- [ ] **1.7** Réutiliser logique route Cron (30min)
  - Fonction commune `generateAndSendAlerts()`
  - Partagée entre Cron et manuel

- [ ] **1.8** Tester envoi manuel (30min)
  - Validation email reçu
  - Validation logs

**Délivrables** :
- ✅ ADMIN peut déclencher envoi à la demande
- ✅ Feedback utilisateur immédiat

---

#### 🟠 PRIORITÉ 3 : Recherche Textuelle (2h)

**Tâches** :
- [ ] **1.9** Créer composant `<SearchBar />` réutilisable (30min)
  - Input avec icône recherche
  - Debounce 300ms (hook `useDebounce`)
  - Clear button

- [ ] **1.10** Implémenter recherche Marchés (30min)
  ```typescript
  // Prisma query
  where: {
    OR: [
      { numero: { contains: query, mode: 'insensitive' } },
      { objet: { contains: query, mode: 'insensitive' } },
      { autoriteContractanteNom: { contains: query, mode: 'insensitive' } }
    ]
  }
  ```

- [ ] **1.11** Implémenter recherche Cautions (20min)
- [ ] **1.12** Implémenter recherche Documents (20min)
- [ ] **1.13** Implémenter recherche Véhicules (20min)

**Délivrables** :
- ✅ Barre recherche opérationnelle sur 4 modules
- ✅ Résultats instantanés (< 500ms)

---

### Jour 2 : Pagination & Upload Premium

#### 🟠 PRIORITÉ 4 : Pagination (3h)

**Tâches** :
- [ ] **2.1** Installer composant Pagination shadcn/ui (15min)
  ```bash
  npx shadcn-ui@latest add pagination
  ```

- [ ] **2.2** Créer helper `usePagination` (1h)
  ```typescript
  const { items, page, totalPages, goToPage } = usePagination({
    data: allMarches,
    pageSize: 25
  })
  ```

- [ ] **2.3** Intégrer pagination Marchés (30min)
  - URL params `?page=2`
  - Indicateur "1-25 sur 243 résultats"
  - Navigation clavier (flèches)

- [ ] **2.4** Intégrer pagination Cautions (30min)
- [ ] **2.5** Intégrer pagination Documents (30min)
- [ ] **2.6** Intégrer pagination Véhicules (30min)

**Délivrables** :
- ✅ Pagination sur toutes les listes
- ✅ Performance optimisée (25 items/page)

---

#### 🔴 PRIORITÉ 5 : Upload Premium 50MB (5h)

**Tâches** :
- [ ] **2.7** Implémenter upload direct client → Supabase (2h)
  ```typescript
  // Contourne limite Vercel 4.5 MB
  // Upload direct navigateur → Supabase Storage
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, {
      onUploadProgress: (progress) => {
        setProgress((progress.loaded / progress.total) * 100)
      }
    })
  ```

- [ ] **2.8** Créer composant `<UploadZone />` avec progress bar (2h)
  - Progress bar linéaire par fichier
  - Pourcentage affiché
  - Bouton annuler upload
  - Support drag & drop (react-dropzone)

- [ ] **2.9** Validation côté client (30min)
  - Taille max 50 MB
  - Types MIME autorisés (PDF, images, Office)
  - Messages erreur clairs

- [ ] **2.10** Upload multiple (max 5 fichiers) (30min)
  - Sélection multiple `<input multiple />`
  - Upload séquentiel avec progress global
  - Toast récapitulatif "3/5 fichiers uploadés"

**Délivrables** :
- ✅ Upload 50 MB fonctionnel
- ✅ Progress bar visuelle
- ✅ Upload multiple (5 fichiers max)

---

### Jour 3 : Sécurité & Validation Workflow

#### 🔴 PRIORITÉ 6 : Récupération Mot de Passe (4h)

**Tâches** :
- [ ] **3.1** Créer modèle Prisma `PasswordReset` (30min)
  ```prisma
  model PasswordReset {
    id        String   @id @default(cuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id])
    token     String   @unique
    expiresAt DateTime
    createdAt DateTime @default(now())
    @@index([token])
  }
  ```

- [ ] **3.2** Page `/forgot-password` (1h)
  - Formulaire email
  - Validation Zod
  - Rate limiting (max 3 demandes/heure)

- [ ] **3.3** Server Action `requestPasswordReset()` (1h)
  - Génération token crypto-safe (32 bytes)
  - Expiration 1h
  - Envoi email avec lien

- [ ] **3.4** Page `/reset-password?token=xxx` (1h)
  - Validation token (exists + non expiré)
  - Formulaire nouveau password
  - Update password + suppression token

- [ ] **3.5** Tests récupération complète (30min)

**Délivrables** :
- ✅ Workflow complet récupération password
- ✅ Sécurité renforcée (token, expiration, rate limit)

---

#### 🔴 PRIORITÉ 7 : Error Boundaries (2h)

**Tâches** :
- [ ] **3.6** Créer `app/error.tsx` (1h)
  ```tsx
  'use client'
  export default function Error({ error, reset }) {
    // Logging Sentry (optionnel)
    // UI erreur user-friendly
    // Bouton "Réessayer"
  }
  ```

- [ ] **3.7** Créer `app/global-error.tsx` (30min)
  - Fallback erreur critique

- [ ] **3.8** Tester erreurs (30min)
  - Simuler erreurs serveur
  - Simuler erreurs client
  - Valider UI + reset

**Délivrables** :
- ✅ Gestion erreurs robuste
- ✅ UX dégradée gracieusement

---

#### 🟠 PRIORITÉ 8 : Validation Workflow Statuts (2h)

**Tâches** :
- [ ] **3.9** Créer fonction `isTransitionValid()` (1h)
  ```typescript
  // lib/utils/marche-workflow.ts
  export function isTransitionValid(
    currentStatus: StatutMarche,
    newStatus: StatutMarche,
    userRole: UserRole
  ): { valid: boolean; reason?: string } {
    // Logique validation partielle
    // ADMIN peut tout forcer
  }
  ```

- [ ] **3.10** Intégrer validation dans Server Action `updateMarche()` (30min)
  - Vérification avant update
  - Message erreur clair si refusé

- [ ] **3.11** Modal confirmation pour ADMIN (30min)
  - "⚠️ Cette transition est inhabituelle. Confirmer ?"

**Délivrables** :
- ✅ Workflow respecté (validation partielle)
- ✅ Protection contre erreurs de saisie

---

### 🎯 Jalon Sprint 1

**Date** : J+3
**Livrable** : **MVP+ avec fonctionnalités critiques**

**Critères d'acceptation** :
- ✅ Alertes automatiques configurées (Vercel Cron)
- ✅ Email test reçu (envoi manuel validé)
- ✅ Recherche opérationnelle sur 4 modules
- ✅ Pagination fonctionnelle (25 items/page)
- ✅ Upload 50 MB avec progress bar
- ✅ Récupération password testée
- ✅ Error boundaries déployées
- ✅ Validation workflow implémentée
- ✅ Build production réussi
- ✅ Déploiement preview Vercel actif

**Session Validation** : **1h avec utilisateur**
- Démo alertes automatiques
- Test recherche en temps réel
- Test upload gros fichier (40 MB)
- Test récupération password
- Validation UX générale

---

## 🎨 Sprint 2 : Expérience Utilisateur (4 jours)

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

**Tâches** :
- [ ] **6.1** Créer hook `useDraftSave()` (2h)
  ```typescript
  // hooks/use-draft-save.ts
  export function useDraftSave<T>(
    formKey: string,
    formData: T,
    enabled = true
  ) {
    useEffect(() => {
      if (!enabled) return

      const timer = setTimeout(() => {
        localStorage.setItem(
          `draft:${formKey}`,
          JSON.stringify({
            data: formData,
            timestamp: Date.now()
          })
        )
      }, 30000) // Auto-save après 30s

      return () => clearTimeout(timer)
    }, [formData, formKey, enabled])

    // Fonction de restauration
    const restoreDraft = () => {
      const saved = localStorage.getItem(`draft:${formKey}`)
      if (!saved) return null

      const { data, timestamp } = JSON.parse(saved)
      const age = Date.now() - timestamp

      // Ignorer brouillons > 7 jours
      if (age > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`draft:${formKey}`)
        return null
      }

      return data
    }

    return { restoreDraft }
  }
  ```

- [ ] **6.2** Intégrer dans formulaire Marché (1h)
  - Auto-save activé pendant saisie
  - Message au retour : "💾 Brouillon trouvé (5 min). Restaurer ?"
  - Effacement après soumission réussie

- [ ] **6.3** Intégrer dans formulaires Caution et Véhicule (1h)

**Délivrables** :
- ✅ Auto-save opérationnel
- ✅ Restauration fonctionnelle
- ✅ UX claire (message restauration)

---

#### 🟠 PRIORITÉ 14 : Permissions EXPLOITATION (2h)

**Tâches** :
- [ ] **6.4** Créer helper `filterMarchesByRole()` (1h)
  ```typescript
  // lib/utils/permissions.ts
  export function filterMarchesByRole(
    marches: Marche[],
    userRole: UserRole
  ): Marche[] {
    if (userRole === 'EXPLOITATION') {
      return marches.filter(m =>
        ['EN_EXECUTION', 'EN_ATTENTE_LIVRAISON_OS', 'EXECUTE_ATTENTE_GARANTIES'].includes(m.statut)
      )
    }
    return marches // ADMIN, AVANCE, VISITEUR voient tout
  }
  ```

- [ ] **6.5** Intégrer filtrage dans `getAllMarches()` (30min)
- [ ] **6.6** Hiding UI pour EXPLOITATION (30min)
  - Masquer boutons "Créer", "Modifier", "Supprimer"
  - Afficher indicateur "Mode lecture seule"

**Délivrables** :
- ✅ Permissions EXPLOITATION correctes
- ✅ Tests RBAC validés

---

#### 🔔 PRIORITÉ 15 : Configuration Notifications (2h)

**Tâches** :
- [ ] **6.7** Configurer durées Sonner (1h)
  ```typescript
  // lib/utils/toast.ts
  export const toast = {
    success: (msg: string) => sonner.success(msg, { duration: 3000 }),
    error: (msg: string) => sonner.error(msg, { duration: 5000 }),
    warning: (msg: string) => sonner.warning(msg, { duration: Infinity }),
    promise: (promise: Promise<any>, msgs: {...}) => sonner.promise(promise, msgs)
  }
  ```

- [ ] **6.8** Remplacer tous les appels `toast()` (1h)
  - Rechercher dans codebase
  - Remplacer par helpers personnalisés

**Délivrables** :
- ✅ Notifications configurées selon specs
- ✅ Warnings persistants

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
  - Créer table `MarcheHistorique` (optionnel)
  - Ou calculer depuis `updatedAt` (simple)
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

  // components/ui/skeleton-kpi.tsx
  export function SkeletonKPI() {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-1/3" />
        </CardContent>
      </Card>
    )
  }
  ```

- [ ] **7.5** Intégrer skeletons (1h)
  - Dashboard : `<SkeletonKPI />` pendant chargement stats
  - Listes : `<SkeletonTable />` pendant chargement
  - Formulaires : `<Skeleton />` pour champs

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
- ✅ Brouillons auto-save validés
- ✅ Timeline visuelles intégrées
- ✅ Permissions EXPLOITATION correctes
- ✅ Skeleton loaders déployés
- ✅ Notifications configurées (durées)
- ✅ Tests utilisateur réussis (score UX > 8/10)

**Session Validation** : **2h avec utilisateur**
- Démo exports (PDF + Excel)
- Test workflow complet avec brouillon
- Validation timeline (compréhension)
- Test permissions EXPLOITATION

---

## 🧪 Sprint 3 : Robustesse & Tests (3 jours)

**Objectif** : Finaliser le polish UI/UX et implémenter une couverture de tests solide

**Valeur livrée** : Interface professionnelle + Tests E2E + Performance optimisée

### Jour 8 : UI/UX Polish

#### 🟡 PRIORITÉ 18 : Tri Colonnes Tableaux (3h)

**Tâches** :
- [ ] **8.1** Créer hook `useSortable()` (1h)
  ```typescript
  // hooks/use-sortable.ts
  export function useSortable<T>(
    data: T[],
    initialSort?: { key: keyof T; direction: 'asc' | 'desc' }
  ) {
    const [sortConfig, setSortConfig] = useState(initialSort)

    const sortedData = useMemo(() => {
      if (!sortConfig) return data

      return [...data].sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }, [data, sortConfig])

    return { sortedData, sortConfig, setSortConfig }
  }
  ```

- [ ] **8.2** Créer composant `<SortableHeader />` (1h)
  - Flèche ↑↓ indicatrice
  - Toggle asc/desc au clic

- [ ] **8.3** Intégrer dans tableaux Marchés, Cautions, Véhicules (1h)

**Délivrables** :
- ✅ Tri colonnes opérationnel
- ✅ Indicateurs visuels clairs

---

#### 🟡 PRIORITÉ 19 : Breadcrumb Systématique (2h)

**Tâches** :
- [ ] **8.4** Créer composant `<Breadcrumb />` réutilisable (1h)
  ```tsx
  // components/ui/breadcrumb.tsx
  interface BreadcrumbItem {
    label: string
    href?: string
  }

  export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
    return (
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="h-4 w-4" />}
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
    )
  }
  ```

- [ ] **8.5** Intégrer breadcrumb sur toutes les pages détail/édition (1h)
  - `/marches/[id]` : Dashboard → Marchés → [Numéro]
  - `/marches/[id]/edit` : Dashboard → Marchés → [Numéro] → Modifier
  - Idem pour cautions, documents, véhicules

**Délivrables** :
- ✅ Breadcrumb partout
- ✅ Navigation améliorée

---

#### 🟡 PRIORITÉ 20 : Indicateur Rôle Utilisateur (1h)

**Tâches** :
- [ ] **8.6** Ajouter badge rôle dans menu utilisateur (1h)
  - Badge couleur par rôle :
    - ADMIN : red
    - AVANCE : blue
    - EXPLOITATION : green
    - VISITEUR : gray
  - Position : Sous le nom utilisateur

**Délivrables** :
- ✅ Badge rôle visible
- ✅ Utilisateur identifie son niveau d'accès

---

#### 🟡 PRIORITÉ 21 : Profil Utilisateur (2h)

**Tâches** :
- [ ] **8.7** Créer page `/profil` (1h)
  - Affichage infos utilisateur (nom, email, rôle)
  - Section "Changer mot de passe"
  - Formulaire mot de passe actuel + nouveau + confirmation

- [ ] **8.8** Server Action `changePassword()` (1h)
  - Validation mot de passe actuel (bcrypt)
  - Validation nouveau (min 8 chars, etc.)
  - Update password hashé
  - Toast succès

**Délivrables** :
- ✅ Page profil fonctionnelle
- ✅ Changement password opérationnel

---

### Jour 9 : Tests E2E Critiques

#### 🧪 PRIORITÉ 22 : Setup Playwright (1h)

**Tâches** :
- [ ] **9.1** Installer Playwright (30min)
  ```bash
  npm install -D @playwright/test
  npx playwright install
  ```

- [ ] **9.2** Configuration `playwright.config.ts` (30min)
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

**Délivrables** :
- ✅ Playwright configuré
- ✅ CI prêt (optionnel)

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

  test('logout', async ({ page }) => {
    // Login first
    await page.goto('/dashboard')
    await page.click('[data-testid=user-menu]')
    await page.click('text=Déconnexion')
    await expect(page).toHaveURL('/login')
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

    // Remplir formulaire
    await page.fill('[name=numero]', 'M-TEST-E2E-001')
    await page.fill('[name=objet]', 'Test E2E Marché')
    await page.selectOption('[name=type]', 'FOURNITURES')
    // ... autres champs

    await page.click('button[type=submit]')

    // Validation
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

    // Confirmation
    await page.click('button:has-text("Confirmer")')

    // Attendre toast
    await expect(page.locator('.sonner-toast')).toContainText('Alertes envoyées')
  })
  ```

- [ ] **9.7** Test email reçu (1h)
  - Intégration Mailhog ou service test SMTP
  - Validation email HTML reçu

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

    // Optionnel : Valider contenu avec ExcelJS
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
  - Suivre `PLAN_TEST_MVP.md`
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
  - Prioriser bugs critiques
  - Fix + tests
  - Re-déploiement

- [ ] **10.4** Création backlog bugs MINEURS (1h)
  - Issues étiquetées "enhancement"
  - Planification post-MVP+

**Délivrables** :
- ✅ Bugs bloquants corrigés
- ✅ Backlog organisé

---

#### ✅ Validation Finale (1h avec utilisateur)

**Tâches** :
- [ ] **10.5** Re-test fonctionnalités corrigées (30min)
- [ ] **10.6** Validation déploiement production (30min)
  - Smoke tests production
  - Validation URLs
  - Validation emails alertes

**Délivrables** :
- ✅ MVP+ validé en production
- ✅ Utilisateur satisfait (sign-off)

---

### 🎯 Jalon Sprint 3

**Date** : J+10
**Livrable** : **MVP+ Production-Ready**

**Critères d'acceptation** :
- ✅ UI cohérente et professionnelle (tri, breadcrumb, profil)
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
J1     | ████ Alertes Auto          |                            |
       | ████ Envoi Manuel          |                            |
       | ████ Recherche             |                            |
-------|----------------------------|----------------------------|---------------------------
J2     | ████ Pagination            |                            |
       | ██████ Upload 50MB         |                            |
-------|----------------------------|----------------------------|---------------------------
J3     | ████████ Récup Password    |                            |
       | ████ Error Boundaries      |                            |
       | ████ Workflow Statuts      |                            |
-------|----------------------------|----------------------------|---------------------------
       | 🎯 JALON 1                 |                            |
-------|----------------------------|----------------------------|---------------------------
J4     |                            | ████████ Fiche Marché PDF  |
       |                            | ████ Fiche Caution PDF     |
       |                            | ████ Tests PDF             |
-------|----------------------------|----------------------------|---------------------------
J5     |                            | ████ Bon Livraison PDF     |
       |                            | ████████ Excel Multi-Sheets|
       |                            | ████ Tests Exports         |
-------|----------------------------|----------------------------|---------------------------
J6     |                            | ████████ Brouillons        |
       |                            | ████ Permissions EXPLOIT   |
       |                            | ████ Config Notifications  |
-------|----------------------------|----------------------------|---------------------------
J7     |                            | ████████ Timeline          |
       |                            | ████ Skeleton Loaders      |
       |                            | ████ Tests Manuels S2      |
-------|----------------------------|----------------------------|---------------------------
       |                            | 🎯 JALON 2                 |
-------|----------------------------|----------------------------|---------------------------
J8     |                            |                            | ██████ Tri Colonnes
       |                            |                            | ████ Breadcrumb
       |                            |                            | ██ Badge Rôle
       |                            |                            | ████ Profil User
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
- `█` = 1 heure de travail
- `🎯` = Jalon avec validation utilisateur

---

## 🔗 Dépendances Critiques

### Dépendances Bloquantes

```
Alertes Automatiques (J1)
  ↓ (doit être testé avant)
Envoi Manuel Alertes (J1)
  ↓ (même logique)
Tests E2E Alertes (J9)

─────────────────────────────

Upload Premium 50MB (J2)
  ↓ (composant réutilisé)
Upload Multiple Fichiers (inclus)

─────────────────────────────

Recherche Textuelle (J1)
  → (indépendant)
Pagination (J2)
  → (peuvent être développés en parallèle)

─────────────────────────────

Exports PDF (J4-J5)
  ↓ (librairie commune)
Tests E2E Exports (J9)

─────────────────────────────

Brouillons LocalStorage (J6)
  ↓ (feature indépendante)
Tests Manuels Sprint 2 (J7)

─────────────────────────────

Tri Colonnes (J8)
Breadcrumb (J8)
Profil User (J8)
  → (UI polish indépendants)
```

### Dépendances Optionnelles (Non-Bloquantes)

- Skeleton Loaders (J7) → Performance perçue (amélioration, pas critique)
- Timeline (J7) → UX améliorée (peut être livrée post-MVP+)
- Tri Colonnes (J8) → Confort utilisateur (nice-to-have)

---

## 🚀 Plan de Déploiement

### Stratégie Git Flow

```
main (production)
  ↑
  └─ feat/ameliorations-mvp (branche feature)
       ├─ feat/sprint-1-fondations (optionnel)
       ├─ feat/sprint-2-experience (optionnel)
       └─ feat/sprint-3-robustesse (optionnel)
```

**Workflow** :
1. Créer branche `feat/ameliorations-mvp` depuis `main`
2. Développer + commiter régulièrement
3. À chaque jalon (fin de sprint) :
   - Merge `feat/ameliorations-mvp` → `main`
   - Autodeploy Vercel → Production
   - Tag Git : `v1.1.0-sprint-1`, `v1.2.0-sprint-2`, `v1.3.0-sprint-3`

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
- [ ] ✅ Changelog rédigé

#### Après Merge Production

- [ ] ✅ Vérifier build Vercel réussi
- [ ] ✅ Smoke tests production (5 min)
  - Login ADMIN
  - Créer marché
  - Export Excel
  - Envoi manuel alertes (sprint 1)
  - Export PDF (sprint 2)
- [ ] ✅ Monitoring erreurs (Vercel logs)
- [ ] ✅ Notification équipe (Slack/email)

### Rollback Plan

**Si problème critique en production** :

1. **Détection** : Monitoring Vercel / Utilisateur reporte bug bloquant
2. **Décision** : Évaluation impact (< 5 min)
3. **Rollback** : Vercel Dashboard → Redéployer version précédente (< 2 min)
4. **Communication** : Notification utilisateurs
5. **Post-mortem** : Analyse cause + correctif + re-test

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
| **R1** | SMTP rate limits (alertes) | 🔴 Élevé | 🟠 Moyen | Tests emails réels dès J1 + logs détaillés | Service SMTP alternatif (SendGrid) |
| **R2** | Upload 50MB timeout Vercel | 🔴 Élevé | 🟡 Faible | Upload direct Supabase (contourne Vercel) | Réduire limite à 25 MB |
| **R3** | Génération PDF lente (> 10s) | 🟠 Moyen | 🟡 Faible | Optimiser templates + cache | Progress indicator + async |
| **R4** | ExcelJS crash (1000+ lignes) | 🟠 Moyen | 🟡 Faible | Tests charge J5 | Pagination export (500 lignes max) |
| **R5** | LocalStorage plein (> 10MB) | 🟡 Faible | 🟢 Très faible | Limite 1 brouillon/formulaire + cleanup 7j | Fallback : désactiver auto-save |
| **R6** | Tests E2E instables (flaky) | 🟡 Faible | 🟠 Moyen | Retry logic + waits explicites | Tests manuels renforcés |
| **R7** | Lighthouse score < 90 | 🟡 Faible | 🟠 Moyen | Optimisations J8-J9 | Report optimisations post-MVP+ |

### Risques Projet

| # | Risque | Impact | Probabilité | Mitigation | Contingence |
|---|--------|--------|-------------|------------|-------------|
| **R8** | Indisponibilité utilisateur (tests) | 🟠 Moyen | 🟡 Faible | Planifier sessions à l'avance | Tests manuels autonomes |
| **R9** | Changement requirements mi-sprint | 🟠 Moyen | 🟠 Moyen | Validation specs avant J1 | Backlog ajustements post-sprint |
| **R10** | Bugs bloquants J10 (pas le temps) | 🔴 Élevé | 🟡 Faible | Tests continus J1-J9 | Livraison partielle (fonctionnalités OK uniquement) |
| **R11** | Surcharge effort (> 80h) | 🟠 Moyen | 🟠 Moyen | Estimations réalistes + buffer | Priorisation : Sprint 1 > 2 > 3 |

### Plan de Monitoring

**Pendant Développement** :
- Commits quotidiens avec messages clairs
- Build local avant chaque push
- Preview Vercel sur feature branch (validation visuelle)

**Pendant Tests** :
- Logs Vercel (erreurs runtime)
- Network tab (performance)
- Console browser (erreurs client)

**Post-Production** :
- Vercel Analytics (traffic, erreurs)
- Logs SMTP (taux envoi alertes)
- Feedback utilisateur (Google Form ?)

---

## ✅ Critères d'Acceptation

### Sprint 1 : Fondations Critiques

#### Alertes Automatiques
- [ ] Route API `/api/cron/alertes` créée et sécurisée (CRON_SECRET)
- [ ] Vercel Cron configuré (lundis 7h)
- [ ] Email HTML professionnel (logo, sections, liens)
- [ ] Détection échéances fonctionnelle (< 7j, < 30j, < 60j)
- [ ] Logs SMTP complets (success/error)
- [ ] Envoi manuel via bouton ADMIN
- [ ] **Test acceptance** : Email reçu dans boîte destinataire test

#### Recherche Textuelle
- [ ] Barre recherche sur 4 modules (Marchés, Cautions, Documents, Véhicules)
- [ ] Debounce 300ms implémenté
- [ ] Recherche insensible casse et accents
- [ ] Résultats affichés < 500ms
- [ ] **Test acceptance** : Recherche "Ministère" retourne marchés correspondants

#### Pagination
- [ ] 25 items/page sur toutes les listes
- [ ] Navigation première/précédent/suivant/dernière
- [ ] Indicateur "Affichage X-Y sur Z résultats"
- [ ] URL params `?page=2` fonctionnels
- [ ] **Test acceptance** : Liste 100 marchés paginée correctement

#### Upload Premium 50MB
- [ ] Upload direct client → Supabase Storage
- [ ] Progress bar visuelle (pourcentage)
- [ ] Support upload multiple (max 5)
- [ ] Validation taille (50 MB) et types (PDF, images, Office)
- [ ] **Test acceptance** : Upload fichier 45 MB réussi avec progress

#### Récupération Mot de Passe
- [ ] Page `/forgot-password` fonctionnelle
- [ ] Email reset envoyé avec token
- [ ] Page `/reset-password?token=xxx` sécurisée
- [ ] Token expire après 1h
- [ ] **Test acceptance** : Workflow complet récupération réussi

#### Sécurité & Validation
- [ ] Error boundaries `app/error.tsx` et `app/global-error.tsx`
- [ ] Validation workflow statuts implémentée
- [ ] Messages erreur clairs utilisateur
- [ ] **Test acceptance** : Erreur serveur affiche page erreur (pas de crash)

---

### Sprint 2 : Expérience Utilisateur

#### Exports PDF
- [ ] Fiche Marché PDF générée (toutes sections)
- [ ] Fiche Caution PDF générée (compact)
- [ ] Bon Livraison Véhicule PDF généré (format standard)
- [ ] Design professionnel (logo, styling, pagination)
- [ ] Téléchargement automatique fichier
- [ ] **Test acceptance** : PDF marché ouvert sans erreur, contenu complet

#### Rapport Excel Multi-Sheets
- [ ] 3 onglets (Marchés, Cautions, Véhicules)
- [ ] Styling header (bold, background)
- [ ] Filtres appliqués respectés
- [ ] Téléchargement automatique
- [ ] **Test acceptance** : Excel ouvert dans Excel/LibreOffice, 3 sheets visibles

#### Brouillons Auto-Save
- [ ] Auto-save LocalStorage toutes les 30s
- [ ] Message restauration au retour sur formulaire
- [ ] Effacement après soumission réussie
- [ ] Cleanup brouillons > 7 jours
- [ ] **Test acceptance** : Interruption formulaire → Retour → Brouillon restauré

#### Permissions EXPLOITATION
- [ ] Filtrage marchés EN_EXECUTION uniquement
- [ ] Masquage boutons créer/modifier/supprimer
- [ ] Accès refusé si tentative via URL directe
- [ ] **Test acceptance** : Login EXPLOITATION → Voir seulement marchés en cours

#### Timeline & Polish
- [ ] Timeline marché (historique statuts)
- [ ] Timeline véhicule (livraison → réception)
- [ ] Skeleton loaders (dashboard, listes)
- [ ] Notifications configurées (durées correctes)
- [ ] **Test acceptance** : Timeline affichée chronologiquement avec dates

---

### Sprint 3 : Robustesse & Tests

#### UI/UX Polish
- [ ] Tri colonnes fonctionnel (asc/desc)
- [ ] Breadcrumb sur toutes les pages détail/édition
- [ ] Badge rôle affiché dans menu utilisateur
- [ ] Page profil avec changement mot de passe
- [ ] **Test acceptance** : Tri colonne "Date" inverse l'ordre

#### Tests E2E
- [ ] Setup Playwright configuré
- [ ] Tests auth (login/logout) passants
- [ ] Tests CRUD marchés passants
- [ ] Tests alertes (envoi manuel) passants
- [ ] Tests exports (Excel, PDF) passants
- [ ] **Test acceptance** : `npm run test:e2e` passe à 100%

#### Performance & Accessibilité
- [ ] Score Lighthouse Performance > 90
- [ ] Score Lighthouse Accessibility > 90
- [ ] Temps chargement dashboard < 2s
- [ ] Navigation clavier complète
- [ ] **Test acceptance** : Audit Lighthouse validé

#### Documentation
- [ ] README.md mis à jour (features)
- [ ] CHANGELOG.md créé (versions)
- [ ] SESSION.md mis à jour (roadmap exécutée)
- [ ] **Test acceptance** : Documentation reflète état actuel

---

## 📈 Suivi et Reporting

### Daily Standup (Async)

**Format message quotidien** (Slack/Email) :

```
📅 [Date] - Jour X/10

✅ Hier :
- Alertes automatiques implémentées (route API + Cron)
- Recherche textuelle testée (4 modules)

🔄 Aujourd'hui :
- Pagination (toutes listes)
- Upload 50MB (client → Supabase)

⚠️ Bloqueurs :
- Aucun / [Décrire si présent]

📊 Avancement Sprint 1 : 40% (12h/30h)
```

---

### Rapports de Jalon (Fin de Sprint)

**Format rapport** (Google Doc / Markdown) :

```markdown
# 🎯 Rapport Jalon Sprint X

**Date** : J+X
**Statut** : ✅ VALIDÉ / ⚠️ PARTIEL / ❌ BLOQUÉ

## Objectifs Atteints

| Objectif | Statut | Notes |
|----------|--------|-------|
| Alertes automatiques | ✅ | Emails reçus, Cron configuré |
| Recherche textuelle | ✅ | Opérationnel 4 modules |
| Pagination | ✅ | 25 items/page |
| ... | ... | ... |

## KPIs Mesurés

| KPI | Cible | Réel | Statut |
|-----|-------|------|--------|
| Alertes envoyées | 100% | 100% | ✅ |
| Recherche < 500ms | 100% | 98% | ✅ |
| ... | ... | ... | ... |

## Bugs Identifiés

| # | Description | Priorité | Assigné | ETA |
|---|-------------|----------|---------|-----|
| B1 | Toast erreur ne disparaît pas | 🟡 BASSE | Dev | Sprint 2 |
| ... | ... | ... | ... | ... |

## Feedback Utilisateur

> "Recherche très rapide, mais j'aimerais pouvoir chercher par date aussi."
> — Utilisateur Test AVANCE

**Score UX** : 8.5/10

## Prochaines Étapes

- [ ] Corriger bug B1 (toast)
- [ ] Démarrer Sprint 2 (J+4)
- [ ] Session validation avec utilisateur (J+7)

## Risques & Mitigation

- ⚠️ SMTP rate limits : OK pour l'instant (20 emails/jour max)
- ✅ Upload 50MB : Fonctionne bien avec Supabase direct

---

**Conclusion** : Sprint 1 ✅ RÉUSSI. Prêt pour Sprint 2.
```

---

### Dashboard de Suivi (Google Sheets / Notion)

**Colonnes** :

| Sprint | Tâche | Priorité | Effort Estimé | Effort Réel | Statut | Assigné | Notes |
|--------|-------|----------|---------------|-------------|--------|---------|-------|
| 1 | Alertes auto | 🔴 | 6h | 7h | ✅ | Dev | +1h debug SMTP |
| 1 | Recherche | 🟠 | 2h | 2h | ✅ | Dev | OK |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Métriques Totales** :

- **Avancement Global** : 35% (28h/80h)
- **Sprint Actuel** : Sprint 1 (J+2)
- **Prochaine Session Validation** : J+3 (1h)
- **Bugs Ouverts** : 2 (1 bloquant, 1 mineur)

---

### Communication Stakeholders

**Fréquence** : Fin de chaque sprint (J+3, J+7, J+10)

**Format email** :

```
Objet : [ERP Marchés] Jalon Sprint X Atteint ✅

Bonjour,

Le Sprint X des améliorations MVP est terminé avec succès !

🎯 Objectifs Atteints :
- ✅ Alertes automatiques fonctionnelles (emails hebdomadaires)
- ✅ Recherche textuelle opérationnelle (gain temps 70%)
- ✅ Upload fichiers lourds (50 MB)

📊 Métriques :
- Tests manuels : 100% passants
- Score utilisateur : 8.5/10
- Bugs bloquants : 0

🚀 Prochaine Étape :
Sprint 2 démarre J+4 (Exports PDF + Brouillons)

📅 Prochaine Session Validation :
J+7 - 2h (démo exports)

Lien vers rapport complet : [URL]

Bien cordialement,
L'équipe Dev
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
git commit -m "feat(alertes): implement automatic cron alerts"
git commit -m "feat(search): add text search on 4 modules"
git commit -m "fix(upload): handle 50MB files with progress bar"
git commit -m "test(exports): add E2E tests for PDF generation"
git commit -m "docs(roadmap): update sprint 1 completion status"
```

---

### Code Style

- ✅ **TypeScript strict mode** : Activer `strict: true`
- ✅ **Prettier** : Formater automatiquement (save on format)
- ✅ **ESLint** : Règles Next.js + React + Accessibility
- ✅ **Imports absolus** : `@/lib/...` (éviter `../../../`)
- ✅ **Nomenclature** :
  - Composants : PascalCase (`MarcheForm.tsx`)
  - Hooks : camelCase avec `use` (`useDraftSave.ts`)
  - Utils : camelCase (`formatDate.ts`)
  - Constants : UPPER_SNAKE_CASE (`STATUT_LABELS`)

---

### Testing

**Stratégie** :
- 🧪 **E2E (Playwright)** : Workflows critiques uniquement (Sprint 3)
- 🔧 **Manuels** : UX/UI + validation métier (Sprints 1-3)
- 📊 **Performance** : Lighthouse audits (Sprint 3)

**Pas de tests unitaires** pour MVP+ (gains marginaux vs effort)

---

### Documentation

**README.md** : Vue d'ensemble + Quick Start
**ARCHITECTURE.md** : Stack technique + patterns
**ROADMAP_AMELIORATIONS_MVP.md** : Ce document (roadmap)
**PLAN_TEST_MVP.md** : Plan de test détaillé
**SESSION.md** : Journal de bord sessions dev
**CHANGELOG.md** : Historique versions

---

## 🏁 Critères de Livraison Finale

### Checklist Acceptance Globale

- [ ] ✅ **26 améliorations implémentées** (Sprint 1-3)
- [ ] ✅ **Tests E2E critiques passants** (> 70% couverture)
- [ ] ✅ **Plan test manuel exécuté à 100%** (PLAN_TEST_MVP.md)
- [ ] ✅ **Bugs bloquants corrigés** (0 bugs CRITICAL ouverts)
- [ ] ✅ **Score Lighthouse** :
  - Performance > 90
  - Accessibility > 90
  - Best Practices > 90
- [ ] ✅ **Validation utilisateur** : Score UX > 8/10
- [ ] ✅ **Documentation mise à jour** (README, CHANGELOG, SESSION)
- [ ] ✅ **Déploiement production stable** (0 rollback nécessaire)
- [ ] ✅ **Alertes automatiques fonctionnelles** (email hebdo reçu)
- [ ] ✅ **Formation utilisateur** (si nécessaire, document/vidéo)

### Définition of Done (DoD) par Tâche

Une tâche est considérée **TERMINÉE** si :

1. ✅ Code écrit et testé localement
2. ✅ Build réussi (`npm run build`)
3. ✅ Commit avec message clair
4. ✅ Push sur feature branch
5. ✅ Preview Vercel déployé
6. ✅ Tests manuels passants (si applicable)
7. ✅ Tests E2E passants (si Sprint 3)
8. ✅ Validation utilisateur (si jalon)
9. ✅ Documentation mise à jour (si feature majeure)

---

## 📞 Contact & Support

### Équipe Projet

| Rôle | Nom | Contact | Disponibilité |
|------|-----|---------|---------------|
| **Product Owner** | [À définir] | [Email] | Sessions validation uniquement |
| **Lead Developer** | Claude (AI) | - | 24/7 |
| **Testeur Utilisateur** | [À définir] | [Email] | J+3, J+7, J+10 (sessions planifiées) |

### Canaux Communication

- **Questions/Clarifications** : [Email/Slack]
- **Bugs bloquants** : [GitHub Issues]
- **Suivi quotidien** : [Slack/Email]
- **Validation jalons** : [Visio/Présentiel]

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
| **KPI** | Key Performance Indicator - Indicateur performance |

### Annexe B : Références

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Playwright Documentation](https://playwright.dev)
- [@react-pdf/renderer Documentation](https://react-pdf.org)
- [ExcelJS Documentation](https://github.com/exceljs/exceljs)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [shadcn/ui Components](https://ui.shadcn.com)

### Annexe C : Modèles de Documents

- **Template Issue GitHub** : Voir `/.github/ISSUE_TEMPLATE/bug_report.md`
- **Template PR GitHub** : Voir `/.github/PULL_REQUEST_TEMPLATE.md`
- **Template Rapport Jalon** : Voir section [Rapports de Jalon](#rapports-de-jalon-fin-de-sprint)

---

## 🎯 Conclusion

Cette roadmap professionnelle garantit :

1. ✅ **Livraison incrémentale de valeur** (3 jalons validation)
2. ✅ **Visibilité complète** (suivi quotidien + rapports)
3. ✅ **Qualité assurée** (tests E2E + manuels + audits)
4. ✅ **Risques maîtrisés** (mitigation + contingence)
5. ✅ **Collaboration efficace** (validation utilisateur à chaque sprint)

**Durée totale** : 10 jours ouvrés (80h)
**Jalons de validation** : 3 (J+3, J+7, J+10)
**Date de livraison** : J+10

---

**Document vivant** - Mise à jour au fur et à mesure de l'avancement.

**Version** : 1.0
**Dernière modification** : 2026-02-08
**Prochaine révision** : Après chaque jalon

---

**🚀 Prêt à démarrer Sprint 1 !**
