# Design — Module Reporting Email (Cron Synthèse Marchés)

**Date** : 2026-03-02
**Statut** : Validé
**Approche retenue** : Module autonome indépendant du système d'alertes

---

## Objectif

Créer un système de reporting email configurable permettant d'envoyer des synthèses de marchés regroupés par statut, indépendamment du moteur d'alertes existant.

Le cron reporting devient un **agrégateur de reporting** : il lit les données directement depuis le module Marchés, regroupe par statut, et envoie des tableaux synthétiques par email selon des règles configurables.

---

## Décisions de design validées

1. **Tous les 13 statuts** sont disponibles pour la sélection (librement combinables par règle)
2. **Interface dédiée** `/admin/reporting` avec CRUD + bouton "Envoyer maintenant"
3. **Cron horaire** `0 * * * *` — chaque règle choisit son heure (0–23h)
4. **Coexistence** avec le système d'alertes existant (les deux tournent en parallèle)
5. **Colonnes email adaptées par statut** — date la plus pertinente selon le statut
6. **Statuts terminaux** — affichage date uniquement, sans indicateur d'urgence

---

## Modèle de données

### Nouveau modèle Prisma : `ReportingRule`

```prisma
model ReportingRule {
  id              String   @id @default(cuid())
  name            String
  description     String?
  statutGroups    String[]   // StatutMarche[] — statuts inclus dans cette règle
  recipientEmails String[]   // Emails destinataires
  scheduleConfig  Json?      // ReportingScheduleConfig | null
  isActive        Boolean    @default(true)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@map("reporting_rules")
}
```

### Type `ReportingScheduleConfig`

```typescript
type ReportingScheduleConfig = {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL'
  hour: number       // 0–23 : heure d'envoi (tranche horaire)
  days?: number[]    // WEEKLY: 1=Lun…7=Dim | MONTHLY: 1–31
}
```

- `MANUAL` : aucun envoi automatique, uniquement via "Envoyer maintenant"
- `scheduleConfig = null` ↔ MANUAL

---

## Architecture — Fichiers

### Fichiers à créer

```
prisma/schema.prisma                              # + model ReportingRule

lib/cron/
  reporting-processor.ts                         # Orchestrateur cron : charge règles, dispatch
  getMarchesForReporting.ts                       # Query Prisma par statutGroups

lib/email/
  reporting-templates.ts                         # Template "Synthèse Marchés" par statut

lib/actions/
  reporting-rules.ts                             # Server Actions CRUD + sendNow

app/api/cron/reporting/
  route.ts                                       # Endpoint cron horaire (GET, sécurisé x-vercel-cron)

app/(dashboard)/admin/reporting/
  page.tsx                                       # Page RSC (chargement des règles)
  ReportingRulesClient.tsx                       # UI client (tableau + dialog création/édition)
```

### Fichiers à modifier

```
vercel.json                                      # + cron "0 * * * *" /api/cron/reporting
components/layout/dashboard-shell.tsx            # + lien sidebar "Reporting" (ADMIN)
```

> Le cron existant `/api/cron/daily-alerts` (schedule `0 7 * * *`) reste **inchangé**.

---

## Flux d'exécution

```
GET /api/cron/reporting (toutes les heures)
  │
  ├── Vérification sécurité (x-vercel-cron ou CRON_SECRET)
  │
  └── reportingProcessor.run(currentHour: number)
        │
        ├── prisma.reportingRule.findMany({ where: { isActive: true } })
        │
        └── Pour chaque règle :
              ├── shouldRunReportingRuleNow(config, currentHour, currentDate) ?
              │     └── Non → skip
              │
              ├── getMarchesForReporting(statutGroups)
              │     └── prisma.marche.findMany({
              │           where: { statut: { in: statutGroups } },
              │           select: { tous les champs dates }
              │         })
              │
              ├── groupMarchesByStatut(marches)
              │     └── Map<StatutMarche, Marche[]>
              │
              ├── buildReportingEmailHtml(groupedMarches, rule.name)
              │     └── Section par statut présent uniquement
              │
              └── sendEmail(recipientEmails, subject, html)
```

---

## Template email "Synthèse Marchés"

### Structure

```
Header STAM navy
  📊 Synthèse Marchés — [Nom de la règle]
  [Jour] [Date]

[Pour chaque statut présent dans les données]
  Titre section : [Label statut] ([N] marchés)
  Tableau HTML : colonnes adaptées au statut
  ────────────────────────────────────────

Footer
  📊 Total : [N] marchés · Généré le [date]
```

