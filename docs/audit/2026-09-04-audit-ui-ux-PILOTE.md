# Audit UI/UX — Rapport pilote (Phase 1)

**Date** : 2026-09-04
**Nature** : audit statique du code (aucune vérification au rendu — voir « Angles morts »)
**Modules audités** : `layout-shell`, `marches`, `admin-alertes` (3 / 13)
**Branche** : `chore/audit-ui-ux` · **runId** : `wf_4f556b30-730`
**Contrat de référence** : décisions de la refonte frontend (échelle typo 11/13/14/16/18/20/24, tokens `stam-*`, `shadow-card`, `AlertDialog` avant action destructive, `loading.tsx` par route liste, spinner proscrit, cible tactile 44px, contraste ≥ 4.5:1).

---

## 1. Résumé exécutif

| Indicateur | Valeur |
|---|---|
| Findings bruts (audit code) | **74** |
| Retirés au DEFI | **4** (hors périmètre UI/UX ou « non conforme » non étayé) |
| Reclassés au DEFI | **15** (14 Important → Cosmétique · 1 Bloquant → Important) |
| **Findings retenus** | **70** |
| Entrées backlog après DEDUP/CLUSTER | **41** |
| Bugs fonctionnels extraits (hors périmètre UI) | **6** |
| Lots de correction | **7** (Lot 0 → Lot 6) |

### Compteurs par sévérité (findings retenus, sévérité finale)

| Sévérité | Nombre | Part |
|---|---|---|
| 🔴 Bloquant | **1** | 1 % |
| 🟠 Important | **30** | 43 % |
| 🟡 Cosmétique | **39** | 56 % |
| **Total** | **70** | |

### Compteurs par thème (findings retenus)

| Thème | Bloquant | Important | Cosmétique | Total |
|---|---|---|---|---|
| design-system (tokens, échelle typo, ombres) | — | 5 | 20 | 25 |
| accessibilité (aria, focus, contraste, cible tactile) | — | 12 | 6 | 18 |
| cohérence (composants divergents, patterns) | — | 4 | 6 | 10 |
| états (loading, tri, pagination, NaN, empty) | — | 5 | 3 | 8 |
| hiérarchie (titres, dominance visuelle) | — | 3 | 1 | 4 |
| responsive (débordement mobile/tablette) | 1 | 1 | — | 2 |
| conformité (contrat) | — | — | 2 | 2 |
| micro-interaction | — | — | 1 | 1 |

### Verdict de calibrage

Le pilote est **productif** : 74 findings sur 3 modules, couverture correcte des 7 thèmes, aucune zone aveugle évidente dans le code. Le rubric penche vers le **design-system tokens** (25/70) — c'est réel mais peu risqué : la moitié se traite dans un seul chantier de fondation (Lot 0). Le signal à forte valeur est concentré : **accessibilité (18)** et **états/bugs fonctionnels (8 + 6)**. Recommandation : **conserver le rubric tel quel** pour la Phase 2, en demandant à l'agent de **fusionner d'office** les findings « couleur en dur → token » d'un même composant partagé (ils ont gonflé le volume brut sans gonfler la valeur).

---

## 2. Méthode de traitement

### 2.1 DEFI — retraits (4)

| Finding source | Raison du retrait |
|---|---|
| `marche-form.tsx:261` — `onSubmit(data: any)` + composant 1300 lignes | Dette de code, pas UI/UX. Aucun impact utilisateur observable. |
| `marche-form.tsx:33` — import mort `Calendar` | Hygiène de code triviale, hors périmètre UI/UX. |
| `marche-card.tsx:108` — footer toujours visible vs « actions révélées au hover » | L'audit lui-même note « peut être volontaire » ; désaccord de gabarit non étayé, pas de préjudice. |
| `rule-form.tsx:61` — cast `(rule as any)` | Dette de typage, pas UI/UX. |

### 2.2 DEFI — reclassements (15)

**Bloquant → Important (1)** : `rules-list-client.tsx:43` `window.confirm()` natif. Non conforme au contrat (AlertDialog), mais **fonctionnel et accessible** (dialogue natif du navigateur) — l'incohérence visuelle ne bloque aucun parcours.

