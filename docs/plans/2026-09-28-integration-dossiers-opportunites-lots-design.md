# Design — Intégration Dossiers d'offre ↔ Opportunités, suivi par lot

**Date** : 2026-09-28 · **Statut** : design validé en séance par Abel, plan d'implémentation à écrire · **Auteur** : Claude (session ERP STAM)

## 1. Problème

Le module « Dossiers d'offre » est lié à l'Opportunité en base (`DossierOffre.opportuniteId`, facultatif) mais pas dans le métier :

- déclenchement partiel : le passage en `DOSSIER_EN_PREPARATION` crée **un seul** dossier par opportunité (`lib/actions/statuts-opportunite.ts:123`, checklist `CHECKLIST_STANDARD`) — pas de notion de lot ni de pièces communes (correction 2026-09-28, relecture du code) ;
- deux statuts indépendants : les dossiers de prod sont `SOUMIS` alors que leurs opportunités sont `GAGNEE`, `PERDUE` ou `EN_ATTENTE_ATTRIBUTION` ;
- `DossierOffre.statut` est une chaîne libre (`EN_COURS | SOUMIS | ARCHIVE`) éditable à la main ;
- la notion de **lot** n'existe nulle part, alors qu'un dossier de mise en concurrence peut en compter plusieurs, avec des résultats différents par lot ;
- la liste Opportunités n'affiche rien du dossier (progression, pièces).

État prod relevé le 2026-09-28 : une trentaine d'opportunités, en majorité NO_GO, quelques-unes PERDUE, GAGNEE ou EN_ATTENTE_ATTRIBUTION, aucune en DOSSIER_EN_PREPARATION ; quelques dossiers, tous rattachés.

## 2. Décisions (validées par Abel le 2026-09-28)

| # | Décision |
|---|---|
| D1 | L'**opportunité pilote** le dossier. Le statut du dossier n'est plus saisi à la main. |
| D2 | **Plusieurs dossiers par opportunité, un par lot.** |
| D3 | Nouveau **modèle `Lot`** rattaché à l'opportunité (option structurée). |
| D4 | **Option B** : pilotage par l'opportunité jusqu'au dépôt ; après attribution, **résultat lot par lot** ; statut de l'opportunité **déduit** des lots. |
| D5 | Les champs de résultat **descendent sur le Lot** ; l'opportunité n'affiche plus que des agrégats. |
| D6 | Reprise : **un « Lot unique » par opportunité existante**, qui reprend ses champs de résultat ; les dossiers existants y sont rattachés. |

## 3. Schéma cible

```prisma
enum ResultatLot {
  EN_COURS                 // pas encore attribué
  ATTRIBUE_PROVISOIREMENT
  GAGNE
  PERDU
  INFRUCTUEUX              // à confirmer (Q3)
}

model Lot {
  id                     String       @id @default(cuid())
  opportuniteId          String
  opportunite            Opportunite  @relation(fields: [opportuniteId], references: [id], onDelete: Cascade)
  numero                 Int          // 1, 2, 3…
  intitule               String
  montantEstime          Decimal?     @db.Decimal(15, 2)
  montantPropose         Decimal?     @db.Decimal(15, 2)
  resultat               ResultatLot  @default(EN_COURS)
  motifPerte             String?      @db.Text
  concurrentGagnant      String?
  montantOffreConcurrent Decimal?     @db.Decimal(15, 2)
  dossier                DossierOffre?
  createdAt              DateTime     @default(now())
  updatedAt              DateTime     @updatedAt

  @@unique([opportuniteId, numero])
  @@map("lots")
}
```

`DossierOffre` gagne `lotId String? @unique` (un dossier par lot) ; `opportuniteId` est conservé pendant la transition (redondant avec `lot.opportuniteId`, retiré en phase 3). Le statut du dossier devient **calculé** (§4) ; la colonne `statut` est retirée en phase 3.

Sur `Opportunite`, `montantPropose`, `motifPerte`, `concurrentGagnant`, `montantOffreConcurrent` sont **conservés en phase 1-2** (lecture de secours) puis supprimés en phase 3.

## 4. Correspondance des statuts

| Statut opportunité | État dossier (dérivé) | Édition des pièces |
|---|---|---|
| EN_ANALYSE, GO, NO_GO | — (pas de dossier requis) | — |
| DOSSIER_EN_PREPARATION | En préparation | oui |
| OFFRE_SOUMISE | Soumis (date de dépôt exigée) | non |
| EN_ATTENTE_ATTRIBUTION | Soumis | non |
| ATTRIBUE_PROVISOIREMENT / GAGNEE / PERDUE | Clos — affiche `lot.resultat` | non |

Statuts legacy `IDENTIFIEE` et `SOUMISE` : traités comme `EN_ANALYSE` et `OFFRE_SOUMISE`.

## 5. Règle d'agrégation (après attribution)

Sur l'ensemble des lots de l'opportunité :

1. au moins un lot `GAGNE` ⇒ opportunité `GAGNEE` ;
2. sinon au moins un lot `ATTRIBUE_PROVISOIREMENT` ⇒ `ATTRIBUE_PROVISOIREMENT` ;
3. sinon au moins un lot `EN_COURS` ⇒ `EN_ATTENTE_ATTRIBUTION` ;
4. sinon (tous `PERDU`/`INFRUCTUEUX`) ⇒ `PERDUE`.

Recalculée dans la même transaction que toute modification de `lot.resultat`. Le changement manuel du statut de l'opportunité reste possible **jusqu'à `EN_ATTENTE_ATTRIBUTION`** ; au-delà il passe par les lots.

