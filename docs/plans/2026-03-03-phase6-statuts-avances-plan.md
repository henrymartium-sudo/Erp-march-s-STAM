# Phase 6 — Statuts Avancés Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter un bouton "Changer le statut" dans la fiche marché, ouvrant un Sheet avec stepper visuel, select filtré sur les transitions autorisées, commentaire obligatoire pour les transitions critiques, et validations métier côté serveur.

**Architecture:** Server Action dédiée `changerStatutMarche` dans `lib/actions/statuts.ts` + composant client `StatutChangerButton` (Sheet + stepper + form) injecté dans `MarcheDetail`. La logique de transition existante (`workflow-statuts.ts`) est réutilisée sans modification majeure — on ajoute uniquement `COMMENTAIRE_OBLIGATOIRE` et les labels.

**Tech Stack:** Next.js 15 Server Actions, Prisma 7, shadcn/ui Sheet + Select + Textarea, React 19, TypeScript, Zod.

---

## Contexte codebase

- `lib/utils/workflow-statuts.ts` — `isTransitionValid`, `getAvailableStatuts`, `isTerminal` déjà présents
- `lib/utils/statut.ts` — `STATUT_LABELS`, `STATUT_COLORS`
- `lib/utils/permissions.ts` — `requireMarcheWrite()` = ADMIN + AVANCE
- `components/marches/marche-detail.tsx` — intégration cible, `canWrite` prop déjà présent
- `components/marches/marche-historique-statuts.tsx` — timeline existante (rafraîchissement après mutation via `useEffect` + state)
- `types/index.ts` — `ActionResult<T>`
- `components/ui/sheet.tsx` — Sheet shadcn disponible

---

## Task 1 : Enrichir `workflow-statuts.ts`

**Files:**
- Modify: `lib/utils/workflow-statuts.ts`

**Step 1 : Ajouter les constantes**

Ajouter à la fin du fichier :

```typescript
/**
 * Statuts nécessitant un commentaire obligatoire lors de la transition.
 */
export const COMMENTAIRE_OBLIGATOIRE: StatutMarche[] = [
  'RESILIE',
  'ANNULE',
  'INFRUCTUEUX',
  'CLOTURE',
]

/**
 * Séquence du chemin principal (hors terminaux latéraux).
 */
export const CHEMIN_PRINCIPAL: StatutMarche[] = [
  'OPPORTUNITE_IDENTIFIEE',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_DEPOSEE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'ATTRIBUE_DEFINITIVEMENT',
  'EN_ATTENTE_LIVRAISON_OS',
  'EN_EXECUTION',
  'EXECUTE_ATTENTE_GARANTIES',
  'CLOTURE',
]

/**
 * Statuts terminaux "latéraux" (branches hors chemin principal).
 */
export const TERMINAUX_LATERAUX: StatutMarche[] = [
  'RESILIE',
  'ANNULE',
  'INFRUCTUEUX',
]
```

**Step 2 : Commit**

```bash
git add lib/utils/workflow-statuts.ts
git commit -m "feat(p6): add COMMENTAIRE_OBLIGATOIRE + CHEMIN_PRINCIPAL constants"
```

---

## Task 2 : Server Action `changerStatutMarche`

**Files:**
- Create: `lib/actions/statuts.ts`

**Step 1 : Créer le fichier**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { StatutMarche } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { requireMarcheWrite } from '@/lib/utils/permissions'
import { isTransitionValid, COMMENTAIRE_OBLIGATOIRE } from '@/lib/utils/workflow-statuts'
import { STATUT_LABELS } from '@/lib/utils/statut'
import type { ActionResult } from '@/types'

const changerStatutSchema = z.object({
  marcheId: z.string().min(1),
  newStatut: z.nativeEnum(StatutMarche),
  commentaire: z.string().optional(),
})

