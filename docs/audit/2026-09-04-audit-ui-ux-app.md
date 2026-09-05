# Audit UI/UX — Backlog consolidé (Phase 2.5)

**Date** : 2026-09-04
**Nature** : consolidation documentaire — fusion des rapports Pilote + Vague 1. Aucune nouvelle décision de sévérité : les arbitrages DEFI de chaque rapport source sont conservés tels quels (cf. `2026-09-04-audit-ui-ux-PILOTE.md` §2, `2026-09-04-audit-ui-ux-VAGUE1.md` §2).
**Branche** : `chore/audit-ui-ux` · **runId** : `wf_4f556b30-730`

---

## 0. Note méthodologique — écart constaté sur le rapport Pilote

Le résumé exécutif du rapport Pilote annonce **41 entrées backlog (1 Bloquant / 30 Important / 39 Cosmétique)**. Vérification directe (`grep` sur les lignes `| B## |` de sa table §3) : la table contient en réalité **48 entrées, B01 à B48, sans aucun trou** (1 Bloquant / 23 Important / 24 Cosmétique). Le triplet « 1/30/39 » du résumé correspond en fait aux **70 « findings retenus »** *avant* DEDUP (1+30+39=70), pas aux 41 entrées de backlog annoncées à la ligne suivante — une incohérence interne au rapport source, pas une erreur de lecture de ce document.

Cette consolidation part de la **table réelle** (48 entrées Pilote + 52 entrées Vague 1 = **100 entrées brutes**), pas du chiffre erroné du résumé Pilote. Le rapport Vague 1, lui, est cohérent en interne (52 lignes = 52 annoncées) : `grep -c '^| V[0-9]' → 52`.

---

## 1. Résumé exécutif

| Indicateur | Valeur |
|---|---|
| Entrées avant fusion (Pilote 48 + Vague 1 52) | **100** |
| Doublons inter-rapports fusionnés | **1** (`CardTitle text-2xl`, `components/ui/card.tsx:39` — B29 ↔ V25/T1) |
| **Entrées backlog consolidées** | **99** |
| Bugs fonctionnels fusionnés (annexe, 6 + 10) | **16** (aucun doublon trouvé) |
| Lots de correction fusionnés | **18** (Lot 0 → Lot 17) |

### Compteurs par sévérité (backlog consolidé)

| Sévérité | Nombre | Part |
|---|---|---|
| 🔴 Bloquant | **7** | 7 % |
| 🟠 Important | **41** | 41 % |
| 🟡 Cosmétique | **51** | 52 % |
| **Total** | **99** | |

### Compteurs par thème (backlog consolidé, thème primaire)

| Thème | Bloquant | Important | Cosmétique | Total |
|---|---|---|---|---|
| design-system (tokens, échelle typo, ombres, cible tactile) | 1 | 2 | 18 | 21 |
| accessibilité (aria, focus, contraste, cible tactile) | 1 | 11 | 7 | 19 |
| cohérence (patterns, composants divergents, headers) | — | 6 | 13 | 19 |
| états (loading, tri, pagination, empty, erreur, succès) | 1 | 10 | 8 | 19 |
| conformité (contrat, filtres, données liées) | 1 | 4 | 2 | 7 |
| hiérarchie (titres, dominance visuelle, layout) | — | 5 | 2 | 7 |
| responsive (débordement mobile/tablette) | 2 | 3 | — | 5 |
| micro-interaction | 1 | — | 1 | 2 |
| **Total** | **7** | **41** | **51** | **99** |

### Méthode de dédup inter-rapports (§2 détaille le raisonnement)

Sur les **4 recoupements nommément désignés** par le rapport Vague 1 comme potentiels doublons avec le Pilote (`CardTitle`, `BreadcrumbNav showHome`, cible tactile `Button` icône, tokens couleur en dur), l'inspection fichier-par-fichier n'en confirme **qu'un seul comme doublon littéral** : `CardTitle text-2xl` (même fichier, même ligne, même défaut, même correctif dans les deux rapports — `components/ui/card.tsx:39`). Les trois autres sont **thématiquement liés** mais portent sur des fichiers différents et des défauts concrets distincts — les fusionner aurait fait disparaître de l'information réelle (deux bugs différents sur deux composants différents). Ils restent des entrées séparées, regroupées dans le même Lot 0 pour un traitement coordonné. Détail au §2.

---

## 2. Périmètre de cette consolidation

**8 modules audités sur 13** :
- Rapport Pilote : `layout-shell`, `marches`, `admin-alertes`
- Rapport Vague 1 : `opportunites`, `cautions`, `dossiers-offre`, `factures`, `documents`

Ensemble, ces 8 modules couvrent **tout le shell transversal** (`layout-shell` — sidebar, topbar, composants `ui/*`/`shared/*` partagés par les 13 modules) et **tout le pipeline appel d'offres** (`opportunites → marches → dossiers-offre → cautions → factures`), plus `documents` (support) et `admin-alertes` (back-office).

**5 modules NON encore audités** — décision d'Abel du 2026-09-04, **pas un oubli** : `dashboard-home`, `vehicules`, `admin-users`, `admin-analytique`, `auth-profil`. Ils pourront faire l'objet d'une **Vague 2** ultérieure, à décider séparément, sans ré-auditer ce qui est déjà fait ici.

**Ce backlog est donc la base de correction pour la Phase 4 (correction par lots), pas le backlog final de l'application entière.** Les entrées transversales (`components/ui/*`, `components/shared/*`) corrigées dans les lots ci-dessous bénéficieront automatiquement aux 5 modules restants le jour où ils seront audités — évitant une 3ᵉ fusion de ces mêmes composants partagés.

### 2.1 Détail du DEDUP inter-rapports

