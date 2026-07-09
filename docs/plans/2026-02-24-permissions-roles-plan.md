mettons a /re# Plan d'implémentation — Rôles & Permissions complets
**Date** : 2026-02-24
**Contexte** : Audit complet réalisé. Ce plan récapitule ce qui est fait, ce qui manque, et les tâches à implémenter dans l'ordre.

---

## Rappel de la matrice cible

```
                 Marchés   Cautions   Véhicules   SAV (interventions)   Documents   Admin
ADMIN              ✅         ✅          ✅               ✅                ✅          ✅
AVANCE             ✅         ✅          ✅               ✅*               ✅          ❌
EXPLOITATION    EN_EXEC       ❌          ❌ lecture       ✅**              ✅ upload   ❌
VISITEUR        lecture    lecture      lecture           lecture          lecture      ❌

*  AVANCE : commentaire contractuel + suppression intervention
** EXPLOITATION : signaler + avancer statuts — pas supprimer, pas commenter contractuellement
```

---

## CE QUI EST DÉJÀ FAIT ✅

### Backend — Server Actions (100% correct)

| Guard | Fonction | Modules protégés |
|-------|----------|-----------------|
| `requireMarcheWrite()` | ADMIN + AVANCE | createVehicule, updateVehicule |
| `requireDelete()` | ADMIN + AVANCE | deleteVehicule, deleteIntervention |
| `canWriteSAV(role)` | ADMIN + AVANCE + EXPLOITATION | createIntervention, updateInterventionStatut |
| `canWriteCommentaireContractuel(role)` | ADMIN + AVANCE | updateCommentaireContractuel |
| Guard redirect rôle | ADMIN + AVANCE | cautions/nouvelle/page.tsx, cautions/[id]/edit/page.tsx |

### helpers `lib/utils/permissions.ts` (complets)

- `requireAuth()` — async, session requise
- `requireRole(roles[])` — async, vérif rôle
- `requireAdmin()` — async, ADMIN only
- `requireMarcheWrite()` — async, ADMIN + AVANCE
- `requireDelete()` — async, ADMIN + AVANCE
- `requireRead()` — async, tous authentifiés
- `canWrite(role?)` — sync, ADMIN || AVANCE
- `isExploitation(role?)` — sync, EXPLOITATION
- `canWriteSAV(role?)` — sync, ADMIN || AVANCE || EXPLOITATION
- `canWriteCommentaireContractuel(role?)` — sync, ADMIN || AVANCE

### UI déjà protégée

- **Marchés** — filtre EN_EXECUTION pour EXPLOITATION (backend + frontend) ✅
- **Marchés** — boutons "Nouveau marché" + actions cachés si !canWrite ✅
- **Cautions** — bouton "+ Nouvelle caution" conditionnel (canWrite) ✅
- **Cautions** — page `/cautions/nouvelle` redirige si !ADMIN && !AVANCE ✅
- **Cautions** — page `/cautions/[id]/edit` redirige si !ADMIN && !AVANCE ✅
- **Cautions** — détail : showActions/onEdit/onDelete passés si canWrite ✅
- **Véhicules** — bouton "+ Nouveau véhicule" conditionnel (canWrite) ✅
- **SAV InterventionsTable** — props `canWrite` + `canDelete` correctement gérées ✅
- **SAV** — bouton "Signaler" conditionnel (canWriteSAV) ✅

---

## CE QUI RESTE À FAIRE ❌

### BLOC 1 — Pages Véhicules (guard rôle manquant) — CRITIQUE

**Problème** : Les pages `/vehicules/nouveau` et `/vehicules/[id]/edit` n'ont aucun guard rôle côté serveur. Un EXPLOITATION ou VISITEUR peut y accéder directement via URL.

#### T1 — Guard rôle `/vehicules/nouveau/page.tsx`
```tsx
// Ajouter après requireAuth()
const role = session.user?.role;
if (!canWrite(role)) {
  redirect('/vehicules');
}
```
**Fichier** : `app/(dashboard)/vehicules/nouveau/page.tsx`

#### T2 — Guard rôle `/vehicules/[id]/edit/page.tsx`
```tsx
// Ajouter après requireAuth()
const role = session.user?.role;
if (!canWrite(role)) {
  redirect(`/vehicules/${id}`);
}
```
**Fichier** : `app/(dashboard)/vehicules/[id]/edit/page.tsx`

