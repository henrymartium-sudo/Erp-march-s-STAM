# Pilotage — tranche 1 : indicateurs de décision sur données existantes

**Date** : 2026-10-02 · **Statut** : design validé, en attente de relecture de la spec

## Purpose

Le taux de succès (offres gagnées ÷ offres déposées) est aujourd'hui l'indicateur le plus visible de l'application. Il ne dit pas si la valeur gagnée se transforme en chiffre d'affaires, ni si les échecs (offres perdues, marchés annulés ou résiliés) sont maîtrisés. Cette tranche crée une page `/pilotage` qui met en avant des indicateurs de décision calculés **uniquement sur les données déjà saisies**, sans migration.

## Contexte et décisions prises

| # | Question | Décision |
|---|----------|----------|
| 1 | Public | Deux vues : un tableau de bord opérationnel quotidien (tranche 3) et une page « Pilotage » mensuelle/trimestrielle (cette tranche) |
| 2 | « CA livré » | Facturé (factures `EMISE`, `EN_ATTENTE`, `PAYEE`) en indicateur principal, encaissé (`PAYEE`) en ligne secondaire |
| 3 | Valeur attribuée | Tout ce qui a été attribué un jour, y compris résilié ou annulé après attribution, avec une ligne « dont perdu après attribution » |
| 4 | Alertes | Cycle de vie (acquitter / résoudre / file de correction) et fusion des échéances dans le tableau de bord opérationnel — **tranche 3** |
| 5 | Renouvellement par autorité contractante | **Reporté** : autorité saisie en texte libre, risque de doublons. Relevé en lecture seule d'abord |
| 6 | Post-mortem | Le dialogue existant (motif, concurrent gagnant, montant retenu) est conservé ; ajout d'une catégorie de cause en liste fermée — **tranche 2** |
| 7 | Accès | Rôles `ADMIN` et `AVANCE` |

## Requirements

### REQ-001 — User SHALL access a dedicated Pilotage page

Page `/pilotage` dans le menu principal, accessible aux rôles `ADMIN` et `AVANCE` (contrôle dans chaque Server Action et dans la page). L'onglet « Analyses » de Reporting Email y est **déplacé** ; Reporting Email ne conserve que la configuration des règles d'envoi et le suivi des opportunités.

**Scénarios**
- Un utilisateur `AVANCE` ouvre `/pilotage` → la page s'affiche.
- Un utilisateur `VISITEUR` ou `EXPLOITATION` ouvre `/pilotage` → accès refusé.
- L'onglet « Analyses » n'apparaît plus dans Reporting Email.

### REQ-002 — System SHALL compute the awarded-to-invoiced conversion rate

- **Dénominateur** : somme des montants des marchés attribués sur la période, c'est-à-dire ayant atteint `ATTRIBUE_DEFINITIVEMENT` ou un statut ultérieur, **y compris** ceux passés ensuite à `RESILIE` ou `ANNULE`. L'attribution antérieure d'un marché annulé ou résilié est établie par `HistoriqueStatut`.
- **Numérateur** : somme des factures `EMISE`, `EN_ATTENTE`, `PAYEE` de ces marchés.
- **Lignes secondaires** : « dont encaissé » (factures `PAYEE`) ; « dont perdu après attribution » (nombre et valeur des marchés résiliés ou annulés après attribution — seul endroit où ces pertes sont comptées).
- **Seuil visuel** : alerte sous 30 %.
- Remplace `tauxRecouvrement` (qui excluait résiliés/annulés et comparait du TTC à un montant de marché de nature non établie).

**Scénarios**
- Un marché résilié après attribution, sans facture → compte au dénominateur, pas au numérateur, apparaît dans « perdu après attribution ».
- Un marché annulé **avant** attribution → exclu du calcul.
- Une facture `BROUILLON`, `REJETEE` ou `ANNULEE` → ignorée.

### REQ-003 — System SHALL compute the outcome of submitted bids

**Amendé le 2026-10-02 après revue finale, sur décision d'Abel** (la version initiale, « cumul des échecs », mélangeait des lots déposés et des marchés attribués dans un même taux, comptait les lots en attente au dénominateur et l'infructueux comme un échec).

Carte « Issue des offres », calculée **par lot** (règle « Résultats par lot » déjà en production), sur les lots soumis de la période (date de dépôt) :
- **Indicateur principal** : taux de perte = perdus ÷ (gagnés + perdus), sur les seuls dossiers clos. Le taux de succès, son complément exact, est affiché en ligne secondaire.
- **Répartition en nombre et en valeur** (montant proposé) : gagnés, perdus, sans suite (infructueux : procédure sans suite, pas un échec de STAM), en attente d'issue. Sans suite et en attente n'entrent pas dans le taux.
- **Les pertes après attribution** (marchés annulés ou résiliés après attribution) relèvent de l'exécution, pas de l'offre : elles sont affichées dans la conversion (REQ-002), en nombre et en valeur, et ne sont pas recomptées ici. Une même perte n'est comptée qu'une fois.
- **Couverture** : les marchés sans opportunité liée (saisis avant le module Opportunités) n'entrent pas dans l'issue des offres ; ils sont listés dans la qualité des données (REQ-005).

