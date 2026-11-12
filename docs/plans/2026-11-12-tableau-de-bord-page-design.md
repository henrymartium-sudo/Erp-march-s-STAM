# Livraison 7 — Nouvelle page d'accueil (tableau de bord) : design

**Date** : 2026-11-12 · **Branche** : `feat/tableau-de-bord-page` (part de `main` = `ed1e0a4`, avec deux commits de correction des données déjà faits : `2b9d091`, `57731e0`).

**Sources qui font foi** (ne pas les redécider) :
- Cadrage : `docs/plans/2026-11-11-simplification-modules-et-tableau-de-bord-design.md` §3 (intention, principes) et §4 (livraison 7).
- Maquette validée, version 3 : https://claude.ai/code/artifact/f0633563-e57a-4bd0-8ab0-d26e2c4892d3 (mélange A + C).
- Données : livraison 6, `getTableauDeBordData()` dans `lib/actions/tableau-de-bord.ts`, type `TableauDeBordData` ; règles dans `lib/tableau-de-bord/` ; plan `docs/plans/2026-11-12-donnees-tableau-de-bord-plan.md`.
- Journal de décisions (vault Obsidian, hors dépôt), entrées du 2026-11-12 : maquette A + C, règles des cinq voyants, retard d'une facture compté depuis son échéance, montants et passation masqués selon le rôle, factures sans date hors du taux de retard, caution en attente de mainlevée comptée dans le voyant.

## 1. Intention

La page d'accueil répond à deux questions, dans cet ordre : **« Qu'est-ce que je dois faire maintenant ? »**, puis **« Est-ce que l'activité va bien ? »**. Elle sert l'action quotidienne ; l'analyse vit dans `/pilotage`. Elle remplace l'actuelle page `/` (`app/(dashboard)/page.tsx`), qui fait l'inventaire sans juger (camemberts, montants mensuels, etc.).

Réussite : en ouvrant l'application, on voit en premier ce qui est en retard ou ne se rattrape pas, et chaque ligne ou chiffre mène à la fiche ou à la liste où agir.

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Brancher la page `/` sur `getTableauDeBordData()`, conformément à la maquette v3.
- Retirer l'ancienne page et ses composants devenus orphelins.
- Respecter les droits par rôle déjà appliqués côté serveur.

**Non-objectifs**
- Aucune nouvelle règle de calcul : les règles de `lib/tableau-de-bord/` font foi. Si l'affichage révèle un défaut de règle, on le signale au lieu de recalculer dans l'interface.
- Aucune migration de base, aucun envoi d'e-mail touché.
- Le menu regroupé (livraison 4) n'est pas dans cette livraison.

**Anti-objectifs** (échec même si « ça marche »)
- Un chiffre affiché à `/` qui diffère de la même notion dans `/pilotage`.
- Un montant ou une donnée de passation visible par un rôle qui n'y a pas droit, y compris dans le HTML envoyé au navigateur.
- Un bloc en erreur qui fait tomber toute la page.
- Un débordement horizontal à 375 px.

## 3. Structure de la page (de haut en bas, une seule colonne)

1. **En-tête** : titre « Tableau de bord », date du jour, bouton principal « Nouvelle opportunité » et menu « Créer… » (marché, caution, véhicule, facture), comme sur la maquette.
2. **Filtre** : « Tout / Passation / Exécution et finances ». Il s'applique à toute la page : lignes « À traiter » selon leur `domaine`, voyants selon leur domaine, pipeline côté passation.
3. **À traiter** (`aTraiter`) :
   - en tête, des compteurs par horizon (en retard, cette semaine, ce mois-ci) ;
   - des groupes **En retard**, **Cette semaine**, puis **Ce mois-ci** replié, dont l'en-tête annonce le nombre d'échéances et « dont N sans rattrapage » ;
   - l'ordre des lignes est celui renvoyé par le serveur (horizon, puis « sans rattrapage » en tête, puis échéance) ;
   - une ligne affiche une icône par nature, le libellé de la nature, la référence, le montant s'il n'est pas `null`, le délai (« Échue depuis 12 j », « J-4 ») et la date, une marque « Sans rattrapage » si besoin, et un **verbe d'action** propre à la nature (voir §5). Toute la ligne mène à `href` ;
   - en bas, un **encadré « Données manquantes »** (`manquants`) : opportunités sans date de dépôt, marchés en attente de livraison sans date de livraison prévue, factures sans date. Chacun mène à sa fiche ;
   - si rien n'est à traiter, un message clair, jamais un vide.
4. **Est-ce que ça va ?** (`voyants`) : les cinq voyants, avec l'état (vert, ambre, rouge, gris) montré par une icône **et** un texte (pas seulement par la couleur), la valeur, une ligne de détail et le seuil en clair. Chaque voyant mène à sa liste filtrée (voir §5). Pour le voyant « Encaissements », s'il y a des factures sans date : mention « N factures non datées, non comptées ».
5. **Pipeline des offres** (`pipeline`) : une barre par phase (nombre, et montant s'il n'est pas `null`), puis le total. Chaque phase mène à la liste des opportunités filtrée sur la phase, et le bloc a un lien « Toutes les opportunités ».

## 4. Rôles

Le serveur renvoie `null` pour un bloc auquel le rôle n'a pas droit, et `montant: null` quand les montants sont masqués (`lib/tableau-de-bord/droits.ts`). L'interface suit ces règles :

