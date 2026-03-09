# STAM v2.0 — Plan d'implémentation des 10 modifications

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implémenter les 10 modifications STAM v2.0 — traçabilité utilisateur dans les logs, évolutions du module Opportunités (schéma, UX, export), automatisation DossierOffre, et enrichissement du Reporting avec drill-down.

**Architecture:** Next.js 15 full-stack — Server Actions pour toutes les mutations, Prisma pour les changements de schéma, shadcn/ui pour les composants UI. Zéro régression : chaque tâche lit les fichiers concernés avant de modifier.

**Tech Stack:** Next.js 15 · React 19 · Prisma 7 · PostgreSQL · shadcn/ui · Recharts 2.15 · TypeScript strict · Zod · Supabase MCP pour migrations

---

## ÉTAPE 1 — MOD-1 : Audit Log — Utilisateur réel

**Contexte :** 3 fichiers appellent `logAction()` sans passer `userId/userEmail` alors que `session` est déjà disponible dans la fonction. Les fichiers corrects (référence) : `lib/actions/marches.ts`, `lib/actions/cautions.ts`.

---

### Task 1: Corriger opportunites.ts

**Files:**
- Modify: `lib/actions/opportunites.ts`

**Step 1: Lire le fichier pour repérer les 4 appels logAction**

```bash
grep -n "logAction\|session.user" lib/actions/opportunites.ts
```

**Step 2: Ajouter userId/userEmail dans createOpportunite (ligne ~150)**

Dans `createOpportunite`, `userId` est déjà extrait via `const userId = (session.user as { id?: string } | undefined)?.id`. Ajouter aussi `userEmail` et passer les deux à logAction :

```typescript
// Après const userId = (session.user as { id?: string } | undefined)?.id
const userEmail = (session.user as { email?: string } | undefined)?.email

// Dans logAction :
await logAction({
  userId,
  userEmail,
  action: AUDIT_ACTION.CREATE,
  entityType: AUDIT_ENTITY.OPPORTUNITE,
  entityId: opportunite.id,
  metadata: { objet: opportunite.objet },
})
```

**Step 3: Ajouter userId/userEmail dans updateOpportunite (ligne ~192)**

La session est disponible. Extraire userId/userEmail juste après `requireAuth()` :

```typescript
const session = await requireAuth()
const role = (session.user as { role?: string } | undefined)?.role
if (!canWrite(role)) { ... }
const userId = (session.user as { id?: string } | undefined)?.id
const userEmail = (session.user as { email?: string } | undefined)?.email

// logAction :
await logAction({
  userId,
  userEmail,
  action: AUDIT_ACTION.UPDATE,
  ...
})
```

**Step 4: Ajouter userId/userEmail dans deleteOpportunite (ligne ~224)**

Même pattern : extraire `userId` et `userEmail` depuis `session`, les passer à `logAction`.

**Step 5: Ajouter userId/userEmail dans createMarcheFromOpportunite (ligne ~309)**

`userId` est déjà extrait. Ajouter `userEmail` et les passer à `logAction`.

**Step 6: Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 erreur sur ce fichier.

**Step 7: Commit**

```bash
git add lib/actions/opportunites.ts
git commit -m "fix(audit): passer userId/userEmail dans logAction — opportunites.ts"
```

---

### Task 2: Corriger dossiers-offre.ts

**Files:**
- Modify: `lib/actions/dossiers-offre.ts`

**Step 1: Lire le fichier**

```bash
grep -n "logAction\|session\b" lib/actions/dossiers-offre.ts
```

**Step 2: Dans createDossierOffre — extraire userId/userEmail et passer à logAction**

```typescript
const session = await requireAuth()
const role = (session.user as { role?: string } | undefined)?.role
// Ajouter après :
const userId = (session.user as { id?: string } | undefined)?.id
const userEmail = (session.user as { email?: string } | undefined)?.email

// logAction :
await logAction({
  userId,
  userEmail,
  action: AUDIT_ACTION.CREATE,
  entityType: AUDIT_ENTITY.DOSSIER_OFFRE,
  entityId: dossier.id,
  metadata: { titre: dossier.titre },
})
```

**Step 3: Dans updateDossierOffre — même pattern**

**Step 4: Dans deleteDossierOffre — même pattern**

**Step 5: Vérifier compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 6: Commit**

```bash
git add lib/actions/dossiers-offre.ts
git commit -m "fix(audit): passer userId/userEmail dans logAction — dossiers-offre.ts"
```

---

