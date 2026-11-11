# Analyses : listes de statuts en situation actuelle — plan

> **Pour l'exécutant :** utiliser `superpowers:executing-plans` (ou `subagent-driven-development`). Les étapes sont à cocher. Production : protocole `disciplined-execution` (`production-steps.md`), un feu vert d'Abel par geste.

**Objectif :** dans l'onglet Analyses de `/pilotage`, « Marchés par statut », « Opportunités par statut » et « Top 10 Autorités Contractantes » montrent la situation **actuelle** (toutes dates), et chaque chiffre reste égal au nombre de lignes de son détail.

**Pourquoi :** un statut est un état d'aujourd'hui. Le filtrer par date de notification (marchés) ou de création (opportunités) fait disparaître les marchés anciens encore « En exécution » et les offres anciennes encore en attente. Constaté par Abel en production le 2026-11-11, juste après le correctif « chiffre ≠ liste » (PR #38, `06cad93`), qui avait aligné les listes sur ces compteurs mal définis.

**Architecture :** les deux fonctions de statistiques existent déjà et filtrent par `Periode`. L'écran leur passe une période « illimitée » pour ces deux zones ; le SAV garde la période choisie. Les exports PDF/Excel appellent les mêmes fonctions avec la vraie période : ils ne changent pas. Les trois actions de détail redeviennent sans période (comme avant le PR #38), ce qui garantit que chiffre et liste coïncident : même filtre « tous, hors Opportunité identifiée pour les marchés ».

**Spec :** décisions d'Abel du 2026-11-11 dans le fil (listes de statuts = situation actuelle, Top 10 autorités aussi ; périmètre limité à ces trois listes ; Indicateurs, Veille et SAV vérifiés : cohortes ou activité de la période, la période y est voulue).

## Contraintes globales

- Dépôt public : aucun secret, chemin local ni donnée client dans le diff ni les messages de commit.
- Aucune migration, aucun e-mail, aucun accès direct à la base de production.
- Tests E2E sur la base locale uniquement, par le skill `base-test` (pour plusieurs specs, passer la liste par `-Command` et non `-File`, qui ne découpe pas la virgule ; `-SansBuild` seulement si le code n'a pas changé depuis le dernier build). Build requis après toute modification du code (~6 min).
- Rôles : l'onglet reste ADMIN/AVANCE (`getAnalyticsAffichees` garde `requireRole`).
- Dashboard (`components/dashboard/status-charts.tsx`) : comportement inchangé.

## Focus de revue

- Un marché notifié il y a plus de 12 mois, statut « En exécution » : compté et listé.
- Une opportunité créée il y a plus de 12 mois, statut « Perdue » ou « Offre soumise » : comptée et listée.
- Un marché « Opportunité identifiée » : jamais compté ni listé dans les statuts de marché.
- Une autorité dont toutes les opportunités sont anciennes : présente dans le Top 10 avec le bon nombre.
- Les exports PDF/Excel des Analyses : inchangés (toujours sur la période).
- Le bandeau « Tous les chiffres de la page portent sur la période » ne doit pas mentir sur ces trois listes.

## Fichiers

- Modifier `lib/actions/analytics.ts` : `getAnalyticsAffichees`.
- Modifier `lib/actions/drill-down.ts` : retirer le paramètre `periode` du PR #38 (orphelin) et `autoriser`.
- Modifier `lib/analytics/filtres.ts` : constante `PERIODE_ILLIMITEE`.
- Modifier `components/analytique/{AnalytiquesTab,PerformanceSection,OpportunitesSection}.tsx` : retirer la prop `periode` devenue inutile, libellés.
- Modifier `app/(dashboard)/pilotage/PilotageOnglets.tsx` : bandeau de l'onglet Analyses.
- Tester `tests/v1/pilotage.spec.ts`.

---

### Tâche 1 : les trois listes en situation actuelle

**Interfaces :**
- Produit : `PERIODE_ILLIMITEE: Periode` dans `lib/analytics/filtres.ts` (`dateDebut = new Date(0)`, `dateFin = new Date('9999-12-31T23:59:59.999Z')`).
- Produit : `getAnalyticsAffichees(periode: Periode)` garde sa signature ; `performance` et `opportunites` sont calculés avec `PERIODE_ILLIMITEE`, `sav` avec `periode`.
- Produit : `getMarchesByStatut(statut: string)`, `getOpportunitesByStatut(statut: string)`, `getOpportunitesByAC(ac: string)` sans paramètre de période, `requireAuth` comme avant le PR #38 ; `LIMITE_DETAIL` conservée.

- [ ] **Étape 1 : écrire les tests qui échouent** dans `tests/v1/pilotage.spec.ts`, bloc « le chiffre annoncé est le nombre de lignes du détail » (il sème déjà un marché `ancien` à 800 jours, `EN_EXECUTION`, et deux opportunités `PERDUE` à 800 et 801 jours, même autorité) :
  - `la liste « Marchés par statut » compte et liste un marché ancien encore en exécution` : ouvrir la ligne « En exécution », attendre le dialogue, `expect(dialogue.getByText('[E2E-LISTES] ancien')).toBeVisible()`.
  - `« Opportunités par statut » et « Top 10 » comptent les opportunités anciennes` : ouvrir « Perdue », le détail contient `[E2E-LISTES] opportunité 800` et `[E2E-LISTES] opportunité 801` ; ouvrir la ligne `Autorité Listes E2E` du Top 10 : le chiffre annoncé vaut 6.
  - Le test existant « annonce autant que son détail » reste tel quel.
- [ ] **Étape 2 : lancer et constater l'échec** — `-Specs tests/v1/pilotage.spec.ts` : les deux nouveaux tests échouent (marché et opportunités anciens absents des compteurs).
- [ ] **Étape 3 : implémenter** `PERIODE_ILLIMITEE`, l'usage dans `getAnalyticsAffichees`, et le retrait du paramètre `periode` des trois actions (`git diff b459c25^ -- lib/actions/drill-down.ts` donne l'état d'avant) ; retirer la prop `periode` de `PerformanceSection` et `OpportunitesSection` et le passage depuis `AnalytiquesTab`.
- [ ] **Étape 4 : vérifier** — `npx tsc --noEmit` sans erreur ; relancer `pilotage`, `v2-analytiques`, `veille` : tout vert (3 tests « annonce autant » et 2 nouveaux).
- [ ] **Étape 5 : commit local** `fix(pilotage): les listes de statuts des Analyses montrent la situation actuelle`.

### Tâche 2 : libellés et bandeau honnêtes

**Interfaces :** consomme la tâche 1 ; ne change aucune donnée.

- [ ] **Étape 1 : écrire le test qui échoue** : sur `/pilotage?onglet=analyses`, les trois listes ont un sous-titre « Situation actuelle, toutes dates » (`getByRole('list', { name: 'Marchés par statut' })` accessible, sous-titre visible dans sa carte) ; le bandeau de l'onglet Analyses ajoute « Dans les Analyses, les listes de statuts montrent la situation actuelle, toutes dates. » ; sur les onglets Indicateurs et Veille le bandeau reste identique (le test existant « un seul sélecteur de période » reste vert).
- [ ] **Étape 2 : lancer, constater l'échec.**
- [ ] **Étape 3 : implémenter** : `ListeAnalyse` reçoit un sous-titre optionnel (`sousTitre?: string`) affiché sous le titre ; les messages vides deviennent « Aucun marché. » et « Aucune opportunité. » dans `PerformanceSection` et `OpportunitesSection` ; `PilotageOnglets.tsx` ajoute la précision au bandeau quand l'onglet actif est Analyses.
- [ ] **Étape 4 : vérifier** — `pilotage`, `v2-analytiques`, `veille` verts ; lint sans erreur ; 413 tests unitaires.
- [ ] **Étape 5 : commit local** `fix(pilotage): le bandeau et les listes disent « situation actuelle »`.

### Tâche 3 : contrôles et mise en production

- [ ] **Étape 1 : Dashboard** — lancer `tests/dashboard/kpi-cards.spec.ts` et un spec du Dashboard qui ouvre un détail de statut s'il existe ; sinon vérifier à la main qu'un clic sur un statut du Dashboard liste toujours des marchés (le Dashboard n'est pas modifié).
- [ ] **Étape 2 : balayage dépôt public** du diff et des messages de commit, PR vers `main`, porte `qualite` verte.
- [ ] **Étape 3 : mise en production** avec le feu vert d'Abel (push, fusion, déploiement automatique), puis sondes publiques et journaux d'erreur.
- [ ] **Étape 4 : demander à Abel** la lecture connectée : un marché ancien en exécution apparaît, chiffre et liste coïncident.
- [ ] **Étape 5 : trace** — plan et mémoire projet à jour ; brouillon Journal montré, jamais écrit sans son « validé ».

## À confirmer par Abel (valeur par défaut retenue)

- **Exports PDF/Excel des Analyses** : restent sur la période choisie (rapport d'activité). Écart assumé avec l'écran, qui montre la situation actuelle pour ces trois listes. Changer ce choix = tâche à part (dette X1).
- **SAV** : reste sur la période. Une vue « interventions encore ouvertes » n'est pas dans ce plan.
- **Date de dépôt** (Indicateurs, Veille) : c'est l'échéance de l'opportunité (`dateLimite`), pas la date réelle de dépôt. Hors périmètre ; à décider séparément.

## Avancement

- **2026-11-11, tâches 1 et 2 faites en local** : test rouge d'abord (2 nouveaux tests en échec, 3 « annonce autant » verts), puis 35/35 E2E sur `pilotage`, `v2-analytiques`, `veille`, typecheck et lint sans erreur. Un seul commit de code pour les deux tâches (les modifications des sections se recouvrent). Le détail du Dashboard est identique à l'état d'avant le PR #38 (seul `LIMITE_DETAIL` remplace 50). Tâche 3 (balayage, PR, production, lecture d'Abel) : en attente du feu vert d'Abel.
