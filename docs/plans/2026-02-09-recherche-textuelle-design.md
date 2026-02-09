# Design - Recherche Textuelle Globale

**Date** : 2026-02-09
**Priorité** : Sprint 1 - Priorité 3
**Durée estimée** : 2h
**Status** : ✅ Validé

---

## 1. Vue d'ensemble

### Objectif

Ajouter une fonctionnalité de recherche textuelle côté client pour les 4 modules principaux (Marchés, Cautions, Documents, Véhicules) afin d'améliorer l'expérience utilisateur et accélérer la navigation dans les données.

### Décisions d'architecture

- **Approche** : Côté client (filtrage des données déjà chargées)
- **Champs** : Essentiels uniquement par module
- **Intégration** : Dans les composants Filters existants
- **Comportement** : Recherche souple (insensible casse/accents)
- **Feedback** : Intégré aux filtres avec compteur adapté

---

## 2. Architecture Générale

### Vue d'ensemble

Le système de recherche textuelle sera implémenté comme une **amélioration des composants Filters existants** plutôt qu'un système séparé. Chaque module (Marchés, Cautions, Documents, Véhicules) aura son propre composant Filter amélioré avec recherche intégrée.

### Architecture des composants

```
MarcheFilters (client component)
├── SearchInput (composant interne)
│   ├── Input shadcn/ui
│   ├── Search icon (lucide-react)
│   └── Clear button (conditionnel)
├── Filtres existants (Select statut, type, etc.)
└── Compteur de résultats (adapté)
```

### Flux de données

1. **État local** : La valeur de recherche est stockée dans l'état React du composant Filter
2. **Debounce** : Utilise le hook `useDebounce` existant (300ms) pour optimiser les rerenders
3. **URL Sync** : La recherche est synchronisée avec les URL search params (comme les filtres existants)
4. **Filtrage** : Le composant Filter émet un événement via callback vers la page parente qui filtre les données

### Avantages

- **Cohérence** : Même pattern que les filtres existants (statut, type)
- **Performance** : Pas de requêtes API, filtrage instantané
- **Maintenabilité** : Un seul composant par module à maintenir
- **URL shareable** : Les recherches peuvent être partagées via URL

---

## 3. Composant SearchInput et Logique de Recherche

### Intégration dans les Filters

Plutôt que de créer un composant global réutilisable, nous intégrons directement l'input de recherche dans chaque composant Filter. Cela simplifie la gestion d'état et évite la sur-abstraction.

**Structure du composant** :
```tsx
// Dans MarcheFilters.tsx (déjà 'use client')
const [searchQuery, setSearchQuery] = useState('')
const debouncedSearch = useDebounce(searchQuery, 300)

// Synchronisation URL
useEffect(() => {
  const params = new URLSearchParams(searchParams.toString())
  if (debouncedSearch) {
    params.set('search', debouncedSearch)
  } else {
    params.delete('search')
  }
  router.push(`/marches?${params.toString()}`)
}, [debouncedSearch])
```

### Fonction de recherche souple

Fonction utilitaire réutilisable pour normaliser et comparer les textes :

```typescript
// lib/utils/search.ts
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Décompose les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .trim()
}

export function searchInFields(
  item: any,
  fields: string[],
  query: string
): boolean {
  const normalizedQuery = normalizeText(query)
  return fields.some(field => {
    const value = item[field]
    if (!value) return false
    return normalizeText(String(value)).includes(normalizedQuery)
  })
}
```

### Champs de recherche par module

| Module | Champs de recherche |
|--------|---------------------|
| **Marchés** | `['numero', 'objet', 'organismeAcheteur']` |
| **Cautions** | `['numeroCaution', 'banqueEmettrice', 'typeCaution']` |
| **Documents** | `['titre', 'reference', 'typeDocument']` |
| **Véhicules** | `['immatriculation', 'marque', 'modele']` |

---

## 4. Intégration UI dans les Filters

