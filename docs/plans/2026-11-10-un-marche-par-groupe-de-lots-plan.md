# Un marché par groupe de lots gagnés — Plan d'implémentation

> **Pour l'exécutant** : exécuter avec le skill `disciplined-execution` (choix d'Abel, 2026-11-10), qui route vers `superpowers:executing-plans` ou `superpowers:subagent-driven-development` selon la complexité. Les cases `- [ ]` suivent l'avancement.

**Objectif** : permettre de créer un marché pour n'importe quel sous-ensemble de lots gagnés d'une opportunité (un lot, plusieurs, tous), et de retirer un lot d'un marché pour corriger un regroupement.

**Architecture** : nouveau lien `Lot.marcheId` ; création de marché pilotée par une sélection de lots (`lotIds`) ; gel des résultats et des véhicules **par lot** (lot rattaché = figé) ; action de retrait d'un lot avec montant recalculé ; fonctions pures dans `lib/utils/` testées en unitaire.

**Stack** : Next.js 15 (Server Actions), Prisma 7, PostgreSQL, shadcn/ui, Playwright (E2E sur base locale via le skill `base-test`).

**Design** : `docs/plans/2026-11-10-un-marche-par-groupe-de-lots-design.md` (décisions D1 à D10).

## Contraintes globales

- Base de production : **sauvegarde avant toute migration**, jamais après ; aucune autre écriture en prod que la migration (le correctif du marché existant est fait par Abel depuis l'interface).
- Dépôt **public** : aucun numéro de marché, montant, nom réel ni chemin local dans le code, les tests, les messages de commit ou la PR.
- Aucun envoi d'email déclenché ; aucun cron touché.
- Rôles : toute action d'écriture vérifie `canWrite` (comme `lots.ts`) ; validation Zod côté serveur.
- Pas de nouvelle bibliothèque UI : shadcn/ui existant (`Dialog`, `Checkbox`).
- Tests E2E uniquement via le skill `base-test` (`.env.test` chargé) ; interface vérifiée à 1920, 768 et 375 px.
- Textes en français ; commits `feat(...)`/`fix(...)` en français, trailer `Co-Authored-By` demandé par la session.
- Branche à partir d'un `origin/main` à jour (le `main` local diverge : 1 commit d'avance, 3 de retard). Le commit local `8db51aa` (CLAUDE.md : renvoi vers le skill `base-test`) n'est pas sur `origin/main` : demander à Abel s'il faut le reprendre (cherry-pick) avant de s'appuyer sur ses consignes.
- **Clôture automatique** (accord d'Abel, 2026-11-10) : protocole du skill `disciplined-execution`, `references/auto-closure.md`, à lire en entier à la reprise et à chaque fin de tâche. Activée par la section « Clôture automatique » ajoutée au `CLAUDE.md` à la tâche 1. Fin de chaque tâche vérifiée (Tasks 1 à 8) : commit local, mémoire, brouillon Journal dans le journal du plan, handoff de 4 Ko au plus (`.claude/handoffs/`, git-ignoré) avec la ligne `Suite automatique : tâche N+1 du plan docs/plans/2026-11-10-un-marche-par-groupe-de-lots-plan.md`, dernière ligne de la réponse `TÂCHE CLOSE : <chemin du handoff>`. Trois arrêts seulement (`ARRÊT : <raison>`) : vérification ratée ou budget de diagnostic épuisé ; geste distant (chaque étape de la tâche 9 : sauvegarde de production, migration, push, PR, fusion) ; fin de ticket (tâche 10). Le garde de production n'est pas actif hors orchestration : « aucun push ni geste distant par la chaîne » repose sur cette consigne seule.
- Journal du plan : `.superpowers/sdd/2026-11-10-un-marche-par-groupe-de-lots-plan/progress.md` (git-ignoré), avec la section `## Brouillon Journal consolidé` en fin de fichier ; l'entrée du Journal de décisions du 2026-11-10 est déjà écrite (validée), ne pas la répéter.

## Revue ciblée (cas non évidents, un test chacun)

1. Deux créations de marché sur le même lot (double clic, deux onglets) → la seconde est refusée (Task 3, Task 8).
2. `lotIds` vide, ou contenant un lot non gagné, déjà rattaché ou d'une autre opportunité → refus clair (Task 2, Task 3).
3. Retrait du dernier lot d'un marché, ou d'un marché avec facture / statut avancé → refusé (Task 2, Task 6).
4. Objet du marché modifié à la main → conservé au retrait d'un lot ; numéro jamais touché (Task 2).
5. Suppression d'un marché → ses lots redeviennent libres et le bouton « Créer le marché » réapparaît, même si `Opportunite.marcheId` est vide alors qu'un autre marché existe (Task 8).
6. Opportunité à un seul lot : l'objet du marché reste sans suffixe, comportement identique à l'actuel (Task 2).
7. Marché préexistant converti en opportunité : la création depuis les lots reste refusée et ses lots ne sont pas figés (Task 2, Task 3).

## Fichiers

| Fichier | Rôle |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261110120000_lot_marche/migration.sql` | lien `Lot.marcheId` + reprise des données |
| `lib/utils/lots.ts` | règles pures : sélection, objet/montant, gel par lot, retrait |
| `lib/utils/marche-numero.ts` | numéro provisoire suivant |
| `lib/actions/opportunites.ts` | `createMarcheFromOpportunite` avec sélection |
| `lib/actions/marche-lots.ts` (nouveau) | `apercuRetraitLot`, `retirerLotDuMarche` |
| `lib/actions/lots.ts`, `lib/actions/vehicules-proposes.ts` | gel par lot |
| `components/opportunites/*`, `app/(dashboard)/opportunites/[id]/page.tsx` | dialogue de création, « Marchés liés », badge marché par lot |
| `components/marches/marche-detail.tsx` (+ composant `marche-lots-section.tsx`) | « Lots couverts » + retrait |
| `lib/actions/analytics.ts`, `lib/actions/exports.ts` | lectures multi-marchés |
| `tests/unit/lots.spec.ts`, `tests/unit/marche-numero.spec.ts`, `tests/v1/lots-dossiers.spec.ts`, `tests/v1/vehicules-proposes.spec.ts` | tests |

---

### Task 1: Branche, base de référence, schéma et migration

**Files:** Modify `prisma/schema.prisma` ; Create `prisma/migrations/20261110120000_lot_marche/migration.sql`.

**Interfaces — Produces:** `Lot.marcheId: string | null`, `Lot.marche`, `Marche.lots` (client Prisma régénéré).

- [ ] **Step 1 :** créer la branche `feat/marche-par-lots` depuis `origin/main` à jour (skill `branche`, après `git fetch`) ; y reporter les deux documents `docs/plans/2026-11-10-un-marche-par-groupe-de-lots-*.md` (non suivis sur le `main` local) ; relever la base de référence : `npx tsc --noEmit` (0 erreur), `npx eslint` (plafond 172), tests unitaires verts.
- [ ] **Step 1b — activer la clôture automatique :** ajouter au `CLAUDE.md` du projet une section `## Clôture automatique` (4 à 6 lignes, sans donnée réelle) : plan concerné (chemin ci-dessus), renvoi vers `~/.claude/skills/disciplined-execution/references/auto-closure.md`, les trois arrêts, « jamais de push ni de geste distant par la chaîne » ; créer le journal du plan (fichier git-ignoré indiqué plus haut) avec sa section `## Brouillon Journal consolidé` ; vérifier que `git check-ignore` couvre ce journal et `.claude/handoffs/`. Commit `docs(claude): activer la clôture automatique pour le plan marché par lots`.
- [ ] **Step 2 :** ajouter à `Lot` : `marcheId String?`, `marche Marche? @relation(fields: [marcheId], references: [id], onDelete: SetNull)`, `@@index([marcheId])` ; à `Marche` : `lots Lot[]`.
- [ ] **Step 3 :** écrire la migration SQL : `ALTER TABLE lots ADD COLUMN "marcheId" TEXT`, clé étrangère `ON DELETE SET NULL`, index, puis la reprise : rattacher chaque lot `GAGNE` au marché dont `marches."opportuniteId" = lots."opportuniteId"` et dont `marches."createdAt" > opportunites."createdAt"` (même règle que l'ancien gel). Un seul marché possible par opportunité avant ce chantier ; la reprise ne rattache jamais un marché antérieur à l'opportunité.
- [ ] **Step 4 — vérification sur la base de test locale** (skill `base-test`) : créer deux opportunités de test (une avec 3 lots dont 2 gagnés et un marché créé après, une avec un marché antérieur) ; appliquer la migration ; attendre : les 2 lots gagnés ont `marcheId` = le marché, le lot perdu et les lots de la seconde opportunité restent à `NULL`. `npx prisma generate`, `npx tsc --noEmit` : 0 erreur.
- [ ] **Step 5 :** commit `feat(lots): lien lot → marché (migration additive + reprise)`.

### Task 2: Règles pures et tests unitaires

**Files:** Modify `lib/utils/lots.ts`, `lib/utils/marche-numero.ts` ; Test `tests/unit/lots.spec.ts`, Create `tests/unit/marche-numero.spec.ts`.

**Interfaces — Produces (signatures exactes) :**

```ts
type LotMarche = { id: string; numero: number; resultat: ResultatLot; montantPropose: unknown; marcheId: string | null }
lotsRattachables(lots: LotMarche[]): LotMarche[]                      // GAGNE et marcheId null
validerSelectionLots(lotIds: string[], lots: LotMarche[]): string | null   // message de refus, ou null
libelleObjetMarche(objetOpportunite: string, numeros: number[], nbLotsTotal: number): string
preparerMarcheDepuisLots(objet: string, lots: LotMarche[], lotIds: string[]): MarcheDepuisLots | null
lotEstFige(lot: { marcheId: string | null }): boolean
vehiculesModifiables(statut: StatutOpportunite, lot: { marcheId: string | null }): boolean
marchePreexistant(opp: { createdAt: Date; marche: { createdAt: Date } | null }): boolean
calculerRetraitLot(p: { objetOpportunite: string; nbLotsTotal: number; marche: { objet: string; montant: number }; lotsDuMarche: LotMarche[]; lotRetireId: string }):
  { refus: string } | { montant: number; objet: string; objetConserve: boolean }
retraitMarcheAutorise(marche: { statut: StatutMarche; nbFactures: number }): string | null   // message de refus, ou null
prochainNumeroProvisoire(annee: number, numeros: string[]): string  // dans marche-numero.ts
```

- [ ] **Step 1 — tests en échec** (adapter les tests existants de `preparerMarcheDepuisLots`, remplacer ceux de `resultatsLotsFiges` et `vehiculesModifiables`) :
  - `validerSelectionLots([], lots)` → message non nul ; avec un lot `PERDU`, un lot déjà rattaché, un identifiant inconnu → message non nul ; avec deux lots gagnés libres → `null`.
  - `libelleObjetMarche('Objet', [1], 3)` → `'Objet — Lot 1'` ; `([1, 3], 3)` → `'Objet — Lots 1, 3'` ; `([1], 1)` → `'Objet'`.
  - `preparerMarcheDepuisLots` : montant = somme des `montantPropose` des lots sélectionnés seulement.
  - `lotEstFige({ marcheId: 'x' })` → `true` ; `{ marcheId: null }` → `false`.
  - `vehiculesModifiables('GAGNEE', { marcheId: null })` → `true` ; avec un `marcheId` → `false` ; `'EN_ANALYSE'` → `false`.
  - `marchePreexistant` : marché plus ancien que l'opportunité → `true` ; plus récent ou `null` → `false`.
  - `calculerRetraitLot` : retrait du lot 3 d'un marché lots 1+3 (objet généré inchangé) → `montant` = montant du lot 1, objet `'… — Lot 1'`, `objetConserve: false` ; même cas avec un objet modifié à la main → objet inchangé, `objetConserve: true` ; marché à un seul lot → `{ refus }`.
  - `retraitMarcheAutorise` : `ATTRIBUE_DEFINITIVEMENT` et `EN_ATTENTE_LIVRAISON_OS` sans facture → `null` ; avec une facture, ou statut `EN_EXECUTION` → message.
  - `prochainNumeroProvisoire(2026, ['MARCHE-2026-007', 'MARCHE-2025-099', 'N°1/2026'])` → `'MARCHE-2026-008'` ; `(2026, [])` → `'MARCHE-2026-001'`.
- [ ] **Step 2 :** lancer `npx playwright test tests/unit` (ou la commande unitaire du projet) : les nouveaux tests échouent.
- [ ] **Step 3 :** implémenter les fonctions aux signatures ci-dessus ; supprimer `resultatsLotsFiges` et l'ancienne signature de `vehiculesModifiables` ; l'objet généré avant retrait se calcule avec `libelleObjetMarche` sur les numéros des lots du marché.
- [ ] **Step 4 :** tests unitaires verts ; `tsc` signale les appelants à migrer (Tasks 3 à 6).
- [ ] **Step 5 :** commit `feat(lots): règles pures marché par groupe de lots`.

### Task 3: Création du marché sur sélection de lots

**Files:** Modify `lib/actions/opportunites.ts:313-431` ; Test `tests/v1/lots-dossiers.spec.ts` (Task 8).

**Interfaces — Consumes :** Task 2. **Produces :** `createMarcheFromOpportunite(opportuniteId: string, lotIds: string[]): Promise<ActionResult<{ marcheId: string }>>`.

- [ ] **Step 1 :** valider l'entrée avec Zod (`lotIds` : tableau de chaînes non vide) ; refuser si le rôle n'a pas `canWrite`.
- [ ] **Step 2 :** dans la transaction, après `FOR UPDATE` sur l'opportunité : relire statut, `marche` (id, `createdAt`), `createdAt` et les lots (avec `id`, `marcheId`) ; refuser si `marchePreexistant` ; refuser si `validerSelectionLots` renvoie un message ; générer le numéro avec `prochainNumeroProvisoire` à partir des numéros `MARCHE-{année}-%` existants, avec jusqu'à 3 reprises sur `P2002` ; créer le marché (`objet`/`montant` via `preparerMarcheDepuisLots`, mêmes valeurs par défaut qu'aujourd'hui) ; `updateMany` des lots sélectionnés avec `marcheId` ; poser `Opportunite.marcheId` seulement s'il est vide.
- [ ] **Step 3 :** le statut de l'opportunité doit rester `GAGNEE` pour créer un marché (inchangé) ; journal d'audit avec `lotIds` en métadonnées ; `revalidatePath` des deux fiches.
- [ ] **Step 4 :** `tsc` : 0 erreur ; commit `feat(marches): création de marché pour une sélection de lots`.

### Task 4: Gel des résultats et des véhicules par lot

**Files:** Modify `lib/actions/lots.ts:104-132`, `lib/actions/vehicules-proposes.ts:42-45`, `components/opportunites/lots-section.tsx`, `lib/actions/opportunites.ts` (types `SerializedLot` : ajouter `marcheId`).

**Interfaces — Consumes :** `lotEstFige`, `vehiculesModifiables(statut, lot)`.

- [ ] **Step 1 :** `setResultatLot` : lire `marcheId` du lot dans la transaction, lever `MARCHE_LIE` si `lotEstFige` ; message : « Ce lot est couvert par un marché : son résultat n'est plus modifiable. »
- [ ] **Step 2 :** `setVehiculesProposes` : même contrôle sur le lot concerné via `vehiculesModifiables(statut, lot)`.
- [ ] **Step 3 :** `LotsSection` : la possibilité de modifier les véhicules et le résultat se décide **par lot** ; afficher sur un lot rattaché un badge « Marché » renvoyant à la fiche du marché (sans nom de contrat dans le code).
- [ ] **Step 4 :** `tsc` 0 erreur ; commit `feat(lots): gel par lot rattaché à un marché`.

### Task 5: Interface de création et « Marchés liés »

**Files:** Modify `components/opportunites/opportunite-detail-actions.tsx`, `app/(dashboard)/opportunites/[id]/page.tsx:85-92, 167-176`, `lib/actions/opportunites.ts` (`getOpportunite` : inclure `marches` `{ id, numero, objet }` et les lots avec `marcheId`) ; Create `components/opportunites/creer-marche-dialog.tsx`.

**Interfaces — Consumes :** `createMarcheFromOpportunite`, `lotsRattachables`. **Produces :** `<CreerMarcheDialog opportuniteId lotsLibres onCreated />` avec `lotsLibres: { id; numero; intitule; montantPropose }[]`.

- [ ] **Step 1 :** remplacer la prop `hasMarcheLinked` par `lotsLibres` ; le bouton « Créer le marché » s'affiche si le statut est `GAGNEE` et s'il reste au moins un lot libre ; il ouvre le dialogue (cases à cocher, tout coché par défaut, total des montants affiché, bouton désactivé si rien n'est coché).
- [ ] **Step 2 :** après succès : toast et redirection vers le marché créé (comportement actuel).
- [ ] **Step 3 :** fiche opportunité : « Marché lié » → « Marchés liés » (un lien par marché, avec les lots couverts) ; « — » s'il n'y en a pas.
- [ ] **Step 4 :** vérifier à 375 px que la barre d'actions ne déborde pas (test `tests/layout/page-header-overflow.spec.ts` existant) ; commit `feat(opportunites): choix des lots à la création du marché`.

### Task 6: Retrait d'un lot d'un marché

**Files:** Create `lib/actions/marche-lots.ts`, `components/marches/marche-lots-section.tsx` ; Modify `components/marches/marche-detail.tsx`, `lib/actions/marches.ts` (inclure `lots` et le nombre de factures dans la lecture du marché).

**Interfaces — Consumes :** `calculerRetraitLot`, `retraitMarcheAutorise`. **Produces :**

```ts
apercuRetraitLot(lotId: string): Promise<ActionResult<{ montant: number; objet: string; objetConserve: boolean }>>
retirerLotDuMarche(data: unknown): Promise<ActionResult<{ marcheId: string }>>   // Zod : { lotId: string, montant: number >= 0 }
```

- [ ] **Step 1 :** `apercuRetraitLot` (lecture) : mêmes contrôles que le retrait, renvoie le montant proposé et l'objet.
- [ ] **Step 2 :** `retirerLotDuMarche` : `canWrite`, verrou `FOR UPDATE` sur l'opportunité, refus via `retraitMarcheAutorise` et `calculerRetraitLot` ; dans la transaction : `lot.marcheId = null`, `marche.montant` = montant confirmé reçu, `marche.objet` mis à jour sauf `objetConserve` ; si `Opportunite.marcheId` désigne ce marché et qu'il ne couvre plus aucun lot, ne rien changer d'autre ; audit (`lotId`, ancien et nouveau montant) ; `revalidatePath` des deux fiches. Le numéro n'est jamais modifié.
- [ ] **Step 3 :** `MarcheLotsSection` : liste des lots couverts (n°, intitulé, montant), bouton « Retirer ce lot du marché » (écriture, masqué sinon) ouvrant une confirmation avec le montant proposé modifiable ; section absente pour un marché sans lot rattaché.
- [ ] **Step 4 :** `tsc` 0 erreur ; commit `feat(marches): retirer un lot d'un marché`.

### Task 7: Adapter les lectures multi-marchés

**Files:** Modify `lib/actions/analytics.ts:462-471`, `lib/actions/exports.ts:1365-1384`.

- [ ] **Step 1 :** inventaire : rechercher toutes les lectures de `opportunite.marche`, `marcheId: { not: null }` et `opp.marche` dans `app`, `lib`, `components` ; consigner la liste dans le message de commit (pas de numéro réel).
- [ ] **Step 2 :** pipeline de l'analytique : calculer à partir de la relation `marches` (somme des montants de tous les marchés de l'opportunité) et non du seul `marcheId` ; export des opportunités : numéros de marché joints par « , ».
- [ ] **Step 3 :** test unitaire ou E2E d'export couvrant une opportunité à deux marchés ; commit `fix(analytics): opportunités à plusieurs marchés`.

### Task 8: Tests E2E et vérification de l'interface

**Files:** Modify `tests/v1/lots-dossiers.spec.ts` (autour de la ligne 356), `tests/v1/vehicules-proposes.spec.ts` (ligne 302).

- [ ] **Step 1 :** adapter les deux tests existants au dialogue (un lot gagné libre : valider le dialogue tel quel donne le même résultat qu'avant).
- [ ] **Step 2 :** nouveaux scénarios (données `[E2E…]`, nettoyées) : (a) 3 lots dont 2 gagnés → créer un marché par lot → 2 marchés, bouton disparu ; (b) 2 lots gagnés cochés ensemble → 1 marché groupé, montant = somme ; (c) groupé puis « Retirer ce lot » → montant recalculé, lot libre, nouveau marché créable ; (d) suppression d'un marché → lots libres, bouton « Créer le marché » de retour ; (e) double soumission du dialogue → un seul marché ; (f) opportunité à un lot : objet sans suffixe.
- [ ] **Step 3 :** lancer via le skill `base-test` : tests unitaires + `lots-dossiers` + `vehicules-proposes` + `page-header-overflow` verts ; vérification visuelle à 1920, 768 et 375 px (dialogue, « Marchés liés », « Lots couverts »).
- [ ] **Step 4 :** passe de la qualité : `tsc` 0 erreur, ESLint ≤ plafond, build local ; commit `test(lots): scénarios marché par groupe de lots`.

### Task 9: Livraison et reprise en production

**Geste distant : la chaîne s'arrête avant chaque étape (`ARRÊT : geste distant — <étape>`) et chacune demande l'accord explicite d'Abel avant de s'exécuter. Elle ne repart qu'après son feu vert, par un handoff avec `Suite automatique` sur l'étape suivante.**

- [ ] **Step 1 — balayage dépôt public** : relire le diff complet (aucun numéro de marché, montant, nom, chemin local) ; PR vers `main` ; CI `qualite` verte.
- [ ] **Step 2 — sauvegarde de production** (`pg_dump` 17, hors dépôt) puis vérification de l'empreinte ; relever le nombre de lots `GAGNE` et de marchés.
- [ ] **Step 3 — migration en production** avec le script de migration habituel (TLS strict, `--dry-run` d'abord, puis `--appliquer`) : attendu, le nombre de lots rattachés relevé à l’étape 2, les autres lots inchangés ; Prisma « up to date ». Annulation : `DROP COLUMN "marcheId"`.
- [ ] **Step 4 — fusion** (squash) : le déploiement de production est automatique ; vérifier sondes (`/login` 200, crons 401) et journaux d'exécution ; repli = déploiement précédent.
- [ ] **Step 5 — correction des cas réels, par Abel** : sur la fiche du marché concerné, « Retirer ce lot » (le lot en trop) → montant et objet recalculés, numéro intact ; puis « Créer le marché » pour ce lot depuis l'opportunité.

### Task 10: Trace et fin de ticket (arrêt 3 de la clôture automatique)

- [ ] **Step 0 :** proposer la revue indépendante du diff ; montrer à Abel le brouillon consolidé et les décisions provisoires ; demander la validation de clôture ; dernière ligne `ARRÊT : fin de ticket`. Après la clôture : handoff, puis proposer `/clear`.
- [ ] **Step 1 :** l'entrée du Journal sur la décision de fond est déjà écrite (2026-11-10). Proposer à Abel, si besoin, une seule entrée complémentaire pour ce que l'exécution a décidé en plus (réserve : jamais écrite sans son « oui »), source `/disciplines-actives senior`.
- [ ] **Step 2 :** mettre à jour la mémoire projet et le handoff (4 Ko max) ; ajouter la mention dans `PRD.md` si le périmètre fonctionnel y décrit « un marché par opportunité ».
