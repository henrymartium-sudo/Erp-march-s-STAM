# Design : Système de Pagination Réutilisable

**Date** : 2026-02-09
**Sprint** : Sprint 1 - Priorité 4
**Durée estimée** : 3h
**Statut** : ✅ Design validé

---

## 1. Contexte et Objectif

### Problème
Les 4 modules principaux (Marchés, Cautions, Documents, Véhicules) affichent toutes les entrées dans une grille sans pagination. Cela devient difficile à naviguer avec plus de 20 entrées.

### Objectif
Créer un système de pagination réutilisable qui :
- Fonctionne sur les 4 modules existants
- Est compatible avec la recherche textuelle et les filtres actuels
- Synchronise l'état avec l'URL
- Supporte différentes tailles de page (10, 20, 50)
- Prépare la V2 (reporting avancé, analyses comparatives)

### Périmètre
- ✅ Pagination côté client (données chargées entièrement)
- ✅ Hook réutilisable `usePagination`
- ✅ Composant UI `PaginationControls`
- ✅ Intégration dans 4 modules
- ❌ Pagination côté serveur (hors scope MVP)

---

## 2. Architecture Globale

### Approche retenue : Pagination côté client

**Justification** :
- Volumétries actuelles < 500 entrées/module (acceptable en mémoire)
- Compatible avec architecture existante (filtres côté serveur)
- Navigation instantanée entre pages (pas de requête réseau)
- Simple à implémenter et maintenir
- Suffisant pour MVP et V1

**Flux de données** :

```
┌─────────────────────────────────────────────────────┐
│ Server Component (page.tsx)                         │
│ - Charge toutes les données via Prisma              │
│ - Sérialise avec serializeMarche/Caution/etc        │
│ - Applique filtres serveur (statut, type, search)   │
└─────────────────────┬───────────────────────────────┘
                      │ Props: filteredData[]
                      ↓
┌─────────────────────────────────────────────────────┐
│ Client Component (*-filters.tsx)                    │
│ - Gère URL params (page, pageSize)                  │
│ - Affiche sélecteur "Afficher: [20▼]"               │
│ - Affiche compteur résultats                        │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Client Component (*-list.tsx)                       │
│ - Utilise usePagination(totalItems)                 │
│ - Calcule slice(startIndex, endIndex)               │
│ - Affiche items de la page courante                 │
│ - Affiche <PaginationControls />                    │
│ - Gère scroll automatique                           │
└─────────────────────────────────────────────────────┘
```

---

## 3. Composants et Fichiers

### A) Hook `usePagination`

**Fichier** : `hooks/use-pagination.ts`

**Responsabilité** : Encapsuler toute la logique de pagination et synchronisation URL.

**Interface** :

```typescript
interface UsePaginationProps {
  totalItems: number       // Nombre total d'items filtrés
  defaultPageSize?: number // 20 par défaut
}

interface UsePaginationReturn {
  // État
  currentPage: number      // Page actuelle (1-indexed)
  pageSize: number         // Taille de page (10/20/50)
  totalPages: number       // Nombre total de pages

  // Calculs
  startIndex: number       // Index début pour slice() (0-indexed)
  endIndex: number         // Index fin pour slice() (0-indexed)

  // Actions
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  goToFirstPage: () => void
  goToLastPage: () => void
  goToNextPage: () => void
  goToPreviousPage: () => void

  // État navigation
  canGoNext: boolean
  canGoPrevious: boolean
}
```

**Logique clé** :

1. **Lecture URL au montage** :
   ```typescript
   const searchParams = useSearchParams()
   const pageParam = Number(searchParams.get('page')) || 1
   const pageSizeParam = Number(searchParams.get('pageSize')) || defaultPageSize
   ```

2. **Calculs automatiques** :
   ```typescript
   const totalPages = Math.ceil(totalItems / pageSize)
   const startIndex = (currentPage - 1) * pageSize
   const endIndex = Math.min(startIndex + pageSize, totalItems)
   ```

3. **Synchronisation URL** :
   ```typescript
   const updateURL = (page: number, size: number) => {
     const params = new URLSearchParams(searchParams.toString())
     params.set('page', page.toString())
     params.set('pageSize', size.toString())
     router.push(`${pathname}?${params.toString()}`)
   }
   ```

4. **Reset automatique si filtres changent** :
   ```typescript
   useEffect(() => {
     // Si totalItems change (filtres modifiés), reset à page 1
     if (currentPage > totalPages && totalPages > 0) {
       setPage(1)
     }
   }, [totalItems])
   ```