---

### BLOC 2 — Props permissions manquantes (UI véhicules) — CRITIQUE

**Problème** : `vehicule-detail.tsx` a `canWrite = true` par défaut. Les pages serveur ne passent pas les props de permission à VehiculeDetail ni à VehiculeList.

#### T3 — Corriger défaut dangereux dans `vehicule-detail.tsx`
```tsx
// AVANT (faille)
export function VehiculeDetail({
  canWrite = true,   // ← DANGER
  ...
})

// APRÈS
export function VehiculeDetail({
  canWrite = false,  // ← sécurisé
  ...
})
```
**Fichier** : `components/vehicules/vehicule-detail.tsx`

#### T4 — Passer props permission depuis `/vehicules/[id]/page.tsx`
La page serveur doit calculer les permissions et les passer à `<VehiculeDetail>` :
```tsx
const role = session?.user?.role;
const userCanWrite = canWrite(role);
const userCanWriteSAV = canWriteSAV(role);
const userCanWriteCommentaire = canWriteCommentaireContractuel(role);
const userCanDelete = canWrite(role); // même niveau que canWrite

// Puis passer à VehiculeDetail :
<VehiculeDetail
  vehicule={vehicule}
  canWrite={userCanWrite}
  canWriteSAV={userCanWriteSAV}
  canWriteCommentaire={userCanWriteCommentaire}
  canDelete={userCanDelete}
/>
```
**Fichier** : `app/(dashboard)/vehicules/[id]/page.tsx`

#### T5 — Ajouter prop `canWrite` à `vehicule-list.tsx` + masquer bouton
Le composant VehiculeList affiche un bouton "+ Ajouter un véhicule" pour tous.
```tsx
// Ajouter prop canWrite dans l'interface
interface VehiculeListProps {
  vehicules: SerializedVehicule[];
  canWrite?: boolean; // ← AJOUTER
  ...
}

// Conditionner le bouton "+ Ajouter"
{canWrite && (
  <Link href="/vehicules/nouveau">
    <Button>+ Ajouter un véhicule</Button>
  </Link>
)}
```
**Fichier** : `components/vehicules/vehicule-list.tsx`

#### T6 — Passer `canWrite` à VehiculeList depuis `/vehicules/page.tsx`
```tsx
<VehiculeList
  vehicules={vehicules}
  canWrite={userCanWrite}  // ← AJOUTER
  ...
/>
```
**Fichier** : `app/(dashboard)/vehicules/page.tsx`

---

### BLOC 3 — Export menus sans protection — MOYEN

**Problème** : Les menus d'export (PDF/Excel) sont visibles pour TOUS les rôles, y compris VISITEUR. Selon la matrice cible, seuls ADMIN et AVANCE peuvent exporter.

#### T7 — Conditionner ExportMenu sur `/vehicules/page.tsx`
```tsx
{userCanWrite && (
  <ExportMenu type="vehicules" ... />
)}
```
**Fichier** : `app/(dashboard)/vehicules/page.tsx`

#### T8 — Conditionner ExportMenu sur `/cautions/page.tsx`
```tsx
{userCanWrite && (
  <ExportMenu type="cautions" ... />
)}
```
**Fichier** : `app/(dashboard)/cautions/page.tsx`

#### T9 — Conditionner ExportMenu sur `/documents/page.tsx`
```tsx
{userCanWrite && (
  <ExportMenu type="documents" ... />
)}
```
**Fichier** : `app/(dashboard)/documents/page.tsx`

#### T10 — Conditionner ExportMenu sur `/marches/page.tsx`
Vérifier si déjà fait. Si non, appliquer le même pattern.
**Fichier** : `app/(dashboard)/marches/page.tsx`

---

### BLOC 4 — Documents delete button — MOYEN

**Problème** : `document-table.tsx` reçoit `onDelete` sans vérification de rôle. Vérifier que la page passe `onDelete` uniquement si `canWrite`.

#### T11 — Vérifier/corriger `documents/page.tsx`
```tsx
// Ne passer onDelete que si canWrite
<DocumentTable
  documents={documents}
  onDelete={userCanWrite ? handleDelete : undefined}
  onUpload={userCanWrite ? handleUpload : undefined}
/>
```
**Fichier** : `app/(dashboard)/documents/page.tsx` et composant `DocumentsContent`

