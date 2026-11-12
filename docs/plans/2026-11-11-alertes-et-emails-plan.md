# Alertes et e-mails (livraison 3) — plan d'implémentation

> **Pour l'exécution :** `superpowers:executing-plans` en direct (cadrage § 5 bis), sous `disciplined-execution`. Étapes à cocher (`- [ ]`).

**But :** `/admin/reporting` est absorbé dans `/admin/alertes`, qui devient un espace à quatre onglets : « Envoi manuel », « Règles d'alerte », « Rapports programmés », « Historique ». Les anciennes adresses redirigent, l'entrée de menu « Reporting » disparaît.

**Architecture :** l'onglet vit dans l'adresse (`/admin/alertes` = Envoi manuel, `?onglet=regles|rapports|historique`), comme `/vehicules` et `/pilotage`. La page reste un composant serveur : elle contrôle le rôle de l'onglet demandé et ne charge que les données de cet onglet. Les formulaires de règle (`/admin/alertes/rules/new`, `/rules/[id]/edit`) restent des pages. **Interface seulement** : aucun moteur d'envoi, aucun cron, aucune règle, aucun schéma, aucun contrôle de rôle des actions serveur ne change.

**Cadrage :** `docs/plans/2026-11-11-simplification-modules-et-tableau-de-bord-design.md` (F2, § 4 livraison 3, § 5 bis).

## Droits (inchangés, onglet par onglet)

| Onglet | Valeur | Rôles | Source actuelle |
|--------|--------|-------|-----------------|
| Envoi manuel | `envoi` (défaut) | ADMIN, AVANCE, EXPLOITATION | `alertes/page.tsx` |
| Règles d'alerte | `regles` | ADMIN, AVANCE (création/modification : ADMIN, déjà dans les actions) | `rules/page.tsx` |
| Rapports programmés | `rapports` | ADMIN | `reporting/page.tsx` |
| Historique | `historique` | ADMIN, AVANCE | `history/page.tsx` |

- Onglet absent de la liste d'un rôle : son lien n'est pas affiché. Adresse directe vers un onglet interdit ou inconnu : redirection vers `/` (comportement actuel de `/admin/reporting`). Les actions serveur gardent leur propre `requireRole`.
- VISITEUR n'a accès à rien ici, comme aujourd'hui (le lien de menu « Alertes » lui reste visible : défaut préexistant, signalé, non corrigé).

## Contraintes globales

- Toute URL retirée redirige : `/admin/reporting` → `?onglet=rapports`, `/admin/alertes/rules` → `?onglet=regles`, `/admin/alertes/history` → `?onglet=historique` (`permanentRedirect` après `requireAuth`, comme `/veille`).
- Un seul `<h1>` : « Alertes et e-mails ». Libellé du menu et titre de la barre du haut passent aussi à « Alertes et e-mails » (le regroupement en sections reste la livraison 4).
- Aucun e-mail envoyé, y compris en test : aucun clic sur « Envoyer » (envoi manuel, « Envoyer maintenant » des rapports). Variables d'envoi vides dans `.env.test`.
- Pas de nouvelle dépendance, pas de mode sombre, cibles tactiles de 44 px, E2E sur la base locale uniquement (`base-test`).

## Choix de Claude à vérifier

1. **La vue « échéances » reste** dans l'onglet Envoi manuel (elle alimente l'envoi). Le cadrage F2 la remplace par le bloc « À traiter », mais ce bloc n'existe qu'à la livraison 7 : la retirer maintenant supprimerait une vue sans remplaçante. Retrait à la livraison 7.
2. Les sous-onglets internes de la page Reporting (« Règles email », « Suivi Opportunités ») sont gardés tels quels dans l'onglet Rapports programmés.
3. Les deux composants clients du reporting sont déplacés (`git mv`) vers `components/admin/alertes/rapports/`, pour ne pas importer depuis le dossier d'une route qui devient une redirection.
4. Adresse interdite → `/` plutôt qu'un repli sur « Envoi manuel » : conserve le test T2 existant.

## Points de vigilance de la revue

1. Les 12 `revalidatePath('/admin/reporting')` et `('/admin/alertes/rules'…)` visent des pages qui deviennent des redirections : sans correction, une règle créée n'apparaîtrait pas. Elles passent à `/admin/alertes` (chaînes seulement, tâche 5).
2. `?onglet=inconnu` ou répété (`string[]`) : onglet par défaut / première valeur, jamais un écran vide (unitaire, tâche 1).
3. AVANCE et EXPLOITATION ne voient ni ne chargent les données des onglets interdits (E2E par rôle, tâche 7 ; `security-review`).
4. Le formulaire de règle revient à l'onglet « Règles d'alerte » après enregistrement (`router.push`).
5. À 375 px, quatre onglets ne débordent pas la page (E2E, tâche 7).
6. Aucun lien d'e-mail ni de cron ne pointe vers `/admin/reporting` (recherche faite : aucun dans `lib/` et `app/api/`).

