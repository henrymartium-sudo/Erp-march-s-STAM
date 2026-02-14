# 🔄 Guide de Reprise - Pagination (2/4 modules restants)

**Session précédente** : 2026-02-14 (3h20)
**Agent ID pour reprendre** : `a3119af`
**Snapshot complet** : `.claude/agents/context-continuity-manager.md`

---

## ✅ Déjà Terminé (2/4 modules)

- **Marchés** : Pagination complète (backend + frontend) ✅
- **Cautions** : Pagination complète (backend + frontend) ✅
- **Production** : https://erp-marches-stam.vercel.app ✅
- **Tests** : Validés en production ✅

---

## ⏸️ À Faire (2/4 modules)

### 1. Module Documents (20 min estimées)

**Backend** : `lib/actions/documents.ts`
```typescript
// Ajouter imports
import type { PaginatedResponse } from '@/types/pagination'
import { calculatePagination, getPrismaSkipTake } from '@/lib/utils/pagination'

// Modifier getDocuments() selon pattern marchés/cautions
// Ajouter getDocumentsArray() wrapper
```

**Frontend** : `app/(dashboard)/documents/page.tsx`
```typescript
import { DataPagination } from '@/components/ui/data-pagination'
import { shouldShowPagination } from '@/lib/utils/pagination'

// Ajouter page aux searchParams
// Utiliser DataPagination en bas de page
```

### 2. Module Véhicules (20 min estimées)

Même pattern que Documents.

### 3. Tests E2E (20 min estimées)

- Tester navigation pages (1→2→3)
- Vérifier edge cases (page > max, page négative)
- Valider conservation filtres + page
- Tester exports Excel (doivent ignorer pagination)

---

## 🚀 Commandes Reprise

### Option 1 : Reprendre avec Claude

```
Reprends la session de pagination avec l'agent a3119af
```

### Option 2 : Référencer le snapshot

```
Lis le fichier .claude/agents/context-continuity-manager.md et continue l'implémentation de la pagination
```

### Option 3 : Manuel (suivre le pattern)

Ouvrir `.claude/agents/context-continuity-manager.md` section "Pattern Backend Complet" et "Pattern Frontend Complet", puis appliquer sur Documents et Véhicules.

---

## 📋 Checklist Complète

- [ ] **Documents Backend** : Modifier `getDocuments()` + ajouter `getDocumentsArray()`
- [ ] **Documents Frontend** : Adapter page avec `DataPagination`
- [ ] **Documents Tests** : `npx tsc --noEmit` → 0 erreurs
- [ ] **Véhicules Backend** : Modifier `getVehicules()` + ajouter `getVehiculesArray()`
- [ ] **Véhicules Frontend** : Adapter page avec `DataPagination`
- [ ] **Véhicules Tests** : `npx tsc --noEmit` → 0 erreurs
- [ ] **Commit** : `feat(pagination): Modules Documents + Véhicules`
- [ ] **Push** : `git push origin main`
- [ ] **Deploy** : `vercel --prod`
- [ ] **Tests E2E** : Tester 4 modules en production
- [ ] **Documentation** : Mettre à jour SESSION.md
- [ ] **Cleanup** : Supprimer `marche-pagination.tsx` (redondant)

---

## 📊 État Actuel

| Fichier | Statut |
|---------|--------|
| `lib/constants/pagination.ts` | ✅ Créé |
| `types/pagination.ts` | ✅ Créé |
| `lib/utils/pagination.ts` | ✅ Créé |
| `components/ui/data-pagination.tsx` | ✅ Créé (réutilisable) |
| `lib/actions/marches.ts` | ✅ Modifié |
| `lib/actions/cautions.ts` | ✅ Modifié |
| `lib/actions/documents.ts` | ⏸️ À modifier |
| `lib/actions/vehicules.ts` | ⏸️ À modifier |

---

## 🎯 Temps Estimé Restant

- **Documents** : 20 min
- **Véhicules** : 20 min
- **Tests E2E** : 20 min
- **Documentation** : 10 min
- **TOTAL** : ~70 min (1h10)

---

**Production actuelle** : https://erp-marches-stam.vercel.app
**Derniers commits** : `3d31fd2`, `5eff5de` (pagination Marchés + Cautions)
**Branche** : `main`