### Colonnes communes à toutes les sections

`N° Marché · Objet · Autorité contractante · Montant · [Date pertinente]`

### Mapping date pertinente par statut

| Statut | Date affichée | J. restants |
|---|---|---|
| `OPPORTUNITE_IDENTIFIEE` | `dateDepotPrevue` | Oui |
| `DOSSIER_EN_PREPARATION` | `dateDepotPrevue` | Oui |
| `OFFRE_DEPOSEE` | `dateDepotOffre` | Non |
| `EN_ATTENTE_ATTRIBUTION` | `dateAttributionProvisoire` | Non |
| `ATTRIBUE_PROVISOIREMENT` | `dateAttributionDefinitive` | Non |
| `ATTRIBUE_DEFINITIVEMENT` | `dateOrdreService` | Non |
| `EN_ATTENTE_LIVRAISON_OS` | `dateLivraisonPrevue` (ou calculée) | Oui |
| `EN_EXECUTION` | `dateFinPrevue` | Oui |
| `EXECUTE_ATTENTE_GARANTIES` | `dateReceptionDefinitive` | Oui |
| `CLOTURE` | `dateClotureAdministrative` | Non |
| `RESILIE` | `dateResiliation` | Non |
| `ANNULE` | `dateAnnulation` | Non |
| `INFRUCTUEUX` | `dateInfructueux` | Non |

- **Statuts avec J. restants** : indicateur coloré 🔴/🟠 si applicable
- **Statuts terminaux** : fond neutre, aucun indicateur d'urgence

---

## Interface `/admin/reporting`

### Tableau des règles

| Nom | Statuts | Planification | Destinataires | Actions |
|---|---|---|---|---|
| Suivi Exécution | 3 statuts | Lun–Ven 8h | 2 emails | ▶ ✏ 🗑 ⏸ |

- `▶` = Envoyer maintenant (indépendant de la planification)
- `⏸` = Toggle actif/inactif

### Dialog création/édition

1. **Nom** + description optionnelle
2. **Statuts** : checkboxes groupées (Pré-commercial / En attente / Exécution / Post-exécution / Terminaux)
3. **Destinataires** : tag-input (réutilise le pattern `ExternalEmailsInput`)
4. **Planification** :
   - Type : DAILY / WEEKLY / MONTHLY / MANUAL
   - Heure : Select 0h–23h (masqué si MANUAL)
   - Jours : boutons jours (si WEEKLY) ou champ numérique (si MONTHLY)

---

## Labels statuts (affichage UI et email)

```typescript
const STATUT_MARCHE_LABELS: Record<StatutMarche, string> = {
  OPPORTUNITE_IDENTIFIEE:    "Opportunité identifiée",
  DOSSIER_EN_PREPARATION:    "Dossier en préparation",
  OFFRE_DEPOSEE:             "Offre déposée",
  EN_ATTENTE_ATTRIBUTION:    "En attente d'attribution",
  ATTRIBUE_PROVISOIREMENT:   "Attribué provisoirement",
  ATTRIBUE_DEFINITIVEMENT:   "Attribué définitivement",
  EN_ATTENTE_LIVRAISON_OS:   "En attente livraison OS",
  EN_EXECUTION:              "En exécution",
  EXECUTE_ATTENTE_GARANTIES: "Exécuté — attente garanties",
  CLOTURE:                   "Clôturé",
  RESILIE:                   "Résilié",
  ANNULE:                    "Annulé",
  INFRUCTUEUX:               "Infructueux",
}
```

---

## Sécurité

- Endpoint `/api/cron/reporting` : même pattern que `/api/cron/daily-alerts`
  - Header `x-vercel-cron: 1` (appel Vercel) **ou** `Authorization: Bearer CRON_SECRET`
- Server Actions CRUD : `requireRole(['ADMIN'])`
- "Envoyer maintenant" : `requireRole(['ADMIN'])`

---

## Contraintes respectées

- ✅ Aucun impact sur le module Alertes existant
- ✅ Aucune logique métier nouvelle — lecture directe des données existantes
- ✅ TypeScript strict
- ✅ Logique isolée dans des modules dédiés (`lib/cron/`, `lib/email/reporting-templates.ts`)
- ✅ Fallback possible : si `isActive = false` sur toutes les règles, aucun email envoyé
- ✅ Pattern `ExternalEmailsInput` réutilisé pour les destinataires
- ✅ Pattern `FrequencySelector` réutilisé pour la planification