- **Un bloc `null` disparaît** : ni cadre vide, ni cadenas.
- **Un `montant: null`** : la colonne ou la mention du montant disparaît, sans « — » ni 0.
- **VISITEUR** : tout sauf les montants ; les voyants « Encaissements » et « Reste à facturer » disparaissent (blocs `null`).
- **EXPLOITATION** : exécution seulement. Pas de pipeline, de dépôts, de taux de succès ni de montants. Le filtre est fixé sur « Exécution et finances » et n'est pas affiché.
- **ADMIN, AVANCE** : tout.
- Les boutons « Nouvelle opportunité » et « Créer… » ne proposent que ce que le rôle a le droit de créer, selon les règles de permission existantes de chaque module.

## 5. Ce qui reste au constructeur

- Composants : shadcn/ui et les jetons de style existants (`globals.css`, `tailwind.config.ts`) ; la maquette donne la mise en page, pas une palette nouvelle. Pas de nouvelle bibliothèque.
- Découpage serveur/client : le filtre et le repli « Ce mois-ci » sont interactifs ; le reste peut être rendu côté serveur.
- Verbe d'action par nature (`NatureEcheance`), inspiré de la maquette : Relancer (facture échue), Mettre à jour la livraison, Passer en exécuté (à clôturer), Demander la mainlevée (garanties et caution à libérer), Finaliser le dossier (dépôt), Proroger ou classer (fin de validité), Renouveler (caution), Suivre (attribution provisoire).
- Lien de chaque voyant vers sa liste : utiliser les filtres d'URL existants des listes (factures, cautions, opportunités, marchés). Si une liste n'a pas le filtre voulu, viser la liste la plus proche et le noter, sans ajouter de filtre dans cette livraison.
- États de chargement (squelette) et d'erreur par bloc, sur le modèle de `/pilotage`.
- Suppression des composants de `components/dashboard/` devenus orphelins, et des fonctions de statistiques qui ne servent plus qu'à l'ancienne page, après vérification qu'aucun autre appelant n'existe.

## 5 bis. Points tranchés après relecture

Choix de Claude, à vérifier par Abel à la lecture :

1. **Lien des phases du pipeline = exactement les lignes comptées.** Aujourd'hui `calculerPipeline` renvoie `/opportunites?statut=<STATUT>`, alors que deux phases regroupent deux statuts : « En analyse » = `EN_ANALYSE` + `IDENTIFIEE`, et « Offre soumise » = `OFFRE_SOUMISE` + `SOUMISE`. Le clic sur « 5 » pourrait donc ouvrir une liste de 3 lignes. C'est le défaut « chiffre ≠ liste » déjà corrigé dans `/pilotage` (PR #38, #39). Correction : le filtre `statut` de la liste des opportunités (`lib/utils/opportunite-filters.ts`) accepte plusieurs statuts séparés par des virgules, et le `href` de chaque phase liste tous ses statuts (`inclut`). C'est la seule entorse à « aucune règle de calcul nouvelle » : le calcul ne change pas, seul le lien change. Test unitaire à l'appui.
2. **Filtre « Tout / Passation / Exécution et finances »** :
   - son état vit dans l'URL (`?vue=passation|execution`), comme les autres filtres de l'application ; il survit au rechargement et se partage ;
   - les lignes « À traiter » suivent leur `domaine` ; les compteurs d'horizon et l'en-tête de « Ce mois-ci » comptent les lignes visibles ;
   - les « Données manquantes » suivent leur domaine : opportunités côté passation, marchés et factures côté exécution ;
   - voyants : Encaissements, Cautions et Reste à facturer côté exécution (comme sur la maquette) ; Taux de succès et Dépôts côté passation ; le pipeline côté passation.
3. **Le verbe d'action est un simple libellé** : toute la ligne est un lien vers la fiche, où l'action se fait. Aucune action serveur nouvelle, aucune mutation depuis la page d'accueil.
4. **Cohérence avec `/pilotage`** : la seule notion commune est le taux de succès (`calculerIssueOffres`, déjà partagé). Le test E2E vérifie que le taux affiché à `/` est celui de `/pilotage` sur la même période ; en cas d'écart, `/pilotage` fait foi et c'est un défaut.
5. **Ce qui disparaît sans reprise** : le cadrage §3 liste déjà ce qui est retiré (camemberts, montants mensuels, CA effectif, activité récente, actions rapides). L'ancien bloc « Alertes et échéances » (cautions qui expirent sous 30 jours, marchés dont la fin prévue tombe dans les 60 jours) est remplacé par « À traiter » et le voyant Cautions. Les marchés en fin d'exécution *proche*, mais pas encore dépassée, ne sont plus signalés : c'est conforme à la règle validée le 2026-11-12 (« à clôturer » = fin prévue dépassée).

## 6. Vérification attendue

- Tests E2E par rôle (ADMIN, VISITEUR, EXPLOITATION) sur la base de test locale, via le skill `base-test` : blocs présents ou absents, aucun montant pour VISITEUR et EXPLOITATION, aucune donnée de passation pour EXPLOITATION, filtre, repli « Ce mois-ci », liens.
- Contrôle aux trois tailles (1920, 768, 375) et au clavier ; revue UI/UX (agent `ui-ux-reviewer`).
- `tsc`, ESLint (plafond actuel), tests unitaires et build verts, comme en CI.
- Mise en production avec le protocole habituel, sur accord explicite d'Abel (la fusion sur `main` déploie).
