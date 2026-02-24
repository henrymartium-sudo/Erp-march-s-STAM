# Design — Évolution Exports & Identités Utilisateurs

**Date** : 2026-02-24
**Statut** : Approuvé
**Contraintes** : Aucun breaking change · Paramètres optionnels uniquement · Logique isolée dans utilitaires

---

## Feature 1 — Export PDF amélioré

### Objectif
Permettre la prévisualisation avant téléchargement, le choix d'orientation (Portrait/Paysage) et corriger les problèmes de chevauchement.

### Backend

**`lib/pdf/layout.ts`** (nouveau fichier)
Utilitaire centralisant les dimensions selon l'orientation :
- Portrait : largeur utile ~535pt
- Paysage : largeur utile ~782pt
- Fonction `getPageLayout(orientation)` retournant `{ size, contentWidth, orientation }`

**`lib/utils/pdf.tsx`** (modification)
- `PDFExportOptions` reçoit `orientation?: 'portrait' | 'landscape'` (défaut : `'portrait'`)
- `createPDFDocument()` utilise `getPageLayout()` pour adapter `<Page size>` et les largeurs de colonnes
- Les colonnes recalculent leurs largeurs proportionnellement selon `contentWidth`

**4 routes API `app/api/exports-pdf/[type]/route.ts`** (modification)
- Lecture param `?orientation=landscape|portrait`
- Lecture param `?preview=true` → switch `Content-Disposition: inline` vs `attachment`
- Passage de `orientation` à la server action correspondante

**`lib/actions/exports.ts`** (modification)
- Chaque fonction `export[Module]PDF()` accepte `orientation?: 'portrait' | 'landscape'`
- Passage à `createPDFDocument()`

### Frontend

**`components/exports/PDFExportModal.tsx`** (nouveau composant)
Dialog shadcn/ui avec :
- Radio Portrait / Paysage
- Bouton **Prévisualiser** → charge `?preview=true&orientation=...` dans `<iframe>`
- Bouton **Télécharger** → déclenche le téléchargement direct
- État loading par action

**`components/exports/export-menu.tsx`** (modification)
- Le click "PDF (.pdf)" ouvre `PDFExportModal` au lieu de déclencher directement le téléchargement
- Le flow Excel reste inchangé

### Non-régression
- Sans `orientation` → portrait par défaut (comportement actuel identique)
- Sans `?preview` → téléchargement direct (comportement actuel identique)

---

## Feature 2 — Export Excel avec formules

### Objectif
Permettre des colonnes calculées dynamiquement via des formules Excel.

### Architecture

**`lib/exports/excelFormulaEngine.ts`** (nouveau fichier)
Fonction pure :
```ts
applyFormula(rowIndex: number, formula: string, columnsMap?: Record<string, number>): string
```
- Remplace `{row}` par `rowIndex` dans la formule
- `columnsMap` optionnel : mapping `key → lettre colonne` pour formules référençant une clé métier
- Exemple : `applyFormula(6, "C{row}*1.18")` → `"C6*1.18"`

**`lib/utils/excel.ts`** (modification)
- `ExcelColumn` reçoit `formula?: string` (champ optionnel)
- Dans `createExcelFile()`, boucle données : si `column.formula` présent → `cell.value = { formula: applyFormula(rowIndex, column.formula), result: valeurBrute }` (format ExcelJS natif)
- Les colonnes sans `formula` restent strictement identiques

### Non-régression
- Aucune colonne existante n'a de `formula` → comportement inchangé
- La valeur brute (`result`) est toujours écrite → fichier lisible sans recalcul Excel

---

## Feature 3 — Identifiants multiples utilisateurs

### Objectif
Autoriser plusieurs emails par utilisateur sans modifier la logique RBAC.

### Prisma — Migration non destructive

Nouvelle table `UserIdentifier` :
```prisma
model UserIdentifier {
  id        String   @id @default(cuid())
  userId    String
  email     String   @unique
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([email])
  @@map("user_identifiers")
}
```

`User.email` reste inchangé (email principal). `UserIdentifier` stocke uniquement les emails additionnels.

Migration via MCP `apply_migration` (pas `prisma migrate dev`).

### Authentification (`lib/auth/auth.config.ts`)

Modification de `authorize()` :
1. Cherche d'abord dans `User.email` (comportement actuel — inchangé)
2. Si non trouvé → cherche dans `UserIdentifier.email` et remonte le `User` associé
3. Flow JWT/session identique

### Server Actions `lib/actions/auth/user-identifiers.ts` (nouveau fichier)

- `addUserIdentifier(userId, email)` — ADMIN uniquement, validation format + unicité
- `removeUserIdentifier(id)` — ADMIN uniquement, interdit de supprimer l'email primaire
- `setPrimaryIdentifier(id)` — ADMIN uniquement

### Page admin `/admin/utilisateurs`

**`app/(dashboard)/admin/utilisateurs/page.tsx`** (nouvelle page)
- Accès ADMIN uniquement (`requireRole(['ADMIN'])`)
- Liste des utilisateurs : nom, email principal, rôle, nb d'identifiants
- Clic sur un user → section expandable avec la liste de ses identifiants
- Actions : ajouter email, définir principal, supprimer
- Validation : format email + unicité globale

### Non-régression
- Login avec email `User.email` existant → comportement identique
- Permissions RBAC inchangées
- Aucune modification des modèles Marche/Caution/Document/Vehicule

---

## Fichiers impactés (récapitulatif)

| Fichier | Action |
|---------|--------|
| `lib/pdf/layout.ts` | Créer |
| `lib/exports/excelFormulaEngine.ts` | Créer |
| `lib/actions/auth/user-identifiers.ts` | Créer |
| `components/exports/PDFExportModal.tsx` | Créer |
| `app/(dashboard)/admin/utilisateurs/page.tsx` | Créer |
| `lib/utils/pdf.tsx` | Modifier (orientation param) |
| `lib/utils/excel.ts` | Modifier (formula field) |
| `lib/actions/exports.ts` | Modifier (orientation param) |
| `lib/auth/auth.config.ts` | Modifier (lookup UserIdentifier) |
| `components/exports/export-menu.tsx` | Modifier (PDFExportModal) |
| `app/api/exports-pdf/*/route.ts` (×4) | Modifier (orientation + preview params) |
| `prisma/schema.prisma` | Modifier (UserIdentifier model) |

---

## Ordre d'implémentation recommandé

1. **F2** — Excel formules (isolé, sans dépendances, rapide)
2. **F1** — PDF orientation + preview (backend → frontend)
3. **F3** — UserIdentifier (migration → auth → actions → UI admin)