5. **Validation pageSize** :
   ```typescript
   const validPageSizes = [10, 20, 50]
   const finalPageSize = validPageSizes.includes(pageSizeParam)
     ? pageSizeParam
     : 20
   ```

---

### B) Composant `PaginationControls`

**Fichier** : `components/ui/pagination-controls.tsx`

**Responsabilité** : Afficher les contrôles de navigation (← 1 2 3 ... 8 →).

**Props** :

```typescript
interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  canGoPrevious: boolean
  canGoNext: boolean
  className?: string
}
```

**Affichage intelligent** :

| Cas | Affichage |
|-----|-----------|
| ≤ 7 pages | `[← 1 2 3 4 5 6 7 →]` (tous les numéros) |
| > 7 pages, début | `[← 1 2 3 ... 12 →]` |
| > 7 pages, milieu | `[← 1 ... 5 6 7 ... 12 →]` |
| > 7 pages, fin | `[← 1 ... 10 11 12 →]` |

**Implémentation avec shadcn/ui** :

```typescript
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

export function PaginationControls({ currentPage, totalPages, onPageChange, ... }) {
  // Logique de calcul des numéros à afficher
  const pageNumbers = calculatePageNumbers(currentPage, totalPages)

  return (
    <Pagination>
      <PaginationContent>
        <PaginationPrevious
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
        />

        {pageNumbers.map((num, idx) =>
          num === '...' ? (
            <PaginationEllipsis key={`ellipsis-${idx}`} />
          ) : (
            <PaginationItem key={num}>
              <PaginationLink
                onClick={() => onPageChange(num)}
                isActive={num === currentPage}
              >
                {num}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationNext
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
        />
      </PaginationContent>
    </Pagination>
  )
}
```

**Responsive** :

Sur mobile (< 768px), affichage simplifié :
```
[← Précédent]  Page 2 / 12  [Suivant →]
```

---

### C) Modifications `*-filters.tsx`

**Fichiers** :
- `components/marches/marche-filters.tsx`
- `components/cautions/caution-filters.tsx`
- `components/documents/document-filters.tsx`
- `components/vehicules/vehicule-filters.tsx`

**Changements** :

1. **Import du hook** :
   ```typescript
   import { useRouter, useSearchParams } from 'next/navigation'
   ```

2. **Lecture pageSize** :
   ```typescript
   const pageSize = Number(searchParams.get('pageSize')) || 20
   ```

3. **Handler changement** :
   ```typescript
   const handlePageSizeChange = (value: string) => {
     const params = new URLSearchParams(searchParams.toString())
     params.set('pageSize', value)
     params.delete('page') // Reset page à 1
     router.push(`/marches?${params.toString()}`)
   }
   ```

4. **UI dans la zone résultats** :
   ```typescript
   <div className="pt-2 border-t flex items-center justify-between">
     {/* Compteur existant (gauche) */}
     <p className="text-sm text-muted-foreground">
       {filteredCount} résultat{filteredCount > 1 ? 's' : ''} sur {totalCount}
     </p>

     {/* NOUVEAU : Sélecteur taille (droite) */}
     <div className="flex items-center gap-2">
       <span className="text-sm text-muted-foreground">Afficher</span>
       <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
         <SelectTrigger className="w-[70px] h-8">
           <SelectValue />
         </SelectTrigger>
         <SelectContent>
           <SelectItem value="10">10</SelectItem>
           <SelectItem value="20">20</SelectItem>
           <SelectItem value="50">50</SelectItem>
         </SelectContent>
       </Select>
     </div>
   </div>
   ```

---

### D) Modifications `*-list.tsx`

**Fichiers** :
- `components/marches/marche-list.tsx`
- `components/cautions/caution-list.tsx`
- `components/documents/document-list.tsx`
- `components/vehicules/vehicule-list.tsx`

**Changements** :

1. **Imports** :
   ```typescript
   import { useRef, useEffect } from 'react'
   import { usePagination } from '@/hooks/use-pagination'
   import { PaginationControls } from '@/components/ui/pagination-controls'
   ```

2. **Utilisation du hook** :
   ```typescript
   export function MarcheList({ marches }: MarcheListProps) {
     const listRef = useRef<HTMLDivElement>(null)

     const {
       currentPage,
       pageSize,
       totalPages,
       startIndex,
       endIndex,
       setPage,
       canGoPrevious,
       canGoNext
     } = usePagination({
       totalItems: marches.length
     })
   ```