**Règle métier** : un marché résilié a toujours été attribué auparavant (une procédure arrêtée avant attribution est une annulation). Un marché annulé n'est compté comme attribué que si l'historique ou la date d'attribution l'établit.

**Scénarios**
- 1 lot gagné, 2 perdus, 1 infructueux, 2 en cours → taux de perte 67 %, taux de succès 33 %.
- Aucun lot clos → pas de taux (« — »).
- Un marché résilié sans date ni historique → compté comme attribué, signalé dans « exclus faute de date ».

### REQ-004 — System SHALL compute the average price gap against the winning bidder

(notre offre − offre gagnante) ÷ offre gagnante, en moyenne sur les échecs où `montantOffreConcurrent` est renseigné. Le nombre de cas est affiché. Sous 3 cas, l'indicateur affiche « Pas assez de données (n = …) » au lieu d'un pourcentage.

### REQ-005 — System SHALL expose a data-quality block

Compteurs cliquables vers la liste concernée :
- marchés attribués sans aucune facture ;
- marchés à échéance dépassée sans changement de statut ;
- échecs sans motif renseigné ;
- marchés exclus d'un calcul faute de date de référence (jamais exclus en silence) ;
- marchés dont le TTC facturé dépasse le montant contractuel de plus de 2 % ;
- marchés au-delà du dépôt sans opportunité liée, donc absents de l'issue des offres (ajout du 2026-10-02).

### REQ-006 — User SHALL drill down from each indicator to its source records

Chaque indicateur ouvre la liste des marchés qui le composent. Aucun chiffre sans accès à sa source.

## Architecture

- **`lib/actions/pilotage.ts`** : Server Actions, une fonction par indicateur, `requireRole(['ADMIN', 'AVANCE'])` dans chacune, validation Zod des paramètres de période.
- Réutilisation de `STATUTS_GAGNES`, `STATUTS_DEPOSES` et de la règle par lot existante — pas de recopie.
- **Période** : sélecteur, année civile par défaut. Date de référence : date de dépôt de l'offre pour REQ-003, date d'attribution pour REQ-002. La règle est affichée sur la page.
- **Base de montant** : montant contractuel vs TTC facturé — voir « Règle de base de montant ».
- Exports PDF et Excel déplacés avec l'onglet Analyses ; les fonctions de `lib/actions/analytics.ts` restent tant qu'un export en dépend.

## Interface

1. Barre de filtres : période + exports.
2. Rangée de 3 indicateurs (valeur, seuil, évolution vs période précédente, phrase d'explication).
3. Détail par indicateur (liste des marchés).
4. Bloc « Qualité des données ».

États : données insuffisantes, vide, erreur **par bloc** (un calcul en échec ne fait pas tomber la page), chargement par squelette. Responsive : 3 colonnes (1920), 2 (768), 1 (375). Design guidé par les skills `dataviz` et `ui-ux-pro-max` à l'implémentation, dans le respect de shadcn/ui.

## Tests

- **Unitaires** (Vitest, gate CI) par indicateur : résilié après attribution, annulé avant attribution, marché multi-lots, facture brouillon/rejetée, montant concurrent manquant.
- **E2E** (Playwright contre la base de test locale) : affichage, drill-down, refus `VISITEUR`, accès `AVANCE`, viewports 1920 / 768 / 375.
- **Rapprochement** : calcul manuel en SQL sur une copie restaurée localement de la sauvegarde de production, comparé à la page ; écarts soumis à validation avant mise en production.

## Mise en production

Aucune migration, aucun e-mail. Branche dédiée → PR → gate qualité → validation → fusion (déploiement automatique). Retour arrière : revert du commit de fusion.

## Règle de base de montant (tranchée le 2026-10-02)

Le `montant` du marché est le **montant contractuel**, c'est-à-dire ce que l'acheteur s'engage à payer ; il n'est pas qualifié HT/TTC dans le schéma. Les DAO imposent parfois un prix TTC, et certains véhicules neufs (hybrides, électriques) sont exonérés de TVA au Togo, alors que la maintenance y est soumise.

- **REQ-002** compare le montant contractuel au **TTC des factures** (ce que l'acheteur paie). Exonéré : HT = TTC, la comparaison tient ; prix TTC imposé : elle tient aussi.
- **REQ-004** compare deux offres répondant au même DAO, donc sur la même base fiscale : pas de conversion.
- **Garde-fou (REQ-005)** : tout marché dont le TTC facturé dépasse le montant contractuel de plus de 2 % est signalé dans le bloc « Qualité des données » (indice d'un montant saisi HT face à des factures TTC).

## Hors périmètre (tranches suivantes)

- **Tranche 2** : catégorie de cause d'échec (enum + colonne, migration additive avec sauvegarde préalable), file de qualification des échecs anciens, taux de post-mortem documentés.
- **Tranche 3** : tableau de bord opérationnel, cycle de vie des alertes, fusion avec « Cautions à surveiller ». Touche l'envoi d'e-mails : tests exclusivement sur la base de test.
- **Relevé** en lecture seule des noms d'autorités contractantes et de concurrents, puis décision sur un référentiel.
