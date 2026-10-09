# Pilotage B — Veille concurrentielle (conception technique)

Entrée : `docs/PRD-pilotage-b.md` (local, non versionné). Base : `origin/main` (`0a489a3`), branche `feat/pilotage-b`. Lecture seule : aucune modification du schéma ni des données, aucun envoi d'e-mail.

## Décisions de conception (validées par Abel le 2026-10-08)

1. **Lots perdus seulement.** La Veille ne lit que les lots perdus, seuls porteurs de toutes les données (concurrent, montant du concurrent, motif, autorité, véhicules proposés). Les marchés historiques sont exclus : la mesure faite pour A2 a montré qu'aucun marché sans opportunité n'a de concurrent gagnant renseigné sur un statut perdu, et un marché n'a ni montant du concurrent ni statut « perdu face à un concurrent ». La page affiche un message : les pertes d'avant les lots ne sont pas saisies. Les marchés historiques s'ajouteront quand la saisie du concurrent (sous-projet C) existera. Cela écarte l'histoire 11 du PRD.
2. **Angle « par véhicule »** : classement par **combinaison** de véhicules du lot. Une perte = une ligne, jamais comptée deux fois.
3. **Seuil de 3 lots documentés** : appliqué **par ligne de classement** (concurrent, autorité, combinaison) et à l'écart global de la période. Sous le seuil, la ligne affiche « pas assez de lots » ; ses pertes restent listées avec leur écart ligne par ligne.
4. **Période dans l'adresse** : `/pilotage` et `/veille` lisent et écrivent la période dans l'URL (`?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ`) ; les liens entre les deux pages la conservent.

## Population

- Lots au résultat `PERDU` dont l'opportunité est au statut offre soumise ou ultérieur et dont la date de dépôt (`dateLimite` de l'opportunité) tombe dans la période. Mêmes règles que `calculerIssueOffres` / `calculerEcartPrix` de `/pilotage`.
- Un lot soumis perdu sans date de dépôt est **exclu** et compté à part (« exclus faute de date »), avec lien vers l'opportunité.
- Un lot est **documenté** s'il a un nom de concurrent, le montant du concurrent (> 0) et notre montant proposé (> 0). Sinon il est **non documenté** ; la liste indique ce qui manque : concurrent, montant du concurrent, notre montant, motif.
- Le motif manquant ne rend pas un lot non documenté : il est signalé comme information manquante sur la ligne.
- **Couverture** : « X lots sur Y documentés », où Y = lots perdus de la période (hors exclus faute de date) et X = lots documentés. Toujours visible. Invariant testé : X + nombre de lignes « non documentées » = Y.

## Calculs (`lib/veille/calculs.ts`, fonctions pures)

### Écart d'un lot
- Écart (%) = (notre offre − offre du gagnant) ÷ offre du gagnant ; positif quand STAM était plus chère. Écart (FCFA) = notre offre − offre du gagnant.
- Les moyennes se font sur les valeurs **non arrondies** (comme `calculerEcartPrix`) ; l'arrondi n'intervient qu'à l'affichage.
- Écart moyen d'une ligne : affiché seulement si la ligne a au moins `MIN_CAS_ECART` (3) lots documentés ; sinon `null` et message « pas assez de lots ».

### Regroupement des noms de concurrents
Normalisation d'un nom, dans cet ordre : minuscules, retrait des accents, remplacement de la ponctuation par des espaces, suppression des formes juridiques courantes (liste fermée et testée : SARL, SARLU, SA, SAS, SUARL, SCS, ETS, ETABLISSEMENT(S), STE, SOCIETE, CIE, COMPAGNIE, LTD, GROUPE, GIE), puis réduction des espaces multiples. Deux noms de même forme normalisée forment **une seule ligne** de classement.
- Nom affiché : l'orthographe brute la plus fréquente du groupe ; à égalité, la plus longue, puis l'ordre alphabétique.
- Un nom qui devient vide après normalisation reste dans son orthographe brute (pas de groupe vide).
- **Doublons possibles** : paires de groupes non fusionnés dont les formes normalisées (au moins 5 caractères chacune) diffèrent de 2 lettres au plus (distance de Levenshtein), ou dont l'une est le début de l'autre au mot près. Ils sont listés avec le nombre de lots de chaque groupe ; jamais fusionnés automatiquement (la fusion mémorisée est le sous-projet C). La correction se fait à la source, en modifiant le lot.