export async function changerStatutMarche(
  data: unknown
): Promise<ActionResult<{ statut: StatutMarche }>> {
  try {
    const session = await requireMarcheWrite()
    const { marcheId, newStatut, commentaire } = changerStatutSchema.parse(data)

    // 1. Récupérer le statut actuel
    const marche = await prisma.marche.findUnique({
      where: { id: marcheId },
      select: {
        statut: true,
        _count: { select: { cautions: { where: { statut: 'ACTIVE' } } } },
      },
    })

    if (!marche) {
      return { success: false, error: 'Marché introuvable.' }
    }

    // 2. Vérifier la transition
    if (!isTransitionValid(marche.statut, newStatut)) {
      return {
        success: false,
        error: `Transition interdite : "${STATUT_LABELS[marche.statut]}" → "${STATUT_LABELS[newStatut]}".`,
      }
    }

    // 3. Commentaire obligatoire pour les statuts critiques
    if (COMMENTAIRE_OBLIGATOIRE.includes(newStatut) && !commentaire?.trim()) {
      return {
        success: false,
        error: 'Un commentaire est obligatoire pour cette transition.',
      }
    }

    // 4. Bloquer CLOTURE si cautions actives
    if (newStatut === 'CLOTURE' && marche._count.cautions > 0) {
      return {
        success: false,
        error: `Impossible de clôturer : ${marche._count.cautions} caution(s) encore active(s). Libérez-les d'abord.`,
      }
    }

    // 5. Transaction : mise à jour statut + historique
    await prisma.$transaction([
      prisma.marche.update({
        where: { id: marcheId },
        data: { statut: newStatut },
      }),
      prisma.historiqueStatut.create({
        data: {
          marcheId,
          ancienStatut: marche.statut,
          nouveauStatut: newStatut,
          commentaire: commentaire?.trim() || null,
          userId: session.user.id as string,
        },
      }),
    ])

    revalidatePath(`/marches/${marcheId}`)

    return { success: true, data: { statut: newStatut } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Données invalides.' }
    }
    console.error('changerStatutMarche error:', error)
    return { success: false, error: 'Erreur lors du changement de statut.' }
  }
}
```

**Step 2 : Vérifier que le type `session.user.id` est disponible**

Dans `lib/auth/auth.config.ts`, le token JWT expose `id`. Si `session.user` ne typo pas `id`, caster en `(session.user as { id: string }).id`.

**Step 3 : Commit**

```bash
git add lib/actions/statuts.ts
git commit -m "feat(p6): Server Action changerStatutMarche avec validations métier"
```

---

## Task 3 : Composant `StatutWorkflowStepper`

**Files:**
- Create: `components/marches/statut-workflow-stepper.tsx`

**Step 1 : Créer le composant**

```typescript
import { StatutMarche } from '@prisma/client'
import { Check, Circle, X, ArrowRight } from 'lucide-react'
import { STATUT_LABELS } from '@/lib/utils/statut'
import { CHEMIN_PRINCIPAL, TERMINAUX_LATERAUX } from '@/lib/utils/workflow-statuts'
import { cn } from '@/lib/utils'

interface StatutWorkflowStepperProps {
  currentStatut: StatutMarche
  selectedStatut?: StatutMarche
}