| Candidat désigné par Vague 1 §7 | Fichier(s) Pilote | Fichier(s) Vague 1 | Verdict | Raison |
|---|---|---|---|---|
| `CardTitle` `text-2xl` | `ui/card.tsx:39` (dans B29, avec `Card` `shadow-sm`) | `ui/card.tsx:39` (V25/T1) | **Fusionné** → entrée #053 | Même fichier, même ligne, même défaut, même correctif. Doublon littéral. |
| `BreadcrumbNav` sans `showHome` | `marches/[id]/edit/page.tsx` · `marches/nouveau/page.tsx` (B13) | `components/shared/breadcrumb-nav.tsx` usage, 6 pages opportunités/factures (V27/T3) | **Non fusionné** — restent #023 (B13) et #063 (V27) | Défauts différents : B13 = `BreadcrumbNav` **absent** sur les pages marchés nouveau/edit ; V27 = `BreadcrumbNav` **présent** mais sans la prop `showHome`, sur d'autres pages (opportunités/factures). Aucun fichier commun. |
| Cible tactile `Button` icône < 44px | `admin/…/notification-bell.tsx:51` (B07, override à 32px) · `shared/SortableHeader.tsx:35` (B30, override à 32px) | `components/ui/button.tsx:31`, variant `icon` = 40px de base (V26/T2) | **Non fusionné** — restent #013 (B07), #054 (B30), #062 (V26) | B07/B30 sont des *overrides* locaux vers 32px sur des composants différents de `ui/button.tsx` ; V26 vise la variante `icon` **de base** (40px) du composant partagé lui-même. Trois défauts réels et distincts, aucun fichier commun — les fusionner aurait fait disparaître 2 correctifs nécessaires sur 3. |
| Tokens couleur en dur (générique, cf. B25 Pilote) | `ui/select.tsx`, `ui/skeleton.tsx`, `ui/dialog.tsx`, `shared/DrillDownSheet.tsx`, `dashboard-shell.tsx`, `marches/*`, `admin/*` (B25) | Fichiers **locaux** à chaque module Vague 1 : `caution-card.tsx`/`lib/utils/caution.ts` (V37), `facture-form.tsx`/`facture-list.tsx` (V42), `document-card.tsx`/`document-filters.tsx` (V45/V46/V48), `checklist-view.tsx`/`piece-statut-button.tsx` (V33) | **Non fusionné** — B25 (#049) reste tel quel, les entrées Vague 1 restent séparées (#074, #077, #078, #083, #086, #087, #089) | Aucun de ces fichiers Vague 1 n'apparaît dans la liste de fichiers de B25 — ce sont des extensions du même *chantier* à de nouveaux modules, pas des répétitions du même fichier. Regroupés dans le même Lot 15 pour traitement coordonné (cf. §4), mais comptés séparément car chacun exige un diff distinct. |

**Bilan** : 1 fusion réelle sur 4 candidats. Les 3 autres restent des entrées distinctes mais sont regroupées avec leurs cousins thématiques dans le Lot 0 (Bloquant/transversal immédiat) ou le Lot 15 (nettoyage tokens, cosmétique) — voir §4.

Aucun autre recoupement fichier-à-fichier n'a été trouvé au-delà des 4 candidats désignés (vérification croisée de tous les chemins `components/ui/*` et `components/shared/*` cités dans les deux rapports).

---

## 3. Backlog complet

Ordre : Bloquant → Important → Cosmétique. À sévérité égale : transversal d'abord, puis pipeline AO (`opportunites → marches → dossiers-offre → cautions → factures`), puis `documents`, puis `admin-alertes`/`layout-shell` restant.
Effort : **S** ≤ 1 h · **M** 1–4 h · **L** > 4 h. Origine : référence dans le rapport source (`B##` = Pilote, `V##` = Vague 1) pour traçabilité.

### 🔴 Bloquant (7)

| # | Thème | Origine | Emplacement | Module(s) | Constat | Correctif | Effort |
|---|---|---|---|---|---|---|---|
| 001 | responsive | B01 | `shared/VehicleMultiSelect.tsx:72` (+ `:83`) | layout-shell | `PopoverContent` en `w-[400px]` fixe → déborde ~25px+ et scroll horizontal en 375px. En prime : le `<div onClick>` + `Checkbox onCheckedChange` togglent tous deux → un clic direct sur la case **annule la sélection** (bug fonctionnel F01). | `w-[min(400px,calc(100vw-2rem))]` (ou `w-[--radix-popover-trigger-width]`) ; rendre le `Checkbox` présentationnel (`tabIndex={-1}` + `pointer-events-none`), un seul gestionnaire de toggle. | S |
| 002 | accessibilité · responsive | V01 [T4] | `caution-card.tsx:84` + `document-card.tsx:78,151` | cautions, documents | Trigger du menu d'actions secondaires (kebab) en `opacity-0 group-hover:opacity-100` : invisible sans survol souris. Sur tablette/mobile (pas de hover), le menu Voir/Modifier/Supprimer devient indécouvrable bien que cliquable. Côté documents, en prime aucun `aria-label` (bug fonctionnel F12). | Retirer `opacity-0`/le limiter à `md:` avec `focus-visible:opacity-100` ; afficher par défaut sous les breakpoints tactiles. Ajouter `aria-label="Actions"` sur les 2 triggers documents. | M |
| 003 | responsive | V02 | `components/shared/page-header.tsx:22` | opportunites | `PageHeader` en `flex items-start justify-between gap-4` sans `flex-wrap`. La page détail Opportunité peut aligner jusqu'à 4 actions (Modifier, Statut, Créer le marché, Supprimer) — dépasse l'espace disponible à 375px sans repli. | Ajouter `flex-wrap` (ou `flex-col sm:flex-row`) sur `PageHeader` ; regrouper les actions secondaires dans un menu sur mobile. | S |
| 004 | design-system | V03 | `caution-badge.tsx:45` | cautions | `CautionBadge` force `variant="outline"` et injecte `colorClass` (`'blue'`/`'green'`/…) comme simple `className` : ni variant `Badge` valide ni classe Tailwind réelle → classe inerte. **Tous** les badges type/statut de caution rendent le même style neutre, sans différenciation colorée (bug fonctionnel F07). | Mapper `TYPE_CAUTION_COLORS`/`STATUT_CAUTION_COLORS` vers les vrais variants `Badge` (`success`/`warning`/`danger`/`info`/`muted`), passés via `variant`. | S |
| 005 | états | V04 | `caution-detail-content.tsx:23` | cautions | Le bouton « Supprimer » (variant destructive) appelle `handleDelete` → `deleteCaution(caution.id)` directement, **sans `AlertDialog` de confirmation**. Un simple clic supprime définitivement une caution bancaire (bug fonctionnel F08). | Envelopper l'action dans un `<AlertDialog>` avec confirmation explicite avant `deleteCaution`. | S |
| 006 | conformité | V05 | `caution-filters.tsx:62` | cautions | `CautionFilters` ne synchronise jamais son état avec l'URL : `page.tsx` pagine côté serveur, `CautionsContent` refiltre côté client le seul lot déjà paginé — le filtrage ne s'applique jamais à l'ensemble des données. `niveauAlerte` transmis par `page.tsx` n'est jamais lu côté serveur (bug fonctionnel F10). | Piloter `CautionFilters` par l'URL (router + searchParams) comme le filtrage serveur ; ajouter `niveauAlerte` au schema Zod et à la clause `where` Prisma ; supprimer le filtrage client redondant. | M |
| 007 | micro-interaction · intégrité des données | V06 | `facture-form.tsx:65` | factures | Le champ Montant TTC reste éditable, mais un `useEffect` l'écrase automatiquement à chaque changement de HT ou TVA — y compris après une saisie manuelle (ex. arrondi contractuel). Perte silencieuse de correction, sans feedback (bug fonctionnel F16, donnée financière contractuelle). | Rendre le champ TTC en lecture seule avec un style de valeur calculée, ou n'auto-calculer que tant que l'utilisateur n'a pas modifié le champ manuellement (flag `dirty`). | M |

### 🟠 Important (41)

**Transversal (9)**

| # | Thème | Origine | Emplacement | Module(s) | Constat | Correctif | Effort |
|---|---|---|---|---|---|---|---|
| 008 | accessibilité | B02 | `layout/dashboard-shell.tsx:366` + `page-header.tsx:25` | TOUS | Deux `<h1>` par page liste (titre topbar + `PageHeader`), le premier du DOM étant le plus petit. Structure de titres cassée pour lecteurs d'écran. | Titre topbar en `<p>`/`<div>` (non sémantique), `<h1>` unique dans `PageHeader`. | S |
| 009 | accessibilité | B03 | `layout/dashboard-shell.tsx:326` | TOUS | Sidebar mobile = `<aside>` conditionnel : pas de `role="dialog"`/`aria-modal`, pas de piège de focus, pas de fermeture Échap. | Utiliser le composant `Sheet` (Radix Dialog) déjà présent, ou focus-trap + listener Escape + `aria-modal`. | M |
| 010 | accessibilité | B04 | `layout/dashboard-shell.tsx:171` | TOUS | Liens nav sidebar sans focus visible (hover en JS, zéro classe `focus-visible`). | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50` sur `<Link>`. | S |
| 011 | accessibilité | B05 | `app/globals.css:91` | TOUS | `--sidebar-muted` sur `--sidebar-bg` : ratio calculé ≈ 4.3:1, sous 4.5:1. *(à confirmer au rendu)* | Éclaircir `--sidebar-muted` vers L ≈ 67 % (≈ 214 22% 67%). | S |
| 012 | accessibilité | B06 | `shared/VehicleMultiSelect.tsx:110` · `marches/marche-filters.tsx:227,432` · `admin/…/rules-list-client.tsx:112` | layout-shell, marches, admin-alertes | Boutons-icône seuls sans `aria-label` — non annoncés. | `aria-label` explicite sur chaque bouton. | M |
| 013 | accessibilité | B07 | `admin/…/notification-bell.tsx:51` | layout-shell | Cloche forcée `h-8 w-8` (32px) sur `size="icon"` → cible tactile < 44px sur la topbar mobile. | Garder `size="icon"` (40px) ou porter la zone cliquable à 44px. | S |
| 014 | cohérence | B08 | `ui/alert.tsx:11` | TOUS | `Alert` variant `default` = `bg-background` → aucune relief sur une page. Pas de variantes sémantiques `success/warning/info`. | `default` → `bg-card` ; ajouter `success/warning/info/danger`. | M |
| 015 | conformité | B09 | `marches/delete-marche-dialog.tsx:64` · `marches/marche-filters.tsx:396` · `admin/…/rules-list-client.tsx:43` | marches, admin-alertes | Actions destructives sans `AlertDialog` : `<Dialog>` générique, suppression au clic direct, `window.confirm()` natif. | Reconstruire avec `AlertDialog`/`AlertDialogAction (destructive)`/`AlertDialogCancel`. | M |
| 016 | états | B24 | `marches/nouveau` · `marches/[id]` · `marches/[id]/edit` · `admin/alertes/rules` · `admin/alertes/history` | marches, admin-alertes | Pas de `loading.tsx` (seule `/marches` en a un). | Ajouter `loading.tsx` (skeleton adapté par route). | M |

**Local — pipeline AO et modules restants (32)**

| # | Thème | Origine | Emplacement | Module(s) | Constat | Correctif | Effort |
|---|---|---|---|---|---|---|---|
| 017 | conformité | V07 | `opportunites/page.tsx:31` | opportunites | `getOpportunites` accepte un filtre statut, mais aucun `FilterBar` n'existe — inatteignable en UI (bug fonctionnel F13). | Ajouter un `FilterBar` (recherche + `Select` statut + Effacer + compteur), modèle `marche-filters.tsx`. | M |
| 018 | états | V08 | `opportunites/page.tsx` | opportunites | Aucun `loading.tsx` sous `app/(dashboard)/opportunites/`. | Ajouter `loading.tsx` avec `ListSkeleton`. | S |
| 019 | accessibilité | V09 | `opportunite-list.tsx:93` + `opportunite-delete-button.tsx:42` | opportunites | Boutons icône seule (Pencil, Trash2) sans `aria-label`. | `aria-label="Modifier l'opportunité"` / `"Supprimer l'opportunité"`. | S |
| 020 | cohérence · états | B10 | `marches/marche-form.tsx:1253` · `marches/delete-marche-dialog.tsx:43` · `marches/marche-detail.tsx` | marches | Retours de mutation via `<div>` colorés en dur au lieu du pattern `toast`. Aucun `toast.success` après suppression. | Remplacer par `toast.error/warning/success` ; `toast.success` avant `router.push`. | M |
| 021 | hiérarchie | B11 | `marches/marche-detail.tsx:105` · `marches/nouveau/page.tsx:21` · `marches/[id]/edit/page.tsx:39` | marches | Titres incohérents : `CardTitle` détail en `text-2xl` ; « Créer un marché » en `h1 text-3xl` plus gros qu'un titre de marché réel. | `<PageHeader>` (ou `h1 text-2xl`) sur nouveau/edit ; `CardTitle` détail en `text-lg`. | M (dép. #050) |
| 022 | hiérarchie · responsive | B12 | `marches/marche-detail.tsx:69` | marches | Rangée d'entête : l'action destructive (`DeleteMarcheDialog`) est la plus grande et la plus contrastée. `flex-wrap` se casse en tablette/mobile. | `DeleteMarcheDialog` en `size sm variant ghost/outline`, ou `DropdownMenu` « Actions ». | M |
| 023 | cohérence | B13 | `marches/[id]/edit/page.tsx:27` · `marches/nouveau/page.tsx` | marches | Pas de `BreadcrumbNav` sur nouveau/edit alors que le détail utilise `<BreadcrumbNav showHome>`. | Ajouter `<BreadcrumbNav showHome items=…>` sur les deux pages. | S |
| 024 | design-system | B14 | `lib/utils/statut.ts:27` · `marches/marche-card.tsx:22` | marches | `STATUT_COLORS` : `ATTRIBUE_PROVISOIREMENT` et `INFRUCTUEUX` partagent la même teinte → indistinguables. Barre 4px « arc-en-ciel » non sémantique. | Source unique statut → groupe sémantique ; teinte distincte pour `INFRUCTUEUX` ; chaque paire ≥ 4.5:1. | M |
| 025 | responsive | B15 | `marches/marche-card.tsx:110` | marches | Liens footer en `py-1.5` (6px) → cible tactile ≈ 28px, sous 44px. | `h-9` min, ou `<Button size="sm" variant="ghost">` pleine hauteur. | S |
| 026 | accessibilité | B16 | `marches/marche-filters.tsx:220` | marches | Input de recherche sans `<label>` ni `aria-label`. | `aria-label="Rechercher un marché"`. | S |
| 027 | états | B17 | `marches/marche-form.tsx:383` (+ `:525`) | marches | `parseFloat`/`parseInt` d'un champ vidé → `NaN` propagé dans le state (bug fonctionnel F03). | `field.onChange(e.target.value === '' ? undefined : parseFloat(...))` avec `isNaN → undefined`. | S |
| 028 | états | B18 | `marches/marche-list.tsx:16` | marches | Tri client (`useSortable`) ne porte que sur la page paginée courante → résultat trompeur (bug fonctionnel F04). | Tri serveur (param URL `sort`/`dir`), ou masquer la toolbar quand paginé. | M |
| 029 | cohérence | V10 | `dossiers-offre/page.tsx` | dossiers-offre | Aucun `FilterBar` sur la page liste, contrairement aux 4 autres modules liste. | Ajouter un `FilterBar` (recherche titre + `Select` statut), modèle `marche-filters.tsx`. | M |
| 030 | états | V11 | `app/(dashboard)/dossiers-offre/` (toutes routes) | dossiers-offre | Aucun `loading.tsx` dans tout le module (liste, `[id]`, `[id]/edit`, `nouveau`). | Créer les `loading.tsx` manquants, modèle `marches/loading.tsx`. | S |
| 031 | états | V12 | `piece-statut-button.tsx:38` | dossiers-offre | Aucun `toast.success` après mise à jour réussie du statut d'une pièce — succès silencieux. | Ajouter `toast.success('Statut mis à jour')` dans le bloc succès. | S |
| 032 | accessibilité | V13 | `piece-statut-button.tsx:56` | dossiers-offre | `SelectTrigger` de statut d'une pièce sans `aria-label` ni label visible associé. | `aria-label={\`Statut de la pièce ${nom}\`}` ou `aria-labelledby`. | S |
| 033 | hiérarchie · responsive | V14 | `dossier-list.tsx:41` | dossiers-offre | `<Table>` (6 colonnes) sans `overflow-x-auto` — débordement garanti à 375×667. | Envelopper dans `<div className="rounded-md border overflow-x-auto">`. | S |
| 034 | conformité | V15 | `dossier-form.tsx:43` | dossiers-offre | Relation `marcheId`/`opportuniteId` reçue en props mais jamais affichée nulle part dans l'UI (bug fonctionnel F15). | Ajouter un champ de sélection/affichage du marché/opportunité lié. | M |
| 035 | états | V16 | `caution-card.tsx:104` | cautions | Item « Supprimer » du menu kebab liste ne fait que `router.push` vers le détail — aucune suppression n'a lieu (bug fonctionnel F09). | Retirer cet item du menu liste, ou lui donner un vrai comportement de suppression avec confirmation. | S |
| 036 | conformité | V17 | `caution-list.tsx:40` | cautions | Pagination cliente maison **en plus** de la pagination serveur `<DataPagination>` — deux systèmes empilés (bug fonctionnel F11). | Supprimer la pagination interne de `CautionList`. | S |
| 037 | accessibilité | V18 | `caution-filters.tsx:117` | cautions | Champ de recherche sans `<Label>` ni `aria-label` — seul le placeholder identifie son rôle. | `aria-label="Rechercher une caution"`, ou `<Label>` `sr-only`. | S |
| 038 | hiérarchie | V19 | `cautions/[id]/edit/page.tsx:99` | cautions | Page Modifier sans `BreadcrumbNav`/`PageHeader` ; bouton retour icône sans `aria-label` ; `h1 text-3xl` hors règle globale. | Aligner sur le pattern détail ; retirer le `h1` fait main ; `aria-label="Retour"`. | M |
| 039 | états | V20 | `app/(dashboard)/factures/page.tsx` | factures | Aucun `loading.tsx` sur la route liste. *(Harmonisé Bloquant → Important par Vague 1, même défaut qu'opportunités/dossiers-offre.)* | Créer `factures/loading.tsx`, modèle `cautions/loading.tsx`. | S |
| 040 | hiérarchie | V21 | `factures/page.tsx:27` | factures | `getFactures` accepte `statut`/`marcheId` en filtres, mais aucun `FactureFilters` n'existe (bug fonctionnel F14). | Ajouter `FactureFilters` (Select statut + recherche marché, compteur). | M |
| 041 | design-system | V22 | `document-card.tsx:78,151` — voir aussi `documents-content.tsx:105` | documents | Toggle vue liste/grille en `border-gray-200 bg-white` en dur, boutons ~28-30px sous la cible 44px. | Tokens (`border-border`/`bg-card`/`hover:bg-muted`) + hauteur ≥44px mobile/tablette. | S |
| 042 | accessibilité | V23 | `document-filters.tsx:94` | documents | Champ de recherche sans `<Label>` ni `aria-label`. | `<Label htmlFor="doc-search" className="sr-only">` + `id`, ou `aria-label`. | S |
| 043 | cohérence | V24 | `app/(dashboard)/documents/upload/page.tsx:32` | documents | Page upload sans `PageHeader` ; `<h1 className="text-3xl">` fait main casse la cohérence typographique. Pas de `BreadcrumbNav`. | Remplacer par `<PageHeader title=… description=… />`. | S |
| 044 | responsive | B19 | `admin/…/rules-list-client.tsx:67` | admin-alertes | `<table>` en `overflow-hidden` (pas `overflow-x-auto`) — colonnes tronquées à 375px sans scroll. | `rounded-xl border bg-card overflow-x-auto`. | S |
| 045 | responsive | B20 | `admin/…/condition-editor.tsx:196` | admin-alertes | Ligne de condition `flex` non-wrap > 400px — déborde en mobile/tablette étroite. | `flex flex-wrap items-center gap-2` ; `Select w-full sm:w-44`. | S |
| 046 | cohérence · états | B21 | `admin/…/history-table.tsx:35` | admin-alertes | Historique **sans pagination** alors que `total` est disponible (bug fonctionnel F05). | Pagination serveur + `<DataPagination>` sous la table. | M |
| 047 | états | B22 | `admin/…/history-table.tsx:84` | admin-alertes | Statut affiché en enum brut anglais (`SENT`/`PENDING`/`FAILED`/`READ`). | `STATUS_LABELS` FR (`Envoyé`, `Lu`, `En attente`, `Échec`). | S |
| 048 | états | B23 | `admin/…/condition-editor.tsx:193` | admin-alertes | `key={i}` (index) sur les lignes de condition — suppression du milieu décale l'état interne (bug fonctionnel F06). | Id stable (`crypto.randomUUID()`) comme `key`. | S |

### 🟡 Cosmétique (51)

**Transversal (15) — c'est le Lot 0 fusionné (cf. §4)**

| # | Thème | Origine | Emplacement | Module(s) | Constat | Correctif | Effort |
|---|---|---|---|---|---|---|---|
| 049 | design-system | B25 | `ui/select.tsx:78` · `ui/skeleton.tsx:18` · `ui/dialog.tsx:47` · `shared/DrillDownSheet.tsx:34` · `dashboard-shell.tsx:345` · `marches/*` · `lib/utils/urgence.ts:78` · `admin/*` | TOUS | Chantier tokens : `border-gray-100`, `bg-white`, `bg-gray-50`, couleurs statut en dur, gradients `hsl(...)` en dur. | Remplacer par `bg-card`/`bg-muted`/`border-border`/`text-stam-*`/`stam-*-bg`. | L |
| 050 | design-system · hiérarchie | B26 | `dashboard-shell.tsx:145/149/229/235/289/367` · `notification-bell.tsx:57` · `marche-card.tsx:62` · `marche-detail.tsx:524` · `history-table.tsx:89` | TOUS | Valeurs de police hors échelle : `text-[9px]`, `text-[10px]`, `text-[13px]`, `text-[15px]`. Échelle imposée : 11/13/14/16/18/20/24. | Mapper sur `text-xs`/`text-sm`/`text-base`/`text-lg` ; supprimer 9/10/15px. | M |
| 051 | cohérence | B27 | `ui/sheet.tsx:24` · `dashboard-shell.tsx:323` | layout-shell (Sheet partagé) | `Sheet` divergent de `Dialog`/`AlertDialog` : overlay sans blur, `rounded-none`, focus-ring shadcn ancien. | Aligner overlay `bg-black/50 backdrop-blur-sm`, `rounded-xl`, `shadow-2xl`. | S |
| 052 | conformité | B28 | `ui/alert.tsx:13` · `ui/chart.tsx:9` | layout-shell | Classes/branches `dark:` mortes (MVP sans mode sombre). | Retirer `dark:border-destructive` ; réduire `chart.tsx` à un seul thème. | S |
| 053 | design-system | B29 + V25 [T1] | `ui/card.tsx:12` · `ui/card.tsx:39` | TOUS (impact direct constaté sur opportunites, cautions, documents, dossiers-offre) | `Card` en `shadow-sm` au lieu de `shadow-card`. `CardTitle` resté `text-2xl` (20px), surdimensionné vs `h3`/`DialogTitle`. *(Entrée fusionnée — même défaut signalé indépendamment par les deux rapports sur `ui/card.tsx:39`.)* | `shadow-card` au repos ; `CardTitle` → `text-lg font-semibold`. Un seul correctif pour les deux signalements. | S |
| 054 | accessibilité | B30 | `shared/SortableHeader.tsx:35` | TOUS (listes) | Bouton de tri en `h-8` (32px) : cible tactile < 44px. | `h-9` min + padding tactile accru (`h-11` mobile). | S |
| 055 | accessibilité | B31 | `dashboard-shell.tsx:359` | TOUS | Hamburger : `aria-label` constant, pas d'`aria-expanded`. | `aria-expanded={mobileOpen}` + `aria-label` dynamique. | S |
| 056 | accessibilité | B32 | `dashboard-shell.tsx:158` | TOUS | `<nav>` sidebar sans `aria-label` alors que plusieurs landmarks nav coexistent. | `aria-label="Navigation principale"`. | S |
| 057 | conformité | B33 | `shared/retry-button.tsx:23` | layout-shell | État de chargement = spinner alors que le contrat impose Skeleton/shimmer. | Libellé seul ou barre de progression indéterminée conforme. | S |
| 058 | cohérence | B34 | `shared/VehicleMultiSelect.tsx:90` | layout-shell | Immatriculation en `font-mono` brut au lieu de `.font-mono-marche`. | `className="text-sm font-medium font-mono-marche"`. | S |
| 059 | micro-interaction | B35 | `dashboard-shell.tsx:170` | TOUS | `title={item.label}` redondant sur desktop où le libellé est déjà visible. | `title` uniquement en mode icônes seules. | S |
| 060 | design-system | B36 | `admin/…/notification-bell.tsx:57` | layout-shell | Pastille compteur en `bg-red-500` (Tailwind brut) au lieu de `stam-danger` ; `text-[9px]`. | `bg-destructive`/`bg-stam-danger` + `text-[10px]` min. | S |
| 061 | accessibilité | B48 | `dashboard-shell.tsx` (hamburger + overlay) · `marche-pagination` | layout-shell, marches | Ordre de focus/tabulation non maîtrisé sur éléments désactivés et overlay mobile (recoupe #009/#? pagination). *(à vérifier au clavier en live)* | Vérification clavier bout-en-bout après #009. | S |
| 062 | design-system | V26 [T2] | `components/ui/button.tsx:31` | opportunites, dossiers-offre | Cible tactile probable <44px : variante `icon` de base = `h-10 w-10` (40px), utilisée pour Modifier/Supprimer icône-seule. | Passer la variante `icon` à `h-11 w-11`, ou élargir la zone cliquable sur ces usages. | S |
| 063 | cohérence | V27 [T3] | `components/shared/breadcrumb-nav.tsx` (usage) | opportunites, factures | `BreadcrumbNav` utilisé sans `showHome` sur 6 pages (3 opportunités + 3 factures). | Ajouter `showHome` aux 6 appels de `BreadcrumbNav`. | S |

**Local — pipeline AO et modules restants (36)**

| # | Thème | Origine | Emplacement | Module(s) | Constat | Correctif | Effort |
|---|---|---|---|---|---|---|---|
| 064 | cohérence | V28 | `opportunite-list.tsx:48` | opportunites | Liste en `<Table>` dense au lieu du pattern Grid de cards imposé pour toute liste métier. | Créer `opportunite-card.tsx`, remplacer la `Table` par une grille responsive. | L |
| 065 | états | V29 | `opportunite-list.tsx:41` | opportunites | État vide réduit à une ligne de texte muted, sans icône/titre/CTA. | Aligner sur `marche-list.tsx` : icône, titre, description, CTA. | S |
| 066 | états | V30 | `opportunites/page.tsx:40` | opportunites | État d'erreur = `<p className="text-destructive">`, sans `Alert`, icône ni retry. | `<Alert variant="destructive">` avec icône et message. | S |
| 067 | cohérence | V31 | `statut-changer-button.tsx:240` | opportunites | Deux widgets de date différents dans le même module (Popover+Calendar vs `Input type=date`). | Remplacer par le même Popover+Calendar que le formulaire principal. | S |
| 068 | design-system | V32 | `opportunite-list.tsx:71,86` + `[id]/page.tsx:97,151` | opportunites | `opp.reference`/`opp.marche.numero` sans `.font-mono-marche`. | Appliquer `font-mono-marche` sur ces 4 emplacements. | S |
| 069 | états | B37 | `marches/marche-list.tsx:21` | marches | État vide unique : même texte/CTA que la base soit vide ou qu'un filtre ne renvoie rien. | Distinguer via `hasFilters` : « Aucun résultat » vs onboarding. | S |
| 070 | cohérence | B38 | `marches/marche-pagination.tsx:20` | marches | Pagination maison au lieu du composant partagé `data-pagination`. | `<DataPagination>` si l'API convient ; sinon `tabIndex={-1}` prev/next désactivés. | S |
| 071 | cohérence | B39 | `marches/marche-filters.tsx:427` | marches | Chips filtres actifs en `Badge secondary` au lieu de `bg-primary/8 text-primary`. | Aligner les chips sur `bg-primary/8 text-primary`. | S |
| 072 | design-system | B40 | `marches/marche-form.tsx:591` | marches | Carte champs spécifiques : `border-blue-200 bg-blue-50/50` en dur + `duration-300` en limite haute. | `border-primary/20 bg-primary/5` + `animate-fade-in`. | S |
| 073 | design-system | B41 | `marches/marche-card.tsx:62` | marches | Badge « Numéro provisoire » codé main (`text-[10px] bg-amber-50…`), variant `warning` existe. | `<Badge variant="warning" className="text-xs">`. | S |
| 074 | design-system | V33 | `checklist-view.tsx:21` + `piece-statut-button.tsx:24` | dossiers-offre | Couleurs de statut codées en dur au lieu des tokens STAM ; `STATUT_PIECE_COLORS` déjà exporté ailleurs. | Remplacer par les tokens STAM ou réutiliser `STATUT_PIECE_COLORS`. | S |
| 075 | états | V34 | `dossiers-offre/page.tsx:27` | dossiers-offre | État d'erreur = `<p className="text-destructive">`, sans `Alert`. | `Alert` (variant destructive) avec titre + description. | S |
| 076 | états | V35 | `dossier-list.tsx:32` | dossiers-offre | État vide minimal : pas d'icône ni CTA alors que `canWrite` est disponible. | Icône `FolderOpen` + bouton « Créer le premier dossier ». | S |
| 077 | design-system | V36 | `caution-filters.tsx:208` | cautions | Checkboxes natives non stylées ; panneau jamais migré vers `FilterBar` compacte ; badges filtres en `secondary`. | `<Checkbox>` shadcn ; barre horizontale compacte alignée sur les autres `FilterBar`. | M |
| 078 | design-system | V37 | `caution-card.tsx:31-45,68…` + `lib/utils/caution.ts:115` | cautions | Couleurs codées en dur (`border-l-red-500`, `bg-white`, `hover:bg-blue-50`…) au lieu des tokens STAM. | Remplacer par les tokens STAM sur les 4 fichiers listés. | M |
| 079 | cohérence | V38 | `cautions/nouvelle/page.tsx:29` | cautions | Page « Nouvelle caution » sans `BreadcrumbNav`/`PageHeader` — 3ᵉ variante d'en-tête différente sur le module. | Uniformiser les 3 écrans (détail/édition/création). | S |
| 080 | design-system | V39 | `caution-filters.tsx:22` | cautions | `useDebounce` importé mais jamais utilisé — recherche refiltre à chaque frappe. | Appliquer `useDebounce` sur `filters.search`, ou retirer l'import. | S |
| 081 | cohérence | V40 | `cautions-content.tsx:116` | cautions | Filtres + Liste dans un `<Card className="p-6">` englobant, hors du pattern `FilterBar` autonome. | Retirer le `Card` englobant. | S |
| 082 | cohérence | V41 | `edit-caution-content.tsx:33` | cautions | `CautionForm` sans prop `onCancel` en édition — aucun bouton Annuler. | Passer `onCancel={() => router.push(...)}`. | S |
| 083 | design-system | V42 | `facture-form.tsx:102,197,268,329` + `facture-list.tsx:47` | factures | `bg-white rounded-xl border border-gray-100 shadow-card` codé en dur à 5 emplacements. | Remplacer par `bg-card border-border`. | S |
| 084 | cohérence | V43 | `facture-list.tsx:68` | factures | Lien numéro facture en `text-stam-primary` (identité de marque) au lieu de `font-mono-marche text-stam-accent`. | Remplacer par `font-mono-marche text-stam-accent hover:underline`. | S |
| 085 | hiérarchie | V44 | `factures/[id]/page.tsx:69` | factures | Layout `grid-cols-1 lg:grid-cols-3` à plat au lieu du layout 2 colonnes documenté pour les pages détail. | Regrouper en 2 colonnes si non intentionnel. | S |
| 086 | design-system | V45 | `document-card.tsx:120,68,213,223` | documents | Couleurs codées en dur répétées dans le même fichier (`bg-white`, `border-gray-100`…). | Remplacer par les tokens (`bg-card`, `border-border`, `hover:bg-muted`). | S |
| 087 | design-system | V46 | `document-card.tsx:30-50` | documents | `TYPE_TOP_BAR`/`TYPE_ICON_COLOR` : 8 couleurs Tailwind arbitraires hors tokens STAM. | Dériver de la palette imposée (`chart-1..5` + `stam-warning`/`stam-danger`) ou documenter l'extension. | M |
| 088 | états | V47 | `documents-content.tsx:136` + `document-table.tsx:114` | documents | État vide dupliqué et minimal (grille et liste), sans CTA d'upload. | État vide partagé (icône + message contextuel + CTA « Nouveau document »). | S |
| 089 | design-system | V48 | `document-filters.tsx:87,156` | documents | `bg-white rounded-xl border border-gray-100 shadow-card` et `border-t border-gray-50` codés en dur. | Remplacer par les tokens (`bg-card`, `border-border`). | S |
| 090 | accessibilité | V49 | `document-card.tsx:193` | documents | `text-amber-600` en dur, contraste calculé ≈3.19:1 sous 4.5:1. Token `stam-warning` (même hex) inutilisé. | Utiliser `text-stam-warning` ou badge `warning` avec fond dédié. | S |
| 091 | cohérence | V50 | `document-filters.tsx:152` | documents | `DocumentFilters` n'affiche aucun compteur de résultats, contrairement aux autres modules. | Ajouter un compteur de résultats (`text-xs`). | S |
| 092 | accessibilité | V51 | `document-version-history.tsx:170` | documents | Boutons icône Prévisualiser/Télécharger avec `title=…` seul, pas d'`aria-label`. | Ajouter `aria-label` sur ces deux boutons. | S |
| 093 | états | V52 | `document-preview.tsx:138` + `document-version-history.tsx:83` | documents | Chargement avec spinner `Loader2` au lieu du Skeleton/shimmer imposé. | Remplacer par des `Skeleton`. | S |
| 094 | design-system | B42 | `admin/…/rules-list-client.tsx:57` · `history-table.tsx:38/45` | admin-alertes | Conteneurs de liste et empty-states en `rounded-lg` (8px) au lieu de `rounded-xl` (12px) imposé. | Uniformiser en `rounded-xl`. | S |
| 095 | design-system | B43 | `admin/…/condition-editor.tsx:74` | admin-alertes | Déclencheur multi-select enum = `<button>` brut divergent des autres `Select`. | Réutiliser le trigger des autres `Select` ou extraire un `MultiSelectTrigger` partagé. | S |
| 096 | cohérence | B44 | `admin/alertes/rules/page.tsx:17` | admin-alertes | `PageHeader` : Historique passe `count` en badge, Règles met le compte dans `description`. | `count={rules.length}` sur la page Règles. | S |
| 097 | hiérarchie | B45 | `admin/…/rule-form.tsx:189` | admin-alertes | 5 sous-sections en `<h3>` identiques, sans numérotation ni pictogramme. | Titres renforcés (pastille numérotée) ou `Card` par section. | S |
| 098 | états | B46 | `admin/…/rule-form.tsx:276` | admin-alertes | Bouton Annuler = `router.back()` : sur accès direct/rechargement, peut sortir de l'app. | `router.push('/admin/alertes/rules')` ; garde `beforeunload` optionnelle. | S |
| 099 | accessibilité | B47 | `admin/…/history-table.tsx:89` | admin-alertes | Colonne Log tronquée (`max-w-[200px] truncate`) sans `title` ni tooltip. | `title={n.deliveryLog}` ou `Popover` pour le log complet. | S |

---

## 4. Lots de correction (fusionnés, 18 lots)

Chaque lot = 1 PR livrable indépendamment. Le Lot 0 des deux rapports sources — fondations tokens/typo/ombre/Sheet/dark-mort/Card côté Pilote et CardTitle/Button-icône/BreadcrumbNav/PageHeader côté Vague 1 — devient **un seul Lot 0**, conformément à l'instruction de consolidation : ce sont le même chantier (composants `ui/*`/`shared/*` partagés par les 8 modules).

### Lot 0 — Fondations transversales (design-system + composants partagés) *(bloque Lots 7, 10, 15)*
**Entrées** : #003, #049, #050, #051, #052, #053, #060, #062, #063, #072, #073, #094, #095 (13 entrées).
**Pourquoi d'abord** : composants `ui/card.tsx`, `ui/button.tsx` (référence), `ui/sheet.tsx`, `ui/alert.tsx`, `ui/chart.tsx`, `shared/page-header.tsx`, `shared/breadcrumb-nav.tsx` référencés par la quasi-totalité des lots suivants. Contient 1 Bloquant (#003).
**Effort** : L. **Risque** : régression visuelle large → capture avant/après sur les 8 modules obligatoire.

### Lot 1 — Bloquant isolé : VehicleMultiSelect (popover + toggle)
**Entrées** : #001 (+ bug fonctionnel F01).
**Effort** : S.

### Lot 2 — Bloquant transversal : menus d'action invisibles au tactile (cautions + documents)
**Entrées** : #002 [T4] (+ bug fonctionnel F12).
**Effort** : M. Indépendant, parallélisable avec le Lot 1.

### Lot 3 — Bloquant isolé : Factures — intégrité des données (TTC écrasé)
**Entrées** : #007 (+ bug fonctionnel F16). **Test requis** : E2E de non-régression (saisie TTC → modif HT → TTC doit rester la valeur saisie ou avertir).
**Effort** : M.

### Lot 4 — Bloquant : Cautions — sécurité et fiabilité des actions *(le plus dense en Bloquant)*
**Entrées** : #004, #005, #006, #035, #036 (+ bugs F07, F08, F09, F10, F11).
**Risque** : #006 touche le contrat de props `CautionFilters` — tester la combinatoire de filtres après migration.
**Effort** : L.

### Lot 5 — Accessibilité transversale du shell
**Entrées** : #008, #009, #010, #011, #012, #013, #026, #054, #055, #056, #061 (+ bug fonctionnel F02, orphelin du plan de lots Pilote d'origine — `getPageTitle` `startsWith` matche `/vehicules` avant `/vehicules/sav`).
**Effort** : M. Majoritairement ajout d'attributs/classes ; #009 est le seul point structurel.

### Lot 6 — Confirmations destructives & feedback
**Entrées** : #014, #015, #020.
**Effort** : M.

### Lot 7 — Marchés : hiérarchie & responsive *(dépend Lot 0)*
**Entrées** : #021, #022, #023, #024, #025, #071.
**Effort** : M/L.

### Lot 8 — Marchés : états & bugs formulaire/liste
**Entrées** : #016, #027, #028, #069, #070 (+ bugs F03, F04). Contient 2 bugs fonctionnels → tests E2E de non-régression.
**Effort** : M.

### Lot 9 — États de chargement manquants (`loading.tsx`), multi-module
**Entrées** : #018 (opportunites), #030 (dossiers-offre), #039 (factures). *(Cf. aussi #016 au Lot 8 pour marches/admin-alertes — même pattern, lots distincts pour ne pas re-toucher les mêmes fichiers deux fois.)*
**Effort** : S. Gain rapide.

### Lot 10 — Admin-alertes : responsive, pagination, libellés *(dépend Lot 0)*
**Entrées** : #044, #045, #046, #047, #048, #096, #097, #098, #099 (+ bugs F05, F06). Contient 2 bugs fonctionnels.
**Effort** : M/L.

### Lot 11 — `FilterBar` manquants (recherche/filtre inatteignable en UI)
**Entrées** : #017, #029, #040 (+ bugs F13, F14).
**Effort** : L. Modèle : `marche-filters.tsx`/`vehicule-filters.tsx`.

### Lot 12 — Accessibilité : labels et `aria-label` manquants par module
**Entrées** : #019, #032, #037, #041, #042, #092.
**Effort** : S. Mécanique, parallélisable.

### Lot 13 — Dossiers-offre : cohérence et visibilité des données
**Entrées** : #031, #033, #034 (+ bug fonctionnel F15).
**Effort** : M.

### Lot 14 — Pages secondaires sans `PageHeader`/`BreadcrumbNav`
**Entrées** : #038 (cautions edit), #079 (cautions nouvelle), #043 (documents upload).
**Effort** : M.

### Lot 15 — Nettoyage design-system : couleurs codées en dur → tokens *(dépend Lot 0, volumineux)*
**Entrées** : #074, #077, #078, #083, #086, #087, #089.
**Effort** : L. Capture avant/après recommandée.

### Lot 16 — Nettoyage cosmétique résiduel transversal (layout-shell)
**Entrées** : #057, #058, #059.
**Effort** : S.

### Lot 17 — Polish cosmétique dispersé *(non bloquant, reportable)*
**Entrées** : #064 (seul item **L** de ce lot — Table→Card opportunités), #065, #066, #067, #068, #075, #076, #080, #081, #082, #084, #085, #088, #090, #091, #093.
**Effort** : S (sauf #064).

### Dépendances clés
- **Lot 0 avant Lots 7, 10, 15** (classes de tokens et composants partagés référencés).
- **#050 avant #021** (échelle typo avant l'harmonisation des titres marchés).
- **#009 avant #061** (structure de la sidebar mobile avant la vérification clavier).
- **#051 (Sheet) avant #009** si #009 choisit la voie « composant `Sheet` ».
- **Lot 9 après/coordonné avec Lot 8** sur le périmètre `loading.tsx` marches/admin-alertes (déjà couvert par #016) pour éviter un chevauchement de PR.
- Lots 1, 2, 3, 6, 12 sont mutuellement indépendants et parallélisables.

---

## 5. Annexe — Bugs fonctionnels (hors périmètre UI pur, fusionnés)

Détectés pendant l'audit UI mais relevant d'un défaut de comportement, pas de présentation. À traiter dans les lots indiqués **avec test E2E de non-régression**. 16 bugs fusionnés (6 Pilote + 10 Vague 1), aucun doublon — modules disjoints entre les deux rapports sources.

| Réf. | Emplacement | Symptôme | Backlog # | Lot |
|---|---|---|---|---|
| F01 | `shared/VehicleMultiSelect.tsx:83` | Clic direct sur la case à cocher → toggle + retoggle par bubbling → **la sélection s'annule**. | #001 | Lot 1 |
| F02 | `layout/dashboard-shell.tsx:86` | `getPageTitle` : `startsWith('/vehicules')` matche avant `/vehicules/sav` → titre erroné. Pas d'entrée backlog dédiée dans le rapport Pilote d'origine (orphelin — repris ici). | — | Lot 5 |
| F03 | `marches/marche-form.tsx:383,525` | `parseFloat`/`parseInt` d'un champ vidé → `NaN` dans le state → message Zod potentiellement brouillé. | #027 | Lot 8 |
| F04 | `marches/marche-list.tsx:16` | Tri client sur la page paginée seule → « trier par Montant » ne réordonne que ~20 lignes visibles. | #028 | Lot 8 |
| F05 | `admin/…/history-table.tsx:35` | Historique sans pagination alors que `total` est disponible → page qui grossit sans limite en prod. | #046 | Lot 10 |
| F06 | `admin/…/condition-editor.tsx:193` | `key={i}` → suppression d'une ligne du milieu décale l'état des `Select`/`Input`. | #048 | Lot 10 |
| F07 | `caution-badge.tsx:45` | `colorClass` injecté en `className` n'est ni un variant `Badge` ni une classe Tailwind réelle → aucune différenciation colorée type/statut. | #004 | Lot 4 |
| F08 | `caution-detail-content.tsx:23` | Suppression d'une caution sans confirmation — un clic supprime définitivement. | #005 | Lot 4 |
| F09 | `caution-card.tsx:104` | Item « Supprimer » du menu liste ne supprime rien — redirige simplement vers le détail. | #035 | Lot 4 |
| F10 | `caution-filters.tsx:62` | Filtres non synchronisés à l'URL ; `niveauAlerte` silencieusement ignoré côté serveur. | #006 | Lot 4 |
| F11 | `caution-list.tsx:40` | Double système de pagination (client + serveur) empilé sur le même écran. | #036 | Lot 4 |
| F12 | `document-card.tsx:78,151` | Menu d'actions secondaires invisible et non annoncé au clavier/tactile. | #002 | Lot 2 |
| F13 | `opportunites/page.tsx:31` | Filtre statut supporté côté serveur mais aucun moyen UI de l'atteindre. | #017 | Lot 11 |
| F14 | `factures/page.tsx:27` | Filtres `statut`/`marcheId` supportés côté serveur mais aucun moyen UI de les atteindre. | #040 | Lot 11 |
| F15 | `dossier-form.tsx:43` | Relation marché/opportunité reçue en props mais jamais affichée nulle part dans l'UI du module. | #034 | Lot 13 |
| F16 | `facture-form.tsx:65` | Montant TTC saisi manuellement écrasé silencieusement au moindre changement de HT/TVA. | #007 | Lot 3 |

---

## 6. Angles morts / à vérifier en live (fusionné, dédupliqué)

### 6.1 Ce que l'audit statique ne peut pas trancher

| Sujet | Findings concernés | Vérification |
|---|---|---|
| **Contraste rendu réel** | #011 (`--sidebar-muted` ≈ 4.3:1), #024 (paires de badges statut marchés), #090 (`text-amber-600` ≈3.19:1) | Contrôle au rendu + outil de contraste (axe/Lighthouse), 3 viewports. |
| **Débordement horizontal réel** | #001 (popover 375px), #022 (rangée d'entête détail marché), #025 (footer carte), #044 (table règles admin), #045 (lignes condition), #003 (`PageHeader` 4 actions à 375px), #033 (table dossiers-offre) | Playwright 375 / 768 / 1920, assertion `scrollWidth <= clientWidth` sur `<body>`. |
| **Invisibilité tactile réelle des menus kebab** | #002 [T4] | Émulation tactile Playwright (pas de `:hover`) sur `caution-card.tsx` et `document-card.tsx` ; confirmer l'inatteignabilité totale. |
| **Ordre de focus / navigation clavier** | #008, #009, #010, #061, #005 (`AlertDialog` à ajouter), #038 (bouton retour sans aria-label) | Navigation clavier Tab/Shift-Tab/Échap bout-en-bout sur les 8 modules ; piège de focus sidebar mobile. |
| **Erreurs console / warnings hydratation** | #008 (double `<h1>`), #048 (`key={i}`), #027 (`NaN`), #006, #034, #036 (états de données incohérents) | Ouvrir la console + l'onglet réseau sur chaque écran concerné, capturer `warning`/`error`. |
| **Comportement réel de la désynchronisation filtres/URL** | #006 (cautions) | Reproduire : appliquer un filtre avec >20 cautions en base, constater l'écart entre compteur `PageHeader` et liste affichée. |
| **Perte de saisie TTC réelle** | #007 (factures) | Reproduire : saisir TTC manuellement, modifier HT, constater l'écrasement silencieux. |
| **Pièges d'interaction réels** | F01 (double-toggle), F03 (`NaN` propagé) | Reproduction manuelle avant/après correctif. |
| **Rendu réel des animations** | #072 (`duration-300`, `animate-in` vs `animate-fade-in`) | Observer la transition d'apparition des champs spécifiques. |

### 6.2 Parcours transverses non audités (à couvrir en Vague 2 ou en pass live dédié)

- **Recherche globale** (topbar) — comportement, résultats, états vide/chargement.
- **Cloche de notifications** — ouverture du panneau, marquage lu/non-lu, navigation depuis une notif, badge compteur.
- **Exports PDF / Excel** — déclenchement, état de chargement, gestion d'erreur, contenu (aucun des modules audités n'a été vérifié sur ce point malgré la présence de factures/cautions, données financières).
- **Pagination serveur bout-en-bout** — cohérence URL, bornes, retour page 1 au changement de filtre (particulièrement sensible sur `cautions`, cf. #006/#036).
- **Tri / filtres bout-en-bout** — combinaisons, filtres sauvegardés (création/application/suppression), persistance URL — notamment sur les modules où le `FilterBar` reste à créer (#017, #029, #040).
- **Navigation clavier complète** — skip-link, ordre des landmarks, retour focus après fermeture de modale.
- **États réseau réels** — lenteur, échec de Server Action, `retry-button` en conditions réelles, sur les Server Actions de suppression/mise à jour de statut.
- **Responsive des 5 modules non audités** — `dashboard-home`, `vehicules`, `admin-users`, `admin-analytique`, `auth-profil` (Vague 2, décision séparée).

### 6.3 Modules à relancer (audit code)

**Aucun.** Les 8 modules audités (Pilote + Vague 1) ont produit un signal exploitable et cohérent. Pas de re-run du workflow d'audit statique nécessaire. Un **pass de vérification live unique (Playwright, 3 viewports, console)** reste requis sur les 8 modules avant l'ouverture des PR de correction, pour lever les points du §6.1 — à faire en un seul passage plutôt que dupliqué par rapport source.

---

## 7. Suite

1. **Phase 3** — Abel valide ce backlog lot par lot (accepter / différer / rejeter chaque lot), puis brouillon d'entrée Journal de décisions (jamais écrit sans validation explicite).
2. **Phase 4** — correction par lots via `superpowers:disciplined-execution` → `subagent-driven-development` : 1 lot = 1 sous-agent → review spec + qualité → fix → tests → 1 PR / lot (`/livre`).
3. **Vague 2** (5 modules restants) — option ouverte, à décider séparément, pas un prérequis à la Phase 4.
