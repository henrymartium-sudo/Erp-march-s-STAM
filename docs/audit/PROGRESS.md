# PROGRESS — Audit & fix UI/UX intégral de l'ERP STAM

Ledger de continuité de la campagne d'audit UI/UX (toute l'application). Ce fichier est la **source de vérité de reprise** : il survit aux `/clear`, la conversation non.

---

## Règle 50 % de contexte (intransigeante)

Dès que le contexte de la conversation d'orchestration atteint **~50 %** (barre de statut `context_window.used_percentage`) :

1. Mettre à jour ce fichier : section « État actuel » + « Prochaine action ».
2. Faire valider le brouillon d'entrée Journal par Abel dans le fil (si une décision est en attente).
3. `/clear`.
4. Reprise = `/disciplines-actives senior` → lire ce fichier → exécuter « Prochaine action ».

**Jamais `/compact`** (perte lossy). On repart toujours des fichiers (`docs/audit/*.md`, `.raw/*.json`, `.superpowers/sdd/progress.md`).

---

## État actuel

| Champ | Valeur |
|---|---|
| Phase | **4 — Correction : Lots 1-4 commités + poussés + PR ouvertes (#3-#6, aucune mergée). Checkpoint avant `/clear` 2026-09-05.** |
| Branche | `chore/audit-ui-ux` (créée depuis `main` @ `44504b6`) — **la doc d'audit y est TOUJOURS non commitée** |
| Workflow | `audit-ui-ux-app` — modèle d'audit : hérité (session) · `live:false` |
| runId | `wf_4f556b30-730` |
| scriptPath | `…/f0c71625-…/workflows/scripts/audit-ui-ux-app-wf_4f556b30-730.js` |
| Modules pilote | `layout-shell`, `marches`, `admin-alertes` |
| Rapport pilote | `docs/audit/2026-09-04-audit-ui-ux-PILOTE.md` (généré en fin de workflow) |
| Modules Vague 1 | `opportunites`, `cautions`, `dossiers-offre`, `factures`, `documents` |
| Rapport Vague 1 | `docs/audit/2026-09-04-audit-ui-ux-VAGUE1.md` (58 findings bruts → 52 entrées backlog : 6 Bloquant / 18 Important / 28 Cosmétique, 11 lots, 10 bugs fonctionnels en annexe) |
| Rapport consolidé | `docs/audit/2026-09-04-audit-ui-ux-app.md` — 100 entrées brutes (48 Pilote réel, pas 41 comme annoncé par son résumé — incohérence interne détectée et documentée §0 du rapport + 52 Vague 1) → 1 doublon inter-rapports fusionné (`CardTitle`/`ui/card.tsx:39`) → **99 entrées backlog** (7 Bloquant / 41 Important / 51 Cosmétique), 18 lots fusionnés (Lot 0 unique), 16 bugs fonctionnels en annexe (aucun doublon) |
| Backlog validé | **partiel** — Lots 1, 2, 3, 4 approuvés par Abel (2026-09-04, validation ciblée « Bloquant seulement »). Lot 0 (dont #003, 7ᵉ Bloquant) + Lots 5-17 en attente de validation. |

## Prochaine action — ordre validé par Abel (2026-09-05), à reprendre après `/clear`

> **B — sécuriser la doc d'audit (priorité 1, coût quasi nul).** Sur `chore/audit-ui-ux`, commiter les fichiers
> de CETTE campagne uniquement : `docs/audit/2026-09-04-audit-ui-ux-{PILOTE,VAGUE1,app}.md`, `docs/audit/PROGRESS.md`,
> `docs/audit/.raw/` (ou les gitignore — à trancher), `.claude/agents/ui-ux-reviewer.md`. **NE PAS commiter** les
> modifs préexistantes sans rapport : `.claude/settings.local.json`, `.claude/agent-memory/context-continuity-manager/*`,
> `.claude/launch.json`, `tsconfig.tsbuildinfo`. Puis push + PR (ou commit direct — les docs sont parfois commités
> directement sur `main` sur ce projet, cf. `86caba7` ; trancher avec Abel).
>
> **D — débloquer les 4 PR ouvertes.** [#3](https://github.com/henrymartium-sudo/Erp-march-s-STAM/pull/3) Lot 1 ·
> [#4](https://github.com/henrymartium-sudo/Erp-march-s-STAM/pull/4) Lot 2 · [#5](https://github.com/henrymartium-sudo/Erp-march-s-STAM/pull/5) Lot 3 ·
> [#6](https://github.com/henrymartium-sudo/Erp-march-s-STAM/pull/6) Lot 4. Toutes **OPEN**, aucune mergée.
> - PR #4, #5 : E2E propres → prêtes à merger (décision Abel).
> - PR #3 (Lot 1) : test E2E `tests/marches/vehicule-liaison.spec.ts` **écrit en base prod** → autorisation Abel requise avant de le lancer.
> - PR #6 (Lot 4) : E2E `tests/cautions/filters.spec.ts` jamais passé (6 tentatives, cause environnementale — machine saturée / sessions Claude concurrentes, PAS le code). Relancer sur machine calme : `cd .claude/worktrees/agent-ab49e16234145830e && npx playwright test tests/cautions/filters.spec.ts --project=chromium`.
>
> **C — reste du backlog.** `docs/audit/2026-09-04-audit-ui-ux-app.md` : 99 entrées / 18 lots, seuls **Lots 1-4 faits**.
> - **Lot 0** (#003 = 7ᵉ Bloquant + 12 cosmétiques, bloque Lots 7/10/15) — jamais validé ni commencé.
> - **Lots 5-17** (92 entrées Important/Cosmétique) — jamais validés par Abel.
> - Validation lot par lot par Abel d'abord (Phase 3 non close), puis même méthode que Lots 1-4.
>
> **E/F — différés, non tranchés** : Vague 2 (5 modules non audités : `dashboard-home`, `vehicules`, `admin-users`,
> `admin-analytique`, `auth-profil`) · config ESLint absente du dépôt (dette, 3 confirmations) ·
> 4ᵉ occurrence `marches/marche-filters.tsx:399` (menu invisible au tactile) · Phase 5 clôture (build+E2E complet, maj `memory/MEMORY.md`).
>
> **Garde-fou** : `feedback_workflow_token_cost` (2026-08-31) — pas de `Workflow` sans proposition validée par Abel + coût affiché. Règle 50 % de contexte (haut de ce fichier) tenue toute la session (plusieurs checkpoints). Entrée Journal de décisions du 2026-09-04/05 écrite et validée.

<details><summary>Historique — état avant la Vague 2 (Vague 1 terminée)</summary>

> **Vague 1 terminée** (`opportunites`, `cautions`, `dossiers-offre`, `factures`, `documents`).
> Rapport : `docs/audit/2026-09-04-audit-ui-ux-VAGUE1.md` — 58 findings bruts → 58 retenus (aucun retrait total,
> 15 rétrogradés Important→Cosmétique, 1 remonté Important→Bloquant, 1 rétrogradé Bloquant→Important pour
> cohérence inter-modules) → 52 entrées de backlog après DEDUP transversal (6 Bloquant / 18 Important /
> 28 Cosmétique) → 11 lots de correction proposés (Lot 0 fondations → Lot 10 polish). 10 bugs fonctionnels
> extraits en annexe, dont 3 concentrés sur `cautions` (badge inerte, suppression sans confirmation, filtres
> désynchronisés de l'URL) et 1 sur `factures` (TTC écrasé silencieusement). Aucun module à relancer côté audit
> code ; un pass de vérification live (Playwright, 3 viewports) reste requis avant d'ouvrir les PR de correction
> (§6 du rapport), à combiner avec celui déjà requis côté pilote plutôt que de le dupliquer.
>
> Ce rapport est **partiel** : ne pas ouvrir de PR de correction avant la consolidation Phase 2.5 (fusion
> Pilote + Vague 1 + Vague 2), pour éviter les doublons entre vagues sur les entrées transversales
> (`CardTitle`, `BreadcrumbNav showHome`, cible tactile `Button icon`).

</details>

<details><summary>Historique — état avant la Vague 1</summary>

> **Calibrage : Abel revoit le rapport pilote, puis Phase 2 (audit complet).**
> Rapport : `docs/audit/2026-09-04-audit-ui-ux-PILOTE.md` — 74 findings bruts → 70 retenus après DEFI (4 retirés,
> 15 reclassés) → 41 entrées de backlog après DEDUP/CLUSTER (1 Bloquant / 30 Important / 39 Cosmétique) → 7 lots
> de correction proposés (Lot 0 fondations tokens → Lot 6 nettoyage). 6 bugs fonctionnels extraits en annexe.
> Aucun module à relancer côté audit code ; un pass de vérification live (Playwright, 3 viewports) reste requis
> avant d'ouvrir les PR de correction (§6 du rapport).
>
> Si GO → **Phase 2** : `Workflow({scriptPath, resumeFromRunId:"wf_4f556b30-730"})` avec `only` retiré (13 modules,
> les 3 du pilote reviennent du cache si le script est inchangé) → `docs/audit/2026-09-04-audit-ui-ux-app.md`.
> Si ajustements du rubric/prompt (voir §7 du rapport pilote — pré-fusionner les findings « couleur en dur → token »,
> champ `bug_fonctionnel` explicite) → Phase 2 = run neuf (les 3 modules pilote re-tournent, acceptable).

</details>

---

## Modules (13) — découpage de l'audit

`layout-shell` · `dashboard-home` · `marches` · `opportunites` · `cautions` · `vehicules` · `documents` ·
`dossiers-offre` · `factures` · `admin-users` · `admin-alertes` · `admin-analytique` · `auth-profil`

Priorité de correction : transversal d'abord, puis pipeline AO (`opportunites`, `marches`, `dossiers-offre`,
`cautions`, `factures`), puis admin/reporting.

---

## Journal des phases

| Date | Phase | Résultat | runId | Commit |
|---|---|---|---|---|
| 2026-09-04 | 0 — Mise en place | branche + ce ledger + agent `ui-ux-reviewer` créés | — | (non commité) |
| 2026-09-04 | 1 — Pilote | workflow lancé (3 modules, modèle hérité, live off) | `wf_4f556b30-730` | — |
| 2026-09-04 | 1 — Pilote | **terminé** : 74 findings bruts → 70 retenus (DEFI : 4 retirés, 15 reclassés) → 41 entrées backlog (1 Bloquant / 30 Important / 39 Cosmétique), 7 lots proposés, 6 bugs fonctionnels en annexe. Rapport `docs/audit/2026-09-04-audit-ui-ux-PILOTE.md` | `wf_4f556b30-730` | — (non commité) |
| 2026-09-04 | 1 — Pilote | ⚠️ coût réel 696 079 tokens de sortie (5 agents) vs ~60–100k estimés (~7–10×) — Abel informé, choix explicite : 2 vagues de 5 modules, modèle hérité | `wf_4f556b30-730` | — |
| 2026-09-04 | 2 — Vague 1 | lancée (resume, rubric en cache) sur `opportunites, cautions, dossiers-offre, factures, documents` — script resserré (fusion tokens répétés §7) | `wf_4f556b30-730` | — |
| 2026-09-04 | 2 — Vague 1 | **terminée** : 58 findings bruts → 58 retenus (DEFI : 0 retiré, 15 rétrogradés Important→Cosmétique, 2 harmonisations de sévérité inter-modules) → 52 entrées backlog (6 Bloquant / 18 Important / 28 Cosmétique), 11 lots proposés, 10 bugs fonctionnels en annexe. Rapport `docs/audit/2026-09-04-audit-ui-ux-VAGUE1.md` | `wf_4f556b30-730` | — (non commité) |
| 2026-09-04 | 2 — Vague 1 | ⚠️ coût réel 860 705 tokens de sortie (7 agents, rubric en cache) — **cumul campagne : 1 556 784 tokens** sur 8/13 modules. Abel informé avant décision Vague 2. | `wf_4f556b30-730` | — |
| 2026-09-04 | 2.5 — Consolidation | terminée : backlog unifié sur 8/13 modules, 99 entrées après dédup inter-rapports (7 Bloquant / 41 Important / 51 Cosmétique). Rapport docs/audit/2026-09-04-audit-ui-ux-app.md | wf_4f556b30-730 | — (non commité) |
| 2026-09-04 | 2.5 — Consolidation | coût 215 548 tokens (1 agent, 18 tool_uses) — **cumul campagne : 1 772 332 tokens** pour 8/13 modules audités + backlog consolidé | — | — |
| 2026-09-04 | 3 — Validation | Abel approuve les Lots 1, 2, 3, 4 (validation ciblée « Bloquant seulement », 6/7 Bloquant). Lot 0 + Lots 5-17 différés. | — | — |
| 2026-09-04 | 4 — Correction | `disciplined-execution` : score 2 (E2E) → palier Simple ; exécution en 4 agents `fix-and-verify` isolés (`git worktree`, pas de fan-out subagent-driven-development — écart assumé pour sobriété contextuelle). 4 branches lancées depuis `main` : `fix/vehicule-multiselect-popover-toggle` (Lot 1), `fix/menus-actions-tactile-cautions-documents` (Lot 2), `fix/facture-ttc-integrite` (Lot 3), `fix/cautions-securite-fiabilite-actions` (Lot 4). Aucun push, aucune PR. | — | — |
| 2026-09-04 | 4 — Lot 1 | **terminé** : commit `c370220` (`fix/vehicule-multiselect-popover-toggle`), 2 bugs corrigés (#001, F01), tsc propre. 2 findings hors périmètre remontés à Abel : (a) aucune config ESLint dans le dépôt (dette projet indépendante) ; (b) test E2E `vehicule-liaison.spec.ts` non lancé — écrit réellement en base prod, autorisation Abel requise. | — | — (non poussé) |
| 2026-09-04 | 4 — Lot 2 | **terminé** : commit `eb9fe46` (fix initial, vérifié en navigateur réel Playwright, cascade CSS prouvée) + commit `01aca30` (correction `md:`→`lg:` appliquée directement — resume de l'agent indisponible, "worktree unverifiable" transitoire, changement mécanique de classe CSS sans surface de type donc fait moi-même). `fix/menus-actions-tactile-cautions-documents`. Finding annexe : 4e occurrence du même pattern (`marches/marche-filters.tsx:399`), hors périmètre, non corrigée, à tracer pour une Vague 2 ou un lot dédié. | — | — (non poussé) |
| 2026-09-04 | 4 — Lot 3 | **terminé** : commit `868e827` (`fix/facture-ttc-integrite`). Option (b) retenue (flag `ttcManuallyEdited`, cohérent avec le pattern déjà présent dans `caution-form.tsx`). Test E2E créé (`tests/factures/ttc-manuel.spec.ts`, 5 cas, 5 passed) — **régression prouvée** : test relancé sur le code bugué (revert), a bien échoué avec l'écart exact attendu (1 180 500 attendu / 1 416 000 reçu), puis fix restauré, suite repassée verte. tsc/eslint propres (mêmes baselines pré-existantes). Finding environnemental : 6 échecs E2E initiaux dus à une machine saturée (RAM/CPU) + `login-form.tsx` qui force un `router.push('/')` coûteux (~20 requêtes Prisma) à chaque connexion, cohérent avec la fragilité E2E déjà connue (memory/MEMORY.md). | — | — (non poussé) |
| 2026-09-05 | 4 — Lot 4 | **échec puis reprise** : 1ʳᵉ tentative (`fix-and-verify`, modèle `opus`) interrompue par une limite de dépenses mensuelle du compte (HTTP 429, reset 3h Africa/Sao_Tome) — pas une erreur de code. Travail réel non commité trouvé dans le worktree (11 fichiers, +468/−390, `tests/cautions/filters.spec.ts` 137 lignes). Repris par un agent `general-purpose` (modèle hérité, pas opus) **dans le même worktree** — révision + complétion + vérification + commit, plutôt que repartir de zéro. | — | — |
| 2026-09-05 | 4 — Lot 4 | 2ᵉ tentative : agent s'est arrêté avant de recevoir le résultat de son propre run Playwright (lancé en fond, jamais lu). Surveillance passive de ce run : **échoué**, 9 tests bloqués sur "Connexion en cours..." — machine sous forte pression mémoire confirmée (0,49 Go libre / 3,89 Go), 2 serveurs `next dev` redondants trouvés (08:25 et 10:24, provenance du 1er non identifiée, non touché). Diagnostic = cold-start login, motif déjà connu (Lot 3). Retry ciblé lancé sur le serveur déjà chaud (`PLAYWRIGHT_BASE_URL` direct, pas de nouveau serveur), budget annoncé = 1 tentative avant d'escalader. | — | — |
| 2026-09-05 | 4 — Lot 4 | **budget de retry épuisé, arrêt honnête** : 3ᵉ échec, même symptôme exact (`login()` timeout 30s sur les 9 tests, `beforeEach`). Diagnostic affiné : `/login` (GET, 0,7s) et `/api/auth/csrf` (0,2s) répondent vite — seule la requête POST d'auth (bcrypt + Prisma) timeout. RAM libre **0,3 Go / 3,89 Go**, en baisse continue depuis Lot 3 (180 Mo) malgré arrêt du serveur dev de test (18556/14440/15948, libéré +0,03 Go seulement — la pression vient d'ailleurs, hors de mon périmètre de nettoyage). Code du Lot 4 stable et inchangé sur les 3 tentatives — ce n'est pas un défaut de code. Remonté à Abel avant tout nouveau run. | — | — |
| 2026-09-05 | 4 — Lot 4 | **COMMITÉ** : `367f6fa` sur `fix/cautions-securite-fiabilite-actions`. Les 5 correctifs relus ligne à ligne et confirmés corrects (badge → vrais variants, AlertDialog sur suppression détail, filtres 100% pilotés par l'URL + `niveauAlerte` en Zod/Prisma, item kebab mort retiré, pagination client doublon supprimée). `tests/cautions/filters.spec.ts` complété (+2 tests : compteur d'en-tête = décompte filtré réel ; filtre combiné à page=2 ne retombe pas silencieusement sur les données non filtrées). tsc propre (baseline inchangée), eslint propre (5 préexistants confirmés via `git show HEAD`, 0 nouveau). **E2E toujours non confirmé** — 5ᵉ tentative de l'agent : un process `find /` orphelin (100% CPU, résidu de sa propre exploration) tuait la machine, tué ; malgré ça le serveur dev a crashé 3× (« Jest worker … exceeding retry limit », pool de compilation Next sous charge) + indice de **sessions Claude concurrentes sur la même machine** (process `claude.exe` à forte conso CPU observés). Cohérent avec le précédent T7 (6 tentatives / 3 sessions, memory/MEMORY.md). | — | — (non poussé) |
| 2026-09-05 | 4 — Push + PR | 4 lots poussés, PR [#3](https://github.com/henrymartium-sudo/Erp-march-s-STAM/pull/3)/[#4](https://github.com/henrymartium-sudo/Erp-march-s-STAM/pull/4)/[#5](https://github.com/henrymartium-sudo/Erp-march-s-STAM/pull/5)/[#6](https://github.com/henrymartium-sudo/Erp-march-s-STAM/pull/6) ouvertes (choix Abel). Vérif 17.4 #2 (secrets/valeurs réelles) faite avant push : rien hors `.claude/settings.local.json` préexistant non commité. Entrée Journal de décisions 2026-09-04/05 écrite et validée. | — | 4 branches poussées |
| 2026-09-05 | Checkpoint avant `/clear` | Ordre validé par Abel : **B** (sécuriser la doc d'audit, non commitée) → **D** (débloquer les 4 PR) → **C** (Lot 0 + Lots 5-17). Section « Prochaine action » ci-dessus mise à jour en conséquence. Prompt de reprise à froid fourni dans le fil. | — | — |

---

## Plan de travail (rappel)

0. **Mise en place** — branche, script, ledger. *(fait)*
1. **Pilote 3 modules** — `Workflow` `only:[…]` → rapport pilote + calibrage.
2. **Audit complet** — `Workflow({scriptPath, resumeFromRunId})` sur les 10 modules restants → `docs/audit/2026-09-04-audit-ui-ux-app.md` (backlog priorisé en lots).
3. **Validation backlog** — Abel tranche lot par lot ; brouillon entrée Journal.
4. **Correction par lots** — `superpowers:disciplined-execution` → `subagent-driven-development` : 1 lot = 1 sous-agent → review spec + qualité → fix → `tests/layout/` + `tests/audit/` → 1 PR / lot (`/livre`). Ledger : `.superpowers/sdd/progress.md`.
5. **Clôture** — build + E2E complets, entrée Journal consolidée, maj `memory/MEMORY.md` cross-session.
