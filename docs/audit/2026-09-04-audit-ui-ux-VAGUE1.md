# Audit UI/UX — Vague 1 (Phase 2)

**Date** : 2026-09-04
**Nature** : audit statique du code (aucune vérification au rendu — voir « Angles morts »)
**Modules audités** : `opportunites`, `cautions`, `documents`, `dossiers-offre`, `factures` (5 / 13 — priorité pipeline AO)
**Branche** : `chore/audit-ui-ux` · **runId** : `wf_4f556b30-730` (resume)
**Contrat de référence** : même contrat que le rapport pilote (échelle typo, tokens `stam-*`, `shadow-card`, `AlertDialog` avant action destructive, `loading.tsx` par route liste, spinner proscrit, cible tactile 44px, contraste ≥ 4.5:1).

> ⚠️ **Ce rapport est PARTIEL.** Vague 1 = 5 des 13 modules. Le backlog final unifié sur les 13 modules sera produit par la **consolidation de Phase 2.5** (fusion Pilote + Vague 1 + Vague 2). Ne pas traiter ce document comme le backlog définitif — ne pas ouvrir de PR de correction avant cette consolidation, pour éviter les doublons entre vagues (ex. `CardTitle`, `Button` icône, `BreadcrumbNav` sont déjà touchés côté pilote sur `layout-shell`/`marches`).

---

## 1. Résumé exécutif

| Indicateur | Valeur |
|---|---|
| Findings bruts (audit code) | **58** |
| Rétrogradés Important → Cosmétique (DEFI) | **15** |
| Remontés Important → Bloquant (harmonisation inter-modules) | **1** (F57 factures) |
| Rétrogradés Bloquant → Important (harmonisation inter-modules) | **1** (F52 factures) |
| **Findings retenus** (aucun retrait total — tous étayés) | **58** |
| Entrées backlog après DEDUP transversal | **52** (6 findings fondus dans 4 entrées « transversal ») |
| Bugs fonctionnels extraits (hors périmètre UI pur) | **10** |
| Lots de correction | **11** (Lot 0 → Lot 10) |

### Compteurs par sévérité (backlog, sévérité finale)

| Sévérité | Nombre | Part |
|---|---|---|
| 🔴 Bloquant | **6** | 12 % |
| 🟠 Important | **18** | 35 % |
| 🟡 Cosmétique | **28** | 54 % |
| **Total entrées backlog** | **52** | |

### Compteurs par thème (backlog)

| Thème | Bloquant | Important | Cosmétique | Total |
|---|---|---|---|---|
| design-system (tokens, échelle typo, cible tactile) | — | 1 | 14 | 15 |
| états (loading, empty, erreur, pagination) | — | 4 | 4 | 8 |
| coherence (patterns, headers, widgets) | — | 1 | 8 | 9 |
| accessibilité (aria, labels, contraste, tactile) | 1 | 5 | 2 | 8 |
| conformité (filtres, données liées) | 3 | 2 | — | 5 |
| responsive | 1 | 1 | — | 2 |
| hiérarchie | — | 1 | 1 | 2 |
| micro-interaction | 1 | — | 1 | 2 |

### Compteurs par module (backlog, module principal — un transversal compte sur chaque module touché)

| Module | Bloquant | Important | Cosmétique |
|---|---|---|---|
| opportunites | 1 | 3 | 5 (+3 transversal) |
| cautions | 3 | 4 | 6 (+2 transversal) |
| documents | 1 | 3 | 8 (+2 transversal) |
| dossiers-offre | — | 6 | 3 (+2 transversal) |
| factures | 1 | 2 | 3 (+1 transversal) |

### Verdict de calibrage

