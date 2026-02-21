# Design — Module SAV Véhicules (Hub Opérationnel 360°)

**Date** : 2026-02-21
**Statut** : Validé
**Approche retenue** : B — SAV autonome + Dashboard véhicule

---

## Contexte

Extension du module Véhicules pour intégrer un module SAV (Service Après-Vente) complet.
Le véhicule devient un hub opérationnel partagé entre le Service Exploitation (SAV technique) et le Service Marchés publics (suivi contractuel).

**Contraintes absolues :**
- Zéro régression sur le code existant
- Extension uniquement (pas de suppression)
- Migrations non destructives
- Nommage en français (convention du projet)
- TypeScript strict, zéro `any`

---

## Décisions de design

| Question | Décision |
|----------|----------|
| Cohabitation `StatutVehicule` vs nouveau statut SAV | **Deux statuts séparés** : garder `StatutVehicule` (contractuel) + ajouter `statutSAV` (opérationnel SAV) |
| Convention de nommage | **Français** — cohérence avec le codebase existant |
| Commentaire contractuel | Champ `commentaireContractuel String?` dans `Intervention` |

---

## Schéma de données

### Extensions `Vehicule` (non destructif — tous champs nullable)

```prisma
dateFinGarantie     DateTime?
kilometrageGarantie Int?
statutSAV           StatutSAV @default(EN_SERVICE)
interventions       Intervention[]
```

### Nouveau enum `StatutSAV`

```prisma
enum StatutSAV {
  EN_SERVICE    // Opérationnel
  IMMOBILISE    // Immobilisé pour intervention SAV
  HORS_SERVICE  // Retiré du parc
}
```

### Nouveau modèle `Intervention`

```prisma
model Intervention {
  id                     String              @id @default(cuid())
  vehiculeId             String
  type                   TypeIntervention
  statut                 StatutIntervention  @default(SIGNALE)
  sousGarantie           Boolean             @default(true)
  signaleAt              DateTime            @default(now())
  immobiliseAt           DateTime?
  resolveAt              DateTime?
  cout                   Decimal?            @db.Decimal(10, 2)
  description            String?             @db.Text
  commentaireContractuel String?             @db.Text
  createdAt              DateTime            @default(now())
  updatedAt              DateTime            @updatedAt

  vehicule Vehicule @relation(fields: [vehiculeId], references: [id], onDelete: Cascade)

  @@map("interventions")
  @@index([vehiculeId])
  @@index([statut])
  @@index([type])
}

enum TypeIntervention {
  PANNE
  ENTRETIEN
  RAPPEL
}

enum StatutIntervention {
  SIGNALE
  DIAGNOSTIC
  EN_COURS
  RESOLU
  CLOS
}
```

---

## Architecture & Fichiers

### Nouveaux fichiers

```
lib/sav/workflow.ts
  - isTransitionInterventionValid(from, to): boolean
  - getAvailableStatutsIntervention(from): StatutIntervention[]
  - calculerDureeImmobilisation(intervention): number | null  (en jours)
  - estSousGarantie(vehicule, dateReference): boolean

lib/sav/metrics.ts
  - calculerTauxDisponibilite(vehiculeId): Promise<number>    (%)
  - calculerTempsMoyenImmobilisation(vehiculeId): Promise<number>  (jours)
  - compterIncidentsGarantie(vehiculeId): Promise<number>

lib/actions/interventions.ts
  - createIntervention(data): Promise<ActionResult<Intervention>>
  - updateInterventionStatut(id, statut): Promise<ActionResult<Intervention>>
  - updateInterventionCommentaire(id, commentaire): Promise<ActionResult>  // ADMIN/AVANCE
  - deleteIntervention(id): Promise<ActionResult>  // ADMIN/AVANCE
  - getInterventionsByVehiculeId(vehiculeId): Promise<Intervention[]>
  - getInterventionsGlobales(filters): Promise<PaginatedResponse<InterventionWithVehicule>>

lib/validations/intervention.ts
  - createInterventionSchema
  - updateInterventionStatutSchema
  - filterInterventionsSchema

components/interventions/interventions-table.tsx     → Tableau interventions d'un véhicule
components/interventions/create-intervention-dialog.tsx → Dialog formulaire création
components/interventions/statut-intervention-badge.tsx  → Badge statut coloré

app/(dashboard)/vehicules/sav/page.tsx     → Vue globale SAV (toutes interventions)
app/(dashboard)/vehicules/sav/loading.tsx
```

