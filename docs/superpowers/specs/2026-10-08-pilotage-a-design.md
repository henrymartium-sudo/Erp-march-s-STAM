# Pilotage A — conception technique (période unique, doublons retirés, portefeuille consolidé)

Entrée : `docs/PRD-pilotage-a.md`. Base : `origin/main` (`fce753d`), branche `feat/pilotage-a`. Lecture seule : aucune modification du schéma ni des données.

Les commits locaux du 03/10 (`feat/pilotage-tranche1`) servent de référence, pas de source : l'entonnoir des offres n'est pas repris, « Issue des offres » consolidée le remplace.

## Décisions de conception (validées par Abel le 2026-10-08)

1. Les exports PDF et Excel des analyses détaillées perdent aussi les anciens taux (`winRate`, `tauxConversion`, `tauxGainGlobal`) : un seul chiffre par notion, y compris dans les fichiers.
2. Période par défaut : **12 mois glissants**. Le sélecteur unique garde les préréglages existants (30 jours, 90 jours, 6 mois, 1 an) et les dates libres.
3. Conflit statut / concurrent gagnant sur un marché historique : **le statut prime** ; l'incohérence est signalée par un compteur de qualité des données.
4. Approche de A2 (révisée le 2026-10-08) : marchés historiques **présentés à part, sans taux** ; taux de succès et de perte sur les seuls lots. Pas de type consolidé, pas de vue SQL.

## Tranche A1 — sans changement des règles de calcul

### Période unique
- L'état `periode` vit dans `PilotageClient` (défaut : 12 mois glissants, `startOfDay(subYears(now, 1))` → `endOfDay(now)`). Un seul `PeriodSelector` est rendu.
- `AnalytiquesTab` reçoit `periode` en prop, perd son état et son sélecteur ; ses exports PDF/Excel utilisent la prop.
- Les dates effectives (début – fin) sont affichées en clair en haut de page.

### Évolution retirée
- Supprimer de `lib/actions/pilotage.ts` : `periodeReference`, les calculs de référence, le champ `evolution` de `PilotageData` et des blocs.
- Supprimer `calculerEvolutionPoints` (et ses tests) de `lib/pilotage/calculs.ts`.
- Supprimer de `IndicateurCard` la prop `evolution` et la ligne qui l'affiche ; supprimer `libelleEvolution` et le paragraphe « Référence : mêmes dates de l’année précédente » dans `PilotageClient`.
- Critère de contrôle : la chaîne « Évolution indisponible » n'existe plus dans le dépôt.

### Anciens taux retirés (un chiffre par notion)
- Retirer `winRate` (global, par type, par autorité, par segment), `tauxConversion`, `tauxGainGlobal` et `lots` de `lib/analytics/types.ts` et de `lib/actions/analytics.ts`.
- Adapter `PerformanceSection`, `CapitalisationSection` (graphique `winRate`), `OpportunitesSection` et `lib/actions/analytics-exports.ts` (colonnes et lignes de synthèse).
- Les analyses détaillées gardent répartitions, montants, SAV, tops et saisonnalité.
- Un seul changement de type à la fois, suivi de `tsc` : le retrait touche des fichiers consommateurs nombreux ; l'ordre est types → actions → composants → exports.

### Détails complets (lots)
- `calculerIssueOffres` : `detail` liste **toutes** les issues (gagné, perdu, en attente, sans suite) ; chaque ligne porte `intitule`, `autorite`, `montantPropose`, `issue`, `concurrentGagnant`, `montantOffreConcurrent`, `ecartFcfa`, `ecartPct`, `motif`, `lien`.
- Intitulé : référence de l'opportunité, sinon objet ; puis « Lot n » ; puis autorité contractante. Une ligne ne s'affiche jamais sans intitulé (repli : objet, puis « Sans intitulé »).
- Lien : `/opportunites/<id>` pour un lot ; `/marches/<id>` pour un marché historique (A2).
- `LotPilotage` s'enrichit de `autorite`, `concurrentGagnant`, `motif`.
- Écart de prix : le détail reprend les mêmes lignes que l'issue ; le nombre de lignes égale le nombre annoncé.

### Conversion
- Facturé et encaissé restent affichés séparément ; les marchés perdus après attribution restent montrés à part.
- Ligne signalée « facturé au-delà du contractuel » quand `montantFacture(m) > m.montant × TOLERANCE_FACTURE`.
- Ligne signalée « récent » quand le marché est attribué depuis moins de **30 jours** et pas encore facturé. Le seuil de 30 jours est une hypothèse à faire valider par Abel avant la mise en ligne.