---

### BLOC 5 — Tests E2E — VALIDATION

#### T12 — Tests E2E permissions véhicules
Fichier : `tests/permissions/vehicules-permissions.spec.ts`

Scénarios à couvrir :
- EXPLOITATION → `/vehicules/nouveau` redirige vers `/vehicules`
- EXPLOITATION → `/vehicules/{id}/edit` redirige vers `/vehicules/{id}`
- EXPLOITATION → bouton "+ Ajouter" absent de la liste
- EXPLOITATION → boutons "Modifier"/"Supprimer" absents du détail
- EXPLOITATION → bouton "Signaler intervention" présent ✅ (déjà implémenté)
- EXPLOITATION → dropdown statut intervention présent ✅ (déjà implémenté)
- VISITEUR → bouton "Signaler" absent
- VISITEUR → aucun bouton action

#### T13 — Tests E2E export protection
- EXPLOITATION → export menu absent
- VISITEUR → export menu absent
- AVANCE → export menu présent
- ADMIN → export menu présent

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

```
BLOC 1 (T1, T2)  → Pages sans guard — quick wins, 15 min
BLOC 2 (T3–T6)   → Props permissions véhicules — cohérence UI, 45 min
BLOC 3 (T7–T10)  → Export menus — 20 min
BLOC 4 (T11)     → Documents delete — vérification + fix, 15 min
BLOC 5 (T12–T13) → Tests E2E — validation complète, 45 min
```

**Total estimé** : ~2h30 de développement + tests

---

## FICHIERS CLÉS À MODIFIER

| Fichier | Tâches | Priorité |
|---------|--------|----------|
| `app/(dashboard)/vehicules/nouveau/page.tsx` | T1 | 🔴 CRITIQUE |
| `app/(dashboard)/vehicules/[id]/edit/page.tsx` | T2 | 🔴 CRITIQUE |
| `components/vehicules/vehicule-detail.tsx` | T3 | 🔴 CRITIQUE |
| `app/(dashboard)/vehicules/[id]/page.tsx` | T4 | 🔴 CRITIQUE |
| `components/vehicules/vehicule-list.tsx` | T5 | 🔴 CRITIQUE |
| `app/(dashboard)/vehicules/page.tsx` | T6, T7 | 🔴 CRITIQUE |
| `app/(dashboard)/cautions/page.tsx` | T8 | 🟠 MOYEN |
| `app/(dashboard)/documents/page.tsx` | T9, T11 | 🟠 MOYEN |
| `app/(dashboard)/marches/page.tsx` | T10 | 🟠 MOYEN |
| `tests/permissions/vehicules-permissions.spec.ts` | T12, T13 | 🟡 VALIDATION |

---

## POINTS D'ATTENTION

### Ne pas toucher (déjà bon)
- `lib/utils/permissions.ts` — complet et correct ✅
- `lib/actions/vehicules.ts` — guards backend corrects ✅
- `lib/actions/interventions.ts` — canWriteSAV, canWriteCommentaireContractuel, requireDelete corrects ✅
- `app/(dashboard)/cautions/nouvelle/page.tsx` — guard rôle correct ✅
- `app/(dashboard)/cautions/[id]/edit/page.tsx` — guard rôle correct ✅
- `components/interventions/interventions-table.tsx` — props canWrite + canDelete corrects ✅

### Règle de vérification après chaque tâche
Après chaque bloc : `npx tsc --noEmit` pour vérifier 0 erreur TypeScript dans `app/` et `lib/`.

### Pattern de référence (cautions bien faites)
Les cautions sont le modèle à suivre pour les véhicules :
- Page liste : bouton conditionnel canWrite ✅, passe props à composant ✅
- Page création : guard rôle redirect ✅
- Page édition : guard rôle redirect ✅
- Composant détail : showActions conditionnel ✅

**Appliquer le même pattern sur les véhicules.**

---

## AUCUNE RÉGRESSION ATTENDUE

Ce plan ne modifie aucune logique métier existante. Il ajoute uniquement :
1. Des redirects côté serveur (guard rôle) sur 2 pages véhicules
2. Des props booléens dans des composants existants
3. Des conditions `{canWrite && ...}` sur des éléments UI

Les Server Actions déjà sécurisées restent intactes.