### Les quatre angles
Chaque perte documentée figure **une seule fois** dans chaque angle ; chaque perte non documentée figure uniquement dans « non documentées ».
- **Concurrent** : par groupe de noms. Colonnes : lots gagnés contre nous, valeur de **nos offres perdues** (somme des montants proposés), valeur gagnée par lui (somme de ses montants), autorités concernées, écart moyen (% et FCFA) si au moins 3 lots.
- **Autorité contractante** : par `autoriteContractante` de l'opportunité (texte brut, regroupé avec la même normalisation de casse, d'accents et d'espaces). Pour chacune, qui a gagné et à quel prix, avec écart moyen au-delà de 3 lots.
- **Véhicule proposé** : la clé est la liste triée des « marque modèle » du lot (normalisés comme les noms ; quantités et prix ignorés), affichée avec l'orthographe d'origine, par exemple « Isuzu D-Max + Toyota Hilux ». Un lot sans véhicule proposé est rangé sous « Véhicule non renseigné » (et signalé comme information manquante). Écart moyen au-delà de 3 lots.
- **Chronologie** : toutes les pertes (documentées ou non, repère visuel pour les non documentées), la plus récente d'abord, selon la date de dépôt.

### Ligne de perte
Chaque ligne porte : intitulé du lot (`intituleLot`), autorité, notre montant, montant du concurrent, écart (% et FCFA), motif tel quel (lu sans classement), concurrent, véhicules, lien `/opportunites/<id>`.

### Écart global
Moyenne sur les lots documentés de la période, mêmes règles de seuil. Il peut différer de l'écart de `/pilotage` quand un lot a les deux montants sans nom de concurrent (non documenté ici, comptabilisé là-bas) : l'écran Veille l'indique par la couverture. Test d'égalité des deux écarts quand tous les lots ayant des montants ont aussi un nom de concurrent.

## Accès aux données (`lib/actions/veille.ts`)

- `getVeilleData({ dateDebut, dateFin })` : `requireRole(['ADMIN', 'AVANCE'])`, période validée par Zod (comme `getPilotageData`).
- Lecture seule : `prisma.lot.findMany` avec `numero`, `resultat`, `montantPropose`, `montantOffreConcurrent`, `motifPerte`, `concurrentGagnant`, `vehiculesProposes { marque, modele }`, et l'opportunité (`id`, `reference`, `objet`, `statut`, `dateLimite`, `autoriteContractante`). Le filtre de période et de statut se fait **en mémoire** (volume de quelques centaines de lignes ; aucune comparaison SQL sur une colonne de statut, ce qui évite le piège texte/enum de `historique_statuts`).
- Un seul calcul (`capturerOperation`) : en cas d'échec, la page affiche « Veille indisponible. Réessayez. » et un bouton « Réessayer ». Il n'y a pas d'isolation par bloc, contrairement à `/pilotage` : tous les angles viennent de la même liste de pertes.
- Aucune modification de `lib/actions/pilotage.ts` ni de `lib/pilotage/calculs.ts`. Le seuil `MIN_CAS_ECART` est réutilisé par import.

## Page et navigation