3. **Scroll automatique** :
   ```typescript
   useEffect(() => {
     if (listRef.current) {
       listRef.current.scrollIntoView({
         behavior: 'smooth',
         block: 'start'
       })
     }
   }, [currentPage])
   ```

4. **Slicing des données** :
   ```typescript
   // Tri existant conservé
   const marchesTries = [...marches].sort((a, b) => {
     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
   })

   // NOUVEAU : Pagination
   const paginatedMarches = marchesTries.slice(startIndex, endIndex)
   ```

5. **Rendu avec pagination** :
   ```typescript
   return (
     <div ref={listRef} className="space-y-6">
       {/* État vide (inchangé) */}
       {paginatedMarches.length === 0 ? (
         <EmptyState />
       ) : (
         <>
           {/* Grille avec items paginés */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {paginatedMarches.map((marche) => (
               <MarcheCard key={marche.id} marche={marche} />
             ))}
           </div>

           {/* NOUVEAU : Contrôles pagination (masqué si ≤ 1 page) */}
           {totalPages > 1 && (
             <PaginationControls
               currentPage={currentPage}
               totalPages={totalPages}
               onPageChange={setPage}
               canGoPrevious={canGoPrevious}
               canGoNext={canGoNext}
             />
           )}
         </>
       )}
     </div>
   )
   ```

---

## 4. Comportements UX

### A) Changement de filtres ou recherche

**Comportement** : Reset automatique à la page 1

**Justification** :
- Standard web (Google, Amazon, etc.)
- Évite confusion (page vide si résultats < page actuelle)
- Prévisible pour l'utilisateur

**Implémentation** :
```typescript
// Dans handleStatutChange, handleTypeChange, etc.
const params = new URLSearchParams(searchParams.toString())
params.set('statut', value)
params.delete('page') // Reset page à 1
router.push(`/marches?${params.toString()}`)
```

### B) Changement de pageSize

**Comportement** : Reset automatique à la page 1

**Justification** :
- Recalcul du nombre total de pages
- Page courante peut devenir invalide
- Simple et cohérent

### C) Scroll automatique

**Comportement** : Scroll en haut de la grille (pas tout en haut de page)