### Modification du composant MarcheFilters

L'input de recherche sera ajouté en **première position** dans le bloc des filtres, avant les selects existants.

**Structure HTML** :
```tsx
<div className="bg-white p-4 rounded-lg border space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-semibold">Filtres</h3>
    {hasFilters && (
      <Button variant="ghost" size="sm" onClick={handleReset}>
        <X className="h-4 w-4 mr-2" />
        Réinitialiser
      </Button>
    )}
  </div>

  {/* NOUVEAU : Barre de recherche */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Rechercher un marché..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-9 pr-9"
    />
    {searchQuery && (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSearchQuery('')}
        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>

  {/* Filtres existants (Select statut, type) */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* ... selects existants ... */}
  </div>

  {/* Compteur adapté */}
  <div className="pt-2 border-t">
    <p className="text-sm text-muted-foreground">
      {/* Affiche "Aucun résultat pour 'xxx'" si recherche active et 0 résultat */}
    </p>
  </div>
</div>
```

### Adaptation du compteur de résultats

Le compteur existant sera enrichi pour afficher :
- Si recherche active ET résultats = 0 : **"Aucun résultat pour 'xxx'"**
- Si recherche active ET résultats > 0 : **"X résultats sur Y"** (comme actuellement)
- Si pas de recherche : comportement actuel

### Réinitialisation

Le bouton "Réinitialiser" existant efface **tous** les filtres ET la recherche.

---

## 5. Filtrage des Données (RSC)

### Modification des pages (Server Components)

Les pages RSC actuelles récupèrent déjà les `searchParams`. Il suffit d'ajouter le paramètre `search` au filtrage existant.

**Dans `app/(dashboard)/marches/page.tsx`** :
```tsx
export default async function MarchesPage({ searchParams }: MarchesPageProps) {
  const allMarches = await getAllMarches()
  const params = await searchParams

  // Filtrage progressif
  let marchesFiltres = allMarches

  // 1. Filtre par statut (existant)
  if (params.statut) {
    marchesFiltres = marchesFiltres.filter(m => m.statut === params.statut)
  }

  // 2. Filtre par type (existant)
  if (params.type) {
    marchesFiltres = marchesFiltres.filter(m => m.type === params.type)
  }

  // 3. NOUVEAU : Filtre par recherche textuelle
  if (params.search) {
    marchesFiltres = marchesFiltres.filter(marche =>
      searchInFields(
        marche,
        ['numero', 'objet', 'organismeAcheteur'],
        params.search
      )
    )
  }

  return (
    // ...
    <MarcheFilters
      totalCount={allMarches.length}
      filteredCount={marchesFiltres.length}
    />
    // ...
  )
}
```

### Interface searchParams mise à jour

```tsx
interface MarchesPageProps {
  searchParams: Promise<{
    statut?: string
    type?: string
    search?: string  // NOUVEAU
  }>
}
```

### Import de la fonction utilitaire

```tsx
import { searchInFields } from '@/lib/utils/search'
```

### Propagation aux exports Excel

Le bouton `ExportExcelButton` doit aussi recevoir le paramètre `search` pour exporter uniquement les résultats filtrés :

```tsx
<ExportExcelButton
  type="marches"
  filters={{
    statut: params.statut,
    type: params.type,
    search: params.search,  // NOUVEAU
  }}
/>
```

---

## 6. Réplication et Tests

### Réplication sur les 4 modules

Chaque module suivra le **même pattern** avec des champs de recherche spécifiques :

#### 1. Marchés (module de référence)
- Champs : `['numero', 'objet', 'organismeAcheteur']`
- Placeholder : "Rechercher un marché..."
- Fichiers :
  - `app/(dashboard)/marches/page.tsx`
  - `components/marches/marche-filters.tsx`

#### 2. Cautions
- Champs : `['numeroCaution', 'banqueEmettrice', 'typeCaution']`
- Placeholder : "Rechercher une caution..."
- Fichiers :
  - `app/(dashboard)/cautions/page.tsx`
  - `components/cautions/caution-filters.tsx`