### États
- Période vide : message explicite. Moins de `MIN_CAS_ECART` (3) lots : « Pas assez de données » (déjà en place pour l'écart ; étendu au taux de succès par lot).
- Qualité des données : compteurs « toutes périodes », étiquetés comme tels, chacun avec un lien vers la liste des marchés concernés.

## Tranche A2 — portefeuille consolidé (révisée le 2026-10-08 après mesure de couverture)

### Constat qui change la conception
Mesure faite sur une copie locale du dump de production du 2026-10-02 (lecture seule) : la quasi-totalité des marchés sans opportunité liée n'a **aucun** `concurrentGagnant` renseigné ; le seul cas renseigné est un marché infructueux (le statut prime). La règle « perdu = concurrent gagnant renseigné » ne classe donc aucun marché historique en perdu. Les offres perdues d'avant les lots n'ont jamais été saisies comme marchés. Consolider un taux unique ajouterait des gagnés sans aucun perdu (biais de survie) et ferait grimper le taux de succès de façon trompeuse. Décision d'Abel : **séparer** (option 1).

### Principe
- Le **taux de succès et le taux de perte restent calculés sur les seuls lots** (données complètes). Aucun marché historique n'y entre.
- Les **marchés historiques** (sans opportunité liée, hors statuts avant dépôt) forment un bloc distinct « Marchés historiques » : nombre et montant par issue, **sans taux**, avec la mention explicite que les offres perdues d'avant les lots ne sont pas saisies.
- Un marché lié à une opportunité n'est jamais compté deux fois : ses lots le représentent.
- Pas de type consolidé `DossierOffre` ni de calcul unique : un seul calcul d'issue par lots (déjà en place) et une fonction de répartition des marchés historiques par issue.

### Issues d'un marché historique (le statut prime)
1. Statut attribué ou au-delà (`STATUTS_ATTRIBUES`) → `GAGNE`.
2. `ANNULE` ou `RESILIE` → `PERDU_APRES_ATTRIBUTION`.
3. `INFRUCTUEUX` → `SANS_SUITE`.
4. `OFFRE_DEPOSEE`, `EN_ATTENTE_ATTRIBUTION` ou `ATTRIBUE_PROVISOIREMENT` → `A_QUALIFIER`.
5. Un `concurrentGagnant` renseigné sur un marché des étapes 1 à 3 est compté selon son statut **et** ajouté au compteur de qualité `STATUT_CONCURRENT_INCOHERENT`. Sur un marché de l'étape 4, il ne change pas l'issue : le marché reste « à qualifier ».

### Rattachement à la période
- Date d'attribution, sinon date du dernier changement de statut (lue dans `historiqueStatuts`), sinon « exclu faute de date ».
- `historique_statuts.nouveauStatut` est en TEXT en production : toute comparaison de statut reste faite en mémoire, jamais en SQL.

### Affichage
- Bloc « Marchés historiques » sous l'issue des offres, avec lien par ligne vers `/marches/<id>`.
- Le libellé de qualité « Marchés sans opportunité liée (absents de l'issue des offres) » devient « Marchés historiques (sans opportunité liée), présentés à part, sans taux ».
- Nouveau compteur de qualité `STATUT_CONCURRENT_INCOHERENT`.

### Recoupement avant mise en ligne
- Calcul indépendant (SQL en lecture seule sur une copie restaurée du dump) du nombre et du montant de marchés historiques par issue. Écart attendu : nul.

## Tests
- Unitaires (`tests/unit/pilotage-calculs.spec.ts`) : une table de cas par règle d'issue, par règle de rattachement, par seuil (3 lots, 30 jours, +2 %), conflit statut/concurrent, marché lié à une opportunité non doublé.
- Retrait des tests d'évolution et des anciens taux.
- E2E : un seul sélecteur sur `/pilotage`, absence de « Évolution indisponible », nombre de lignes de chaque détail égal au nombre annoncé, accès refusé aux rôles VISITEUR et EXPLOITATION, pas de défilement horizontal à 375, 768 et 1920 px, contre une base de test locale (jamais la production).

## Irréversible et déploiement
- Aucun envoi d'e-mail ni migration dans A : la page est en lecture seule.
- Le merge sur `main` déclenche un déploiement de production automatique : accord d'Abel requis avant le push, balayage « dépôt public » du diff et des messages de commit (aucun chiffre réel de production dans le code, les tests ou les documents).
- Les chiffres de la page changent à la mise en ligne (période unique, portefeuille consolidé) : prévenir les lecteurs.
- A1 et A2 sont deux PR distinctes ; A2 n'est fusionnée qu'après le recoupement ci-dessus.
