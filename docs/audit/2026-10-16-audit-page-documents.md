# Audit — Page « Documents & Médias » (`/documents`)

**Date** : 2026-10-16
**Nature** : audit en lecture seule — code (`app/(dashboard)/documents/`, `components/documents/`) + vérification au rendu sur la production (session authentifiée ADMIN), aux 3 tailles du projet. Aucune action d'écriture déclenchée (ni upload, ni suppression, ni modification).
**Référentiels** : `BONNES_PRATIQUES.md`, `CLAUDE.md` projet, `ARCHITECTURE.md`, spec OpenSpec `module-documents-medias/specs/document-ui`, audit UI/UX du 2026-09-04 (Lot 2 « menus tactiles »).
**Limites** : le clavier a été vérifié par inspection du DOM et du code (pas de parcours Tab complet à l'écran) ; la saisie au clavier dans l'émulation mobile n'a pas fonctionné (la valeur a été injectée par l'outil de formulaire) ; la préversion n'a été testée que sur une image, pas sur un PDF ; le contraste n'a été mesuré que sur le texte secondaire.

---

## 1. Résumé

| Sévérité | Nombre |
|---|---|
| 🔴 Bloquant | **2** |
| 🟠 Important | **11** |
| 🟡 Cosmétique | **7** |

Points forts : en-tête soigné (`PageHeader`, compteur), filtres synchronisés avec l'URL et réinitialisables, pagination avec résumé « Affichage 1-10 sur 45 », `loading.tsx` dédié, `AlertDialog` avant suppression, boutons d'action du tableau à 44×44 px, aucun débordement à 1920 px, `<h1>` unique, préversion image fonctionnelle (Échap ferme le dialogue).

Les deux bloquants sont **fonctionnels** : le filtrage ne rafraîchit pas la liste, et sur mobile les actions sont hors écran.

---

## 2. Bloquants

### B1 — La liste ne se met pas à jour quand on filtre, recherche ou change de page
- **Où** : `app/(dashboard)/documents/_components/documents-content.tsx:36-39` — `useState<Document[]>(initialDocuments)`.
- **Constat (reproduit en prod)** : recherche d'un terme sans correspondance → l'URL passe à `?search=…`, le badge de l'en-tête affiche **0**, mais le tableau montre toujours **10 lignes** (état copié au premier rendu, jamais resynchronisé avec les nouvelles props serveur). Même mécanisme attendu pour le filtre type/phase et la pagination (changement de page : compteur correct, lignes inchangées).
- **Impact** : l'utilisateur voit des résultats qui ne correspondent pas à son filtre ; risque de **supprimer ou télécharger le mauvais document** en croyant filtrer. Contredit le scénario « Search / Filter / Combined filters » de la spec.
- **Piste** : ne pas copier les props dans un état (dériver de `initialDocuments`, retirer les suppressions via `router.refresh()` / `revalidatePath`), ou ajouter une `key` dépendant des paramètres d'URL.

### B2 — Mobile 375 px : débordement horizontal et actions inaccessibles
- **Mesuré** : `innerWidth` 506 px pour `clientWidth` 375 px (≈ 131 px de défilement horizontal de la page).
- **Éléments qui dépassent** : le bloc filtres (`flex-1` sans `min-w-0`, bord droit à 402 px) et surtout la **bascule Liste/Grille** (bord à 506 px). Cause : conteneur `flex items-end` sans passage en colonne sous `sm`.
- **Tableau** : largeur de contenu 897 px dans un conteneur de 341 px → seules les colonnes Icône + Nom sont visibles ; **Type, Taille, Date et le menu Actions sont hors écran** (défilement horizontal interne non signalé). Aucune carte mobile alors que la spec exige « Mobile card view (< 768 px) ».
- **Impact** : sur téléphone, on ne peut ni prévisualiser ni télécharger ni supprimer sans deviner le défilement latéral. Réapparition du problème traité au Lot 2 de l'audit du 2026-09-04 (menus tactiles).
- **Piste** : sous `md`, basculer automatiquement en vue cartes (ou colonnes masquées + menu), passer la barre d'outils en `flex-col`, `min-w-0` sur le bloc filtres.