Vague 1 est **plus dense en Bloquant que le pilote** (6 contre 1) : le module `cautions` concentre à lui seul 3 Bloquants, tous des bugs fonctionnels réels sur une donnée sensible (badge de type/statut inerte, suppression sans confirmation, filtres désynchronisés de l'URL) — cohérent avec 17.1 (fiabilité des données non négociable). Le module `factures` ajoute un bug financier silencieux (TTC écrasé). Le signal design-system reste volumineux (15/52) mais moins écrasant que sur le pilote (25/70) grâce à la fusion des « couleur en dur → token » déjà pré-appliquée par le script resserré (§7 du rapport pilote) — les entrées design-system restantes sont majoritairement des couleurs codées en dur *locales à un composant*, pas des répétitions massives à fusionner davantage.

---

## 2. Méthode de traitement

### 2.1 DEFI — rétrogradations Important → Cosmétique (15)

Toutes retenues comme incohérences réelles mais sans impact utilisateur mesurable (préférence de pattern, écart de token sans échec fonctionnel, ou doublon d'une entrée déjà comptée ailleurs) :

| Finding source | Raison de la rétrogradation |
|---|---|
| `opportunite-list.tsx:48` — Table au lieu de Card grid | Écart de pattern, mais la donnée reste pleinement lisible/exploitable en table ; aucun préjudice utilisateur mesurable. |
| `opportunite-list.tsx:41` — état vide minimal | Le CTA de création existe déjà dans le `PageHeader` de la page ; l'absence d'icône/CTA redondant dans l'état vide est un manque de polish, pas un blocage. |
| `opportunites/page.tsx:40` — erreur `<p>` brut | Le message d'erreur est bien affiché à l'utilisateur ; seul le style diverge du composant `Alert`. |
| `[id]/page.tsx:52` (×3) — `BreadcrumbNav` sans `showHome` | Fondu dans l'entrée transversale **T3** (cf. §2.3). |
| `statut-changer-button.tsx:240` — 2e widget de date | Les deux composants (Popover+Calendar / `input type=date`) sont fonctionnels ; désaccord de gabarit, pas de perte de donnée. |
| `caution-filters.tsx:208` — checkboxes natives + panneau non migré | Écart au pattern `FilterBar` visé, mais les filtres restent utilisables ; aucun échec fonctionnel isolé de ce point précis (la désynchronisation URL est traitée séparément en Bloquant, cf. F16). |
| `caution-card.tsx` / `lib/utils/caution.ts` — couleurs en dur (4 fichiers) | Dette de tokens, rendu visuel toujours cohérent (rouge=danger reste rouge) ; pas d'échec de communication du statut démontré. |
| `document-card.tsx:120` — couleurs en dur | Idem — dette de tokens sans échec de rendu démontré. |
| `document-card.tsx:30-50` — palette `TYPE_TOP_BAR`/`TYPE_ICON_COLOR` hors tokens | Idem — 8 couleurs restent visuellement distinctes, écart de gouvernance plus que défaut utilisateur. |
| `documents-content.tsx:136` + `document-table.tsx:114` — état vide dupliqué | Consistance/DRY, pas de blocage : l'absence de résultat est bien communiquée. |
| `document-filters.tsx:87` — couleurs en dur | Dette de tokens. |
| `checklist-view.tsx:21` / `piece-statut-button.tsx:24` — couleurs de statut en dur | Le statut reste visuellement distinct (ambre/bleu/vert) ; dette de gouvernance des tokens, pas d'échec de communication. |
| `facture-form.tsx` / `facture-list.tsx` — `bg-white border-gray-100` en dur (5 endroits) | Dette de tokens sans échec de rendu. |
| `facture-list.tsx:68` — lien numéro en `text-stam-primary` au lieu de `font-mono-marche text-stam-accent` | Écart de convention bien documenté (hex précis, lignes précises) mais impact strictement visuel/de marque — les deux couleurs restent des liens lisibles. |
| `[id]/page.tsx` (×3, factures) — `BreadcrumbNav` sans `showHome` | Fondu dans l'entrée transversale **T3**. |

### 2.2 Harmonisations de sévérité entre modules (2)

Deux ajustements pour cohérence entre findings **strictement équivalents** repérés dans des modules différents de cette même vague (pas une reclassification arbitraire — la même classe de défaut doit porter la même sévérité) :

- **`cautions/caution-card.tsx:84` (Important → Bloquant)** : trigger de menu kebab en `opacity-0 group-hover:opacity-100`, invisible au tactile. Strictement le même défaut que `documents/document-card.tsx:78,151`, déjà noté Bloquant par l'audit (menu d'actions secondaires totalement inatteignable sur tablette/mobile). Fondu avec ce dernier dans l'entrée transversale **T4** (cf. §2.3), sévérité Bloquant.
- **`factures/page.tsx` (Bloquant → Important)** : absence de `loading.tsx`. Le même défaut est noté Important sur `opportunites` (F4) et `dossiers-offre` (F42) sans justification d'une gravité différente sur `factures` (pas de fetch particulièrement plus lourd démontré) — harmonisé à Important pour cohérence, en conservant la mention « à confirmer en cas de fetch factures anormalement lent en live ».

**Escalade retenue** (justifiée par un impact financier direct, cohérent avec 17.1 — fiabilité des données non négociable) : `facture-form.tsx:65` (Important → Bloquant) — le champ TTC saisi manuellement est silencieusement écrasé par le recalcul automatique dès que HT ou TVA est retouché, sans avertissement. Sur un ERP de marchés publics où les montants engagent contractuellement, une correction manuelle perdue sans que l'utilisateur s'en aperçoive est un défaut d'intégrité des données, pas un simple désagrément.

### 2.3 DEDUP — entrées transversales (4, fusionnant 10 findings bruts)

| Réf. | Défaut | Fichier(s) racine | Modules touchés | Findings fondus |
|---|---|---|---|---|
| **T1** | `CardTitle` reste `text-2xl` (20px), hors échelle H3/H4 attendue — dette globale déjà documentée côté pilote (`ui/card.tsx:39`) | `components/ui/card.tsx` | opportunites, cautions, documents, dossiers-offre | 4 |
| **T2** | Cible tactile `size="icon"` (`h-10 w-10` = 40px) sous le seuil 44px sur boutons Modifier/Supprimer | `components/ui/button.tsx` | opportunites, dossiers-offre | 2 |
| **T3** | `BreadcrumbNav` utilisé sans `showHome` (icône Accueil absente du 1er maillon) | `components/shared/breadcrumb-nav.tsx` (usage) | opportunites, factures | 2 |
| **T4** | Trigger de menu d'actions secondaires en `opacity-0 group-hover:opacity-100`, invisible au clavier/tactile ; sans `aria-label` côté documents | `caution-card.tsx` + `document-card.tsx` | cautions, documents | 2 |

---

## 3. Backlog complet

Ordre : Bloquant → Important → Cosmétique. À sévérité égale : transversal d'abord, puis pipeline AO (`opportunites` → `dossiers-offre` → `cautions` → `factures`), puis `documents` (support, hors pipeline AO strict).
Effort : **S** ≤ 1 h · **M** 1–4 h · **L** > 4 h (ou multi-fichiers à risque de régression).

| # | Sév. | Thème | Emplacement | Module(s) | Constat | Correctif | Effort |
|---|---|---|---|---|---|---|---|
| V01 | 🔴 | accessibilité · responsive | `caution-card.tsx:84` + `document-card.tsx:78,151` | cautions, documents | **[T4]** Trigger du menu d'actions secondaires (kebab) en `opacity-0 group-hover:opacity-100` : invisible sans survol souris. Sur tablette/mobile (pas de hover), le menu Voir/Modifier/Supprimer devient indécouvrable bien que cliquable. Côté documents, en prime aucun `aria-label` (juste une icône). | Retirer `opacity-0`/le limiter à `md:` avec `focus-visible:opacity-100` ; afficher par défaut sous les breakpoints tactiles. Ajouter `aria-label="Actions"` sur les 2 triggers documents. | M |
| V02 | 🔴 | responsive | `components/shared/page-header.tsx:22` | opportunites | `PageHeader` en `flex items-start justify-between gap-4` sans `flex-wrap`. La page détail Opportunité peut aligner jusqu'à 4 actions (Modifier, Statut, Créer le marché, Supprimer) — dépasse l'espace disponible à 375px sans repli. | Ajouter `flex-wrap` (ou `flex-col sm:flex-row`) sur `PageHeader` ; regrouper les actions secondaires dans un menu sur mobile. | S |
| V03 | 🔴 | design-system | `caution-badge.tsx:45` | cautions | `CautionBadge` force `variant="outline"` et injecte `colorClass` ('blue'/'green'/… ) comme simple `className` : ni variant `Badge` valide ni classe Tailwind réelle (aucune règle `.blue`/`.success` dans `globals.css`) → classe inerte. **Tous** les badges type/statut de caution rendent le même style neutre, sans différenciation colorée. | Mapper `TYPE_CAUTION_COLORS`/`STATUT_CAUTION_COLORS` vers les vrais variants `Badge` (`success`/`warning`/`danger`/`info`/`muted`), passés via `variant`. | S |
| V04 | 🔴 | états | `caution-detail-content.tsx:23` | cautions | Le bouton « Supprimer » (variant destructive) appelle `handleDelete` → `deleteCaution(caution.id)` directement, **sans `AlertDialog` de confirmation**. Un simple clic supprime définitivement une caution bancaire. | Envelopper l'action dans un `<AlertDialog>` avec confirmation explicite avant `deleteCaution`. | S |
| V05 | 🔴 | conformité | `caution-filters.tsx:62` | cautions | `CautionFilters` ne synchronise jamais son état avec l'URL : `page.tsx` pagine côté serveur (skip/take), `CautionsContent` refiltre côté client le seul lot déjà paginé (ex. 20 items) — filtrer ne s'applique donc jamais à l'ensemble des données, et le compteur `PageHeader` devient incohérent avec la liste affichée. `niveauAlerte` transmis par `page.tsx` n'est jamais lu côté serveur (absent du schema Zod et du `where` Prisma). | Piloter `CautionFilters` par l'URL (router + searchParams) comme le filtrage serveur ; ajouter `niveauAlerte` au schema Zod et à la clause `where` ; supprimer le filtrage client redondant. | M |
| V06 | 🔴 | micro-interaction · intégrité des données | `facture-form.tsx:65` | factures | Le champ Montant TTC reste pleinement éditable, mais un `useEffect` l'écrase automatiquement à chaque changement de HT ou TVA — y compris après une saisie manuelle du TTC (ex. arrondi contractuel). L'utilisateur perd sa correction sans aucun feedback. *(Escalade Important → Bloquant, cf. §2.2 — donnée financière contractuelle.)* | Rendre le champ TTC en lecture seule avec un style de valeur calculée, ou n'auto-calculer que tant que l'utilisateur n'a pas modifié le champ manuellement (flag `dirty`). | M |
| V07 | 🟠 | conformité | `opportunites/page.tsx:31` | opportunites | `getOpportunites` accepte un filtre statut, mais aucun `FilterBar` n'existe sur la page — filtre inatteignable sans manipuler l'URL, contrairement à marchés/véhicules/documents. | Ajouter un `FilterBar` (recherche + `Select` statut + Effacer + compteur), sur le modèle de `marche-filters.tsx`. | M |
| V08 | 🟠 | états | `opportunites/page.tsx` | opportunites | Aucun `loading.tsx` sous `app/(dashboard)/opportunites/` — pas de Skeleton au chargement de la liste, contrairement à marchés/véhicules/documents/cautions. | Ajouter `app/(dashboard)/opportunites/loading.tsx` avec `ListSkeleton`. | S |
| V09 | 🟠 | accessibilité | `opportunite-list.tsx:93` + `opportunite-delete-button.tsx:42` | opportunites | Boutons icône seule (Pencil, Trash2, réutilisés en liste et en détail) sans `aria-label` — aucun texte exploitable pour un lecteur d'écran. | Ajouter `aria-label="Modifier l'opportunité"` / `aria-label="Supprimer l'opportunité"`. | S |
| V10 | 🟠 | coherence | `dossiers-offre/page.tsx` | dossiers-offre | Aucun `FilterBar` sur la page liste (pas de recherche, pas de filtre statut). Les 4 autres modules liste suivent le pattern `PageHeader` + `FilterBar` + Grid/Table + Pagination. | Ajouter un `FilterBar` (recherche titre + `Select` statut EN_COURS/SOUMIS/ARCHIVE), sur le modèle de `marche-filters.tsx`. | M |
| V11 | 🟠 | états | `app/(dashboard)/dossiers-offre/` (toutes routes) | dossiers-offre | Aucun `loading.tsx` dans tout le module (liste, `[id]`, `[id]/edit`, `nouveau`) — navigation affiche un blanc/flash pendant le fetch Prisma. | Créer les `loading.tsx` manquants (`ListSkeleton`/skeleton formulaire selon la route), sur le modèle de `marches/loading.tsx`. | S |
| V12 | 🟠 | états | `piece-statut-button.tsx:38` | dossiers-offre | Aucun `toast.success` après mise à jour réussie du statut d'une pièce — seul `toast.error` est appelé en cas d'échec. Succès totalement silencieux, contrairement à `dossier-form.tsx`/`dossier-delete-button.tsx` du même module. | Ajouter `toast.success('Statut mis à jour')` dans le bloc succès de `handleChange`. | S |
| V13 | 🟠 | accessibilité | `piece-statut-button.tsx:56` | dossiers-offre | Le `SelectTrigger` de statut d'une pièce n'a ni `aria-label` ni label visible associé — dans une liste de pièces, impossible pour un utilisateur clavier/lecteur d'écran de savoir à quelle pièce le select est rattaché une fois le focus dessus. | `aria-label={\`Statut de la pièce ${nom}\`}` (passer `nom` en prop depuis `checklist-view.tsx`) ou `aria-labelledby`. | S |
| V14 | 🟠 | hierarchie · responsive | `dossier-list.tsx:41` | dossiers-offre | `<Table>` (6 colonnes) enveloppée dans `rounded-md border` **sans** `overflow-x-auto`. À 375×667 (point de contrôle imposé par le projet), une table à 6 colonnes va déborder sans mécanisme de scroll dédié. | Envelopper dans `<div className="rounded-md border overflow-x-auto">`. | S |
| V15 | 🟠 | conformité | `dossier-form.tsx:43` | dossiers-offre | Le formulaire reçoit `marcheId`/`opportuniteId` (defaults + valeurs en édition) mais **n'affiche cette relation nulle part** — ni champ, ni valeur en lecture seule, ni sur la page détail. Un dossier lié à un marché existant ne montre ce lien dans aucune UI du module. | Ajouter un champ de sélection/affichage du marché/opportunité lié (Select ou lien en lecture seule) dans `dossier-form.tsx` et/ou `[id]/page.tsx`. | M |
| V16 | 🟠 | états | `caution-card.tsx:104` | cautions | Dans le menu kebab de la carte liste, l'item « Supprimer » (icône + texte destructif) appelle `onDelete(caution.id)` qui, dans `cautions-content.tsx`, ne fait que `router.push` vers la page de détail — **aucune suppression n'a lieu** depuis la liste malgré le libellé/icône. | Retirer cet item du menu liste, ou lui donner un vrai comportement de suppression avec confirmation cohérent avec la page détail. | S |
| V17 | 🟠 | conformité | `caution-list.tsx:40` | cautions | `CautionList` implémente sa propre pagination cliente (20 items/page, boutons faits main) **en plus** de la pagination serveur déjà rendue par `<DataPagination>` dans `page.tsx` — deux systèmes de pagination indépendants empilés sur le même écran. | Supprimer la pagination interne de `CautionList` ; laisser uniquement `DataPagination` piloter la navigation. | S |
| V18 | 🟠 | accessibilité | `caution-filters.tsx:117` | cautions | Le champ de recherche n'a ni `<Label>` associé ni `aria-label` ; seul le placeholder identifie son rôle — disparaît dès la saisie. | `aria-label="Rechercher une caution"`, ou `<Label>` `sr-only` associé via `htmlFor`/`id`. | S |
| V19 | 🟠 | hierarchie | `cautions/[id]/edit/page.tsx:99` | cautions | La page Modifier n'utilise ni `BreadcrumbNav` ni `PageHeader`, contrairement au détail. À la place : bouton retour icône seule sans `aria-label` et un `<h1 className="text-3xl">` qui contredit la règle globale `h1 = text-2xl`. | Aligner sur le pattern détail (`BreadcrumbNav` + `PageHeader`), retirer le `h1` fait main, ajouter `aria-label="Retour"`. | M |
| V20 | 🟠 | états | `app/(dashboard)/factures/page.tsx` | factures | Aucun `loading.tsx` sur la route liste. *(Harmonisé Bloquant → Important, cf. §2.2 — même défaut qu'opportunités/dossiers-offre, sans facteur aggravant démontré côté factures.)* | Créer `factures/loading.tsx` en reprenant le pattern de `cautions/loading.tsx`. | S |
| V21 | 🟠 | hierarchie | `factures/page.tsx:27` | factures | `getFactures` accepte `statut` et `marcheId` en filtres, mais aucun `FactureFilters` n'existe — filtre/recherche inatteignable en UI, seulement via l'URL. | Ajouter `FactureFilters` (Select statut + Select/recherche marché, compteur), branché sur les query params déjà supportés côté serveur. | M |
| V22 | 🟠 | design-system | `document-card.tsx:78,151` (variante du toggle) — voir aussi `documents-content.tsx:105` | documents | Toggle vue liste/grille en `border-gray-200 bg-white` codé en dur, boutons `px-3 py-1.5` (~28-30px de hauteur) sous la cible tactile 44px. | Remplacer par tokens (`border-border`/`bg-card`/`hover:bg-muted`) et porter la hauteur à ≥44px sur mobile/tablette. | S |
| V23 | 🟠 | accessibilité | `document-filters.tsx:94` | documents | Le champ de recherche n'a pas de `<Label>` associé ni d'`aria-label` — seuls placeholder et icône décorative indiquent son rôle. | `<Label htmlFor="doc-search" className="sr-only">Rechercher un document</Label>` + `id` sur l'`Input`, ou `aria-label`. | S |
| V24 | 🟠 | coherence | `app/(dashboard)/documents/upload/page.tsx:32` | documents | La page d'upload n'utilise pas `PageHeader` (utilisé sur liste/détail) mais un `<h1 className="text-3xl">` fait main, qui écrase le style `h1` global (20px) et casse la cohérence typographique. Pas de `BreadcrumbNav` non plus. | Remplacer par `<PageHeader title=… description=… />`, cohérent avec le reste du module. | S |
| V25 | 🟡 | hierarchie | `components/ui/card.tsx:39` | opportunites, cautions, documents, dossiers-offre | **[T1]** `CardTitle` reste `text-2xl` (20px), hors échelle H3/H4 attendue — amplifie une dette déjà documentée côté pilote sur ces 4 modules (plusieurs titres par écran détail). | Réduire `CardTitle` à `text-lg font-semibold` (correctif global, une seule fois — coordonner avec le Lot 0 du pilote si non déjà fait). | S |
| V26 | 🟡 | design-system | `components/ui/button.tsx:31` | opportunites, dossiers-offre | **[T2]** Cible tactile probable <44px : variante `icon` = `h-10 w-10` (40px). Utilisée pour Modifier/Supprimer icône-seule sur `opportunite-list.tsx` et `dossier-list.tsx`. | Passer la variante `icon` à `h-11 w-11`, ou élargir la zone cliquable sur ces usages. | S |
| V27 | 🟡 | coherence | `components/shared/breadcrumb-nav.tsx` (usage) | opportunites, factures | **[T3]** `BreadcrumbNav` utilisé sans `showHome` sur 6 pages (3 opportunités + 3 factures), contrairement au pattern établi sur marchés/documents/véhicules/cautions. | Ajouter `showHome` aux 6 appels de `BreadcrumbNav`. | S |
| V28 | 🟡 | coherence | `opportunite-list.tsx:48` | opportunites | Liste rendue en `<Table>` dense (7-8 colonnes) au lieu du pattern Grid de cards (`MarcheCard`/`VehiculeCard`/`DocumentCard`/`CautionCard`) imposé pour toute liste métier. Aucune `OpportuniteCard` n'existe. | Créer `opportunite-card.tsx` (barre couleur statut, footer Voir/Modifier) et remplacer la `Table` par une grille responsive. | L |
| V29 | 🟡 | états | `opportunite-list.tsx:41` | opportunites | État vide réduit à une ligne de texte muted, sans icône/titre/CTA, alors que `marche-list.tsx` affiche icône + titre + description + bouton Créer. | Aligner sur `marche-list.tsx` : icône, titre, description, bouton « Nouvelle opportunité » (si `canWrite`). | S |
| V30 | 🟡 | états | `opportunites/page.tsx:40` | opportunites | État d'erreur réduit à `<p className="text-destructive">`, sans `Alert`, icône ni action de retry. | Remplacer par `<Alert variant="destructive">` avec icône et message. | S |
| V31 | 🟡 | coherence | `statut-changer-button.tsx:240` | opportunites | Deux widgets de date différents dans le même module : `opportunite-form.tsx` (Popover+Calendar shadcn) vs `statut-changer-button.tsx` (`<Input type="date">` natif). | Remplacer les `Input type=date` du `Sheet` par le même Popover+Calendar que le formulaire principal. | S |
| V32 | 🟡 | design-system | `opportunite-list.tsx:71,86` + `[id]/page.tsx:97,151` | opportunites | `opp.reference` et `opp.marche.numero` ne portent pas la classe `.font-mono-marche` imposée pour tout numéro de marché/immatriculation. | Appliquer `className="font-mono-marche"` sur ces 4 emplacements. | S |
| V33 | 🟡 | design-system | `checklist-view.tsx:21` + `piece-statut-button.tsx:24` | dossiers-offre | Couleurs de statut codées en dur (`text-amber-500`, `text-blue-500`, `text-green-500`…) au lieu des tokens STAM sémantiques, alors que `STATUT_PIECE_COLORS` (déjà exporté par `lib/validations/dossier-offre.ts`) fait référence ailleurs dans le projet. | Remplacer par les tokens STAM (`text-stam-warning`, `text-stam-accent`, `text-stam-success`, `text-destructive`) — ou réutiliser directement `STATUT_PIECE_COLORS` comme source unique. | S |
| V34 | 🟡 | états | `dossiers-offre/page.tsx:27` | dossiers-offre | État d'erreur de la page liste réduit à `<p className="text-destructive">`, sans `Alert`, icône ni action de retry. | Utiliser `Alert` (variant destructive) avec titre + description. | S |
| V35 | 🟡 | états | `dossier-list.tsx:32` | dossiers-offre | État vide minimal : texte centré sans icône ni CTA, alors que `canWrite` est disponible et qu'un CTA « Nouveau dossier » existe déjà dans le `PageHeader`. | Enrichir l'état vide (icône `FolderOpen` + bouton « Créer le premier dossier » si `canWrite`). | S |
| V36 | 🟡 | design-system | `caution-filters.tsx:208` | cautions | Filtres Type/Statut sur `<input type="checkbox">` HTML natifs non stylés au lieu du `Checkbox` shadcn/ui ; panneau jamais migré vers le pattern `FilterBar` horizontale compacte des autres modules ; badges filtres actifs en `variant="secondary"` générique au lieu de `bg-primary/8 text-primary`. | Remplacer les checkboxes natives par `<Checkbox>` shadcn ; convertir le panneau en barre horizontale compacte alignée sur les autres `FilterBar` du projet. | M |
| V37 | 🟡 | design-system | `caution-card.tsx:31-45,68…` + `lib/utils/caution.ts:115` | cautions | Couleurs codées en dur sur un composant réutilisable (`border-l-red-500`/`amber-400`/…, `text-red-600 bg-red-50`/…, `bg-white`/`border-gray-100`/`hover:bg-blue-50`…) au lieu des tokens sémantiques STAM. Même divergence dans `lib/utils/caution.ts` (`getCouleurNiveauAlerte`), consommée par `caution-detail.tsx` et `caution-timeline.tsx`. | Remplacer chaque couleur Tailwind brute par le token STAM correspondant (`stam-danger`/`-bg`, `stam-warning`/`-bg`, `stam-success`/`-bg`) sur les 4 fichiers listés. | M |
| V38 | 🟡 | coherence | `cautions/nouvelle/page.tsx:29` | cautions | La page « Nouvelle caution » n'utilise ni `BreadcrumbNav` ni `PageHeader` (juste `Card`/`CardHeader`/`CardTitle`) — troisième variante d'en-tête différente sur le même module. | Uniformiser les 3 écrans (détail/édition/création) sur `BreadcrumbNav` + `PageHeader`. | S |
| V39 | 🟡 | design-system | `caution-filters.tsx:22` | cautions | `useDebounce` importé mais jamais utilisé — la recherche texte refiltre à chaque frappe sans debounce, alors que le hook 300ms est la convention établie ailleurs. | Appliquer `useDebounce` sur `filters.search` avant `onFiltersChange`, ou retirer l'import. | S |
| V40 | 🟡 | coherence | `cautions-content.tsx:116` | cautions | Filtres + Liste enveloppés dans un unique `<Card className="p-6">`, alors que le pattern cible prévoit une `FilterBar` autonome suivie directement de la Grid, sans carte englobante. | Retirer le `Card` englobant ; laisser `CautionFilters`/`CautionList` se présenter directement dans le flux de page. | S |
| V41 | 🟡 | coherence | `edit-caution-content.tsx:33` | cautions | `CautionForm` utilisé sans prop `onCancel` en mode édition : aucun bouton Annuler, aucun moyen d'annuler l'édition autrement qu'en quittant la page. | Passer `onCancel={() => router.push(\`/cautions/${caution.id}\`)}` à `CautionForm`. | S |
| V42 | 🟡 | design-system | `facture-form.tsx:102,197,268,329` + `facture-list.tsx:47` | factures | `bg-white rounded-xl border border-gray-100 shadow-card` codé en dur à 5 emplacements au lieu des tokens shadcn déjà disponibles (`bg-card`/`border-border`). | Remplacer les 5 occurrences par `bg-card border-border` (ou composant `Card` shadcn par défaut). | S |
| V43 | 🟡 | coherence | `facture-list.tsx:68` | factures | Le lien du numéro de facture utilise `text-stam-primary` (identité de marque réservée sidebar/login) au lieu de `font-mono-marche text-stam-accent` — convention établie pour tout identifiant de liste (numéro de marché, immatriculation). | Remplacer par `font-mono-marche text-stam-accent hover:underline`, aligné sur `marche-card.tsx`/`vehicule-card.tsx`. | S |
| V44 | 🟡 | hierarchie | `factures/[id]/page.tsx:69` | factures | Layout `grid-cols-1 lg:grid-cols-3` (3 cards Montants/Dates/Marché à plat) au lieu du layout 2 colonnes documenté pour les pages détail (marché/caution/véhicule). | Regrouper en 2 colonnes (colonne principale Montants+Dates, colonne latérale Marché associé) si non intentionnel. | S |
| V45 | 🟡 | design-system | `document-card.tsx:120,68,213,223` | documents | Couleurs codées en dur répétées dans le même fichier au lieu des tokens : `bg-white`, `border-gray-100`, `hover:bg-gray-50`, `hover:bg-gray-100`, `bg-gray-50/50`, `border-gray-200`. | Remplacer par les tokens (`bg-card`, `border-border`, `hover:bg-muted`). | S |
| V46 | 🟡 | design-system | `document-card.tsx:30-50` | documents | `TYPE_TOP_BAR`/`TYPE_ICON_COLOR` utilisent 8 couleurs Tailwind arbitraires (blue/green/orange/purple/pink/indigo/cyan, gray) hors du système de tokens STAM. | Dériver ces couleurs de la palette imposée (`chart-1..5` + `stam-warning`/`stam-danger`/`muted-foreground`) ou documenter explicitement l'extension de palette nécessaire. | M |
| V47 | 🟡 | états | `documents-content.tsx:136` + `document-table.tsx:114` | documents | État vide dupliqué et minimal (grille et liste) : juste « Aucun document trouvé », sans icône, sans distinction filtré/vide, sans CTA d'upload alors que `canWrite` est disponible. | Créer un état vide partagé (icône + message contextuel + CTA « Nouveau document » si `canWrite`) réutilisé par les deux vues. | S |
| V48 | 🟡 | design-system | `document-filters.tsx:87,156` | documents | `bg-white rounded-xl border border-gray-100 shadow-card` et `border-t border-gray-50` codés en dur au lieu des tokens. | Remplacer `bg-white`→`bg-card`, `border-gray-100`/`border-gray-50`→`border-border`. | S |
| V49 | 🟡 | accessibilité | `document-card.tsx:193` | documents | `text-amber-600` codé en dur pour « Valide jusqu'au » sur fond blanc en `text-xs` (11px) : contraste calculé ≈3.19:1, sous le seuil 4.5:1. Le token `stam-warning` (même hex) existe et n'est pas utilisé. | Utiliser `text-stam-warning` ou le badge `warning` avec fond dédié plutôt qu'un texte coloré isolé. | S |
| V50 | 🟡 | coherence | `document-filters.tsx:152` | documents | Contrairement à `marche-filters.tsx`/`vehicule-filters.tsx`, `DocumentFilters` n'affiche aucun compteur de résultats. | Ajouter un compteur de résultats (`text-xs`), sur le modèle des deux autres modules. | S |
| V51 | 🟡 | accessibilité | `document-version-history.tsx:170` | documents | Boutons icône Prévisualiser/Télécharger n'ont que `title=…`, pas d'`aria-label`, alors que le contrat impose `aria-label` pour les boutons icône seuls. | Ajouter `aria-label` sur ces deux boutons. | S |
| V52 | 🟡 | états | `document-preview.tsx:138` + `document-version-history.tsx:83` | documents | Chargement affiché avec spinner `Loader2` au lieu du Skeleton/shimmer imposé par le contrat. | Remplacer par des `Skeleton` (zone de prévisualisation, liste de versions). | S |

---

## 4. Lots de correction

Chaque lot = 1 PR livrable indépendamment. Ordre imposé par la priorité (Bloquant d'abord) et les dépendances. **Avant tout Lot** : vérifier auprès du pilote (rapport `…PILOTE.md`) qu'un Lot 0 tokens n'est pas déjà en cours sur `layout-shell`/`marches`, pour éviter un conflit de fusion sur les mêmes fichiers `ui/`.

### Lot 0 — Fondations transversales *(effort S, aucune dépendance, à faire en premier)*
**Entrées** : V25 (`CardTitle` T1), V26 (`Button` icône T2), V27 (`BreadcrumbNav showHome` T3), V02 (`PageHeader` flex-wrap, Bloquant).
**Pourquoi d'abord** : 3 composants partagés (`ui/card.tsx`, `ui/button.tsx`, `shared/page-header.tsx`) et 1 usage répété (`BreadcrumbNav`) — bénéficient immédiatement aux 4-5 modules de cette vague sans attendre le reste.

### Lot 1 — Cautions : sécurité et fiabilité des actions *(effort L — le plus dense en Bloquant)*
**Entrées** : V03 (badge inerte), V04 (suppression sans confirmation), V05 (filtres non synchronisés URL + `niveauAlerte`), V16 (bouton « Supprimer » trompeur en liste), V17 (double pagination).
**Risque** : V05 touche le contrat de props `CautionFilters` — tester la combinatoire de filtres après migration.

### Lot 2 — Menus d'action invisibles au tactile *(Bloquant transversal, effort M)*
**Entrées** : V01 (T4 — cautions + documents).
**Dépendance** : indépendant, peut être fait en parallèle du Lot 1.

### Lot 3 — Factures : intégrité des données *(Bloquant, effort M, isolé)*
**Entrées** : V06 (TTC écrasé silencieusement).
**Test requis** : E2E de non-régression (saisie manuelle TTC → modification HT → TTC doit rester la valeur saisie ou avertir explicitement).

### Lot 4 — États de chargement manquants (`loading.tsx`) *(Important, effort S, gain rapide)*
**Entrées** : V08 (opportunites), V11 (dossiers-offre, 4 routes), V20 (factures).

### Lot 5 — `FilterBar` manquants (recherche/filtre inatteignable en UI) *(Important, effort L)*
**Entrées** : V07 (opportunites), V10 (dossiers-offre), V21 (factures).
**Modèle** : `marche-filters.tsx`/`vehicule-filters.tsx` comme référence de pattern.

### Lot 6 — Accessibilité : labels et `aria-label` manquants *(Important + Cosmétique, effort S, mécanique)*
**Entrées** : V09 (opportunites), V13 (dossiers-offre), V18 (cautions), V22 (documents, toggle vue), V23 (documents, recherche), V51 (documents, preview/download).

### Lot 7 — Dossiers-offre : cohérence et visibilité des données *(Important, effort M)*
**Entrées** : V12 (toast succès), V14 (`overflow-x-auto` table), V15 (lien marché/opportunité invisible).

### Lot 8 — Pages secondaires sans `PageHeader`/`BreadcrumbNav` *(Important + Cosmétique, effort M)*
**Entrées** : V19 (cautions, edit), V38 (cautions, nouvelle), V24 (documents, upload).

### Lot 9 — Nettoyage design-system (couleurs codées en dur → tokens) *(Cosmétique mais volumineux, effort L, dépend du Lot 0 stabilisé)*
**Entrées** : V33 (dossiers-offre), V36 (cautions, checkboxes + `FilterBar`), V37 (cautions, 4 fichiers), V42 (factures, 5 endroits), V45 (documents), V46 (documents, palette type), V48 (documents).
**À faire en fin de vague** : gros volume de fichiers touchés, capture avant/après recommandée.

### Lot 10 — Polish cosmétique dispersé *(effort S, non bloquant — reportable à la consolidation Phase 2.5)*
**Entrées** : V28 (opportunites, Table→Card, seul item **L** de ce lot), V29, V30, V31, V32 (opportunites) ; V34, V35 (dossiers-offre) ; V39, V40, V41 (cautions) ; V43, V44 (factures) ; V47, V49, V50, V52 (documents).

### Dépendances clés
- **Lot 0 avant tout le reste** (composants partagés référencés par plusieurs lots).
- **Lot 9 après Lot 0** (éviter de tokeniser puis re-toucher les mêmes fichiers pour la taille de police/cible tactile).
- **Lot 5 dépend du Lot 4** sur `dossiers-offre` uniquement si le même sprint touche les deux (`loading.tsx` et `FilterBar` sur les mêmes routes) — sinon indépendants.
- Lots 1, 2, 3, 6 sont mutuellement indépendants et parallélisables.

---

## 5. Annexe — Bugs fonctionnels (hors périmètre UI pur)

Détectés pendant l'audit UI mais relevant d'un défaut de comportement, pas de présentation. À traiter dans les lots indiqués **avec test E2E de non-régression**.

| Réf. | Emplacement | Symptôme | Lot |
|---|---|---|---|
| F1 | `caution-badge.tsx:45` | `colorClass` injecté en `className` n'est ni un variant `Badge` ni une classe Tailwind réelle → aucune différenciation colorée type/statut. | Lot 1 (V03) |
| F2 | `caution-detail-content.tsx:23` | Suppression d'une caution sans confirmation — un clic supprime définitivement. | Lot 1 (V04) |
| F3 | `caution-card.tsx:104` | Item « Supprimer » du menu liste ne supprime rien — redirige simplement vers le détail. | Lot 1 (V16) |
| F4 | `caution-filters.tsx:62` | Filtres non synchronisés à l'URL : ne filtrent que la page serveur déjà chargée, jamais l'ensemble des données ; `niveauAlerte` silencieusement ignoré côté serveur. | Lot 1 (V05) |
| F5 | `caution-list.tsx:40` | Double système de pagination (client + serveur) empilé sur le même écran. | Lot 1 (V17) |
| F6 | `document-card.tsx:78,151` | Menu d'actions secondaires (versions/supprimer) invisible et non annoncé au clavier/tactile — inatteignable sur tablette/mobile. | Lot 2 (V01) |
| F7 | `opportunites/page.tsx:31` | Filtre statut supporté côté serveur mais aucun moyen UI de l'atteindre. | Lot 5 (V07) |
| F8 | `factures/page.tsx:27` | Filtres `statut`/`marcheId` supportés côté serveur mais aucun moyen UI de les atteindre. | Lot 5 (V21) |
| F9 | `dossier-form.tsx:43` | Relation marché/opportunité reçue en props mais jamais affichée nulle part dans l'UI du module. | Lot 7 (V15) |
| F10 | `facture-form.tsx:65` | Montant TTC saisi manuellement écrasé silencieusement au moindre changement de HT/TVA — perte de donnée sans avertissement, sur un champ financier contractuel. | Lot 3 (V06) |

---

## 6. Angles morts / à vérifier en live

### 6.1 Ce que l'audit statique ne peut pas trancher

| Sujet | Findings concernés | Vérification |
|---|---|---|
| **Débordement horizontal réel** | V02 (`PageHeader` 4 actions à 375px), V14 (table dossiers-offre) | Playwright 375 / 768 / 1920, assertion `scrollWidth <= clientWidth` sur `<body>`. |
| **Contraste rendu réel** | V49 (`text-amber-600` ≈3.19:1 calculé) | Contrôle au rendu + outil de contraste (axe/Lighthouse), 3 viewports. |
| **Invisibilité tactile réelle des menus kebab** | V01 (T4) | Émulation tactile Playwright (pas de `:hover`) sur `caution-card.tsx` et `document-card.tsx` ; confirmer que le menu reste totalement inatteignable. |
| **Comportement réel de la désynchronisation filtres/URL** | V05 (cautions) | Reproduire : appliquer un filtre avec >20 cautions en base, constater l'écart entre compteur `PageHeader` et liste affichée. |
| **Perte de saisie TTC réelle** | V06 (factures) | Reproduire : saisir TTC manuellement, modifier HT, constater l'écrasement silencieux. |
| **Ordre de focus / navigation clavier** | V04 (AlertDialog à ajouter), V19 (bouton retour sans aria-label) | Navigation clavier Tab/Shift-Tab/Échap bout-en-bout sur les 5 modules. |
| **Erreurs console / réseau** | V05, V15, V17 (états de données incohérents) | Ouvrir la console + l'onglet réseau sur chaque écran concerné, capturer `warning`/`error`. |

### 6.2 Parcours transverses non audités (à couvrir en Phase 2.5 ou en pass live dédié)

- **Recherche globale** (topbar) — comportement, résultats, états vide/chargement.
- **Cloche de notifications** — ouverture du panneau, marquage lu/non-lu, navigation depuis une notif.
- **Exports PDF / Excel** — déclenchement, état de chargement, gestion d'erreur, contenu (aucun des 5 modules de cette vague n'a été vérifié sur ce point malgré la présence de factures/cautions, données financières).
- **Pagination serveur bout-en-bout** — cohérence URL, bornes, retour page 1 au changement de filtre (particulièrement sensible sur `cautions`, cf. V05/V17).
- **Tri / filtres bout-en-bout** — combinaisons, persistance URL, sur les modules où le `FilterBar` reste à créer (V07, V10, V21).
- **Navigation clavier complète** — skip-link, ordre des landmarks, retour focus après fermeture de modale (`AlertDialog` à ajouter en V04).
- **États réseau réels** — lenteur, échec de Server Action, sur les Server Actions de suppression/mise à jour de statut (cautions, dossiers-offre).
- **Responsive des 8 modules restants** — `layout-shell`, `dashboard-home`, `marches`, `admin-alertes` déjà couverts par le pilote ; `vehicules`, `admin-users`, `admin-analytique`, `auth-profil` restent à auditer (Vague 2).

### 6.3 Modules à relancer (audit code)

**Aucun.** Les 5 modules de la Vague 1 ont produit un signal exploitable et cohérent avec le pilote ; pas de re-run du workflow d'audit statique nécessaire. Un **pass de vérification live (Playwright, 3 viewports, console)** reste requis sur `opportunites`, `cautions`, `documents`, `dossiers-offre`, `factures` avant l'ouverture des PR de correction, pour lever les points du §6.1 — à combiner avec le pass live déjà requis pour le pilote (§6.3 de `…PILOTE.md`) plutôt que de le dupliquer.

---

## 7. Recommandations pour la Vague 2 et la consolidation Phase 2.5

1. **Garder le rubric et le script resserré** — la fusion « couleur en dur → token » par composant a bien réduit le volume brut sans perdre de signal (58 findings sur 5 modules vs 74 sur 3 pour le pilote, densité comparable mais moins de répétitions intra-fichier).
2. **La Vague 2** (`dashboard-home`, `vehicules`, `admin-users`, `admin-analytique`, `auth-profil`) recoupera probablement `T1`/`T2` (`CardTitle`, `Button` icône) — les traiter comme *déjà comptées* dans la consolidation plutôt que de les re-fusionner une 3e fois.
3. **La consolidation Phase 2.5** doit fusionner explicitly les 3 rapports (Pilote 41 entrées + Vague 1 52 entrées + Vague 2 à venir) et dédupliquer les entrées transversales qui se recoupent entre vagues (`CardTitle`, `BreadcrumbNav showHome`, cible tactile `Button icon` — déjà présentes côté pilote sur `layout-shell`/`marches`).
4. **Densité Bloquant à surveiller** : 6/52 ici contre 1/41 côté pilote — les modules `cautions` et `factures` manipulent des données financières/contractuelles (cautions bancaires, montants de facture) ; si la Vague 2 confirme ce pattern sur `vehicules`/`admin-analytique`, envisager de prioriser ces lots avant le nettoyage cosmétique, indépendamment de l'ordre pipeline AO.
5. **Live ciblé** : concentrer le pass Playwright post-Vague-2 sur l'ensemble des `a_verifier_live: true` cumulés des 3 rapports plutôt que 3 passes séparées.