**Justification** :
- Utilisateur voit immédiatement les nouveaux résultats
- Garde les filtres visibles (pas de scroll jusqu'au header)
- Standard UX (Amazon, etc.)

**Implémentation** : `scrollIntoView({ behavior: 'smooth', block: 'start' })`

### D) URL directe avec params

**Comportement** : Respecte les params URL (`?page=3&pageSize=50`)

**Validation** :
- Si page > totalPages → Redirige vers dernière page
- Si pageSize invalide → Fallback sur 20
- Si params manquants → Utilise valeurs par défaut

---

## 5. Cas Limites et Validation

### A) Cas limites gérés

| Cas | Comportement |
|-----|--------------|
| Liste vide (0 items) | Pas de pagination affichée, état vide standard |
| 1 seule page | Pagination masquée (totalPages ≤ 1) |
| Page invalide dans URL | Reset automatique à page 1 |
| PageSize invalide | Fallback sur 20 |
| Changement filtres | Reset page 1 + recalcul totalPages |
| Page > totalPages | Redirige vers dernière page disponible |

### B) Validation usePagination

```typescript
// Validation page
useEffect(() => {
  if (currentPage > totalPages && totalPages > 0) {
    setPage(Math.min(currentPage, totalPages))
  }
}, [totalPages, currentPage])

// Validation pageSize
const VALID_PAGE_SIZES = [10, 20, 50]
const validatedPageSize = VALID_PAGE_SIZES.includes(pageSizeParam)
  ? pageSizeParam
  : 20
```

### C) Performance

- **Pas de re-fetch serveur** : Données déjà en mémoire
- **Calculs optimisés** : `useMemo` pour totalPages, startIndex, endIndex
- **Re-render minimal** : Seulement `*-list.tsx` re-render à chaque changement page
- **Volumétries supportées** : < 1000 entrées par module (largement suffisant pour MVP)

---

## 6. Tests de Validation

### A) Scénarios Playwright à implémenter

**Fichier** : `tests/pagination/pagination-validation.spec.ts`

**10 scénarios de test** :

1. **PAG-01 : Navigation basique**
   - Visiter `/marches`
   - Créer 25 marchés (pour avoir 2 pages avec pageSize=20)
   - Vérifier affichage page 1 (20 items)
   - Cliquer page 2
   - Vérifier affichage page 2 (5 items)

2. **PAG-02 : Changement pageSize**
   - PageSize par défaut = 20
   - Changer à 10
   - Vérifier URL `?pageSize=10`
   - Vérifier affichage 10 items
   - Changer à 50
   - Vérifier tous les items affichés (1 seule page)

3. **PAG-03 : Reset page sur filtre**
   - Page 2 active
   - Changer filtre statut
   - Vérifier retour page 1
   - Vérifier URL `?page=1`

4. **PAG-04 : Reset page sur recherche**
   - Page 3 active
   - Rechercher "test"
   - Vérifier retour page 1
   - Vérifier résultats filtrés

5. **PAG-05 : URL directe avec params**
   - Visiter `/marches?page=2&pageSize=10`
   - Vérifier page 2 affichée
   - Vérifier pageSize=10 appliqué

6. **PAG-06 : Scroll automatique**
   - Scroller en bas de page 1
   - Cliquer page 2
   - Vérifier scroll remonte en haut de grille

7. **PAG-07 : Navigation prev/next**
   - Bouton Previous désactivé sur page 1
   - Cliquer Next → Page 2
   - Cliquer Previous → Page 1
   - Vérifier boutons activés/désactivés

8. **PAG-08 : Pagination masquée si ≤ 1 page**
   - Liste avec 5 items (pageSize=20)
   - Vérifier contrôles pagination absents

9. **PAG-09 : Export Excel (tous les items)**
   - Page 2 active
   - Cliquer "Exporter Excel"
   - Vérifier export contient TOUS les marchés (pas seulement page 2)

10. **PAG-10 : Responsive mobile**
    - Viewport 375x667 (mobile)
    - Vérifier contrôles simplifiés
    - Navigation fonctionnelle

### B) Tests manuels

- ✅ Navigation fluide entre pages
- ✅ Pas de flash de contenu
- ✅ URL synchronisée en temps réel
- ✅ Boutons disabled aux extrémités
- ✅ Sélecteur pageSize fonctionnel
- ✅ Compteur résultats cohérent
- ✅ Scroll automatique smooth

---

## 7. Plan d'Implémentation

### Phase 1 : Hook et composant UI (1h)

1. ✅ Créer `hooks/use-pagination.ts`
   - Logique pagination
   - Synchronisation URL
   - Validation

2. ✅ Créer `components/ui/pagination-controls.tsx`
   - Utiliser shadcn/ui Pagination
   - Logique affichage intelligent
   - Responsive

3. ✅ Tests unitaires hook (optionnel pour MVP)

### Phase 2 : Intégration Marchés (45 min)

4. ✅ Modifier `components/marches/marche-filters.tsx`
   - Ajouter sélecteur pageSize

5. ✅ Modifier `components/marches/marche-list.tsx`
   - Utiliser usePagination
   - Ajouter PaginationControls
   - Scroll automatique

6. ✅ Test manuel module Marchés

### Phase 3 : Réplication autres modules (1h)

7. ✅ Appliquer à Cautions (15 min)
8. ✅ Appliquer à Documents (15 min)
9. ✅ Appliquer à Véhicules (15 min)
10. ✅ Tests manuels 3 modules (15 min)

### Phase 4 : Tests et validation (15 min)

11. ✅ Tests Playwright (scénarios critiques)
12. ✅ Validation responsive
13. ✅ Test export Excel (cohérence)

**Durée totale estimée** : **3h**

---

## 8. Décisions de Design

### Décision 1 : Pagination côté client

**Options considérées** :
- A) Pagination côté client ✅ **RETENU**
- B) Pagination côté serveur
- C) Approche hybride

**Justification** :
- Volumétries actuelles < 500 entrées/module
- Architecture existante compatible
- Navigation instantanée
- Simplicité d'implémentation
- Suffisant pour MVP et V1

### Décision 2 : Taille variable (10, 20, 50)

**Options considérées** :
- A) Taille fixe de 20
- B) Taille variable (10, 20, 50) ✅ **RETENU**
- C) Taille + option "Tout afficher"

**Justification** :
- Aligné avec vision V2 (analyses comparatives)
- Exploitabilité des données (Principe #2 PRD)
- Facilite reporting avancé
- Coût implémentation faible
- Évite refactorisation future

### Décision 3 : Placement UI

**Options considérées** :
- A) Sélecteur dans filtres, pagination en bas ✅ **RETENU**
- B) Approche séparée
- C) Tout en bas

**Justification** :
- Cohérent avec zone filtres existante
- Séparation claire contrôles/affichage
- Standard UX

### Décision 4 : Contrôles complets avec numéros