---

### Tâche 1 : Lecture de l'onglet et droits (pur, testé)

**Fichiers :** créer `lib/alertes/onglets.ts` ; test `tests/unit/alertes-onglets.spec.ts`.

**Interfaces :** `OngletAlertes = 'envoi'|'regles'|'rapports'|'historique'` ; `lireOngletAlertes(valeur)` (absent/inconnu/vide → `'envoi'`, tableau → première valeur) ; `urlOngletAlertes(onglet)` (`envoi` → `/admin/alertes`) ; `ongletsAutorises(role)` ; `ongletAutorise(onglet, role)`.

- [ ] Test d'abord : lecture (absent, inconnu, répété), URL de chaque onglet, onglets par rôle (ADMIN 4, AVANCE 3, EXPLOITATION 1, VISITEUR 0).
- [ ] Écrire le minimum pour le faire passer ; `npm run test:unit`.

### Tâche 2 : Barre d'onglets

**Fichiers :** créer `components/admin/alertes/alertes-onglets.tsx` (calqué sur `components/vehicules/vehicules-onglets.tsx` : liens, `aria-current`, `min-h-11`, `overflow-x-auto` pour 375 px).

- [ ] Ne rend que les onglets du rôle reçu en propriété.

### Tâche 3 : Page à onglets

**Fichiers :** modifier `app/(dashboard)/admin/alertes/page.tsx` ; déplacer `ReportingRulesClient.tsx` et `OpportuniteReportingRulesClient.tsx` vers `components/admin/alertes/rapports/`.

- [ ] Lire `searchParams.onglet`, `requireAuth` puis refus → `redirect('/')` si l'onglet n'est pas autorisé.
- [ ] Charger uniquement les données de l'onglet affiché (échéances + destinataires ; règles ; règles de reporting ×2 ; historique).
- [ ] Contenu de chaque onglet = contenu actuel de la page correspondante, sans refonte (bouton « Nouvelle règle » conservé dans Règles).
- [ ] Erreur de chargement : message + `RetryButton` par onglet, comme aujourd'hui.

### Tâche 4 : Redirections et retour du formulaire

**Fichiers :** `reporting/page.tsx`, `alertes/rules/page.tsx`, `alertes/history/page.tsx` (redirections) ; `components/admin/alertes/rule-builder/rule-form.tsx` (`router.push(urlOngletAlertes('regles'))`) ; lien de `rules-list-client.tsx` inchangé.

### Tâche 5 : `revalidatePath`

**Fichiers :** `lib/actions/reporting-rules.ts`, `opportunite-reporting-rules.ts`, `alert-rules.ts` (chaînes de chemin seulement, aucune logique).

- [ ] `/admin/reporting` et `/admin/alertes/rules` → `/admin/alertes` ; garder `/admin/alertes/rules/${id}/edit`.
- [ ] Relire le diff : uniquement des chaînes de chemin.

### Tâche 6 : Menu

**Fichiers :** `components/layout/dashboard-shell.tsx`.

- [ ] Retirer l'entrée « Reporting », son titre de page et l'import `BarChart2` orphelin ; libellé « Alertes et e-mails ».

### Tâche 7 : Tests E2E (`base-test`, base locale)

**Fichiers :** adapter `tests/reporting/reporting-rules.spec.ts` (T6 « lien Reporting » devient « onglet Rapports programmés » ; titres « Reporting Email » ; T2 conservé) et `tests/alertes/cron-prod.spec.ts` (texte « Gestion des Alertes ») ; créer `tests/alertes/onglets.spec.ts`.

- [ ] Redirections : `/admin/reporting`, `/rules`, `/history` atterrissent sur le bon onglet, paramètres conservés si présents.
- [ ] Droits : ADMIN 4 onglets ; AVANCE sans Rapports (adresse directe → `/`) ; EXPLOITATION seulement Envoi manuel.
- [ ] Création d'une règle : retour sur l'onglet Règles, règle visible.
- [ ] 375 px : pas de débordement horizontal ; clavier : onglets atteignables.
- [ ] Aucun envoi déclenché.

### Tâche 8 : Contrôles de fin et mise en production

- [ ] `npx tsc --noEmit`, ESLint (plafond 172), `npm run test:unit`, build.
- [ ] `agent-browser` sur chaque onglet (375 px, clavier) ; agent `ui-ux-reviewer` ; `security-review` (droits par onglet) ; `simplify` ; `code-review`.
- [ ] Aperçu en direct proposé à Abel (`apercu`), jamais lancé sans son « oui ».
- [ ] Mettre à jour la section « Clôture automatique » du `CLAUDE.md` vers ce plan (une fois validé).
- [ ] Protocole `production-steps.md` : un feu vert pour le push, un pour la fusion (qui déploie), contrôle après déploiement, retour arrière noté (repli = déploiement précédent `58355fa`). Aucun e-mail envoyé.