### Task 3: Corriger statuts-opportunite.ts

**Files:**
- Modify: `lib/actions/statuts-opportunite.ts`

**Step 1: Extraire userId/userEmail depuis session**

```typescript
const session = await requireAuth()
const role = (session.user as { role?: string } | undefined)?.role
// Ajouter :
const userId = (session.user as { id?: string } | undefined)?.id
const userEmail = (session.user as { email?: string } | undefined)?.email
```

**Step 2: Passer à logAction**

```typescript
await logAction({
  userId,
  userEmail,
  action: AUDIT_ACTION.UPDATE,
  entityType: AUDIT_ENTITY.OPPORTUNITE,
  entityId: opportuniteId,
  metadata: {
    ancienStatut: opportunite.statut,
    nouveauStatut: newStatut,
    commentaire: commentaire?.trim() || null,
  },
})
```

**Step 3: Vérifier compilation + commit**

```bash
npx tsc --noEmit 2>&1 | head -30
git add lib/actions/statuts-opportunite.ts
git commit -m "fix(audit): passer userId/userEmail dans logAction — statuts-opportunite.ts"
```

---

## ÉTAPE 2 — MOD-8 + MOD-9 : Schéma Prisma

**Contexte :** Supprimer `probabiliteGain Int?` et ajouter `montantPropose Decimal? @db.Decimal(15,2)` dans le modèle `Opportunite`. Une seule migration. Le `montantPropose` est visible/éditable uniquement à partir du statut `OFFRE_SOUMISE`.

---

### Task 4: Migration Prisma — supprimer probabiliteGain, ajouter montantPropose

**Files:**
- Modify: `prisma/schema.prisma` (modèle `Opportunite`)

**Step 1: Lire le modèle Opportunite dans schema.prisma**

```bash
grep -n "probabiliteGain\|montantPropose\|Opportunite" prisma/schema.prisma | head -30
```

**Step 2: Modifier schema.prisma**

Supprimer la ligne :
```prisma
probabiliteGain    Int?
```

Ajouter après `montantEstime` (ou après `dateLimite`) :
```prisma
montantPropose     Decimal?  @db.Decimal(15, 2)
```

**Step 3: Générer et appliquer la migration via Supabase MCP**

Utiliser l'outil MCP `apply_migration` avec le SQL :
```sql
ALTER TABLE "Opportunite" DROP COLUMN IF EXISTS "probabiliteGain";
ALTER TABLE "Opportunite" ADD COLUMN IF NOT EXISTS "montantPropose" DECIMAL(15,2);
```

**Step 4: Vérifier la génération des types Prisma**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client" sans erreur.

**Step 5: Commit schema**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): supprimer probabiliteGain + ajouter montantPropose (Opportunite)"
```

---

### Task 5: Adapter la validation Zod et les Server Actions

**Files:**
- Modify: `lib/validations/opportunite.ts`
- Modify: `lib/actions/opportunites.ts`

**Step 1: Lire lib/validations/opportunite.ts**

**Step 2: Dans formOpportuniteSchema — supprimer probabiliteGain, ajouter montantPropose**

```typescript
// Supprimer :
probabiliteGain: z.number().int().min(0).max(100).nullable().optional(),