### Fichiers modifiés (extension uniquement)

```
prisma/schema.prisma              → +3 champs Vehicule + modèle Intervention + enums
lib/validations/vehicule.ts       → Ajouter dateFinGarantie, kilometrageGarantie, statutSAV
lib/actions/vehicules.ts          → Ajouter statutSAV dans VehiculesStats
types/serialized.ts               → Étendre SerializedVehicule avec champs SAV + interventions
lib/utils/permissions.ts          → Ajouter canWriteSAV() → ADMIN | AVANCE | EXPLOITATION
components/vehicules/vehicule-detail.tsx → Section SAV (table + bouton création)
components/vehicules/vehicule-form.tsx   → Champs dateFinGarantie + kilometrageGarantie
```

---

## Permissions

| Action | ADMIN | AVANCE | EXPLOITATION | VISITEUR |
|--------|:-----:|:------:|:------------:|:-------:|
| Voir interventions | ✅ | ✅ | ✅ | ✅ |
| Créer intervention | ✅ | ✅ | ✅ | ❌ |
| Changer statut intervention | ✅ | ✅ | ✅ | ❌ |
| Commentaire contractuel | ✅ | ✅ | ❌ | ❌ |
| Supprimer intervention | ✅ | ✅ | ❌ | ❌ |
| Modifier `statutSAV` véhicule | ✅ | ✅ | ✅ | ❌ |

---

## Workflow `StatutIntervention`

```
SIGNALE → DIAGNOSTIC
SIGNALE → CLOS          (résolution directe)
DIAGNOSTIC → EN_COURS
DIAGNOSTIC → RESOLU
EN_COURS → RESOLU
RESOLU → CLOS
CLOS → (terminal)
```

---

## Indicateurs métier (`lib/sav/metrics.ts`)

- **Taux de disponibilité** : `(1 - jours_immobilisé / jours_total_vie) × 100`
- **Temps moyen d'immobilisation** : moyenne des durées `(resolveAt - immobiliseAt)` en jours
- **Incidents garantie** : `count(interventions WHERE sousGarantie = true)`

---

## Règles métier clés

1. Quand une intervention passe en `EN_COURS` → `statutSAV` véhicule passe à `IMMOBILISE` (si `immobiliseAt` renseigné)
2. Quand une intervention passe à `RESOLU` → `statutSAV` véhicule repasse à `EN_SERVICE`
3. `sousGarantie` calculé automatiquement à la création : `dateFinGarantie > now()` (mais modifiable manuellement)
4. `commentaireContractuel` visible de tous, mais éditable uniquement par ADMIN/AVANCE

---

## Tests mentaux validés

- [x] Véhicule sans intervention → section SAV vide, aucune erreur
- [x] Intervention sans résolution → `resolveAt` null, durée non calculable (retourne null)
- [x] Véhicule hors garantie → `sousGarantie` false par défaut si `dateFinGarantie < now()`
- [x] Migration avec données existantes → tous champs nullable, aucune donnée perdue
- [x] Performance liste > 500 véhicules → indexes sur `vehiculeId`, `statut`, pagination

---

## Risques identifiés

| Risque | Mitigation |
|--------|-----------|
| Migration Supabase lente | Utiliser MCP `apply_migration` (pas `prisma migrate dev`) |
| Prisma Client non régénéré | `npx prisma generate` après migration |
| Types serialisés désynchronisés | Mettre à jour `types/serialized.ts` immédiatement après migration |
