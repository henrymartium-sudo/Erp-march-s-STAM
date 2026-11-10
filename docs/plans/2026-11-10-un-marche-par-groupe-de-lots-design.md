# Design — Un marché par groupe de lots gagnés

**Date** : 2026-11-10 · **Statut** : design à valider par Abel, plan d'implémentation associé (`2026-11-10-un-marche-par-groupe-de-lots-plan.md`) · **Auteur** : Claude (session ERP STAM)

## 1. Problème

Une opportunité à plusieurs lots peut donner **plusieurs contrats** : un lot peut faire un marché à lui seul, et deux lots gagnés peuvent aussi être regroupés dans un même marché. Les deux cas sont réels et coexistent.

Aujourd'hui `createMarcheFromOpportunite` (`lib/actions/opportunites.ts`) crée **un seul marché** qui regroupe tous les lots gagnés, puis refuse toute nouvelle création dès que `opportunite.marcheId` est renseigné. Conséquences :

- impossible de créer un marché par lot, ou un marché pour un sous-ensemble de lots gagnés ;
- le `Lot` n'a aucun lien vers un marché : on ne sait pas quel lot est couvert par quel marché ;
- le gel des résultats de lots (`resultatsLotsFiges`) repose sur une comparaison de dates de création (marché postérieur à l'opportunité), qui ne tient plus avec plusieurs marchés ;
- le numéro provisoire est calculé par `count()+1` : deux créations rapprochées peuvent produire un doublon (`numero` est unique).

Cette demande **remplace la décision Q2 du design du 2026-09-28** (« un seul marché regroupant les lots gagnés ; pas de relation Lot→Marché en base »). À consigner au Journal de décisions après validation.

Un relevé de production en lecture seule (2026-11-10) a confirmé que des opportunités à plusieurs lots gagnés ont déjà été regroupées dans un seul marché ; les détails ne figurent pas ici (dépôt public).

## 2. Objectifs, hors périmètre

**Objectifs**

- G1. Créer un marché pour **n'importe quel sous-ensemble** de lots gagnés non encore rattachés (un lot, plusieurs, tous), autant de fois qu'il reste des lots gagnés libres.
- G2. Savoir en base quel lot est couvert par quel marché.
- G3. Pouvoir **retirer un lot d'un marché** (corriger un regroupement) sans perdre le marché, ses cautions, documents ni factures.
- G4. Reprendre les marchés déjà créés en production sans perte de données.
- G5. Numéros provisoires sans collision.

**Hors périmètre (décidé)**

- Ajouter un lot à un marché existant (se fera plus tard si le besoin apparaît ; pour l'instant : retirer puis recréer).
- Rattacher le dossier d'offre du lot au marché (`DossierOffre.marcheId`) : intérêt jugé faible par Abel, écarté le 2026-11-10.
- Refaire la liste des marchés ou le pilotage au-delà de l'adaptation des lectures existantes.
- Supprimer `Opportunite.marcheId` (conservé : conversion marché → opportunité, compatibilité des lectures).

**Anti-objectif** : ne jamais déplacer ni supprimer automatiquement des cautions, documents ou factures d'un marché.

## 3. Décisions

| # | Décision | Origine |
|---|---|---|
| D1 | Un marché couvre **un ou plusieurs lots** ; un lot appartient à **au plus un** marché. | Abel, 2026-11-10 |
| D2 | Nouveau lien `Lot.marcheId` (optionnel, `onDelete: SetNull`) + relation inverse `Marche.lots`. Supprimer un marché libère ses lots. | Claude |
| D3 | À la création, l'utilisateur coche les lots gagnés libres ; tout est coché par défaut (reproduit le comportement actuel). | Claude |
| D4 | Le bouton « Créer le marché » reste visible tant qu'il reste un lot gagné libre. | Claude |
| D5 | Gel **par lot** : un lot rattaché à un marché garde son résultat et ses véhicules figés ; les autres lots restent modifiables. | Claude |
| D6 | Action « Retirer ce lot du marché » sur la fiche marché : libère le lot, recalcule le montant (somme des `montantPropose` des lots restants) **proposé et confirmé**, régénère l'objet seulement s'il est encore celui qui avait été généré. Le numéro n'est jamais touché. Refusée pour le dernier lot du marché (supprimer le marché à la place). | Claude |
| D7 | Retrait refusé si le marché a une facture ou si son statut a dépassé l'attente d'ordre de service (`ATTRIBUE_DEFINITIVEMENT`, `EN_ATTENTE_LIVRAISON_OS` autorisés). | Claude, à confirmer |
| D8 | Numéro provisoire : suffixe maximal existant de l'année + 1, sous le verrou de l'opportunité, avec reprise sur violation d'unicité. | Claude |
| D9 | Reprise : la migration rattache les lots `GAGNE` aux marchés créés depuis les lots (marché postérieur à l'opportunité, même règle que le gel actuel). Les marchés de production concernés sont ensuite corrigés par Abel via « Retirer ce lot du marché ». | Abel/Claude |
| D10 | Le garde « un marché préexistant (converti en opportunité) interdit la création depuis les lots » est conservé, avec le même test de dates. | Claude |

## 4. Schéma cible

```prisma
model Lot {
  // … champs existants
  marcheId String?
  marche   Marche? @relation(fields: [marcheId], references: [id], onDelete: SetNull)
  @@index([marcheId])
}
model Marche {
  // … champs existants
  lots Lot[]
}
```

Migration additive (colonne nullable + index), puis reprise de données (UPDATE) dans la même migration. Annulation : `ALTER TABLE lots DROP COLUMN "marcheId"` (les marchés ne sont pas touchés).

## 5. Comportement

**Création** : `createMarcheFromOpportunite(opportuniteId, lotIds)`. Dans une transaction, sous le verrou de la ligne opportunité (`FOR UPDATE`, comme `setResultatLot`) : relire les lots, exiger que chaque `lotId` soit de cette opportunité, `GAGNE` et libre ; objet = `objet — Lot n` / `Lots n, m` (au singulier avec un seul lot, sans suffixe si l'opportunité n'a qu'un lot) ; montant = somme des `montantPropose` des lots cochés ; créer le marché, poser `Lot.marcheId` ; poser `Opportunite.marcheId` au premier marché créé seulement.

**Fiche opportunité** : « Marché lié » devient « Marchés liés » (liste : numéro + lots couverts) ; chaque lot rattaché affiche son marché ; le dialogue de création liste les lots gagnés libres.

**Fiche marché** : bloc « Lots couverts » avec « Retirer ce lot du marché » (écriture, confirmation avec le nouveau montant proposé).

**Lectures à adapter** (une opportunité peut avoir plusieurs marchés) : fiche opportunité, export des opportunités (numéro de marché), pipeline de l'analytique (somme des marchés de l'opportunité), `vehiculesModifiables` / `setResultatLot` (gel par lot).

## 6. Risques et vérifications

- **Production** : seule écriture sur la base = la migration. Sauvegarde obligatoire avant (aucune sauvegarde automatique, plan gratuit Supabase) ; contrôle avant/après du nombre de lots rattachés ; emails automatiques non concernés (aucun cron touché).
- **Dépôt public** : ce document et les tests n'embarquent aucun numéro, montant ni nom réel.
- **Fusion** : la fusion sur `main` déclenche un déploiement de production automatique ; le correctif du marché existant se fait après, par Abel, depuis l'interface.
- **Concurrence** : verrou opportunité à la création et au retrait.
- **Tests** : unitaires des fonctions pures (sélection, objet/montant, gel par lot, retrait) ; E2E sur la base de test locale (skill `base-test`) : « 3 lots dont 2 gagnés → 2 marchés », « 2 lots gagnés → 1 marché groupé », « retrait d'un lot puis recréation » ; responsive 1920 / 768 / 375.

## 7. Laissé au constructeur

Libellés exacts des boutons et messages d'erreur ; mise en forme de la liste « Marchés liés » ; forme du dialogue (shadcn `Dialog`) ; découpage des commits.