// Ajouter :
montantPropose: z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
  z.number().positive().nullable().optional()
),
```

**Step 3: Faire de même dans createOpportuniteSchema et updateOpportuniteSchema**

**Step 4: Dans lib/actions/opportunites.ts — vérifier qu'aucune référence à probabiliteGain ne subsiste**

```bash
grep -n "probabiliteGain" lib/actions/opportunites.ts lib/validations/opportunite.ts
```

Expected: 0 résultat.

**Step 5: Vérifier compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 6: Commit**

```bash
git add lib/validations/opportunite.ts lib/actions/opportunites.ts
git commit -m "feat(opportunites): adapter Zod — supprimer probabiliteGain, ajouter montantPropose"
```

---

### Task 6: Adapter le formulaire et l'affichage

**Files:**
- Modify: `components/opportunites/opportunite-form.tsx` (ou équivalent — chercher avec glob)
- Modify: `app/(dashboard)/opportunites/[id]/page.tsx` ou composant détail

**Step 1: Trouver les fichiers UI qui référencent probabiliteGain**

```bash
grep -rn "probabiliteGain" components/ app/ --include="*.tsx" --include="*.ts"
```

**Step 2: Supprimer tous les champs probabiliteGain de l'UI**

Pour chaque occurrence : supprimer le champ du formulaire, supprimer l'affichage dans le détail.

**Step 3: Ajouter le champ montantPropose dans le formulaire**

Le champ doit être conditionnel — visible uniquement si `statut >= OFFRE_SOUMISE`. Exemple :

```tsx
{/* Visible seulement à partir de OFFRE_SOUMISE */}
{isStatutOffertOuPlus(watchedStatut) && (
  <FormField
    control={form.control}
    name="montantPropose"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Montant proposé (XOF)</FormLabel>
        <FormControl>
          <Input
            type="number"
            placeholder="Montant réellement soumis"
            {...field}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

Créer un helper dans le même fichier :
```typescript
const STATUTS_POST_SOUMISSION = ['OFFRE_SOUMISE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE']
function isStatutOffertOuPlus(statut: string | undefined): boolean {
  return STATUTS_POST_SOUMISSION.includes(statut ?? '')
}
```

**Step 4: Afficher montantPropose dans la page détail**

Dans le composant détail, ajouter une ligne :
```tsx
{opportunite.montantPropose && isStatutOffertOuPlus(opportunite.statut) && (
  <div>
    <span className="text-sm text-muted-foreground">Montant proposé</span>
    <span className="font-semibold">{formatMontant(opportunite.montantPropose)} XOF</span>
  </div>
)}
```

**Step 5: Vérifier compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 6: Commit**

```bash
git add components/opportunites/ app/\(dashboard\)/opportunites/
git commit -m "feat(opportunites): UI — retirer probabiliteGain, ajouter montantPropose conditionnel"
```

---

## ÉTAPE 3 — MOD-5 : Auto-création DossierOffre

**Contexte :** Quand `changerStatutOpportunite()` transite vers `DOSSIER_EN_PREPARATION`, créer automatiquement un `DossierOffre` lié si aucun n'existe déjà pour cette opportunité.

---

### Task 7: Brancher la création automatique dans statuts-opportunite.ts

**Files:**
- Modify: `lib/actions/statuts-opportunite.ts`

**Step 1: Lire entièrement statuts-opportunite.ts**

**Step 2: Après la mise à jour du statut Prisma, ajouter la logique**

Après `await prisma.opportunite.update(...)`, ajouter :

```typescript
// Auto-création DossierOffre si transition vers DOSSIER_EN_PREPARATION
if (newStatut === 'DOSSIER_EN_PREPARATION') {
  const existingDossier = await prisma.dossierOffre.findFirst({
    where: { opportuniteId },
  })

  if (!existingDossier) {
    await prisma.dossierOffre.create({
      data: {
        titre: `Dossier — ${opportunite.objet}`,
        opportuniteId,
        statut: 'EN_COURS',
        progression: 0,
        pieces: {
          create: CHECKLIST_STANDARD.map((p) => ({
            nom:         p.nom,
            description: p.description,
            obligatoire: p.obligatoire,
            ordre:       p.ordre,
            statut:      'ABSENT' as const,
          })),
        },
      },
    })
    revalidatePath('/dossiers-offre')
  }
}
```

**Step 3: Importer CHECKLIST_STANDARD**

```typescript
import { CHECKLIST_STANDARD } from '@/lib/actions/dossiers-offre'
```

> Si `CHECKLIST_STANDARD` n'est pas exporté depuis `dossiers-offre.ts`, l'exporter. Lire le fichier pour vérifier.

**Step 4: Vérifier compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 5: Commit**

```bash
git add lib/actions/statuts-opportunite.ts lib/actions/dossiers-offre.ts
git commit -m "feat(opportunites): auto-créer DossierOffre lors du passage à DOSSIER_EN_PREPARATION"
```

---

## ÉTAPE 4 — MOD-6 + MOD-7 : Dialogs statut Opportunité

**Contexte :**
- MOD-6 : Dialog "Période de validité de l'offre" au passage à `OFFRE_SOUMISE` (deux dates : début et fin)
- MOD-7 : Dialog "Échéance attribution provisoire" au passage à `ATTRIBUE_PROVISOIREMENT` + alerte si dépassée

---

### Task 8: Ajouter champs schéma pour MOD-6 et MOD-7

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Ajouter les champs dans le modèle Opportunite**

```prisma
periodeValiditeDebut   DateTime?
periodeValiditeFin     DateTime?
echeanceAttributionProv DateTime?
```

**Step 2: Appliquer la migration via Supabase MCP**

```sql
ALTER TABLE "Opportunite"
  ADD COLUMN IF NOT EXISTS "periodeValiditeDebut" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "periodeValiditeFin" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "echeanceAttributionProv" TIMESTAMP(3);
```

**Step 3: Régénérer le client Prisma**

```bash
npx prisma generate
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): ajouter champs validité offre et échéance attribution provisoire"
```

---

### Task 9: Adapter le schéma Zod et la Server Action changerStatutOpportunite

**Files:**
- Modify: `lib/validations/opportunite.ts` (ou le schéma de changerStatut)
- Modify: `lib/actions/statuts-opportunite.ts`

**Step 1: Lire le schéma `changerStatutOpportuniteSchema`**

```bash
grep -n "changerStatutOpportuniteSchema\|periodeValidite\|echeance" lib/validations/opportunite.ts lib/actions/statuts-opportunite.ts
```

**Step 2: Ajouter les champs optionnels dans le schéma Zod**

```typescript
periodeValiditeDebut:    z.preprocess((v) => v ? new Date(v as string) : null, z.date().nullable().optional()),
periodeValiditeFin:      z.preprocess((v) => v ? new Date(v as string) : null, z.date().nullable().optional()),
echeanceAttributionProv: z.preprocess((v) => v ? new Date(v as string) : null, z.date().nullable().optional()),
```

**Step 3: Dans changerStatutOpportunite — enregistrer les données selon le statut cible**

```typescript
const {
  opportuniteId,
  newStatut,
  commentaire,
  motifPerte,
  concurrentGagnant,
  montantOffreConcurrent,
  periodeValiditeDebut,    // MOD-6
  periodeValiditeFin,      // MOD-6
  echeanceAttributionProv, // MOD-7
} = parsed.data

const updateData: Record<string, unknown> = { statut: newStatut }

if (newStatut === 'PERDUE') {
  updateData.motifPerte = motifPerte ?? null
  updateData.concurrentGagnant = concurrentGagnant ?? null
  updateData.montantOffreConcurrent = montantOffreConcurrent ?? null
}

if (newStatut === 'OFFRE_SOUMISE') {
  updateData.periodeValiditeDebut = periodeValiditeDebut ?? null
  updateData.periodeValiditeFin = periodeValiditeFin ?? null
}

if (newStatut === 'ATTRIBUE_PROVISOIREMENT') {
  updateData.echeanceAttributionProv = echeanceAttributionProv ?? null
}
```

**Step 4: Vérifier compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 5: Commit**

```bash
git add lib/validations/opportunite.ts lib/actions/statuts-opportunite.ts
git commit -m "feat(opportunites): SA changerStatut — stocker données MOD-6 et MOD-7"
```

---

### Task 10: Créer lib/urgency.ts — détection échéances dépassées

**Files:**
- Create: `lib/urgency.ts`

**Step 1: Créer le fichier**

```typescript
// lib/urgency.ts
// Utilitaire centralisé pour la détection des échéances dépassées

export type UrgencyLevel = 'ok' | 'warning' | 'danger' | 'overdue'

export function getUrgencyLevel(echeance: Date | null | undefined): UrgencyLevel {
  if (!echeance) return 'ok'
  const now = new Date()
  const diffDays = Math.ceil((echeance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'danger'
  if (diffDays <= 7) return 'warning'
  return 'ok'
}

export function isEcheanceDepassee(echeance: Date | null | undefined): boolean {
  return getUrgencyLevel(echeance) === 'overdue'
}

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  ok:      'Dans les délais',
  warning: 'Bientôt',
  danger:  'Urgent',
  overdue: 'Dépassé',
}
```

**Step 2: Commit**

```bash
git add lib/urgency.ts
git commit -m "feat: créer lib/urgency.ts — utilitaire détection échéances"
```

---

### Task 11: Composant Dialog statut — MOD-6 + MOD-7

**Files:**
- Modify: composant qui déclenche le changement de statut (chercher avec `grep -rn "changerStatutOpportunite" components/ app/` pour localiser le bon fichier)

**Step 1: Localiser le composant de changement de statut**

```bash
grep -rn "changerStatutOpportunite" components/ app/ --include="*.tsx"
```

**Step 2: Comprendre la structure actuelle du dialog**

Lire le fichier localisé.

**Step 3: Ajouter les champs conditionnels dans le formulaire de changement de statut**

Après le champ "commentaire", ajouter conditionnellement selon le statut cible :

```tsx
{/* MOD-6 : Période de validité — visible si newStatut === 'OFFRE_SOUMISE' */}
{newStatut === 'OFFRE_SOUMISE' && (
  <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
    <p className="text-sm font-medium text-blue-800">Période de validité de l'offre</p>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-muted-foreground">Date de début</label>
        <Input type="date" {...register('periodeValiditeDebut')} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Date de fin</label>
        <Input type="date" {...register('periodeValiditeFin')} />
      </div>
    </div>
  </div>
)}

{/* MOD-7 : Échéance attribution provisoire */}
{newStatut === 'ATTRIBUE_PROVISOIREMENT' && (
  <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
    <p className="text-sm font-medium text-orange-800">Échéance de l'attribution provisoire</p>
    <Input type="date" {...register('echeanceAttributionProv')} />
    <p className="text-xs text-muted-foreground">
      Une alerte sera affichée si cette date est dépassée.
    </p>
  </div>
)}
```

**Step 4: Afficher les données dans la page détail de l'opportunité**

Ajouter des badges/lignes pour `periodeValiditeDebut/Fin` et `echeanceAttributionProv`, avec badge d'urgence via `getUrgencyLevel()`.

**Step 5: Vérifier compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 6: Commit**

```bash
git add components/ app/\(dashboard\)/opportunites/
git commit -m "feat(opportunites): dialogs MOD-6 (validité offre) + MOD-7 (échéance attribution)"
```

---

## ÉTAPE 5 — MOD-10 : Export Opportunités

**Contexte :** Ajouter un bouton Export (Excel + PDF) dans la liste des opportunités. Pattern identique à `lib/actions/exports.ts` (lire ce fichier avant de coder).

---

### Task 12: Server Action export opportunités

**Files:**
- Modify: `lib/actions/exports.ts`

**Step 1: Lire un export existant dans exports.ts pour comprendre le pattern**

Chercher `exportMarchesExcel` ou `exportCautionsExcel` pour identifier le pattern exact.

**Step 2: Ajouter exportOpportunitesExcel**

Colonnes : Référence · Objet · Autorité contractante · Montant estimé · Montant proposé · Statut · Date limite · Notes

```typescript
export async function exportOpportunitesExcel(): Promise<ActionResult<string>> {
  try {
    const session = await requireAuth()
    if (!canExport((session.user as { role?: string })?.role)) {
      return { success: false, error: 'Permissions insuffisantes' }
    }

    const opportunites = await prisma.opportunite.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Opportunités')

    sheet.columns = [
      { header: 'Référence',              key: 'reference',          width: 18 },
      { header: 'Objet',                  key: 'objet',              width: 40 },
      { header: 'Autorité contractante',  key: 'autoriteContractante', width: 30 },
      { header: 'Montant estimé (XOF)',   key: 'montantEstime',      width: 20 },
      { header: 'Montant proposé (XOF)',  key: 'montantPropose',     width: 20 },
      { header: 'Statut',                 key: 'statut',             width: 25 },
      { header: 'Date limite',            key: 'dateLimite',         width: 15 },
      { header: 'Notes',                  key: 'notes',              width: 40 },
    ]

    // Styling entête (copier le pattern des exports existants)
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }

    for (const opp of opportunites) {
      sheet.addRow({
        reference:           opp.reference ?? '',
        objet:               opp.objet,
        autoriteContractante: opp.autoriteContractante,
        montantEstime:       opp.montantEstime ? Number(opp.montantEstime) : '',
        montantPropose:      opp.montantPropose ? Number(opp.montantPropose) : '',
        statut:              STATUT_OPPORTUNITE_LABELS[opp.statut] ?? opp.statut,
        dateLimite:          opp.dateLimite ? formatDate(opp.dateLimite) : '',
        notes:               opp.notes ?? '',
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    await logAction({
      userId:     (session.user as { id?: string })?.id,
      userEmail:  (session.user as { email?: string })?.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { type: 'opportunites_excel', count: opportunites.length },
    })

    return { success: true, data: base64 }
  } catch (error) {
    console.error('Erreur exportOpportunitesExcel:', error)
    return { success: false, error: "Impossible d'exporter les opportunités" }
  }
}
```

> Importer `STATUT_OPPORTUNITE_LABELS` depuis `lib/utils/workflow-statuts-opportunite` (chercher l'emplacement exact avec grep).

**Step 3: Ajouter exportOpportunitesPDF de façon analogue**

Suivre le même pattern que les exports PDF existants (lire un exemple dans exports.ts).

**Step 4: Vérifier compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 5: Commit**

```bash
git add lib/actions/exports.ts
git commit -m "feat(opportunites): SA export Excel + PDF"
```

---

### Task 13: Bouton Export dans la liste opportunités

**Files:**
- Modify: composant liste opportunités (chercher avec `grep -rn "opportunites" app/(dashboard)/opportunites/` pour identifier la page)

**Step 1: Localiser la page liste**

```bash
ls app/\(dashboard\)/opportunites/
```

**Step 2: Ajouter le bouton Export (copier le pattern des autres listes)**

```tsx
import { exportOpportunitesExcel, exportOpportunitesPDF } from '@/lib/actions/exports'

// Dans le composant, ajouter un DropdownMenu Export :
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      <Download className="mr-2 h-4 w-4" />
      Exporter
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleExportExcel}>Excel (.xlsx)</DropdownMenuItem>
    <DropdownMenuItem onClick={handleExportPDF}>PDF</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Step 3: Vérifier compilation + commit**

```bash
npx tsc --noEmit 2>&1 | head -30
git add app/\(dashboard\)/opportunites/
git commit -m "feat(opportunites): bouton Export professionnel dans la liste"
```

---

## ÉTAPE 6 — MOD-2 + MOD-3 : Reporting Opportunités + Top 10 AC

---

### Task 14: Server Action — données analytiques opportunités

**Files:**
- Modify: `lib/actions/analytics.ts`
- Modify: `lib/analytics/types.ts`

**Step 1: Lire analytics.ts et types.ts pour comprendre le pattern**

**Step 2: Ajouter le type OpportunitesStats dans types.ts**

```typescript
export interface OpportunitesStats {
  parStatut: { statut: string; label: string; count: number }[]
  tauxConversion: number          // % GO → GAGNEE
  totalPipeline: number           // somme montantEstime statuts actifs
  totalPropose: number            // somme montantPropose statuts post-soumission
  countTotal: number
}
```

**Step 3: Ajouter getOpportunitesStats dans analytics.ts**

```typescript
export async function getOpportunitesStats(periode: Periode): Promise<OpportunitesStats> {
  const { dateDebut, dateFin } = getPeriodeDates(periode)

  const opportunites = await prisma.opportunite.findMany({
    where: { createdAt: { gte: dateDebut, lte: dateFin } },
    select: {
      statut: true,
      montantEstime: true,
      montantPropose: true,
    },
  })

  // Grouper par statut
  const statsCounts: Record<string, number> = {}
  let totalPipeline = 0
  let totalPropose = 0
  let countGO = 0
  let countGAGNEE = 0

  for (const opp of opportunites) {
    statsCounts[opp.statut] = (statsCounts[opp.statut] ?? 0) + 1
    if (opp.montantEstime) totalPipeline += Number(opp.montantEstime)
    if (opp.montantPropose) totalPropose += Number(opp.montantPropose)
    if (['GO', 'DOSSIER_EN_PREPARATION', 'OFFRE_SOUMISE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT', 'GAGNEE'].includes(opp.statut)) countGO++
    if (opp.statut === 'GAGNEE') countGAGNEE++
  }

  const tauxConversion = countGO > 0 ? Math.round((countGAGNEE / countGO) * 100) : 0

  const parStatut = Object.entries(statsCounts).map(([statut, count]) => ({
    statut,
    label: STATUT_OPPORTUNITE_LABELS[statut as StatutOpportunite] ?? statut,
    count,
  }))

  return {
    parStatut,
    tauxConversion,
    totalPipeline,
    totalPropose,
    countTotal: opportunites.length,
  }
}
```

**Step 4: Ajouter getTop10ACParCAEncaisse dans analytics.ts**

```typescript
export async function getTop10ACParCAEncaisse(periode: Periode): Promise<{ ac: string; montant: number }[]> {
  const { dateDebut, dateFin } = getPeriodeDates(periode)

  // Regrouper les factures encaissées par AC (via marché)
  const factures = await prisma.facture.findMany({
    where: {
      statut: 'PAYEE',
      datePaiement: { gte: dateDebut, lte: dateFin },
    },
    include: {
      marche: { select: { autoriteContractanteNom: true } },
    },
  })

  const byAC: Record<string, number> = {}
  for (const f of factures) {
    const ac = f.marche?.autoriteContractanteNom ?? 'Inconnu'
    byAC[ac] = (byAC[ac] ?? 0) + Number(f.montant ?? 0)
  }

  return Object.entries(byAC)
    .map(([ac, montant]) => ({ ac, montant }))
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 10)
}
```

**Step 5: Vérifier compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 6: Commit**

```bash
git add lib/analytics/types.ts lib/actions/analytics.ts
git commit -m "feat(analytics): getOpportunitesStats + getTop10ACParCAEncaisse"
```

---

### Task 15: Composant OpportunitesSection

**Files:**
- Create: `components/analytique/OpportunitesSection.tsx`

**Step 1: Lire un composant analytique existant pour le pattern exact**

```bash
cat components/analytique/PerformanceSection.tsx | head -80
```

**Step 2: Créer OpportunitesSection.tsx**

Structure : cartes KPI en haut (total, taux conversion, pipeline, proposé) + PieChart/BarChart par statut — même structure que `PerformanceSection`.

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Pie, PieChart } from 'recharts'
import type { OpportunitesStats } from '@/lib/analytics/types'
import { formatMontant } from '@/lib/utils/format'

interface Props {
  stats: OpportunitesStats
}

export function OpportunitesSection({ stats }: Props) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total opportunités</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.countTotal}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Taux de conversion</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{stats.tauxConversion}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline estimé</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatMontant(stats.totalPipeline)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Montant proposé</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatMontant(stats.totalPropose)}</p></CardContent>
        </Card>
      </div>

      {/* BarChart par statut */}
      <Card>
        <CardHeader><CardTitle>Répartition par statut</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.parStatut}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <ChartTooltip />
              <Bar dataKey="count" name="Opportunités" fill="#1E3A5F" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 3: Intégrer dans AnalytiquesTab**

Dans `app/(dashboard)/admin/reporting/AnalytiquesTab.tsx` :
- Importer `OpportunitesSection`
- Ajouter un onglet "Opportunités" dans les tabs existants
- Fetcher `getOpportunitesStats(periode)` dans le composant parent (RSC ou dans l'onglet)

**Step 4: Vérifier compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 5: Commit**

```bash
git add components/analytique/OpportunitesSection.tsx app/\(dashboard\)/admin/reporting/
git commit -m "feat(reporting): onglet Opportunités avec KPIs + graphique par statut"
```

---

### Task 16: Graphique Top 10 AC dans CapitalisationSection

**Files:**
- Modify: `components/analytique/CapitalisationSection.tsx`

**Step 1: Lire CapitalisationSection.tsx**

**Step 2: Ajouter le graphique Top 10**

```tsx
{/* Top 10 AC par CA encaissé */}
<Card>
  <CardHeader><CardTitle>Top 10 — Autorités contractantes (CA encaissé)</CardTitle></CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={top10AC} layout="vertical">
        <XAxis type="number" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
        <YAxis type="category" dataKey="ac" width={160} tick={{ fontSize: 11 }} />
        <ChartTooltip formatter={(v: number) => [`${formatMontant(v)} XOF`, 'CA encaissé']} />
        <Bar dataKey="montant" fill="#C49A1A" radius={[0,4,4,0]} />
      </BarChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

**Step 3: Passer top10AC depuis le parent**

Modifier la signature du composant pour recevoir `top10AC: { ac: string; montant: number }[]` en prop, et fetcher `getTop10ACParCAEncaisse(periode)` dans `AnalytiquesTab`.

**Step 4: Vérifier compilation + commit**

```bash
npx tsc --noEmit 2>&1 | head -30
git add components/analytique/CapitalisationSection.tsx app/\(dashboard\)/admin/reporting/
git commit -m "feat(reporting): graphique Top 10 AC par CA encaissé"
```

---

## ÉTAPE 7 — MOD-4 : Drill-down Graphiques

**Contexte :** Chaque élément cliquable dans les graphiques (Dashboard + Reporting) ouvre un Sheet Radix affichant les éléments détaillés correspondants.

---

### Task 17: Créer le composant DrillDownSheet

**Files:**
- Create: `components/shared/DrillDownSheet.tsx`

**Step 1: Créer le composant générique**

```tsx
'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export interface DrillDownItem {
  id: string
  label: string
  sublabel?: string
  montant?: number
  statut?: string
  href?: string
}

interface DrillDownSheetProps {
  open: boolean
  onClose: () => void
  title: string
  items: DrillDownItem[]
  emptyMessage?: string
}

export function DrillDownSheet({ open, onClose, title, items, emptyMessage }: DrillDownSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">{emptyMessage ?? 'Aucun élément'}</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                {item.href ? (
                  <Link href={item.href} className="font-medium text-sm hover:underline truncate block">
                    {item.label}
                  </Link>
                ) : (
                  <p className="font-medium text-sm truncate">{item.label}</p>
                )}
                {item.sublabel && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sublabel}</p>
                )}
              </div>
              <div className="ml-3 flex items-center gap-2 shrink-0">
                {item.statut && <Badge variant="outline" className="text-xs">{item.statut}</Badge>}
                {item.montant !== undefined && (
                  <span className="text-sm font-semibold">
                    {new Intl.NumberFormat('fr-FR').format(item.montant)} XOF
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 2: Commit**

```bash
git add components/shared/DrillDownSheet.tsx
git commit -m "feat: créer composant DrillDownSheet générique"
```

---

### Task 18: Brancher DrillDownSheet sur les graphiques Dashboard

**Files:**
- Modify: `components/dashboard/status-charts.tsx`
- Modify: `components/dashboard/montants-chart.tsx`

**Step 1: Lire status-charts.tsx pour comprendre la structure actuelle**

**Step 2: Ajouter state et handler onClick dans status-charts.tsx**

```tsx
const [drillDown, setDrillDown] = useState<{ title: string; items: DrillDownItem[] } | null>(null)

// Dans Pie / Bar, ajouter onClick :
<Pie
  onClick={(data) => {
    setDrillDown({
      title: `Marchés — ${data.name}`,
      items: /* fetch ou filtrer les marchés correspondants */,
    })
  }}
/>

<DrillDownSheet
  open={!!drillDown}
  onClose={() => setDrillDown(null)}
  title={drillDown?.title ?? ''}
  items={drillDown?.items ?? []}
/>
```

> **Note :** Pour les données détaillées, passer les marchés complets depuis le RSC parent en props (éviter un fetch client). Chercher comment `status-charts.tsx` reçoit ses données.

**Step 3: Faire de même dans montants-chart.tsx**

**Step 4: Faire de même dans les graphiques de AnalytiquesTab / sections analytiques**

Chercher tous les composants `BarChart`/`PieChart`/`Pie`/`Bar` dans `components/analytique/` et ajouter `onClick` + `DrillDownSheet`.

**Step 5: Vérifier compilation**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 6: Build final**

```bash
npm run build 2>&1 | tail -20
```

Expected: "Route (app)" sans erreurs de compilation.

**Step 7: Commit final**

```bash
git add components/dashboard/ components/analytique/ components/shared/
git commit -m "feat(dashboard+reporting): drill-down graphiques avec DrillDownSheet"
```

---

## Vérification finale

```bash
# 1. TypeScript strict
npx tsc --noEmit

# 2. Build complet
npm run build

# 3. Vérifier qu'aucune référence à probabiliteGain ne subsiste
grep -rn "probabiliteGain" app/ components/ lib/ --include="*.ts" --include="*.tsx"
# Expected: 0 résultat

# 4. Vérifier que tous les logAction passent userId
grep -B2 "AUDIT_ACTION" lib/actions/opportunites.ts lib/actions/dossiers-offre.ts lib/actions/statuts-opportunite.ts | grep -c "userId"
# Expected: ≥ 8
```

---

## Ordre des commits résumé

1. `fix(audit): passer userId/userEmail — opportunites.ts`
2. `fix(audit): passer userId/userEmail — dossiers-offre.ts`
3. `fix(audit): passer userId/userEmail — statuts-opportunite.ts`
4. `feat(schema): supprimer probabiliteGain + ajouter montantPropose`
5. `feat(opportunites): adapter Zod — probabiliteGain/montantPropose`
6. `feat(opportunites): UI formulaire/détail — probabiliteGain/montantPropose`
7. `feat(opportunites): auto-créer DossierOffre → DOSSIER_EN_PREPARATION`
8. `feat(schema): champs validité offre + échéance attribution`
9. `feat(opportunites): SA changerStatut — stocker MOD-6/MOD-7`
10. `feat: créer lib/urgency.ts`
11. `feat(opportunites): dialogs MOD-6 + MOD-7`
12. `feat(opportunites): SA export Excel + PDF`
13. `feat(opportunites): bouton Export dans la liste`
14. `feat(analytics): getOpportunitesStats + getTop10ACParCAEncaisse`
15. `feat(reporting): onglet Opportunités`
16. `feat(reporting): Top 10 AC par CA encaissé`
17. `feat: DrillDownSheet générique`
18. `feat(dashboard+reporting): drill-down graphiques`
