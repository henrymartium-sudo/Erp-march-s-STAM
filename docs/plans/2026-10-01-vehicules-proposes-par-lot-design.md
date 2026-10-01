# Véhicules proposés par lot — design

Date : 2026-10-01 · Branche : `feat/vehicules-proposes-par-lot` · Statut : **brouillon à valider par Abel**

## Objectif

Permettre de renseigner, pour chaque lot d'une opportunité, le ou les véhicules proposés (marque, modèle, quantité, prix unitaire), à partir du statut « Dossier en préparation ». Le montant proposé du lot se déduit de ces véhicules.

## Décisions validées (2026-10-01)

| # | Décision |
|---|---|
| 1 | Un lot a 1 à N véhicules proposés : marque, modèle, **quantité**, **prix unitaire**. |
| 2 | Pas de reprise du catalogue existant. Le modèle `Vehicule` est le parc livré (immatriculation, SAV), sans rapport. |
| 3 | « Apprentissage » : suggestions de marque et de modèle issues des saisies précédentes (requête sur la table elle-même, pas de table catalogue). Choisir un modèle connu pré-remplit le dernier prix unitaire, modifiable. |
| 4 | `Lot.montantPropose` = Σ (quantité × prix unitaire) dès qu'au moins un véhicule existe ; saisie manuelle seulement quand le lot n'a aucun véhicule. |
| 5 | Saisie possible à partir de `DOSSIER_EN_PREPARATION`, y compris après dépôt (renégociations : changement de véhicules ou de quantités), **jusqu'à la création du marché depuis les lots** : ensuite figé (`resultatsLotsFiges`). Une opportunité `PERDUE` ou `NO_GO` est en lecture seule. |
| 6 | Droits identiques aux lots (`canWrite`) : ADMIN et AVANCE modifient ; EXPLOITATION et VISITEUR consultent. |

## Modèle de données

Nouvelle table, migration **additive uniquement** (aucune colonne existante modifiée) :

```prisma
model VehiculePropose {
  id           String   @id @default(cuid())
  lotId        String
  lot          Lot      @relation(fields: [lotId], references: [id], onDelete: Cascade)
  marque       String
  modele       String
  quantite     Int      @default(1)
  prixUnitaire Decimal  @db.Decimal(15, 2)
  ordre        Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([lotId])
  @@index([marque, modele])
  @@map("vehicules_proposes")
}
```

`Lot` gagne la relation inverse `vehiculesProposes VehiculePropose[]`.

## Montant du lot : synchronisation à l'écriture

`montantPropose` est lu par de nombreux consommateurs (contrôle avant soumission, création du marché depuis les lots, totaux de la fiche, reporting, analytique, exports). Pour ne toucher aucun d'eux, la colonne reste la source de lecture et **est recalculée dans la même transaction** que chaque ajout, modification ou suppression de véhicule :

- au moins un véhicule → `montantPropose = Σ quantité × prixUnitaire` ;
- plus aucun véhicule → `montantPropose` est conservé tel quel (retour à la saisie manuelle, pas de remise à zéro silencieuse).

Fonction pure de calcul dans `lib/utils/lots.ts`, testée à l'unité. Le formulaire du lot passe en lecture seule sur le montant proposé dès qu'un véhicule existe.

## Suggestions (apprentissage)

Server Action en lecture : marques distinctes, puis modèles distincts d'une marque, avec le dernier prix unitaire (le plus récent par `updatedAt`). Recherche insensible à la casse et aux accents (`normalizeText` existant). Limite de 10 résultats. Aucune table supplémentaire.

## Interface

Dans la section lots de la fiche opportunité (`components/opportunites/lots-section.tsx`) : la liste des véhicules d'un lot s'affiche sous son intitulé (lisible par tous) ; un bouton ouvre un dialogue d'édition (lignes marque, modèle, quantité, prix unitaire, total de ligne, ajout, retrait, total du lot). L'enregistrement remplace la liste du lot en une transaction. Le bouton n'apparaît que si l'édition est permise (statut et gel du marché).

## Sécurité et validation

Zod côté serveur (marque et modèle 1–100 caractères, quantité entière de 1 à 999, prix unitaire de 0 à 999 999 999, 20 lignes au plus par lot, total du lot ≤ capacité de `montantPropose`). Rôle vérifié dans chaque Server Action. Édition vérifiée côté serveur : statut de `DOSSIER_EN_PREPARATION` à `GAGNEE` (hors `PERDUE` et `NO_GO`) et marché non créé depuis les lots (`resultatsLotsFiges` faux). Constantes dans `lib/utils/lots.ts`. Journal d'audit sur ajout, modification, suppression.

## Migration et mise en production

1. Répétition sur la base Docker locale (`127.0.0.1:5433`) restaurée depuis un dump de production.
2. Script de retour arrière `DROP TABLE vehicules_proposes` préparé et testé en local.
3. Sauvegarde fraîche (`pg_dump`) hors dépôt, juste avant la production.
4. Migration d'abord (port 5432, mode session), déploiement du code ensuite.
5. **Rien en production sans accord explicite d'Abel.**

## Point tranché : modification après dépôt (2026-10-01, Abel)

Les négociations peuvent obliger à changer de véhicules ou de quantités après le dépôt. Les véhicules restent donc modifiables après dépôt et attribution provisoire, jusqu'à la création du marché depuis les lots. Dès lors, `montantPropose` est copié dans le marché et plus rien ne se modifie, donc le marché et le lot ne divergent jamais. Un changement après dépôt est tracé dans le journal d'audit (ancien et nouveau montant).

## Tests

- Unitaires : calcul du montant, validation Zod, suggestions.
- E2E Playwright (desktop, tablette, mobile) : ajout, modification, suppression, recalcul du montant, lecture seule VISITEUR, suggestions. Sur la base de test locale uniquement, jamais la production.