Agrégats affichés sur l'opportunité : montant proposé total, montant estimé total, nombre de lots gagnés / total.

## 6. Déclenchement

Au passage en `DOSSIER_EN_PREPARATION` (`lib/actions/statuts-opportunite.ts` → `changerStatutOpportunite`, qui crée déjà un dossier unique — à étendre) :
- s'il n'y a aucun lot, proposer la saisie des lots (au minimum un lot unique pré-rempli avec l'objet) ;
- créer un dossier par lot sans dossier, titre pré-rempli, checklist de pièces standard.

## 7. Écrans touchés

- **Fiche opportunité** : section « Lots » (tableau : lot, montants, résultat, progression du dossier, lien), saisie du résultat par lot après dépôt.
- **Liste opportunités** : colonne ou ligne secondaire « Dossier : x/y pièces » ; nombre de lots.
- **Formulaire opportunité** : retrait des champs de résultat (déplacés vers les lots).
- **Dossiers d'offre** : statut affiché dérivé, sélecteur de statut retiré du formulaire, colonne Lot.
- **Analytique / exports / emails de reporting** : lire les champs de résultat depuis les lots (fichiers recensés : `lib/actions/analytics.ts`, `analytics-exports.ts`, `exports.ts`, `components/analytique/OpportunitesSection.tsx`, `lib/email/opportunite-reporting-templates.ts`, `lib/utils/serialize.ts`, `lib/analytics/types.ts`, `components/opportunites/*`).
- `createMarcheFromOpportunite` : voir Q2.

## 8. Phasage et risques

| Phase | Contenu | Réversibilité |
|---|---|---|
| 0 | **Sauvegarde de la base de prod** (tableau de bord Supabase, compte propriétaire) — bloquant | — |
| 1 | Migration **additive** : enum `ResultatLot`, table `lots`, `dossiers_offre.lotId`. Script de reprise idempotent (D6). | Oui (drop table/colonne) |
| 2 | Code : statut dérivé, agrégation, déclenchement, écrans, analytique lisant les lots. | Oui (revert) |
| 3 | Migration **destructive** : retrait des anciens champs de résultat sur `opportunites` et de `dossiers_offre.statut`, après vérification en prod. | Non — sauvegarde fraîche exigée |

Risques : emails de reporting (irréversibles) doivent être vérifiés avant la phase 3 ; migrations Prisma via le port 5432 (pas le pooler 6543) ; écart entre agrégat calculé et statut actuel des opportunités PERDUE et GAGNEE existantes à contrôler par le script de reprise (rapport avant écriture).

## 9. Tests

- Unitaires : fonction pure d'agrégation (§5) et de dérivation du statut dossier (§4), tous cas.
- E2E Playwright : passage en DOSSIER_EN_PREPARATION ⇒ dossiers créés ; lot gagné + lot perdu ⇒ opportunité GAGNEE ; pièces non éditables après dépôt.
- Script de reprise : dry-run sur la base `.env.test`, puis rapport sur la prod avant écriture.

## 10. Questions ouvertes

- ~~Q1~~ — **Tranché 2026-09-28 : pièces communes + pièces propres à chaque lot.** Modélisation proposée : `PieceOffre` reçoit `opportuniteId String?` et `dossierId` devient facultatif (contrainte : exactement l'un des deux renseigné). Pièces communes = rattachées à l'opportunité (administratives : attestations, caution de soumission…), saisies une seule fois ; pièces de lot = rattachées au dossier. La progression d'un dossier = pièces communes + pièces du lot. Reprise : pièces existantes restent sur leur dossier.
- ~~Q2~~ — **Tranché 2026-09-28 : un seul marché regroupant les lots gagnés.** `createMarcheFromOpportunite` reste conditionné à `GAGNEE` (agrégat) ; le montant du marché est pré-rempli avec la somme des `montantPropose` des lots `GAGNE` ; l'intitulé liste les lots gagnés. Pas de relation Lot→Marché en base (non requise à ce stade).
- ~~Q3~~ — **Tranché 2026-09-28 : `INFRUCTUEUX` distinct de `PERDU`.** Un lot infructueux n'a ni concurrent gagnant ni montant concurrent (champs masqués). Agrégation inchangée (§5 règle 4 : tous `PERDU`/`INFRUCTUEUX` ⇒ opportunité `PERDUE`) ; l'analytique distingue les deux dans le taux de réussite.
- ~~Q4~~ — **Tranché 2026-09-28 : seulement un onglet de la fiche opportunité.** Entrée « Dossiers d'offre » retirée du menu ; fiche opportunité avec onglets (Informations · Lots & dossiers · Pièces communes). Les routes `/dossiers-offre`, `/dossiers-offre/[id]`, `/dossiers-offre/nouveau` redirigent (308) vers l'onglet de l'opportunité concernée, pour ne pas casser les liens existants (emails, favoris). Les dossiers sans opportunité (0 en prod au 2026-09-28) sont impossibles après la reprise.

**Toutes les questions ouvertes sont tranchées** — prochaine étape : plan d'implémentation (`superpowers:writing-plans`).

## 11. Automatisations recommandées (grille claude-automation-recommender)

- Sous-agent `ui-ux-reviewer` sur la fiche opportunité après la phase 2.
- Test E2E de cohérence opportunité ↔ lots ↔ dossiers, gardien de la règle D1/D4.
- Pas de workflow multi-agents : périmètre de 2 modules.
