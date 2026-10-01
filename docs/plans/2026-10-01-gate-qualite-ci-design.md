# Gate qualité et intégration continue (phase 1) — conception et plan

Date : 2026-10-01 · Branche : `feat/ci-qualite-gate` · Statut : validé par Abel (phase 1, sans base de données)

## Objectif

Un contrôle automatique à chaque push et pull request : typage, lint, tests unitaires, build. Il remplace la vérification manuelle (≈ 1 h sur une machine de 4 Go) par un résultat vert/rouge en quelques minutes, et empêche une régression de typage ou de lint d'atteindre `main`.

## Périmètre

**Phase 1 (cette branche)** : `tsc`, ESLint, tests unitaires, build, sans base de données ni secret.
**Phase 2 (autre branche, plus tard)** : E2E en CI avec PostgreSQL de service, après avoir rendu chaque scénario autonome.
**Hors périmètre** : protection de branche sur `main` (réglage GitHub à faire par Abel une fois la CI stable), déploiement.

## Faits mesurés (2026-10-01)

- `tsc` : 16 erreurs, toutes dans 3 fichiers de test, aucune dans le code applicatif ; corrigées (types `Browser`/`Page` explicites), 0 erreur.
- ESLint : aucune configuration (`next lint` interactif). Avec une base `next/core-web-vitals` + `next/typescript` : 3 211 erreurs et 17 076 avertissements, dont 99 % venaient d'un ancien dossier de travail local `.worktrees/` (sorties de build). Sur les sources réelles : 396 fichiers, 168 erreurs, 70 avertissements avant réglage des niveaux.
- Tests unitaires : 95, déjà sous Playwright (`tests/unit`), sans navigateur.

## Décisions

1. **Zéro erreur ESLint exigé ; avertissements plafonnés.** Niveaux : `react/no-unescaped-entities` désactivée (interface en français, rendu correct), `no-explicit-any` et `no-unused-vars` en avertissement (103 + 60 existants), `no-require-imports` désactivée pour les scripts CommonJS, `next-env.d.ts` (généré) ignoré. Résultat : 0 erreur, 172 avertissements. Le script `lint` impose `--max-warnings=172` : le plafond ne peut que baisser (cliquet).
2. **Config Playwright dédiée aux tests unitaires** (`playwright.unit.config.ts`, sans serveur web ni navigateur) : plus de variable d'environnement spéciale, exécution identique sur Windows et Linux, plus rapide.
3. **Aucune nouvelle dépendance.** ESLint 9, `eslint-config-next` et `@eslint/eslintrc` sont déjà installés.
4. **Dépôt public : workflow sans secret**, `permissions: contents: read`, variables d'environnement factices pour l'installation et le build, annulation des exécutions obsolètes, délai maximal de 20 minutes.
5. **Répétition de la CI en local sur une copie propre** (`git archive` + `npm ci` + les 4 commandes, sans `.env`) avant de pousser, et validation du fichier de workflow par un linter dédié.

## Tâches

1. Typage des tests à zéro erreur ✅ (commit `6d9129a`).
2. Configuration ESLint, scripts `typecheck`, `lint`, `test:unit`, `ci`, config Playwright unitaire.
3. Workflow `.github/workflows/ci.yml`.
4. Répétition en copie propre (installation, typage, lint, tests, build, sans `.env`) et validation du workflow.
5. **Sur feu vert d'Abel** : pousser la branche (dépôt public), constater l'exécution réelle de la CI, ajuster ; puis fusion sur `main`.
6. Documentation (`README`/`CLAUDE.md` : commandes, politique de cliquet) et mémoire du projet.

## Risques

- Le build peut exiger des variables d'environnement ou une base au moment de la génération statique : à prouver par la répétition en copie propre, avec une URL de base inatteignable.
- Le plafond d'avertissements bloque un ajout légitime : le message d'ESLint indique le dépassement ; on corrige ou on relève consciemment le plafond dans le même commit.
- Un workflow poussé sur un dépôt public s'exécute sur les pull requests de forks avec des droits réduits : aucun secret n'y est lu.