**Options considérées** :
- A) Complet avec numéros ✅ **RETENU**
- B) Simple prev/next + indicateur
- C) Hybrid (prev/next + input)

**Justification** :
- Navigation directe vers n'importe quelle page
- Idéal pour analyses/reporting V2
- Shadcn/ui a ce composant prêt
- Visibilité totale nombre de pages

### Décision 5 : Reset page sur changement filtre

**Options considérées** :
- A) Reset automatique à page 1 ✅ **RETENU**
- B) Maintenir page courante
- C) Reset seulement pour recherche

**Justification** :
- Comportement standard web
- Prévisible et simple
- Évite confusion (page vide)

### Décision 6 : Scroll automatique en haut de grille

**Options considérées** :
- A) Scroll en haut de grille ✅ **RETENU**
- B) Pas de scroll automatique
- C) Scroll en haut de page complète

**Justification** :
- Standard UX (Amazon, Google)
- Garde filtres visibles
- Utilisateur voit immédiatement nouveaux résultats

---

## 9. Impacts et Considérations

### A) Compatibilité

- ✅ Compatible avec recherche textuelle existante (debounce 300ms)
- ✅ Compatible avec filtres statut/type
- ✅ Compatible avec export Excel (exporte TOUT)
- ✅ Compatible avec sérialisation Prisma existante
- ✅ Compatible avec Next.js 15 (async params, RSC)

### B) Performance

- **Chargement initial** : Inchangé (toutes les données chargées)
- **Navigation pages** : Instantanée (pas de requête réseau)
- **Mémoire** : ~50-100 Ko par module (acceptable)
- **Re-render** : Minimal (seulement *-list.tsx)

### C) Maintenance

- **Code réutilisable** : Hook + composant utilisés 4 fois
- **Pattern cohérent** : Identique sur tous les modules
- **Testabilité** : Hook isolé facile à tester
- **Documentation** : Ce document + commentaires code

### D) Evolution V2

Cette implémentation pose les bases pour :
- Tableaux de bord personnalisables (préférences pageSize)
- Reporting avancé (ajustement granularité)
- Comparaisons multi-annuelles (50 items pour analyses)
- Filtres avancés (pagination s'adapte automatiquement)

---

## 10. Checklist de Validation

Avant de considérer la fonctionnalité complète :

**Implémentation** :
- [ ] Hook `usePagination` créé et testé
- [ ] Composant `PaginationControls` créé
- [ ] Intégration Marchés complète
- [ ] Intégration Cautions complète
- [ ] Intégration Documents complète
- [ ] Intégration Véhicules complète

**Tests fonctionnels** :
- [ ] Navigation entre pages fluide
- [ ] Changement pageSize fonctionnel
- [ ] Reset page sur filtre/recherche
- [ ] URL synchronisée correctement
- [ ] Scroll automatique opérationnel
- [ ] Boutons prev/next disabled aux extrémités
- [ ] Pagination masquée si ≤ 1 page
- [ ] Export Excel exporte TOUT (pas juste page)

**Tests non-fonctionnels** :
- [ ] Responsive desktop (1920x1080)
- [ ] Responsive tablette (768x1024)
- [ ] Responsive mobile (375x667)
- [ ] Performance acceptable (< 100ms changement page)
- [ ] Pas de flash de contenu
- [ ] Accessibilité clavier (Tab + Enter)

**Documentation** :
- [ ] Code commenté
- [ ] Design document validé (ce fichier)
- [ ] SESSION.md mis à jour

---

## 11. Risques et Mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Performance dégradée avec >1000 entrées | Moyen | Faible | Volumétries MVP < 500. Si besoin V2, migrer côté serveur |
| Incohérence URL si navigation navigateur | Faible | Faible | Hook lit URL au montage, se synchronise automatiquement |
| Flash de contenu au changement page | Faible | Moyen | Scroll automatique smooth + React transition |
| Export Excel n'exporte que la page | Élevé | Moyen | ✅ Export utilise données complètes (pas slice) |

---

## 12. Références

- **PRD.md** - Vision V2 : Piloter et décider
- **ARCHITECTURE.md** - Patterns Next.js 15 et conventions
- **SESSION.md** - Historique développement et leçons apprises
- **docs/plans/2026-02-09-recherche-textuelle-design.md** - Pattern similaire (debounce + URL sync)

---

**FIN DU DOCUMENT DE DESIGN** ✅

**Prochaine étape** : Implémentation selon le plan Phase 1-4 (durée estimée 3h)