export function StatutWorkflowStepper({
  currentStatut,
  selectedStatut,
}: StatutWorkflowStepperProps) {
  const currentIdx = CHEMIN_PRINCIPAL.indexOf(currentStatut)
  const selectedIdx = selectedStatut ? CHEMIN_PRINCIPAL.indexOf(selectedStatut) : -1
  const isCurrentTerminalLateral = TERMINAUX_LATERAUX.includes(currentStatut)

  return (
    <div className="space-y-2">
      {/* Chemin principal */}
      <ol className="relative space-y-1">
        {CHEMIN_PRINCIPAL.map((statut, idx) => {
          const isPast = idx < currentIdx
          const isCurrent = statut === currentStatut
          const isSelected = statut === selectedStatut && statut !== currentStatut
          const isFuture = idx > currentIdx && !isCurrent

          return (
            <li key={statut} className="flex items-center gap-2 py-0.5">
              <span
                className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs',
                  isPast && 'bg-green-100 border-green-500 text-green-700',
                  isCurrent && 'bg-blue-100 border-blue-600 text-blue-700 font-bold',
                  isSelected && 'bg-amber-100 border-amber-500 text-amber-700',
                  isFuture && !isSelected && 'bg-gray-50 border-gray-300 text-gray-400'
                )}
              >
                {isPast ? (
                  <Check className="h-3 w-3" />
                ) : isCurrent ? (
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                ) : isSelected ? (
                  <ArrowRight className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </span>
              <span
                className={cn(
                  'text-xs',
                  isPast && 'text-green-700',
                  isCurrent && 'font-semibold text-blue-700',
                  isSelected && 'font-semibold text-amber-700',
                  isFuture && !isSelected && 'text-muted-foreground'
                )}
              >
                {STATUT_LABELS[statut]}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Branches terminales latérales */}
      {(TERMINAUX_LATERAUX.some((t) =>
        CHEMIN_PRINCIPAL.slice(currentIdx).some(() => true)
      ) || isCurrentTerminalLateral) && (
        <div className="mt-2 border-t pt-2">
          <p className="text-xs text-muted-foreground mb-1">Terminaisons possibles :</p>
          <div className="flex flex-wrap gap-2">
            {TERMINAUX_LATERAUX.map((statut) => {
              const isSelected = statut === selectedStatut
              const isCurrent = statut === currentStatut
              return (
                <span
                  key={statut}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border',
                    isCurrent && 'bg-gray-200 border-gray-400 text-gray-700 font-semibold',
                    isSelected && 'bg-amber-100 border-amber-500 text-amber-700 font-semibold',
                    !isCurrent && !isSelected && 'bg-gray-50 border-gray-200 text-gray-400'
                  )}
                >
                  <X className="h-2.5 w-2.5" />
                  {STATUT_LABELS[statut]}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2 : Commit**

```bash
git add components/marches/statut-workflow-stepper.tsx
git commit -m "feat(p6): StatutWorkflowStepper — chemin principal + branches terminales"
```

---

## Task 4 : Composant `StatutChangerButton` (Sheet complet)

**Files:**
- Create: `components/marches/statut-changer-button.tsx`

**Step 1 : Créer le composant**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { StatutMarche } from '@prisma/client'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatutBadge } from './statut-badge'
import { StatutWorkflowStepper } from './statut-workflow-stepper'
import { changerStatutMarche } from '@/lib/actions/statuts'
import { getAvailableStatuts, COMMENTAIRE_OBLIGATOIRE } from '@/lib/utils/workflow-statuts'
import { STATUT_LABELS } from '@/lib/utils/statut'
import { toast } from '@/lib/utils/toast'

interface StatutChangerButtonProps {
  marcheId: string
  currentStatut: StatutMarche
  onStatutChanged?: (newStatut: StatutMarche) => void
}

export function StatutChangerButton({
  marcheId,
  currentStatut,
  onStatutChanged,
}: StatutChangerButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedStatut, setSelectedStatut] = useState<StatutMarche | ''>('')
  const [commentaire, setCommentaire] = useState('')
  const [isPending, startTransition] = useTransition()

  const availableStatuts = getAvailableStatuts(currentStatut).filter(
    (s) => s !== currentStatut
  )

  const needsComment =
    selectedStatut !== '' && COMMENTAIRE_OBLIGATOIRE.includes(selectedStatut as StatutMarche)

  const commentaireLabel =
    selectedStatut === 'RESILIE' ? 'Motif de résiliation *' : 'Commentaire *'

  function handleClose() {
    setOpen(false)
    setSelectedStatut('')
    setCommentaire('')
  }

  function handleSubmit() {
    if (!selectedStatut) return

    if (needsComment && !commentaire.trim()) {
      toast.error('Un commentaire est obligatoire pour cette transition.')
      return
    }

    startTransition(async () => {
      const result = await changerStatutMarche({
        marcheId,
        newStatut: selectedStatut,
        commentaire: commentaire.trim() || undefined,
      })

      if (result.success) {
        toast.success(`Statut changé : ${STATUT_LABELS[result.data.statut]}`)
        handleClose()
        onStatutChanged?.(result.data.statut)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={availableStatuts.length === 0}
      >
        <ArrowLeftRight className="h-4 w-4 mr-1.5" />
        Statut
      </Button>

      <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Changer le statut</SheetTitle>
            <SheetDescription>
              Sélectionnez le nouveau statut du marché.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-5">
            {/* Statut actuel */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Statut actuel</p>
              <StatutBadge statut={currentStatut} />
            </div>

            {/* Stepper visuel */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Workflow</p>
              <StatutWorkflowStepper
                currentStatut={currentStatut}
                selectedStatut={selectedStatut || undefined}
              />
            </div>

            {/* Select nouveau statut */}
            <div className="space-y-1.5">
              <Label htmlFor="new-statut">Nouveau statut *</Label>
              <Select
                value={selectedStatut}
                onValueChange={(v) => setSelectedStatut(v as StatutMarche)}
              >
                <SelectTrigger id="new-statut">
                  <SelectValue placeholder="Choisir un statut..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuts.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Commentaire conditionnel */}
            {selectedStatut && (
              <div className="space-y-1.5">
                <Label htmlFor="commentaire">
                  {needsComment ? commentaireLabel : 'Commentaire (optionnel)'}
                </Label>
                <Textarea
                  id="commentaire"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder={
                    needsComment
                      ? 'Expliquez la raison de ce changement...'
                      : 'Note sur ce changement de statut (facultatif)'
                  }
                  rows={3}
                />
              </div>
            )}
          </div>

          <SheetFooter className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedStatut || isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirmer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

**Step 2 : Commit**

```bash
git add components/marches/statut-changer-button.tsx
git commit -m "feat(p6): StatutChangerButton — Sheet + stepper + form + validation client"
```

---

## Task 5 : Intégration dans `MarcheDetail`

**Files:**
- Modify: `components/marches/marche-detail.tsx`

**Step 1 : Convertir en client component avec state statut**

`MarcheDetail` est déjà un client component (il utilise `useState` pour d'autres choses). Vérifier en tête de fichier. Ajouter l'import et le state :

```typescript
// Ajouter l'import
import { StatutChangerButton } from './statut-changer-button'
import { useState } from 'react'
```

**Step 2 : Ajouter le state `currentStatut` local**

En haut de la fonction `MarcheDetail`, après la déclaration des autres states :

```typescript
const [currentStatut, setCurrentStatut] = useState<StatutMarche>(marche.statut as StatutMarche)
```

Et remplacer `marche.statut` par `currentStatut` partout où il est utilisé pour l'affichage (badge, section infos spécifiques au statut).

**Step 3 : Insérer le bouton à côté du badge statut**

Localiser le bloc (ligne ~45-60 dans `marche-detail.tsx`) :

```tsx
<StatutBadge statut={marche.statut} size="lg" />
{canWrite && (
  <>
    <Button variant="outline" size="sm" asChild>
      ...
```

Remplacer par :

```tsx
<StatutBadge statut={currentStatut} size="lg" />
{canWrite && (
  <>
    <StatutChangerButton
      marcheId={marche.id}
      currentStatut={currentStatut}
      onStatutChanged={setCurrentStatut}
    />
    <Button variant="outline" size="sm" asChild>
      ...
```

**Step 4 : Vérifier l'import `StatutMarche`**

S'assurer que `StatutMarche` est importé depuis `@prisma/client` en haut du fichier.

**Step 5 : Commit**

```bash
git add components/marches/marche-detail.tsx
git commit -m "feat(p6): intégrer StatutChangerButton dans MarcheDetail"
```

---

## Task 6 : Tests Playwright production

**Files:**
- Create: `tests/marches/statut-changer.spec.ts`

**Step 1 : Créer le fichier de test**

```typescript
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// Marché EN_EXECUTION existant en prod (à ajuster si besoin)
const MARCHE_ID_EXECUTION = process.env.TEST_MARCHE_ID || ''

test.describe('Phase 6 — Changement de statut', () => {
  test.beforeEach(async ({ page }) => {
    // Login ADMIN
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@stam.tg')
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD || 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 })
  })

  test('bouton Statut visible pour ADMIN', async ({ page }) => {
    await page.goto(`${BASE_URL}/marches`)
    await page.waitForLoadState('networkidle')
    // Cliquer sur le premier marché non-terminal
    const firstLink = page.locator('table tbody tr a').first()
    await firstLink.click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /Statut/i })).toBeVisible()
  })

  test('Sheet s\'ouvre avec statuts autorisés', async ({ page }) => {
    await page.goto(`${BASE_URL}/marches`)
    await page.waitForLoadState('networkidle')
    const firstLink = page.locator('table tbody tr a').first()
    await firstLink.click()
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /Statut/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Changer le statut')).toBeVisible()
    await expect(page.getByText('Workflow')).toBeVisible()
  })

  test('commentaire obligatoire pour transition ANNULE', async ({ page }) => {
    await page.goto(`${BASE_URL}/marches`)
    await page.waitForLoadState('networkidle')
    // Trouver un marché avec ANNULE disponible
    const firstLink = page.locator('table tbody tr a').first()
    await firstLink.click()
    await page.waitForLoadState('networkidle')

    const btn = page.getByRole('button', { name: /Statut/i })
    if (!(await btn.isEnabled())) {
      test.skip()
      return
    }

    await btn.click()
    await page.waitForSelector('[role="dialog"]')

    // Sélectionner ANNULE si disponible
    const select = page.locator('#new-statut')
    await select.click()
    const annuleOption = page.getByRole('option', { name: 'Annulé' })
    if (!(await annuleOption.isVisible())) {
      test.skip()
      return
    }
    await annuleOption.click()

    // Soumettre sans commentaire
    await page.getByRole('button', { name: 'Confirmer' }).click()
    await expect(page.getByText(/commentaire.*obligatoire/i)).toBeVisible({ timeout: 5000 })
  })

  test('fermeture Sheet avec Annuler', async ({ page }) => {
    await page.goto(`${BASE_URL}/marches`)
    await page.waitForLoadState('networkidle')
    const firstLink = page.locator('table tbody tr a').first()
    await firstLink.click()
    await page.waitForLoadState('networkidle')

    const btn = page.getByRole('button', { name: /Statut/i })
    if (!(await btn.isEnabled())) { test.skip(); return }

    await btn.click()
    await page.waitForSelector('[role="dialog"]')
    await page.getByRole('button', { name: 'Annuler' }).click()
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })
  })
})
```

**Step 2 : Lancer les tests**

```bash
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
  npx playwright test tests/marches/statut-changer.spec.ts --project=chromium --headed --workers=1
```

**Step 3 : Commit**

```bash
git add tests/marches/statut-changer.spec.ts
git commit -m "test(p6): tests Playwright — StatutChangerButton Sheet + validations"
```

---

## Task 7 : Push + vérification déploiement

**Step 1 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "^tests/"
```

Attendu : aucune erreur.

**Step 2 : Push**

```bash
git push origin feature/v1-professionnaliser
```

**Step 3 : Vérifier le déploiement via API GitHub**

```bash
curl -s "https://api.github.com/repos/henrymartium-sudo/Erp-march-s-STAM/deployments?per_page=1" \
  -H "Authorization: token $(git credential fill <<< $'protocol=https\nhost=github.com' | grep password | cut -d= -f2)" \
  | grep '"state"'
```

Attendu : `"state": "success"`

---

## Récapitulatif des commits

| Commit | Description |
|--------|-------------|
| T1 | `feat(p6): add COMMENTAIRE_OBLIGATOIRE + CHEMIN_PRINCIPAL constants` |
| T2 | `feat(p6): Server Action changerStatutMarche avec validations métier` |
| T3 | `feat(p6): StatutWorkflowStepper — chemin principal + branches terminales` |
| T4 | `feat(p6): StatutChangerButton — Sheet + stepper + form + validation client` |
| T5 | `feat(p6): intégrer StatutChangerButton dans MarcheDetail` |
| T6 | `test(p6): tests Playwright — StatutChangerButton Sheet + validations` |
| T7 | Push + vérification déploiement |