**Important → Cosmétique (14)** — tous des remplacements « valeur en dur → token » à rendu identique ou quasi identique, ou du code mort sans impact utilisateur :
`VehicleMultiSelect` (débordement conservé Bloquant, mais le point typo passe cosmétique) · `notification-bell:57` (token rouge) · `select.tsx:78` / `skeleton` / `dialog` (`border-gray-100`) · `DrillDownSheet:34` (`#1E3A5F` = `stam-primary`, **même couleur**) · `alert.tsx:13` + `chart.tsx:9` (classes `dark:` mortes) · `sheet.tsx:24` (opacité overlay) · `dashboard-shell:145` (échelle typo) · `delete-marche-dialog:93` (rouge en dur) · `marche-form:591` (bleu en dur) · `marche-detail:57` (lot de couleurs en dur) · `marche-card:62` (`text-[10px]`) · `rules-list-client:67` (`bg-gray-50`) · `history/page.tsx:8` (`loading.tsx` — normalisé avec l'équivalent marchés, déjà cosmétique).

### 2.3 DEDUP — entrées transversales (composants `ui/` + `shared/`)

5 défauts identiques répétés sur plusieurs fichiers/modules → 1 entrée chacune : **tokens couleur** (B25), **échelle typo** (B26), **Sheet/overlays** (B27), **mode sombre mort** (B28), **Card** (B29). Idem pour un défaut de pattern répété côté modules : **aria-label boutons-icône** (B06), **confirmation destructive** (B09), **`loading.tsx` manquants** (B24).

---

## 3. Backlog complet

Ordre : Bloquant → Important → Cosmétique. À sévérité égale : transversal/shell d'abord, puis pipeline AO (`marches`), puis admin (`admin-alertes`).
Effort : **S** ≤ 1 h · **M** 1–4 h · **L** > 4 h (ou multi-fichiers à risque de régression).

| # | Sév. | Thème | Emplacement | Modules | Constat | Correctif | Effort |
|---|---|---|---|---|---|---|---|
| B01 | 🔴 | responsive | `shared/VehicleMultiSelect.tsx:72` (+ `:83`) | layout-shell¹ | `PopoverContent` en `w-[400px]` fixe → déborde ~25px+ et scroll horizontal en 375px. En prime : le `<div onClick>` + `Checkbox onCheckedChange` togglent tous deux → un clic direct sur la case **annule la sélection** (bug fonctionnel, cf. annexe). | `w-[min(400px,calc(100vw-2rem))]` (ou `w-[--radix-popover-trigger-width]`) ; rendre le `Checkbox` présentationnel (`tabIndex={-1}` + `pointer-events-none`), un seul gestionnaire de toggle. | S |
| B02 | 🟠 | accessibilité | `layout/dashboard-shell.tsx:366` + `page-header.tsx:25` | TOUS | Deux `<h1>` par page liste (titre topbar + `PageHeader`), le premier du DOM étant le plus petit. Structure de titres cassée pour lecteurs d'écran. | Titre topbar en `<p>`/`<div>` (`aria-hidden` ou non sémantique), `<h1>` unique dans `PageHeader`. | S |
| B03 | 🟠 | accessibilité | `layout/dashboard-shell.tsx:326` | TOUS | Sidebar mobile = `<aside>` conditionnel : pas de `role="dialog"`/`aria-modal`, pas de piège de focus, pas de fermeture Échap. Focus reste derrière l'overlay. | Utiliser le composant `Sheet` (Radix Dialog) déjà présent, ou focus-trap + listener Escape + `aria-modal`. | M |
| B04 | 🟠 | accessibilité | `layout/dashboard-shell.tsx:171` | TOUS | Liens nav sidebar sans focus visible (hover en JS `onMouseEnter/Leave`, zéro classe `focus-visible`). Navigation clavier sans repère sur fond sombre. | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50` sur `<Link>`. | S |
| B05 | 🟠 | accessibilité | `app/globals.css:91` | TOUS | `--sidebar-muted` (214 25% 58%) sur `--sidebar-bg` (214 52% 18%) : ratio calculé ≈ **4.3:1**, sous 4.5:1. Tous les libellés de nav inactifs. *(à confirmer au rendu)* | Éclaircir `--sidebar-muted` vers L ≈ 67 % (≈ 214 22% 67%). | S |
| B06 | 🟠 | accessibilité | `shared/VehicleMultiSelect.tsx:110` · `marches/marche-filters.tsx:227,432` · `admin/…/rules-list-client.tsx:112` | layout-shell, marches, admin-alertes | Boutons-icône seuls (X de badge/chip, effacer recherche, Power/Pencil/Trash2) sans `aria-label` — non annoncés. Contrat : `aria-label` obligatoire sur icône seule. | `aria-label` explicite sur chaque bouton (`Retirer {immat}`, `Effacer la recherche`, `Activer/Désactiver la règle`, `Modifier la règle`, `Supprimer la règle`). | M |
| B07 | 🟠 | accessibilité | `admin/…/notification-bell.tsx:51` | layout-shell (topbar) | Cloche forcée `h-8 w-8` (32px) sur `size="icon"` → cible tactile < 44px sur la topbar mobile. | Garder `size="icon"` (40px) ou porter la zone cliquable à 44px. | S |
| B08 | 🟠 | cohérence | `ui/alert.tsx:11` | TOUS | `Alert` variant `default` = `bg-background` (= fond de page) → aucune relief sur une page. Pas de variantes sémantiques `success/warning/info` alignées sur `Badge`. | `default` → `bg-card` ; ajouter `success/warning/info/danger` (fond `stam-*-bg` + texte `stam-*`). | M |
| B09 | 🟠 | conformité | `marches/delete-marche-dialog.tsx:64` · `marches/marche-filters.tsx:396` · `admin/…/rules-list-client.tsx:43` | marches, admin-alertes | Actions destructives sans `AlertDialog` : suppression de marché via `<Dialog>` générique ; suppression de filtre sauvegardé au clic direct sans confirmation ; suppression de règle via `window.confirm()` natif. Incohérent avec `convertir-en-opportunite` qui fait bien un `AlertDialog`. | Reconstruire avec `AlertDialog`/`AlertDialogAction (variant=destructive)`/`AlertDialogCancel`, récap nommé (numéro/objet/nom de règle). | M |
| B10 | 🟠 | cohérence · états | `marches/marche-form.tsx:1253` · `marches/delete-marche-dialog.tsx:43` · `marches/marche-detail.tsx` | marches | Retours de mutation via `<div>` colorés en dur (`red-100`/`yellow-100`/`green-100`) au lieu du pattern `ActionResult` → `toast`. `marche-form` importe **déjà** `lib/utils/toast` pour le brouillon (incohérence interne). Aucun `toast.success` après suppression réussie. | Remplacer les blocs `<div>` par `toast.error/warning/success` ; `toast.success(\`Marché {n} supprimé\`)` avant `router.push` ; si rappel inline nécessaire, `<Alert>` tokenisé. | M |
| B11 | 🟠 | hiérarchie | `marches/marche-detail.tsx:105` · `marches/nouveau/page.tsx:21` · `marches/[id]/edit/page.tsx:39` | marches | Titres incohérents : `CardTitle` de détail en `text-2xl` (= le `<h1>` objet, aucune hiérarchie entre titre de page et ~7 sections) ; « Créer un marché » en `h1 text-3xl` (24px) **plus gros** qu'un titre de marché réel (`text-2xl`). `marche-form` force pourtant `CardTitle` à `text-lg`. | `<PageHeader>` (ou `h1 text-2xl`) sur nouveau/edit ; `CardTitle` de `marche-detail` en `text-lg`. | M (dép. B26) |
| B12 | 🟠 | hiérarchie · responsive | `marches/marche-detail.tsx:69` | marches | Rangée d'entête : `StatutBadge lg` + badge + `Statut`/`Convertir`/`Modifier` (`size sm`) + `DeleteMarcheDialog` (`size default`, destructive plein rouge + shadow). L'action destructive est **la plus grande et la plus contrastée**. En tablette/mobile la rangée `flex-wrap` se casse. | `DeleteMarcheDialog` en `size sm variant ghost/outline`, ou dans un `DropdownMenu` « Actions » regroupant au-delà de 2 boutons. | M |
| B13 | 🟠 | cohérence | `marches/[id]/edit/page.tsx:27` · `marches/nouveau/page.tsx` | marches | Pas de `BreadcrumbNav` sur nouveau/edit (juste un bouton « Retour ») alors que la page détail utilise `<BreadcrumbNav showHome>`. Navigation contextuelle incohérente. | Ajouter `<BreadcrumbNav showHome items=…>` sur les deux pages. | S |
| B14 | 🟠 | design-system | `lib/utils/statut.ts:27` · `marches/marche-card.tsx:22` | marches | `STATUT_COLORS` : 13 statuts sur teintes brutes Tailwind. `ATTRIBUE_PROVISOIREMENT` et `INFRUCTUEUX` partagent exactement `bg-orange-100 text-orange-800` → **indistinguables**. `yellow-800/yellow-100` = contraste le plus faible. Barre 4px de carte (`STATUT_TOP_COLOR`) = 13 hues arbitraires non alignées (« arc-en-ciel »). | Source unique statut → groupe sémantique ; teinte distincte pour `INFRUCTUEUX` ; barre dérivée des mêmes groupes ; chaque paire ≥ 4.5:1. | M |
| B15 | 🟠 | responsive | `marches/marche-card.tsx:110` | marches | Liens footer (« Voir détails », « Modifier ») en `py-1.5` (6px) → cible tactile ≈ 28px, sous 44px. Problématique en 375px. | `h-9` min, ou `<Button size="sm" variant="ghost">` pleine hauteur. | S |
| B16 | 🟠 | accessibilité | `marches/marche-filters.tsx:220` | marches | Input de recherche sans `<label>` ni `aria-label` (placeholder seul). | `aria-label="Rechercher un marché"`. | S |
| B17 | 🟠 | états | `marches/marche-form.tsx:383` (+ `:525`) | marches | `parseFloat(e.target.value)` → `NaN` si champ vidé ; idem `parseInt` sur `delaiExecution`. `NaN` se propage dans le state et peut brouiller le message Zod. **Bug fonctionnel.** | `field.onChange(e.target.value === '' ? undefined : parseFloat(...))` avec `isNaN → undefined`. | S |
| B18 | 🟠 | états | `marches/marche-list.tsx:16` | marches | Le tri client (`useSortable`) ne porte que sur la page paginée courante (~20 items). « Trier par Montant » ne réordonne que les lignes visibles → résultat trompeur. **Bug fonctionnel.** | Tri serveur (param URL `sort`/`dir` → `getAllMarches`), ou masquer la toolbar quand paginé, ou libeller « tri sur la page courante ». | M |
| B19 | 🟠 | responsive | `admin/…/rules-list-client.tsx:67` | admin-alertes | Conteneur `<table>` en `overflow-hidden` (pas `overflow-x-auto`). En 375px, colonnes Règle + Statut + Actions (3 boutons) tronquées, pas de scroll. `history-table.tsx:45` fait bien `overflow-x-auto` (incohérence intra-module). | `rounded-xl border bg-card overflow-x-auto`. | S |
| B20 | 🟠 | responsive | `admin/…/condition-editor.tsx:196` | admin-alertes | Chaque ligne de condition = `flex` non-wrap : 2 `Select w-44` + valeur + bouton > 400px. Déborde en mobile 375px et tablette étroite, sans wrap ni scroll. | `flex flex-wrap items-center gap-2` ; `Select w-full sm:w-44`. | S |
| B21 | 🟠 | cohérence · états | `admin/…/history-table.tsx:35` | admin-alertes | Historique affiché **sans pagination** alors que `getNotificationHistory` expose `total` et que le contrat impose une `Pagination`. Page potentiellement très longue en prod. **Bug fonctionnel (perf).** | Pagination serveur (`page`/`pageSize`) + `<DataPagination>` sous la table. | M |
| B22 | 🟠 | états | `admin/…/history-table.tsx:84` | admin-alertes | Statut affiché en enum brut anglais (`SENT`/`PENDING`/`FAILED`/`READ`) dans le badge. Contrat : libellés métier lisibles. | `STATUS_LABELS = { SENT:'Envoyé', READ:'Lu', PENDING:'En attente', FAILED:'Échec' }`. | S |
| B23 | 🟠 | états | `admin/…/condition-editor.tsx:193` | admin-alertes | `key={i}` (index) sur les lignes de condition. Supprimer une ligne du milieu décale l'état interne des `Select`/`Input` vers la mauvaise ligne (valeurs affichées fausses). **Bug fonctionnel.** | Id stable à la création (`crypto.randomUUID()`) utilisé comme `key`. | S |
| B24 | 🟠 | états | `marches/nouveau` · `marches/[id]` · `marches/[id]/edit` · `admin/alertes/rules` · `admin/alertes/history` | marches, admin-alertes | Pas de `loading.tsx` (seule `/marches` en a un). `auth` + fetch serveur bloquant sans skeleton → écran figé pendant la navigation. Contrat : `loading.tsx` avec Skeleton shimmer par route liste. | Ajouter `loading.tsx` (skeleton 2 colonnes pour le détail, skeleton formulaire pour edit, `<PageHeader>` + skeleton de table pour les listes admin). | M |
| B25 | 🟡 | design-system | `ui/select.tsx:78` · `ui/skeleton.tsx:18` · `ui/dialog.tsx:47` · `shared/DrillDownSheet.tsx:34` · `dashboard-shell.tsx:345` · `marches/*` (delete-dialog:93, form:591, detail:57, card:47/109/112/117, filters:213/477) · `lib/utils/urgence.ts:78` · `admin/*` (rules-list:67/121, history-table:45/48/60, condition-editor:196) | TOUS | Chantier tokens : `border-gray-100`, `bg-white`, `bg-gray-50`, `text-[#1E3A5F]`, `text-red-800 bg-red-100`, `border-blue-200 bg-blue-50/50`, `green-100/orange-100/red-100`, `text-green-600/text-gray-400`, gradients `hsl(...)` en dur. | Remplacer par `bg-card` / `bg-muted` / `border-border` / `text-primary` / `text-stam-*` / `stam-*-bg` / `var(--...)`. | L |
| B26 | 🟡 | design-system · hiérarchie | `dashboard-shell.tsx:145/149/229/235/289/367` · `notification-bell.tsx:57` · `marche-card.tsx:62` · `marche-detail.tsx:524` · `history-table.tsx:89` | TOUS | Valeurs de police hors échelle : `text-[9px]`, `text-[10px]`, `text-[13px]`, `text-[15px]`. L'échelle redéfinie = 11/13/14/16/18/20/24. Titre topbar `text-[15px]` à peine plus gros que le corps. | Mapper sur `text-xs` (11) / `text-sm` (13) / `text-base` (14) / `text-lg` (16) ; supprimer 9/10/15px. | M |
| B27 | 🟡 | cohérence | `ui/sheet.tsx:24` · `dashboard-shell.tsx:323` | layout-shell (Sheet partagé) | `Sheet` divergent de `Dialog`/`AlertDialog` : overlay `bg-black/80` sans blur (vs `bg-black/50 backdrop-blur-sm`) ; `rounded-none` + `shadow-lg` (vs `rounded-xl` + `shadow-2xl`) ; close `focus:ring-ring ring-offset-2` (ancien shadcn). Overlay sidebar mobile en `bg-black/60`. | Aligner overlay `bg-black/50 backdrop-blur-sm`, `rounded-xl`, `shadow-2xl`, focus `ring-primary/20 ring-offset-0`. | S |
| B28 | 🟡 | conformité | `ui/alert.tsx:13` · `ui/chart.tsx:9` | layout-shell | Classes/branches `dark:` mortes (MVP sans mode sombre) : `dark:border-destructive` ; `THEMES = {light:'', dark:'.dark'}` + bloc CSS `.dark [data-chart]`. | Retirer `dark:border-destructive` ; réduire `chart.tsx` à un seul thème. | S |
| B29 | 🟡 | design-system | `ui/card.tsx:12` · `ui/card.tsx:39` | TOUS | `Card` en `shadow-sm` (shadcn) au lieu de `shadow-card` (ombres teintées navy). `CardTitle` resté `text-2xl` (20px), surdimensionné vs `h3` (16) et `DialogTitle` (`text-lg`). | `shadow-card` au repos ; `CardTitle` → `text-lg font-semibold`. | S |
| B30 | 🟡 | accessibilité | `shared/SortableHeader.tsx:35` | TOUS (listes) | Bouton de tri en `h-8` (32px) : cible tactile < 44px sur en-têtes de tableau en usage mobile. | `h-9` min + padding tactile accru (`h-11` sur mobile). | S |
| B31 | 🟡 | accessibilité | `dashboard-shell.tsx:359` | TOUS | Hamburger : `aria-label="Menu"` constant, pas d'`aria-expanded`, libellé inchangé quand l'icône devient une croix. | `aria-expanded={mobileOpen}` + `aria-label` dynamique. | S |
| B32 | 🟡 | accessibilité | `dashboard-shell.tsx:158` | TOUS | `<nav>` sidebar sans `aria-label` alors que la page a plusieurs landmarks nav (sidebar desktop/mobile, fil d'Ariane, pagination). | `aria-label="Navigation principale"` (label distinct pour la variante mobile). | S |
| B33 | 🟡 | conformité | `shared/retry-button.tsx:23` | layout-shell | État de chargement = spinner (`animate-spin`) alors que le contrat impose Skeleton/shimmer et proscrit le spinner. | Libellé seul (« Nouvelle tentative… ») ou barre de progression indéterminée conforme. | S |
| B34 | 🟡 | cohérence | `shared/VehicleMultiSelect.tsx:90` | layout-shell | Immatriculation en `font-mono` brut au lieu de `.font-mono-marche` (13px, letter-spacing .025em). | `className="text-sm font-medium font-mono-marche"`. | S |
| B35 | 🟡 | micro-interaction | `dashboard-shell.tsx:170` | TOUS | `title={item.label}` sur tous les items sidebar, y compris desktop où le libellé est visible → tooltip natif redondant. | `title` uniquement en mode icônes seules (md et < lg, hors `forceExpanded`). | S |
| B36 | 🟡 | design-system | `admin/…/notification-bell.tsx:57` | layout-shell | Pastille compteur en `bg-red-500` (Tailwind brut, 0 84% 60%) — le rouge marque est `destructive`/`stam-danger` (0 72% 51%) ; `text-[9px]`. | `bg-destructive` (ou `bg-stam-danger`) + `text-[10px]` min. | S |
| B37 | 🟡 | états | `marches/marche-list.tsx:21` | marches | État vide unique : même texte et CTA « créer votre premier marché » que la base soit vide ou qu'un filtre ne renvoie rien (trompeur avec 50 marchés en base). | Distinguer via `hasFilters` : filtres actifs → « Aucun résultat » + « Effacer les filtres » ; sinon onboarding. | S |
| B38 | 🟡 | cohérence | `marches/marche-pagination.tsx:20` | marches | Pagination maison sur `<Pagination>` shadcn brut au lieu du composant partagé `data-pagination`. Prev/next désactivés restent dans l'ordre de tabulation (`aria-disabled` seul). | `<DataPagination>` si l'API convient ; sinon `tabIndex={-1}` sur prev/next désactivés. | S |
| B39 | 🟡 | cohérence | `marches/marche-filters.tsx:427` | marches | Chips de filtres actifs en `<Badge variant="secondary">` alors que le contrat spécifie `bg-primary/8 text-primary`. | Aligner les chips sur `bg-primary/8 text-primary`. | S |
| B40 | 🟡 | design-system | `marches/marche-form.tsx:591` | marches | Carte champs spécifiques : `border-blue-200 bg-blue-50/50` en dur + `animate-in fade-in slide-in-from-top-2` au lieu de `animate-fade-in` (150ms) ; `transition-all duration-300` en limite haute. | `border-primary/20 bg-primary/5` + `animate-fade-in` ; retirer `duration-300`. | S |
| B41 | 🟡 | design-system | `marches/marche-card.tsx:62` | marches | Badge « Numéro provisoire » codé à la main : `text-[10px] bg-amber-50 text-amber-800 border-amber-300`. `text-[10px]` hors échelle, variant `warning` existe. Même motif dans `marche-detail.tsx:57`. | `<Badge variant="warning" className="text-xs">Numéro provisoire</Badge>`. | S |
| B42 | 🟡 | design-system | `admin/…/rules-list-client.tsx:57` · `history-table.tsx:38/45` | admin-alertes | Conteneurs de liste et empty-states en `rounded-lg` (8px, atome) au lieu de `rounded-xl` (12px) imposé pour cartes/panneaux. | Uniformiser en `rounded-xl`. | S |
| B43 | 🟡 | design-system | `admin/…/condition-editor.tsx:74` | admin-alertes | Déclencheur du multi-select enum = `<button>` brut (`rounded-md border-input bg-background shadow-sm hover:bg-accent`) : hauteur et focus-ring divergent des autres champs (`SelectTrigger h-10 rounded-lg`). | Réutiliser le trigger des autres `Select` ou extraire un `MultiSelectTrigger` partagé. | S |
| B44 | 🟡 | cohérence | `admin/alertes/rules/page.tsx:17` | admin-alertes | `PageHeader` : la page Historique passe `count` (badge), la page Règles met le compte dans `description`. Deux traitements du même pattern. | `count={rules.length}` sur la page Règles. | S |
| B45 | 🟡 | hiérarchie | `admin/…/rule-form.tsx:189` | admin-alertes | 5 sous-sections en `<h3>` `font-medium` identiques, sans numérotation ni pictogramme. Formulaire long (8 blocs + Separator) à progression visuelle plate. | Titres renforcés (`text-sm font-semibold uppercase tracking-wide text-muted-foreground` ou pastille numérotée), voire `Card` par section. | S |
| B46 | 🟡 | états | `admin/…/rule-form.tsx:276` | admin-alertes | Bouton Annuler = `router.back()` : sur accès direct/rechargement, peut sortir de l'app. Aucune protection contre la perte de saisie. | `router.push('/admin/alertes/rules')` ; garde `beforeunload` optionnelle si formulaire sale. | S |
| B47 | 🟡 | accessibilité | `admin/…/history-table.tsx:89` | admin-alertes | Colonne Log en `text-xs` (11px) `font-mono` `text-muted-foreground`, tronquée (`max-w-[200px] truncate`) sans `title` ni tooltip : valeur complète illisible. | `title={n.deliveryLog}` ou `Popover` pour le log complet ; envisager `text-sm`. | S |
| B48 | 🟡 | accessibilité | `dashboard-shell.tsx` (hamburger + overlay) · `marche-pagination` | layout-shell, marches | Ordre de focus / tabulation non maîtrisé sur éléments désactivés et overlay mobile (recoupe B03/B38). *(à vérifier au clavier en live)* | Vérification clavier bout-en-bout après B03/B38. | S |

¹ `layout-shell` = le shell applicatif → tout finding « TOUS » impacte les 13 modules.

---

## 4. Lots de correction

Chaque lot = 1 PR livrable indépendamment. Ordre imposé par les dépendances.

### Lot 0 — Fondations design-system *(bloque Lot 3 et Lot 5)*
**Entrées** : B25 (tokens couleur), B26 (échelle typo), B27 (Sheet/overlays), B28 (dark mort), B29 (Card shadow + CardTitle), B36, B40, B41, B42, B43.
**Pourquoi d'abord** : les écrans des lots suivants réécrivent des classes dans les mêmes fichiers ; tokeniser après = double travail + conflits.
**Effort** : L. **Risque** : régression visuelle large → capture avant/après sur les 3 modules obligatoire.

### Lot 1 — Accessibilité transversale (shell) *(indépendant)*
**Entrées** : B01 (VehicleMultiSelect), B02 (double h1), B03 (sidebar mobile dialog), B04 (focus nav), B05 (contraste sidebar), B06 (aria-label icônes), B07 (cloche 44px), B30 (SortableHeader 44px), B31 (hamburger), B32 (nav aria-label), B48 (ordre de focus).
**Effort** : M. Majoritairement ajout d'attributs/classes ; B03 est le seul point structurel.

### Lot 2 — Confirmations destructives & feedback *(indépendant, utilise l'`AlertDialog` existant)*
**Entrées** : B09 (AlertDialog partout), B10 (retours mutation → toast).
**Effort** : M.

### Lot 3 — Marchés : hiérarchie & responsive écrans *(dépend Lot 0)*
**Entrées** : B11 (titres de page), B12 (rangée d'entête détail), B13 (breadcrumb nouveau/edit), B14 (source unique statut→couleur), B15 (footer carte 44px), B39 (chips filtres).
**Effort** : M/L.

### Lot 4 — Marchés : états & bugs formulaire/liste *(indépendant)*
**Entrées** : B17 (NaN — fonctionnel), B18 (tri page courante — fonctionnel), B37 (empty-state), B38 (pagination partagée), B24 (loading.tsx marchés).
**Effort** : M. Contient 2 bugs fonctionnels → tests E2E de non-régression.

### Lot 5 — Admin-alertes : responsive, pagination, libellés *(dépend Lot 0)*
**Entrées** : B19 (overflow table), B20 (condition-editor wrap), B21 (pagination historique — fonctionnel), B22 (libellés statut FR), B23 (key={i} — fonctionnel), B24 (loading.tsx admin), B44 (PageHeader count), B45 (titres de bloc), B46 (Annuler), B47 (colonne Log).
**Effort** : M/L. Contient 2 bugs fonctionnels.

### Lot 6 — Nettoyage cosmétique résiduel *(dernier — peut toucher des fichiers des lots 0/3/5)*
**Entrées** : B08 (variantes Alert — si non fait en Lot 2), B33 (retry-button spinner), B34 (font-mono-marche), B35 (title redondant desktop).
**Effort** : S.

### Dépendances clés
- **Lot 0 avant Lot 3 et Lot 5** (classes de tokens référencées).
- **B26 avant B11** (échelle typo avant l'harmonisation des titres marchés).
- **B03 avant B48** (structure de la sidebar mobile avant la vérif clavier).
- **B27 (Sheet) avant B03** si B03 choisit la voie « composant `Sheet` ».
- Lots 1, 2, 4 sont mutuellement indépendants et parallélisables.

---

## 5. Annexe — Bugs fonctionnels (hors périmètre UI pur)

Détectés pendant l'audit UI mais relevant d'un défaut de comportement, pas de présentation. À traiter dans les lots indiqués **avec test E2E de non-régression**.

| Réf. | Emplacement | Symptôme | Lot |
|---|---|---|---|
| F1 | `shared/VehicleMultiSelect.tsx:83` | Clic direct sur la case à cocher → toggle + retoggle via bubbling → **la sélection s'annule**. Seul le clic sur le libellé fonctionne. | Lot 1 (B01) |
| F2 | `layout/dashboard-shell.tsx:86` | `getPageTitle` : `startsWith('/vehicules')` matche avant `/vehicules/sav` → la page SAV affiche le titre « Véhicules ». Casse pour toute future sous-route. | Lot 1 (à intégrer) |
| F3 | `marches/marche-form.tsx:383,525` | `parseFloat`/`parseInt` d'un champ vidé → `NaN` dans le state → message Zod potentiellement brouillé. | Lot 4 (B17) |
| F4 | `marches/marche-list.tsx:16` | Tri client sur la page paginée seule → « trier par Montant » ne réordonne que ~20 lignes visibles → résultat trompeur. | Lot 4 (B18) |
| F5 | `admin/…/history-table.tsx:35` | Historique sans pagination alors que `total` est disponible → page qui grossit sans limite en prod. | Lot 5 (B21) |
| F6 | `admin/…/condition-editor.tsx:193` | `key={i}` → suppression d'une ligne du milieu décale l'état des `Select`/`Input` → valeurs affichées fausses. | Lot 5 (B23) |

---

## 6. Angles morts / à vérifier en live

### 6.1 Ce que l'audit statique ne peut pas trancher

| Sujet | Findings concernés | Vérification |
|---|---|---|
| **Contraste rendu réel** | B05 (`--sidebar-muted` ≈ 4.3:1), B14 (`yellow-800/yellow-100`, paires de badges statut) | Contrôle au rendu + outil de contraste (axe / Lighthouse), 3 viewports. |
| **Débordement horizontal réel** | B01 (popover 375px), B12 (rangée d'entête détail), B15 (footer carte), B19 (table règles), B20 (lignes de condition) | Playwright 375 / 768 / 1920, assertion `scrollWidth <= clientWidth` sur `<body>`. |
| **Ordre de focus effectif** | B02, B03, B04, B38, B48 | Navigation clavier Tab/Shift-Tab/Échap bout-en-bout ; piège de focus sidebar mobile. |
| **Erreurs console / warnings hydratation** | B02 (double `<h1>`), B23 (`key={i}`), B17 (`NaN`) | Ouvrir la console sur chaque écran, capturer `warning`/`error`. |
| **Pièges d'interaction réels** | F1 (double-toggle), F3 (`NaN` propagé) | Reproduction manuelle avant/après correctif. |
| **Rendu réel des animations** | B40 (`duration-300`, `animate-in` vs `animate-fade-in`) | Observer la transition d'apparition des champs spécifiques. |

### 6.2 Parcours transverses non audités (à couvrir en Phase 2 ou en pass live dédié)

- **Recherche globale** (topbar) — comportement, résultats, états vide/chargement.
- **Cloche de notifications** — ouverture du panneau, marquage lu/non-lu, navigation depuis une notif, badge compteur.
- **Exports PDF / Excel** — déclenchement, état de chargement, gestion d'erreur, contenu.
- **Pagination serveur** — cohérence URL, bornes, retour page 1 au changement de filtre.
- **Tri / filtres bout-en-bout** — combinaisons, filtres sauvegardés (création/application/suppression), persistance URL.
- **Navigation clavier complète** — skip-link, ordre des landmarks, retour focus après fermeture de modale.
- **États réseau réels** — lenteur, échec de Server Action, `retry-button` en conditions réelles.
- **Responsive des 10 autres modules** — `dashboard-home`, `opportunites`, `cautions`, `vehicules`, `documents`, `dossiers-offre`, `factures`, `admin-users`, `admin-analytique`, `auth-profil`.

### 6.3 Modules à relancer (audit code)

**Aucun.** Le pilote a produit un signal exploitable sur les 3 modules ; pas de re-run du workflow d'audit statique nécessaire. En revanche, **un pass de vérification live (Playwright, 3 viewports, console)** est requis sur `layout-shell`, `marches` et `admin-alertes` **avant** d'ouvrir les PR de correction, pour lever les points « à vérifier en live » du §6.1.

---

## 7. Recommandations de calibrage pour la Phase 2

1. **Garder le rubric.** Couverture et pertinence correctes.
2. **Instruire l'agent de pré-fusionner** les findings « couleur/valeur en dur → token » d'un même composant `ui/`/`shared/` en une entrée (ils représentent 25/70 findings pour ~1 chantier réel).
3. **Demander un champ `bug_fonctionnel` explicite** dans le rubric — 6 vrais bugs se sont glissés dans un audit « UI/UX », c'est utile mais il faut les isoler d'emblée.
4. **Live off pour la Phase 2** également (13 modules × 3 viewports = coûteux) ; concentrer le budget live sur un pass unique post-audit, ciblé sur les findings `a_verifier_live: true`.
5. Volume attendu Phase 2 : ~3 × (74 × 10/13) ≈ **250–320 findings bruts** sur les 10 modules restants → prévoir le DEDUP transversal en conséquence.