#### 3. Documents
- Champs : `['titre', 'reference', 'typeDocument']`
- Placeholder : "Rechercher un document..."
- Fichiers :
  - `app/(dashboard)/documents/page.tsx`
  - `components/documents/document-filters.tsx`

#### 4. Véhicules
- Champs : `['immatriculation', 'marque', 'modele']`
- Placeholder : "Rechercher un véhicule..."
- Fichiers :
  - `app/(dashboard)/vehicules/page.tsx`
  - `components/vehicules/vehicule-filters.tsx`

### Ordre d'implémentation recommandé

1. ✅ Créer `lib/utils/search.ts` (fonctions utilitaires)
2. ✅ Modifier `components/marches/marche-filters.tsx` (module de référence)
3. ✅ Modifier `app/(dashboard)/marches/page.tsx` (filtrage RSC)
4. ✅ Tester Marchés (validation pattern)
5. ✅ Répliquer sur Cautions
6. ✅ Répliquer sur Documents
7. ✅ Répliquer sur Véhicules

### Tests à effectuer (avec Playwright)

#### Tests fonctionnels
- ✅ Recherche trouve les résultats attendus
- ✅ Recherche insensible à la casse ("STAM" = "stam")
- ✅ Recherche insensible aux accents ("mairie" trouve "mairie")
- ✅ Recherche partielle fonctionne ("march" trouve "marché")
- ✅ Debounce fonctionne (pas de rerender à chaque frappe)

#### Tests UI
- ✅ Clear button (X) efface la recherche
- ✅ Bouton "Réinitialiser" efface recherche + filtres
- ✅ Icône de recherche (🔍) visible
- ✅ Placeholder correct pour chaque module

#### Tests d'intégration
- ✅ URL contient le paramètre `?search=xxx`
- ✅ URL partageable fonctionne (copier/coller avec search param)
- ✅ Compteur affiche "Aucun résultat pour 'xxx'" si vide
- ✅ Compteur affiche "X résultats sur Y" si résultats
- ✅ Fonctionne en combinaison avec filtres (statut + type + search)

#### Tests d'export
- ✅ Export Excel respecte la recherche active
- ✅ Export Excel + filtres + recherche combinés

---

## 7. Critères de réussite

### Performance
- ✅ Debounce 300ms implémenté
- ✅ Pas de lag lors de la saisie
- ✅ Filtrage instantané après debounce

### UX
- ✅ Interface cohérente sur les 4 modules
- ✅ Feedback visuel clair (compteur, message aucun résultat)
- ✅ Recherche intuitive et tolérante (casse, accents)

### Maintenabilité
- ✅ Fonctions utilitaires réutilisables (`lib/utils/search.ts`)
- ✅ Pattern cohérent sur tous les modules
- ✅ Code DRY (Don't Repeat Yourself)

---

## 8. Fichiers impactés

### Nouveaux fichiers
- `lib/utils/search.ts` - Fonctions utilitaires de recherche
- `docs/plans/2026-02-09-recherche-textuelle-design.md` - Ce document

### Fichiers modifiés
- `components/marches/marche-filters.tsx` - Ajout input de recherche
- `app/(dashboard)/marches/page.tsx` - Ajout filtrage par search
- `components/cautions/caution-filters.tsx` - Ajout input de recherche
- `app/(dashboard)/cautions/page.tsx` - Ajout filtrage par search
- `components/documents/document-filters.tsx` - Ajout input de recherche
- `app/(dashboard)/documents/page.tsx` - Ajout filtrage par search
- `components/vehicules/vehicule-filters.tsx` - Ajout input de recherche
- `app/(dashboard)/vehicules/page.tsx` - Ajout filtrage par search

---

**Design validé le** : 2026-02-09
**Prêt pour implémentation** : ✅