- Route `app/(dashboard)/veille/page.tsx` : garde de rôle identique à `/pilotage` (`requireRole(['ADMIN','AVANCE'])`, redirection vers `/` sinon). Visiteurs et exploitation n'y accèdent pas, y compris par adresse directe.
- Menu : entrée « Veille » dans `dashboard-shell.tsx` (rôles ADMIN et AVANCE) et titre de page.
- **Période dans l'URL** : un petit hook partagé `usePeriodeUrl` (défaut : 12 mois glissants, mêmes bornes que `/pilotage`) lit `debut` et `fin` des paramètres d'adresse, les écrit au changement du `PeriodSelector`, et ignore les valeurs invalides (retour au défaut). `PilotageClient` l'utilise à la place de son état local ; ses calculs ne changent pas. Les liens « Voir la veille » (depuis `/pilotage`) et « Retour au pilotage » (depuis `/veille`) portent les mêmes paramètres.
- **Composition de la page** : en haut le sélecteur et le rappel des dates effectives ; la couverture ; le message sur les pertes d'avant les lots ; quatre onglets (Concurrent, Autorité, Véhicule, Chronologie) ; bloc « Non documentées » (liste avec ce qui manque) ; bloc « Doublons possibles ».
- **États** : chargement (squelettes) ; période sans perte → message « Aucune perte sur cette période » (pas une panne) ; moins de 3 lots → « pas assez de lots » ; erreur partielle ou totale avec « Réessayer ».
- **Responsive** : lignes en grille sur grand écran, **cartes** empilées sous 768 px (un seul rendu, adapté par CSS) ; aucun défilement horizontal à 375, 768 et 1920 px ; contrôles de 44 px minimum, atteignables au clavier (onglets, liens, bouton « Réessayer »).

## Tests

- **Unitaires** (`tests/unit/veille-calculs.spec.ts`, `playwright.unit.config.ts`) : normalisation (casse, accents, ponctuation, espaces, chaque forme juridique de la liste) ; deux orthographes → une seule ligne ; choix du nom affiché ; doublons possibles (limite à 2 lettres, début au mot près, noms de moins de 5 caractères) ; documenté / non documenté pour chaque champ manquant ; seuil de 3 lots à 2, 3 et 4 lots ; chaque perte une seule fois dans chaque angle (clé « combinaison » avec 1, 2 et 3 véhicules, lot sans véhicule) ; couverture = X + non documentées = Y ; période vide ; lot sans date exclu ; égalité de l'écart global avec `calculerEcartPrix` dans le cas sans conflit de nom.
- **E2E** (contre la base de test locale `127.0.0.1:5433`, jamais la production) : accès refusé à VISITEUR et EXPLOITATION ; période conservée dans les deux sens ; message de période vide ; pas de défilement horizontal à 375, 768 et 1920 px ; navigation au clavier. Chaque test nettoie ses données `[E2E…]`.
- Contrôle visuel du Browser pane aux trois largeurs, console sans erreur.

## Recoupement avant mise en ligne

Calcul indépendant (SQL en lecture seule sur une copie restaurée du dump de production, dans un conteneur temporaire supprimé ensuite) du nombre de lots perdus, des lots documentés et de l'écart moyen par concurrent. Écart attendu : nul. Une copie plus ancienne est acceptable : on compare le calcul de l'application à une requête indépendante sur les mêmes données.

## Irréversible et déploiement

- Aucune migration, aucun envoi d'e-mail : la page est en lecture seule.
- Le merge sur `main` déclenche un déploiement de production automatique : accord d'Abel avant le push, balayage « dépôt public » du diff et des messages de commit (aucun chiffre, nom de concurrent ni autorité réels dans le code, les tests, les documents ou les captures).
- Repli : déploiement précédent de Vercel.
- La période devient partageable par l'adresse sur `/pilotage` : changement visible pour les utilisateurs, à mentionner dans la PR.

## Hors périmètre (rappel du PRD)

Fiche concurrent et nouvelle saisie (sous-projet C), fusion mémorisée de noms, classement automatique des motifs, toute écriture depuis la page, alertes et e-mails, données externes, **marchés historiques** (décision 1 ci-dessus).