---

## 3. Important

| # | Constat | Où | Détail / piste |
|---|---|---|---|
| I1 | **Tablette 768 px : colonnes Taille / Date / Actions coupées** | `document-table.tsx` | Table de 897 px dans 672 px de large, défilement interne seulement. Masquer Taille/Date sous `lg` ou passer les infos sous le nom (spec : « colonnes réduites »). |
| I2 | **Entrée d'historique à chaque chargement** | `document-filters.tsx` (`useEffect` + `router.push`) | L'effet exécute `router.push` au montage et à chaque changement de `searchParams` : l'historique s'allonge sans action de l'utilisateur (4 entrées après 4 chargements), le bouton Retour devient piégeux. Utiliser `router.replace` et ne pousser que si la valeur a changé. |
| I3 | **Boutons de tri sans état annoncé** | `document-table.tsx` | Aucun `aria-sort` sur les `<th>`, pas d'indicateur de sens (flèche unique `ArrowUpDown`), contrairement à la spec (↓/↑). Le tri n'agit que sur **la page courante** (10 lignes sur 45) et la colonne « Type » trie sur la valeur technique (`PV_RECEPTION`), pas sur le libellé affiché. |
| I4 | **Sélecteurs Type / Phase sans nom accessible** | `document-filters.tsx` | Les deux `combobox` n'ont ni `aria-label` ni `<label>` (seul le placeholder). Le bouton « effacer la recherche » (croix) n'a pas d'`aria-label`. Champ de recherche sans label (placeholder seul). |
| I5 | **Boutons « Actions » identiques dans le tableau** | `document-table.tsx` | Chaque ligne annonce « Actions » sans le nom du document (la carte, elle, annonce « Actions pour <nom> »). |
| I6 | **Bascule Liste/Grille : pas d'état exposé, choix non mémorisé** | `documents-content.tsx` | Pas de `aria-pressed`, cible 69×28 / 72×28 px (< 44 px). Le mode revient à « Liste » à chaque visite. |
| I7 | **Menu d'actions des cartes : cible 24×24 px et invisible au survol seulement** | `document-card.tsx` | `lg:opacity-0 lg:group-hover:opacity-100` : sur écran tactile large (tablette paysage) le menu reste caché ; cible sous 44 px. Le menu de la carte ne contient ni Prévisualiser ni Télécharger (déplacés au pied de carte) → incohérent avec le tableau. |
| I8 | **Téléchargement : feedback trompeur et risque de bloqueur de fenêtres** | `documents-content.tsx:57-69` | `window.open` après un `await` (souvent bloqué par les navigateurs) ; le toast « Téléchargement lancé » s'affiche avant tout téléchargement réel ; aucun état de chargement sur le bouton. |
| I9 | **Message de suppression ambigu** | `documents-content.tsx` | « Cette action peut être annulée (soft delete) » : aucune interface de restauration n'est visible sur la page. Le message promet une annulation que l'utilisateur ne peut pas faire. Reformuler (« Le document sera retiré de la liste ») ou exposer la restauration. |
| I10 | **Écarts à la spec fonctionnelle** | spec OpenSpec | Non présents sur la page : filtre par **marché** (le paramètre `marcheId` existe côté serveur mais n'a aucun contrôle ; il est aussi absent de l'export), colonne **Marché**, **page détail document** (le dossier `[id]` existe mais aucune entrée n'y mène depuis la liste), action « Copier le lien », « Nouvelle version ». |
| I11 | **Aucune alternative au défilement latéral du tableau** | `components/ui/table.tsx` | Conteneur `overflow-auto` sans indice visuel (ombre, scrollbar visible) ni focus clavier sur la zone défilante. |

> I10 est un écart de périmètre. **Tranché le 2026-10-16** : les 5 fonctions de la spec restent voulues (voir la feuille de route, phase 4).
>
> **Avancement au 2026-10-17** : B1 et I2 corrigés (PR #29) ; B2 et I1 corrigés (PR #30), avec un reste connu : à 375 px la pagination (414 px de large) provoque encore 20 px de défilement horizontal. Le reste (I3-I9, I11, I10, cosmétiques) n'est pas traité.

---

## 4. Cosmétique

1. **Libellés anglais** : pagination « Previous / Next », bouton de fermeture du dialogue « Close » (`components/ui/dialog.tsx`, `data-pagination.tsx`) — l'app est en français.
2. **État d'erreur de la page** : conteneur `container mx-auto py-8` différent du reste de l'app ; pas d'icône ni de lien d'aide (le bouton « Réessayer » est correct).
3. **État vide** : simple « Aucun document trouvé », sans icône, sans suggestion (« Effacer les filtres ») ni CTA « Nouveau document ». Dupliqué à l'identique dans la table et dans la grille.
4. **Couleurs en dur** : barres/icônes de type en `blue-400`, `green-500`… (`document-card.tsx`), `bg-primary/8` (valeur non standard Tailwind), `text-stam-accent` côté bouton de carte — hors palette de tokens `globals.css` / `tailwind.config.ts` (déjà identifié comme Lot 15 « couleurs codées en dur » le 2026-09-04).
5. **Skeleton** : ne reflète pas la bascule liste/grille ni la barre de filtres réelle (un seul bloc `h-12`).
6. **Texte de 12 px** (`text-xs`) pour les boutons de carte et la bascule : lisible mais en limite basse de l'échelle typographique convenue (11/13/14/16/…).
7. **Pas de lien d'évitement** (« Aller au contenu ») ni de repère `aria-label` sur la table (pas de `<caption>`).

---

## 5. Conformité aux référentiels

| Critère | Verdict |
|---|---|
| Pas de mode sombre (MVP) | ✅ Respecté (aucune variante `dark:` sur la page) |
| shadcn/ui + Radix, pas de lib UI supplémentaire | ✅ Table, Select, Dropdown, Dialog, AlertDialog, Badge, Skeleton |
| Validation / permissions côté serveur | ✅ `requireAuth`, `canWrite`, `canExport` appliqués dans la page (la vérification dans chaque Server Action n'a pas été auditée ici) |
| États vide / chargement / erreur / succès | 🟠 présents mais minimaux (cf. cosmétique 2, 3, 5) ; succès via toasts, trompeur pour le téléchargement (I8) |
| Contraste WCAG AA | ✅ texte secondaire mesuré ≈ 4,5:1 sur le fond de page (limite) ; non mesuré sur les badges colorés |
| Responsive 1920 / 768 / 375 | ✅ 1920 · 🟠 768 (I1) · 🔴 375 (B2) |
| Navigation clavier | 🟠 composants Radix navigables (menus, dialogue fermé par Échap) ; manques d'étiquettes et d'états (I3-I6, cosmétique 7) |
| Cibles tactiles 44 px | 🟠 OK pour les actions du tableau ; non conformes pour bascule, menu de carte, tri |
| Design system (tokens, `shadow-card`, échelle typo) | 🟠 globalement suivi ; écarts de couleurs en dur (cosmétique 4) |

## 6. Mesures relevées (production)

| Taille | `innerWidth` / `clientWidth` | Largeur table / conteneur | Remarque |
|---|---|---|---|
| 1920×1080 | 1920 / 1914 | 1624 / 1624 | aucun débordement ; bouton Actions 44×44 |
| 768×1024 | 768 / 762 | 897 / 672 | colonnes Taille/Date/Actions coupées |
| 375×667 | **506 / 375** | 897 / 341 | débordement page + table ; bascule à 506 px |

## 7. Ordre de correction suggéré

1. **B1** (liste non rafraîchie) — correctif de quelques lignes, risque métier le plus élevé.
2. **B2 + I1** (vue cartes / colonnes masquées sous `md`, barre d'outils en colonne).
3. **I2** (`router.replace`), **I3-I6** (accessibilité des contrôles) — lot unique.
4. **I8, I9** (feedback de téléchargement, message de suppression).
5. **I10** : décision de périmètre avec Abel avant tout développement.
6. Cosmétique : regrouper avec le Lot 15 existant (tokens) et le lot « libellés français ».
