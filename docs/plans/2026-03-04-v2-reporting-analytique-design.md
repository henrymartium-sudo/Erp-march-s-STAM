# Design — V2 Reporting Analytique (F1 + F5)

**Date** : 2026-03-04
**Statut** : Approuvé
**Périmètre** : F1 Reporting avancé + F5 Capitalisation stratégique

---

## 1. Objectif

Étendre `/admin/reporting` avec un onglet **Analyses** offrant 4 groupes d'analyses interactives sur une période configurable, exportables en PDF et Excel.

---

## 2. Localisation

`/admin/reporting` → système d'onglets shadcn/ui :
- **Onglet 1 : Règles email** — `ReportingRulesClient.tsx` (existant, inchangé)
- **Onglet 2 : Analyses** — `AnalytiquesTab.tsx` (nouveau)

Accès : **ADMIN uniquement** (cohérent avec l'existant).

---

## 3. Structure UI

```
/admin/reporting → [Règles email] [Analyses]

Onglet Analyses :
├── PeriodSelector : [30j] [90j] [6m] [1an] [Personnalisé]
├── Section 1 : Performance marchés
│   ├── KPI Cards (total, win rate, montant moyen, délai moyen)
│   ├── DonutChart répartition statuts (Recharts)
│   └── BarChart win rate par type de marché
├── Section 2 : Analyse financière
│   ├── KPI Cards (CA contractualisé, encaissé, en attente, cautions actives)
│   ├── BarChart CA contractualisé vs encaissé vs en attente
│   └── BarChart factures par statut
├── Section 3 : Capitalisation stratégique
│   ├── KPI Cards (nb AC, meilleur win rate, segment le + rentable)
│   ├── BarChart top 10 autorités contractantes (montants + win rate)
│   ├── BarChart win rate par segment
│   └── LineChart saisonnalité appels d'offres (par mois)
├── Section 4 : SAV & Interventions
│   ├── KPI Cards (nb interventions, délai moyen résolution, coût total, taux résolution)
│   ├── BarChart interventions par type (PANNE / ENTRETIEN / RAPPEL)
│   ├── BarChart délais de résolution
│   └── Tableau top véhicules défaillants
└── Boutons export : [Exporter PDF] [Exporter Excel]
```

---

## 4. Couche de données

### Nouveaux fichiers

**`lib/actions/analytics.ts`** — 4 Server Actions :

```typescript
type Periode = { dateDebut: Date; dateFin: Date }

getPerformanceStats(periode: Periode)
// groupBy statut → count, win rate
// groupBy type → count + _sum montant
// aggregate → délai moyen exécution
// concurrentGagnant → top concurrents

getFinancialStats(periode: Periode)
// _sum montant marchés EN_EXECUTION + CLOTURE → CA contractualisé
// _sum montantTTC factures PAYEE → CA encaissé
// _sum montantTTC factures EMISE+EN_ATTENTE → CA en attente
// _sum montant cautions ACTIVE → risque engagé

getCapitalisationStats(periode: Periode)
// groupBy autoriteContractanteNom → count + _sum montant + win rate
// groupBy type → win rate par segment
// groupBy mois datePublication → saisonnalité

getSAVStats(periode: Periode)
// groupBy statut → count interventions
// aggregate → délai moyen résolution
// groupBy type → PANNE / ENTRETIEN / RAPPEL
// groupBy vehiculeId → top véhicules défaillants
// _sum cout → coût total
```

**`lib/actions/analytics-exports.ts`** — 2 Server Actions :

```typescript
exportAnalytiquesPDF(periode: Periode)
// Rapport complet multi-pages, mise en page STAM
// Réutilise lib/utils/pdf.tsx existant

exportAnalytiquesExcel(periode: Periode)
// Workbook 4 onglets (Performance / Financière / Capitalisation / SAV)
// Réutilise lib/utils/excel.ts existant
```

---

## 5. Composants Frontend

```
app/(dashboard)/admin/reporting/
├── page.tsx                     ← MODIFIER : Tabs + fetch initial 12 mois
├── ReportingRulesClient.tsx     ← INCHANGÉ
└── AnalytiquesTab.tsx           ← CRÉER (Client Component)

components/analytique/
├── PeriodSelector.tsx           ← Presets + DatePicker range
├── PerformanceSection.tsx       ← KPIs + DonutChart + BarChart
├── FinanciereSection.tsx        ← KPIs + BarCharts
├── CapitalisationSection.tsx    ← KPIs + BarCharts + LineChart
└── SAVSection.tsx               ← KPIs + BarCharts + Tableau
```

### Pattern de chaque section
- Props : données pré-fetché (pas de fetch interne)
- Recharts : mêmes composants que le dashboard existant
- État vide : `EmptyState` si aucune donnée sur la période
- Erreur : message inline sans bloquer les autres sections

---

## 6. Flux de données

```
page.tsx (RSC)
└── données initiales 12 mois (pré-fetché, évite flash)
    └── AnalytiquesTab (Client)
        ├── état: periode (défaut 1an)
        ├── état: loading via useTransition
        ├── changement période → Promise.all(4 SA) en parallèle
        └── sections → skeleton pendant refetch
```

---

## 7. Performance

| Risque | Mitigation |
|---|---|
| 4 SA par changement de période | Promise.all — parallèle |
| Queries groupBy coûteuses | Index existants suffisants (statut, dateNotification, createdAt) |
| Re-renders inutiles | React.memo sur les 4 sections |
| Export PDF lent | useTransition dédié + spinner |

---

## 8. Export PDF — structure rapport

```
Page 1 : Couverture (Logo STAM + Titre + Période + Date)
Page 2 : Performance marchés (KPIs + tableau statuts + win rate)
Page 3 : Analyse financière (CA contractualisé / encaissé / en attente)
Page 4 : Capitalisation (Top AC + saisonnalité)
Page 5 : SAV (Interventions + délais + coûts)
```

---

## 9. Export Excel — workbook

```
Onglet 1 : Performance
Onglet 2 : Financière
Onglet 3 : Capitalisation
Onglet 4 : SAV
```

---

## 10. Tests & validation

### Playwright (3 breakpoints obligatoires)
- Desktop 1920×1080 : toutes sections + exports
- Tablette 768×1024 : sections + exports
- Mobile 375×667 : sections en scroll (exports optionnels)

### Critères métier
- Taux de succès cohérent avec les données manuelles (50 marchés réels)
- Montants totaux vérifiables par recoupement avec exports existants
- Top AC reflète les vraies autorités contractantes
- Exports PDF/Excel correctement datés et complets

---

## 11. Dépendances

**Aucune nouvelle bibliothèque** — tout réutilise l'existant :
- Recharts 2.15.0 ✅
- shadcn/ui (Tabs, Card, Button, Calendar, Table) ✅
- @react-pdf/renderer ✅
- ExcelJS ✅
- date-fns ✅
- Prisma aggregate/groupBy ✅

---

## 12. Estimation

| Groupe | Estimation |
|---|---|
| lib/actions/analytics.ts (4 SA) | ~6h |
| lib/actions/analytics-exports.ts | ~4h |
| PeriodSelector + AnalytiquesTab | ~3h |
| PerformanceSection | ~4h |
| FinanciereSection | ~4h |
| CapitalisationSection | ~5h |
| SAVSection | ~3h |
| page.tsx (Tabs + intégration) | ~2h |
| Tests Playwright | ~3h |
| **Total** | **~34h** |
