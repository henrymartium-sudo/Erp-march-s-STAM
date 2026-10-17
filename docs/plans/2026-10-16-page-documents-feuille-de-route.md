# Feuille de route — Page « Documents & Médias »

**Date** : 2026-10-16 · **Statut** : proposée, à valider phase par phase
**Source** : `docs/audit/2026-10-16-audit-page-documents.md` (identifiants B1, B2, I1-I11).
**Décisions d'Abel (2026-10-16)** : les 5 fonctions de la spec OpenSpec `module-documents-medias` restent voulues ; l'export suit l'option B (« comme Opportunités ») ; l'option C (export de sélection) est reportée à un besoin confirmé.

Règles communes : une phase = une branche (`/branche`) + une PR ; test Playwright aux 3 tailles (1920×1080, 768×1024, 375×667) en fin de phase ; aucun déploiement ni migration sans accord explicite ; aucune donnée réelle dans les tests.

---

## Phase 1 — Fiabilité de la liste (B1, I2)
- Supprimer la copie des documents dans un état local ; la liste suit toujours les paramètres d'URL (recherche, type, phase, page).
- Les filtres utilisent `router.replace` et ne naviguent que si la valeur change.
- **Critères** : une recherche sans résultat affiche 0 ligne et l'état vide ; changer de page change les lignes ; le bouton Retour ne rejoue plus les filtres ; une suppression retire bien la ligne.
- **Dépendances** : aucune. **Risque** : faible.

## Phase 2 — Responsive et accessibilité (B2, I1, I3-I7, I11, cosmétiques 1, 7)
- Sous `md` : vue cartes automatique ; barre d'outils en colonne ; aucun débordement (`innerWidth` = `clientWidth` à 375 px).
- Tablette : colonnes Taille/Date masquées sous `lg` ou repliées sous le nom.
- Tri : `aria-sort`, flèche de sens, tri sur le libellé du type ; décision sur le tri global (serveur) à prendre.
- Noms accessibles (selects, croix, « Actions pour <nom> »), `aria-pressed` sur la bascule, cibles ≥ 44 px, mode de vue mémorisé, libellés français (« Précédent / Suivant », « Fermer »).
- **Critères** : mesures de l'audit §6 à zéro débordement ; parcours clavier complet ; menu d'actions accessible en tactile.
- **Dépendances** : Phase 1.

## Phase 3 — Retours utilisateur (I8, I9, cosmétiques 2-3, 5)
- Téléchargement : état de chargement, toast seulement après succès, repli si fenêtre bloquée.
- Message de suppression reformulé (ou restauration exposée, à décider).
- États vide/erreur harmonisés (icône, « Effacer les filtres », CTA).
- **Dépendances** : Phase 1.

## Phase 4 — Fonctions de la spec (I10)
Ordre proposé, chacune livrable seule :
1. **Filtre par marché** + colonne **Marché** (transmettre aussi `marcheId` à l'export).
2. **Page détail document** (`/documents/[id]`) accessible depuis la liste ; marché lié cliquable ; historique des versions.
3. **Copier le lien** dans le menu d'actions.
4. **Nouvelle version** depuis la liste (écriture : confirmation, journal d'audit, permissions `canWrite`).
- **Critères** : scénarios correspondants de la spec passent ; rôles respectés (VISITEUR en lecture seule).
- **Dépendances** : Phases 1-2 ; la page détail et « Nouvelle version » touchent le stockage → relire la sécurité des Server Actions avant.

## Phase 5 — Export option B
- Excel : mêmes règles que #17 (largeurs fixées une fois, « n.d. », ligne « Aucune donnée »), taille en nombre, tous les filtres de la liste repris (recherche, marché).
- Feuille 2 « Récapitulatif » : documents par type, par phase, par marché.
- Documents arrivant à échéance (`dateValidite`) signalés.
- PDF avec le modal existant (orientation, aperçu), comme les Opportunités.
- **Critères** : le nombre de lignes exportées = le compteur de la liste filtrée ; fichier ouvert sans « ####### » ; export vide géré ; plafond `EXPORT_MAX_ROWS` signalé à l'utilisateur.
- **Dépendances** : Phase 4.1 (filtre marché).

## Reporté
- **Option C** : export de sélection / téléchargement groupé (activer la sélection déjà codée dans `DocumentTable`).
- Cosmétiques 4 et 6 (couleurs en dur, taille 12 px) : rattachés au lot « tokens » existant de l'audit du 2026-09-04.

## Points à trancher avec Abel avant la phase concernée
1. Phase 2 : tri limité à la page courante ou tri global côté serveur ?
2. Phase 3 : restauration d'un document supprimé exposée à l'écran, ou message reformulé seulement ?
3. Phase 4 : « Nouvelle version » depuis la liste, ou uniquement depuis la page détail ?
