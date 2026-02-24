# Exports PDF amélioré + Excel formules + Identités utilisateurs — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter la prévisualisation/orientation PDF, les formules Excel dynamiques, et la gestion des identifiants multiples par utilisateur.

**Architecture:**
- F2 (Excel formules) : nouvelle fonction pure `applyFormula` + extension optionnelle de `ExcelColumn.formula`
- F1 (PDF) : nouveau composant `PDFExportModal` + param `orientation`/`preview` dans les routes existantes
- F3 (UserIdentifier) : nouvelle table Prisma + lookup auth + page admin `/admin/utilisateurs`

**Tech Stack:** Next.js 15, React 19, @react-pdf/renderer 4.3.2, ExcelJS 4.4.0, Prisma 7, shadcn/ui, Playwright (tests E2E uniquement — pas de jest/vitest)

**Ordre :** F2 → F1 → F3 (du plus isolé au plus impactant)

---

## Task 1 : F2 — Créer `lib/exports/excelFormulaEngine.ts`

**Files:**
- Créer : `lib/exports/excelFormulaEngine.ts`

**Step 1 : Créer le fichier**

```ts
/**
 * Moteur de formules Excel — remplace {row} par le numéro de ligne réel
 *
 * @param rowIndex   Numéro de ligne Excel (1-based, numéro réel dans le worksheet)
 * @param formula    Formule avec placeholder : "C{row}*1.18" ou "D{row}+E{row}"
 * @param columnsMap Optionnel — mapping clé métier → lettre colonne : { montant: 'C' }
 *
 * @example
 *   applyFormula(6, "C{row}*1.18")          → "C6*1.18"
 *   applyFormula(6, "{montant}*1.18", { montant: 'C' }) → "C*1.18" (non, ça ne marche pas)
 *   // Note : columnsMap remplace {clé} par la lettre, pas la référence complète
 *   applyFormula(6, "{montant}{row}*1.18", { montant: 'C' }) → "C6*1.18"
 */
export function applyFormula(
  rowIndex: number,
  formula: string,
  columnsMap?: Record<string, string>
): string {
  // Remplacement du placeholder {row}
  let result = formula.replace(/\{row\}/g, String(rowIndex))

  // Remplacement des clés métier par leurs lettres de colonne
  if (columnsMap) {
    for (const [key, letter] of Object.entries(columnsMap)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), letter)
    }
  }

  return result
}
```

**Step 2 : Vérifier la compilation TypeScript**

```bash
cd "C:\Users\HP\Documents\claude projets\projet ERP marchés\ERP Marchés STAM Final"
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur dans `lib/`

**Step 3 : Commit**

```bash
git add lib/exports/excelFormulaEngine.ts
git commit -m "feat(excel): add applyFormula engine with {row} placeholder support"
```

---

## Task 2 : F2 — Étendre `ExcelColumn` + `createExcelFile`

**Files:**
- Modifier : `lib/utils/excel.ts`

**Step 1 : Ajouter `formula?` à `ExcelColumn`**

Dans `lib/utils/excel.ts`, modifier l'interface (ligne ~8) :

```ts
import { applyFormula } from '@/lib/exports/excelFormulaEngine'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
  style?: Partial<ExcelJS.Style>
  formula?: string  // ex. "C{row}*1.18" — {row} est remplacé par le numéro de ligne Excel réel
}
```

**Step 2 : Modifier la boucle de données dans `createExcelFile`**

Trouver la section `// DONNÉES` (ligne ~198). Remplacer :

```ts
  options.data.forEach((row) => {
    const dataRow = worksheet.getRow(currentRow)

    options.columns.forEach((column, index) => {
      const cell = dataRow.getCell(index + 1)
      const value = formatValueForExcel(row[column.key], column)

      cell.value = value
      applyCellStyle(cell, column, value)
    })

    currentRow++
  })
```

Par :

```ts
  options.data.forEach((row) => {
    const dataRow = worksheet.getRow(currentRow)
    const excelRowIndex = currentRow // numéro de ligne réel dans le worksheet

    options.columns.forEach((column, index) => {
      const cell = dataRow.getCell(index + 1)
      const value = formatValueForExcel(row[column.key], column)

      if (column.formula) {
        // Écriture formule Excel + valeur brute comme résultat de repli
        const numericValue = typeof value === 'number' ? value : undefined
        cell.value = {
          formula: applyFormula(excelRowIndex, column.formula),
          result: numericValue,
        } as ExcelJS.CellFormulaValue
      } else {
        cell.value = value
      }

      applyCellStyle(cell, column, value)
    })

    currentRow++
  })
```

**Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur dans `lib/`

**Step 4 : Vérifier le build Next.js**

```bash
npm run build 2>&1 | tail -20
```

Attendu : `✓ Compiled successfully` ou exit 0

**Step 5 : Commit**

```bash
git add lib/utils/excel.ts
git commit -m "feat(excel): add optional formula field to ExcelColumn with ExcelJS formula support"
```

---

## Task 3 : F2 — Tests Playwright exports Excel (non-régression)

**Files:**
- Modifier : `tests/exports/marches-exports.spec.ts`

**Step 1 : Vérifier que les tests Excel existants passent toujours**

```bash
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app npx playwright test tests/exports/marches-exports.spec.ts --project=chromium --grep "Excel" --workers=1
```

Attendu : PASS (le flow Excel est inchangé)

**Step 2 : Si PASS → commit vide, sinon investiguer**

Les exports Excel sans `formula` doivent être strictement identiques. Aucune modification des server actions n'est nécessaire pour la F2 (les colonnes existantes n'ont pas de `formula`).

---

## Task 4 : F1 — Créer `lib/pdf/layout.ts`

**Files:**
- Créer : `lib/pdf/layout.ts`

**Step 1 : Créer le fichier**

```ts
/**
 * Utilitaire de dimensionnement PDF selon l'orientation
 * Dimensions A4 en points (1pt = 1/72 inch)
 */

export type PDFOrientation = 'portrait' | 'landscape'

export interface PDFPageLayout {
  /** Orientation de la page */
  orientation: PDFOrientation
  /**
   * Largeur utile du contenu (hors padding 30pt de chaque côté)
   * Portrait  : 595.28 - 60 = 535.28pt
   * Paysage   : 841.89 - 60 = 781.89pt
   */
  contentWidth: number
}

const LAYOUTS: Record<PDFOrientation, PDFPageLayout> = {
  portrait: {
    orientation: 'portrait',
    contentWidth: 535,
  },
  landscape: {
    orientation: 'landscape',
    contentWidth: 782,
  },
}

/**
 * Retourne les dimensions de page selon l'orientation demandée
 * @param orientation 'portrait' | 'landscape' — défaut : 'portrait'
 */
export function getPageLayout(
  orientation: PDFOrientation = 'portrait'
): PDFPageLayout {
  return LAYOUTS[orientation]
}
```

**Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur

**Step 3 : Commit**

```bash
git add lib/pdf/layout.ts
git commit -m "feat(pdf): add layout utility for orientation-aware page dimensions"
```

---

## Task 5 : F1 — Étendre `PDFExportOptions` + `createPDFDocument`

**Files:**
- Modifier : `lib/utils/pdf.tsx`

**Step 1 : Ajouter `orientation` à `PDFExportOptions`**

Trouver l'interface `PDFExportOptions` (ligne ~30). Ajouter le champ :

```ts
import { getPageLayout, type PDFOrientation } from '@/lib/pdf/layout'

export interface PDFExportOptions {
  title: string
  subtitle?: string
  columns: PDFColumn[]
  data: any[]
  summary?: PDFSummaryItem[]
  orientation?: PDFOrientation  // défaut : 'portrait'
}
```

**Step 2 : Utiliser l'orientation dans `createPDFDocument`**

Trouver la fonction `createPDFDocument` (ligne ~403). Modifier :

```ts
export async function createPDFDocument(
  options: PDFExportOptions
): Promise<Buffer> {
  const orientation = options.orientation ?? 'portrait'

  const PDFDoc = () => (
    <Document>
      <Page size="A4" orientation={orientation} style={pdfStyles.page}>
        {/* Header fixe */}
        <PDFHeader title={options.title} subtitle={options.subtitle} />

        {/* Tableau de données */}
        <PDFTable columns={options.columns} data={options.data} />

        {/* Summary optionnel */}
        {options.summary && options.summary.length > 0 && (
          <PDFSummary items={options.summary} />
        )}

        {/* Footer fixe */}
        <PDFFooter />
      </Page>
    </Document>
  )

  // Génération du PDF en Buffer
  const blob = await pdf(<PDFDoc />).toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
```

**Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur

**Step 4 : Commit**

```bash
git add lib/utils/pdf.tsx lib/pdf/layout.ts
git commit -m "feat(pdf): add orientation param to createPDFDocument (portrait default, backward compatible)"
```

---

## Task 6 : F1 — Étendre les server actions PDF (orientation)

**Files:**
- Modifier : `lib/actions/exports.ts`

**Step 1 : Étendre `ExportFilters`**

Trouver l'interface `ExportFilters` (ligne ~26). Ajouter :

```ts
interface ExportFilters {
  statut?: string
  type?: string
  dateDebut?: string
  dateFin?: string
  search?: string
  orientation?: 'portrait' | 'landscape'  // pour les exports PDF
}
```

**Step 2 : Passer `orientation` dans chaque fonction `export[Module]PDF()`**

Pour chacune des 4 fonctions (`exportMarchesPDF`, `exportCautionsPDF`, `exportDocumentsPDF`, `exportVehiculesPDF`), modifier l'appel à `createPDFDocument` pour inclure l'orientation :

```ts
// Exemple pour exportMarchesPDF — appliquer le même pattern aux 4 fonctions
const buffer = await createPDFDocument({
  title: 'Export des Marchés Publics',
  subtitle: `${marches.length} marché${marches.length > 1 ? 's' : ''}`,
  columns,
  data,
  summary,
  orientation: filters?.orientation ?? 'portrait',  // ← AJOUT
})
```

**Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur

**Step 4 : Commit**

```bash
git add lib/actions/exports.ts
git commit -m "feat(pdf): pass orientation from filters to createPDFDocument in all PDF export actions"
```

---

## Task 7 : F1 — Étendre les routes API PDF (`orientation` + `preview`)

**Files:**
- Modifier : `app/api/exports-pdf/marches/route.ts`
- Modifier : `app/api/exports-pdf/cautions/route.ts`
- Modifier : `app/api/exports-pdf/vehicules/route.ts`
- Modifier : `app/api/exports-pdf/documents/route.ts`

**Step 1 : Pattern à appliquer aux 4 routes**

Remplacer chaque route par ce pattern (exemple pour `marches`) :

```ts
import { NextRequest, NextResponse } from 'next/server'
import { exportMarchesPDF } from '@/lib/actions/exports'
import { auth } from '@/lib/auth/auth.config'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams

    // Extraction des filtres depuis les query params
    const rawOrientation = searchParams.get('orientation')
    const orientation =
      rawOrientation === 'landscape' ? 'landscape' : 'portrait'
    const isPreview = searchParams.get('preview') === 'true'

    const filters = {
      statut: searchParams.get('statut') || undefined,
      type: searchParams.get('type') || undefined,
      dateDebut: searchParams.get('dateDebut') || undefined,
      dateFin: searchParams.get('dateFin') || undefined,
      search: searchParams.get('search') || undefined,
      orientation,
    }

    const result = await exportMarchesPDF(filters)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // inline pour prévisualisation, attachment pour téléchargement
    const disposition = isPreview
      ? `inline; filename="${result.data.filename}"`
      : `attachment; filename="${result.data.filename}"`

    return new NextResponse(new Uint8Array(result.data.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    })
  } catch (error: any) {
    console.error('[API_EXPORT_MARCHES_PDF]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
```

Appliquer le même pattern à `cautions`, `vehicules`, `documents` en changeant la fonction importée et le log d'erreur.

**Step 2 : Vérifier le build**

```bash
npm run build 2>&1 | tail -20
```

Attendu : exit 0

**Step 3 : Commit**

```bash
git add app/api/exports-pdf/
git commit -m "feat(pdf): add orientation + preview params to all PDF API routes"
```

---

## Task 8 : F1 — Créer `PDFExportModal`

**Files:**
- Créer : `components/exports/PDFExportModal.tsx`

**Step 1 : Créer le composant**

```tsx
'use client'

import { useState } from 'react'
import { FileText, Loader2, Download, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

// ============================================================================
// TYPES
// ============================================================================

type PDFOrientation = 'portrait' | 'landscape'

interface PDFExportModalProps {
  open: boolean
  onClose: () => void
  /** URL de base de l'API PDF — ex. "/api/exports-pdf/marches?statut=EN_COURS" */
  apiUrl: string
  /** Nom du module pour les labels */
  moduleName?: string
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function PDFExportModal({
  open,
  onClose,
  apiUrl,
  moduleName = 'données',
}: PDFExportModalProps) {
  const [orientation, setOrientation] = useState<PDFOrientation>('portrait')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingDownload, setLoadingDownload] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  /** Construit l'URL finale avec les params orientation et preview */
  const buildUrl = (preview: boolean): string => {
    const separator = apiUrl.includes('?') ? '&' : '?'
    const previewParam = preview ? '&preview=true' : ''
    return `${apiUrl}${separator}orientation=${orientation}${previewParam}`
  }

  /** Charge la prévisualisation dans l'iframe */
  const handlePreview = async () => {
    setLoadingPreview(true)
    setPreviewUrl(null)
    try {
      const url = buildUrl(true)
      // Vérifier que l'endpoint répond avant d'afficher l'iframe
      const response = await fetch(url)
      if (!response.ok) throw new Error('Erreur de génération PDF')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      setPreviewUrl(objectUrl)
    } catch (error) {
      console.error('[PDF_PREVIEW]', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  /** Déclenche le téléchargement direct */
  const handleDownload = async () => {
    setLoadingDownload(true)
    try {
      const url = buildUrl(false)
      const response = await fetch(url)
      if (!response.ok) throw new Error('Erreur de génération PDF')
      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `export_${Date.now()}.pdf`
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
      onClose()
    } catch (error) {
      console.error('[PDF_DOWNLOAD]', error)
    } finally {
      setLoadingDownload(false)
    }
  }

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setOrientation('portrait')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-600" />
            Export PDF — {moduleName}
          </DialogTitle>
        </DialogHeader>

        {/* Sélecteur orientation */}
        <div className="flex items-center gap-6 py-3 border-b">
          <Label className="text-sm font-medium text-muted-foreground">
            Orientation :
          </Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="orientation"
                value="portrait"
                checked={orientation === 'portrait'}
                onChange={() => {
                  setOrientation('portrait')
                  setPreviewUrl(null)
                }}
                className="accent-primary"
              />
              <span className="text-sm">Portrait</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="orientation"
                value="landscape"
                checked={orientation === 'landscape'}
                onChange={() => {
                  setOrientation('landscape')
                  setPreviewUrl(null)
                }}
                className="accent-primary"
              />
              <span className="text-sm">Paysage</span>
            </label>
          </div>
        </div>

        {/* Zone de prévisualisation */}
        <div className="min-h-[400px] bg-muted/30 rounded-lg border flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-[500px] rounded-lg"
              title="Prévisualisation PDF"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Cliquez sur &quot;Prévisualiser&quot; pour voir le rendu
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={loadingPreview || loadingDownload}
          >
            {loadingPreview ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Prévisualiser
          </Button>
          <Button
            onClick={handleDownload}
            disabled={loadingPreview || loadingDownload}
          >
            {loadingDownload ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur

**Step 3 : Commit**

```bash
git add components/exports/PDFExportModal.tsx
git commit -m "feat(pdf): add PDFExportModal with orientation selector and inline preview"
```

---

## Task 9 : F1 — Mettre à jour `ExportMenu` pour utiliser `PDFExportModal`

**Files:**
- Modifier : `components/exports/export-menu.tsx`

**Step 1 : Modifier le composant**

Remplacer le contenu de `export-menu.tsx` par :

```tsx
'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react'
import { toast } from '@/lib/utils/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { PDFExportModal } from './PDFExportModal'

// ============================================================================
// TYPES
// ============================================================================

type ExportType = 'marches' | 'cautions' | 'documents' | 'vehicules'

export interface ExportFilters {
  statut?: string
  type?: string
  phase?: string
  dateDebut?: string
  dateFin?: string
  search?: string
  marcheId?: string
}

/** Labels affichés dans la modal PDF */
const MODULE_LABELS: Record<ExportType, string> = {
  marches: 'Marchés',
  cautions: 'Cautions',
  documents: 'Documents',
  vehicules: 'Véhicules',
}

interface ExportMenuProps {
  type: ExportType
  filters?: ExportFilters
  buttonText?: string
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon'
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost'
  disabled?: boolean
  className?: string
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function ExportMenu({
  type,
  filters,
  buttonText = 'Exporter',
  buttonSize = 'default',
  buttonVariant = 'outline',
  disabled = false,
  className,
}: ExportMenuProps) {
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [pdfModalOpen, setPdfModalOpen] = useState(false)

  /** Construit l'URL API Excel avec les filtres */
  const buildExcelUrl = (): string => {
    const params = new URLSearchParams()
    if (filters?.statut) params.set('statut', filters.statut)
    if (filters?.type) params.set('type', filters.type)
    if (filters?.phase) params.set('phase', filters.phase)
    if (filters?.dateDebut) params.set('dateDebut', filters.dateDebut)
    if (filters?.dateFin) params.set('dateFin', filters.dateFin)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.marcheId) params.set('marcheId', filters.marcheId)
    const qs = params.toString()
    return `/api/exports/${type}${qs ? `?${qs}` : ''}`
  }

  /** Construit l'URL de base pour la modal PDF (sans orientation/preview — ajoutés par la modal) */
  const buildPdfBaseUrl = (): string => {
    const params = new URLSearchParams()
    if (filters?.statut) params.set('statut', filters.statut)
    if (filters?.type) params.set('type', filters.type)
    if (filters?.phase) params.set('phase', filters.phase)
    if (filters?.dateDebut) params.set('dateDebut', filters.dateDebut)
    if (filters?.dateFin) params.set('dateFin', filters.dateFin)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.marcheId) params.set('marcheId', filters.marcheId)
    const qs = params.toString()
    return `/api/exports-pdf/${type}${qs ? `?${qs}` : ''}`
  }

  /** Télécharge l'export Excel */
  const handleExcelExport = async () => {
    setLoadingExcel(true)
    try {
      const url = buildExcelUrl()
      const response = await fetch(url)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur lors de l'export")
      }
      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch =
        contentDisposition?.match(/filename="(.+)"/) ||
        contentDisposition?.match(/filename=([^;]+)/)
      const filename = filenameMatch?.[1] || `export_${type}_${Date.now()}.xlsx`
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      toast.success('Export Excel réussi', {
        description: `Le fichier ${filename} a été téléchargé`,
      })
    } catch (error: any) {
      console.error('[EXPORT_MENU_EXCEL]', error)
      toast.error("Erreur lors de l'export", {
        description: error.message || 'Une erreur est survenue',
      })
    } finally {
      setLoadingExcel(false)
    }
  }

  const isLoading = loadingExcel

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={buttonVariant}
            size={buttonSize}
            disabled={disabled || isLoading}
            className={className}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {buttonText}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Format d&apos;export</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Option Excel — inchangée */}
          <DropdownMenuItem
            onClick={handleExcelExport}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            <div className="flex flex-col">
              <span className="font-medium">Excel (.xlsx)</span>
              <span className="text-xs text-muted-foreground">
                Tableur avec totaux
              </span>
            </div>
            {loadingExcel && (
              <Loader2 className="ml-auto h-4 w-4 animate-spin" />
            )}
          </DropdownMenuItem>

          {/* Option PDF — ouvre la modal */}
          <DropdownMenuItem
            onClick={() => setPdfModalOpen(true)}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4 text-red-600" />
            <div className="flex flex-col">
              <span className="font-medium">PDF (.pdf)</span>
              <span className="text-xs text-muted-foreground">
                Aperçu + choix orientation
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal PDF */}
      <PDFExportModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        apiUrl={buildPdfBaseUrl()}
        moduleName={MODULE_LABELS[type]}
      />
    </>
  )
}
```

**Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur

**Step 3 : Build complet**

```bash
npm run build 2>&1 | tail -20
```

Attendu : exit 0

**Step 4 : Commit**

```bash
git add components/exports/export-menu.tsx components/exports/PDFExportModal.tsx
git commit -m "feat(pdf): update ExportMenu to open PDFExportModal on PDF click"
```

---

## Task 10 : F1 — Mettre à jour les tests Playwright exports PDF

**Files:**
- Modifier : `tests/exports/marches-exports.spec.ts`
- Modifier : `tests/exports/cautions-exports.spec.ts`
- Modifier : `tests/exports/vehicules-exports.spec.ts`
- Modifier : `tests/exports/documents-exports.spec.ts`

**Step 1 : Pattern de mise à jour — nouveau flow PDF**

Dans chaque fichier de test, remplacer les tests PDF qui attendent un téléchargement direct par le nouveau flow modal. Exemple pour `marches-exports.spec.ts` — remplacer le test `devrait pouvoir exporter la liste des marchés en PDF` :

```ts
test('devrait pouvoir exporter la liste des marchés en PDF via la modal', async ({ page }) => {
  await page.goto('/marches')
  await wait(1000)

  // Ouvrir le menu export
  const exportButton = page.locator('button:has-text("Exporter")')
  await exportButton.click()
  await wait(500)

  // Cliquer sur "PDF (.pdf)" — ouvre la modal (plus de téléchargement direct)
  const pdfOption = page.locator('text=PDF (.pdf)')
  await expect(pdfOption).toBeVisible()
  await pdfOption.click()

  // Vérifier que la modal s'ouvre
  const modal = page.locator('[role="dialog"]')
  await expect(modal).toBeVisible({ timeout: 5000 })

  // Vérifier les éléments de la modal
  await expect(modal.locator('text=Export PDF')).toBeVisible()
  await expect(modal.locator('input[value="portrait"]')).toBeChecked()
  await expect(modal.locator('input[value="landscape"]')).toBeVisible()
  await expect(modal.locator('button:has-text("Prévisualiser")')).toBeVisible()
  await expect(modal.locator('button:has-text("Télécharger")')).toBeVisible()

  // Tester le téléchargement depuis la modal
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await modal.locator('button:has-text("Télécharger")').click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/\.pdf$/)

  // Fermer la modal si elle est encore ouverte
  const cancelBtn = page.locator('button:has-text("Annuler")')
  if (await cancelBtn.isVisible()) await cancelBtn.click()
})

test('devrait pouvoir prévisualiser le PDF en paysage', async ({ page }) => {
  await page.goto('/marches')
  await wait(1000)

  const exportButton = page.locator('button:has-text("Exporter")')
  await exportButton.click()
  await wait(500)

  await page.locator('text=PDF (.pdf)').click()
  await wait(500)

  const modal = page.locator('[role="dialog"]')
  await expect(modal).toBeVisible({ timeout: 5000 })

  // Sélectionner Paysage
  await modal.locator('input[value="landscape"]').click()
  await expect(modal.locator('input[value="landscape"]')).toBeChecked()

  // Prévisualiser
  await modal.locator('button:has-text("Prévisualiser")').click()

  // Attendre que l'iframe apparaisse (génération PDF peut prendre 5-10s)
  await expect(modal.locator('iframe[title="Prévisualisation PDF"]')).toBeVisible({
    timeout: 20000,
  })

  // Fermer la modal
  await modal.locator('button:has-text("Annuler")').click()
})
```

Appliquer le même pattern aux 3 autres fichiers de tests export (`cautions`, `vehicules`, `documents`).

**Step 2 : Lancer les tests sur production**

```bash
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app npx playwright test tests/exports/ --project=chromium --workers=1 --headed
```

Attendu : tests PDF passent avec le nouveau flow modal

**Step 3 : Commit**

```bash
git add tests/exports/
git commit -m "test(pdf): update E2E tests for new PDF modal flow (orientation + preview)"
```

---

## Task 11 : F3 — Migration Prisma `UserIdentifier`

**Files:**
- Modifier : `prisma/schema.prisma`

**Step 1 : Ajouter le modèle au schéma**

Dans `prisma/schema.prisma`, après le modèle `PasswordReset` (ligne ~32), ajouter :

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

Et dans le modèle `User`, ajouter la relation :

```prisma
model User {
  // ... champs existants inchangés ...

  // Relations existantes inchangées
  marches              Marche[]
  cautions             Caution[]
  documents            Document[]
  passwordResets       PasswordReset[]
  alertNotifications   AlertNotification[]
  // Nouvelle relation
  userIdentifiers      UserIdentifier[]

  @@map("users")
}
```

**Step 2 : Appliquer la migration via MCP Supabase**

Utiliser l'outil MCP `mcp__plugin_supabase_supabase__apply_migration` avec :
- `project_id` : `awsvkjdziwzknnvkpuyq`
- `name` : `add_user_identifiers`
- `query` :
```sql
CREATE TABLE "user_identifiers" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_identifiers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_identifiers_email_key" ON "user_identifiers"("email");
CREATE INDEX "user_identifiers_userId_idx" ON "user_identifiers"("userId");
CREATE INDEX "user_identifiers_email_idx" ON "user_identifiers"("email");

ALTER TABLE "user_identifiers" ADD CONSTRAINT "user_identifiers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Step 3 : Régénérer le client Prisma**

```bash
npx prisma generate
```

Attendu : `✔ Generated Prisma Client`

**Step 4 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur

**Step 5 : Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(auth): add UserIdentifier model to Prisma schema (user_identifiers table)"
```

---

## Task 12 : F3 — Modifier `auth.config.ts` pour lookup UserIdentifier

**Files:**
- Modifier : `lib/auth/auth.config.ts`

**Step 1 : Modifier la fonction `authorize`**

Remplacer la fonction `authorize` pour ajouter le lookup secondaire :

```ts
async authorize(credentials) {
  try {
    const { email, password } = await loginSchema.parseAsync(credentials)

    // 1. Chercher d'abord dans User.email (comportement actuel — inchangé)
    let user = await prisma.user.findUnique({
      where: { email },
    })

    // 2. Si non trouvé, chercher dans UserIdentifier
    if (!user) {
      const identifier = await prisma.userIdentifier.findUnique({
        where: { email },
        include: { user: true },
      })
      if (identifier) {
        user = identifier.user
      }
    }

    if (!user) {
      console.log('User not found:', email)
      return null
    }

    // Vérification du mot de passe (inchangée)
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      console.log('Invalid password for user:', email)
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }
  } catch (error) {
    console.error('Error in authorize:', error)
    return null
  }
},
```

**Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur

**Step 3 : Build complet**

```bash
npm run build 2>&1 | tail -20
```

Attendu : exit 0

**Step 4 : Commit**

```bash
git add lib/auth/auth.config.ts
git commit -m "feat(auth): support login via UserIdentifier secondary emails"
```

---

## Task 13 : F3 — Créer `lib/actions/auth/user-identifiers.ts`

**Files:**
- Créer : `lib/actions/auth/user-identifiers.ts`

**Step 1 : Créer le fichier**

```ts
'use server'

import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import type { ActionResult } from '@/types'
import { z } from 'zod'

const emailSchema = z.string().email('Email invalide')

// ============================================================================
// TYPES
// ============================================================================

export interface UserIdentifierData {
  id: string
  email: string
  isPrimary: boolean
  createdAt: Date
}

export interface UserWithIdentifiers {
  id: string
  name: string
  email: string
  role: string
  identifiers: UserIdentifierData[]
}

// ============================================================================
// LECTURE
// ============================================================================

/** Retourne tous les utilisateurs avec leur liste d'identifiants — ADMIN only */
export async function getUsersWithIdentifiers(): Promise<
  ActionResult<UserWithIdentifiers[]>
> {
  try {
    await requireRole(['ADMIN'])

    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        userIdentifiers: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return {
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        identifiers: u.userIdentifiers.map((i) => ({
          id: i.id,
          email: i.email,
          isPrimary: i.isPrimary,
          createdAt: i.createdAt,
        })),
      })),
    }
  } catch (error: any) {
    console.error('[GET_USERS_WITH_IDENTIFIERS]', error)
    return { success: false, error: error.message || 'Erreur serveur' }
  }
}

// ============================================================================
// MUTATIONS
// ============================================================================

/** Ajoute un email secondaire à un utilisateur — ADMIN only */
export async function addUserIdentifier(
  userId: string,
  email: string
): Promise<ActionResult<UserIdentifierData>> {
  try {
    await requireRole(['ADMIN'])

    // Validation format
    emailSchema.parse(email)

    // Vérifier que l'email n'est pas déjà utilisé (User.email ou UserIdentifier.email)
    const [existingUser, existingIdentifier] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.userIdentifier.findUnique({ where: { email } }),
    ])

    if (existingUser || existingIdentifier) {
      return { success: false, error: 'Cet email est déjà utilisé' }
    }

    const identifier = await prisma.userIdentifier.create({
      data: { userId, email, isPrimary: false },
    })

    return {
      success: true,
      data: {
        id: identifier.id,
        email: identifier.email,
        isPrimary: identifier.isPrimary,
        createdAt: identifier.createdAt,
      },
    }
  } catch (error: any) {
    console.error('[ADD_USER_IDENTIFIER]', error)
    return { success: false, error: error.message || 'Erreur serveur' }
  }
}

/** Supprime un identifiant secondaire — ADMIN only */
export async function removeUserIdentifier(
  id: string
): Promise<ActionResult<null>> {
  try {
    await requireRole(['ADMIN'])

    await prisma.userIdentifier.delete({ where: { id } })

    return { success: true, data: null }
  } catch (error: any) {
    console.error('[REMOVE_USER_IDENTIFIER]', error)
    return { success: false, error: error.message || 'Erreur serveur' }
  }
}

/** Définit un identifiant comme principal — ADMIN only */
export async function setPrimaryIdentifier(
  id: string
): Promise<ActionResult<null>> {
  try {
    await requireRole(['ADMIN'])

    const identifier = await prisma.userIdentifier.findUnique({ where: { id } })
    if (!identifier) {
      return { success: false, error: 'Identifiant introuvable' }
    }

    // Mettre tous les identifiants du user comme non-primaires, puis activer celui-ci
    await prisma.$transaction([
      prisma.userIdentifier.updateMany({
        where: { userId: identifier.userId },
        data: { isPrimary: false },
      }),
      prisma.userIdentifier.update({
        where: { id },
        data: { isPrimary: true },
      }),
    ])

    return { success: true, data: null }
  } catch (error: any) {
    console.error('[SET_PRIMARY_IDENTIFIER]', error)
    return { success: false, error: error.message || 'Erreur serveur' }
  }
}
```

**Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur

**Step 3 : Commit**

```bash
git add lib/actions/auth/user-identifiers.ts
git commit -m "feat(auth): add user-identifiers server actions (add/remove/setPrimary) — ADMIN only"
```

---

## Task 14 : F3 — Créer la page admin `/admin/utilisateurs`

**Files:**
- Créer : `app/(dashboard)/admin/utilisateurs/page.tsx`
- Créer : `app/(dashboard)/admin/utilisateurs/UsersAdminClient.tsx`

**Step 1 : Créer la page serveur `page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/utils/permissions'
import { getUsersWithIdentifiers } from '@/lib/actions/auth/user-identifiers'
import { UsersAdminClient } from './UsersAdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminUtilisateursPage() {
  // Guard ADMIN côté serveur
  try {
    await requireRole(['ADMIN'])
  } catch {
    redirect('/')
  }

  const result = await getUsersWithIdentifiers()
  const users = result.success ? result.data : []

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Gestion des utilisateurs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez les identifiants (emails) de connexion de chaque utilisateur.
        </p>
      </div>
      <UsersAdminClient initialUsers={users ?? []} />
    </div>
  )
}
```

**Step 2 : Créer le composant client `UsersAdminClient.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Star, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { toast } from '@/lib/utils/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  addUserIdentifier,
  removeUserIdentifier,
  setPrimaryIdentifier,
  type UserWithIdentifiers,
} from '@/lib/actions/auth/user-identifiers'

interface UsersAdminClientProps {
  initialUsers: UserWithIdentifiers[]
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  AVANCE: 'Avancé',
  EXPLOITATION: 'Exploitation',
  VISITEUR: 'Visiteur',
}

const ROLE_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info' | 'muted'> = {
  ADMIN: 'default',
  AVANCE: 'info',
  EXPLOITATION: 'warning',
  VISITEUR: 'muted',
}

export function UsersAdminClient({ initialUsers }: UsersAdminClientProps) {
  const [users, setUsers] = useState<UserWithIdentifiers[]>(initialUsers)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [newEmails, setNewEmails] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const toggleExpand = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId))
    if (!newEmails[userId]) {
      setNewEmails((prev) => ({ ...prev, [userId]: '' }))
    }
  }

  const handleAdd = (userId: string) => {
    const email = newEmails[userId]?.trim()
    if (!email) return

    startTransition(async () => {
      const result = await addUserIdentifier(userId, email)
      if (result.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, identifiers: [...u.identifiers, result.data] }
              : u
          )
        )
        setNewEmails((prev) => ({ ...prev, [userId]: '' }))
        toast.success('Email ajouté')
      } else {
        toast.error(result.error || 'Erreur lors de l\'ajout')
      }
    })
  }

  const handleRemove = (userId: string, identifierId: string) => {
    startTransition(async () => {
      const result = await removeUserIdentifier(identifierId)
      if (result.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, identifiers: u.identifiers.filter((i) => i.id !== identifierId) }
              : u
          )
        )
        toast.success('Email supprimé')
      } else {
        toast.error(result.error || 'Erreur lors de la suppression')
      }
    })
  }

  const handleSetPrimary = (userId: string, identifierId: string) => {
    startTransition(async () => {
      const result = await setPrimaryIdentifier(identifierId)
      if (result.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  identifiers: u.identifiers.map((i) => ({
                    ...i,
                    isPrimary: i.id === identifierId,
                  })),
                }
              : u
          )
        )
        toast.success('Email principal mis à jour')
      } else {
        toast.error(result.error || 'Erreur')
      }
    })
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Email principal</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead className="text-center">Identifiants</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <>
              <TableRow
                key={user.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpand(user.id)}
              >
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_VARIANTS[user.role] ?? 'muted'}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="muted">{user.identifiers.length}</Badge>
                </TableCell>
                <TableCell>
                  {expandedUserId === user.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
              </TableRow>

              {/* Section identifiants expandable */}
              {expandedUserId === user.id && (
                <TableRow key={`${user.id}-identifiers`}>
                  <TableCell colSpan={5} className="bg-muted/30 p-4">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Identifiants de connexion
                      </p>

                      {/* Liste des identifiants */}
                      {user.identifiers.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          Aucun email secondaire
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {user.identifiers.map((identifier) => (
                            <div
                              key={identifier.id}
                              className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                            >
                              <span className="text-sm">{identifier.email}</span>
                              <div className="flex items-center gap-2">
                                {identifier.isPrimary && (
                                  <Badge variant="success" className="text-xs">
                                    Principal
                                  </Badge>
                                )}
                                {!identifier.isPrimary && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSetPrimary(user.id, identifier.id)
                                    }}
                                    disabled={isPending}
                                    title="Définir comme principal"
                                  >
                                    <Star className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemove(user.id, identifier.id)
                                  }}
                                  disabled={isPending}
                                  title="Supprimer"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ajout email */}
                      <div className="flex gap-2 pt-1">
                        <Input
                          type="email"
                          placeholder="nouveau@email.com"
                          value={newEmails[user.id] ?? ''}
                          onChange={(e) =>
                            setNewEmails((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAdd(user.id)
                          }}
                          className="h-8 text-sm max-w-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAdd(user.id)
                          }}
                          disabled={isPending || !newEmails[user.id]?.trim()}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}

          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Aucun utilisateur
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

**Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "tests/"
```

Attendu : 0 erreur

**Step 4 : Build complet**

```bash
npm run build 2>&1 | tail -20
```

Attendu : exit 0

**Step 5 : Commit**

```bash
git add app/(dashboard)/admin/utilisateurs/
git commit -m "feat(auth): add /admin/utilisateurs page with user identifiers management (ADMIN only)"
```

---

## Task 15 : F3 — Ajouter le lien dans la sidebar + Tests Playwright

**Files:**
- Modifier : `components/layout/dashboard-shell.tsx`
- Créer : `tests/auth/user-identifiers.spec.ts`

**Step 1 : Ajouter le lien sidebar**

Dans `components/layout/dashboard-shell.tsx`, repérer la section des liens admin (liens avec `href` commençant par `/admin`). Ajouter un lien vers `/admin/utilisateurs` :

```tsx
// Chercher le pattern existant des liens admin et ajouter :
{ href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users, adminOnly: true }
```

Le pattern exact dépend de l'implémentation de la sidebar. Repérer les liens `/admin/alertes` et ajouter le lien utilisateurs au même niveau.

**Step 2 : Créer les tests Playwright**

```ts
// tests/auth/user-identifiers.spec.ts
import { test, expect } from '@playwright/test'
import { login, TEST_USERS } from '../helpers/auth'

test.describe('Admin — Identifiants utilisateurs', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin)
  })

  test('la page /admin/utilisateurs est accessible en ADMIN', async ({ page }) => {
    await page.goto('/admin/utilisateurs')
    await expect(page.locator('h1:has-text("Gestion des utilisateurs")')).toBeVisible({ timeout: 10000 })
  })

  test('affiche la liste des utilisateurs', async ({ page }) => {
    await page.goto('/admin/utilisateurs')
    await page.waitForLoadState('networkidle')

    // Au moins un utilisateur dans la table
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 10000 })
  })

  test('peut développer un utilisateur pour voir ses identifiants', async ({ page }) => {
    await page.goto('/admin/utilisateurs')
    await page.waitForLoadState('networkidle')

    // Cliquer sur la première ligne
    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()

    // Vérifier que la section identifiants s'affiche
    await expect(page.locator('text=Identifiants de connexion')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[placeholder="nouveau@email.com"]')).toBeVisible()
  })

  test('peut ajouter et supprimer un email secondaire', async ({ page }) => {
    await page.goto('/admin/utilisateurs')
    await page.waitForLoadState('networkidle')

    // Développer le premier user
    await page.locator('tbody tr').first().click()
    await page.waitForTimeout(500)

    const testEmail = `test-secondary-${Date.now()}@example.com`

    // Ajouter un email
    await page.locator('input[placeholder="nouveau@email.com"]').fill(testEmail)
    await page.locator('button:has-text("Ajouter")').click()

    // Vérifier que l'email apparaît
    await expect(page.locator(`text=${testEmail}`)).toBeVisible({ timeout: 10000 })

    // Supprimer l'email
    const row = page.locator(`text=${testEmail}`).locator('..')
    await row.locator('button[title="Supprimer"]').click()

    // Vérifier la suppression
    await expect(page.locator(`text=${testEmail}`)).not.toBeVisible({ timeout: 10000 })
  })

  test('/admin/utilisateurs redirige les non-ADMIN', async ({ page }) => {
    // Se déconnecter et se reconnecter en EXPLOITATION
    await page.goto('/admin/utilisateurs')
    // Re-login avec un autre rôle
    await login(page, TEST_USERS.exploitation)
    await page.goto('/admin/utilisateurs')

    // Doit être redirigé (vers / ou vers une page d'erreur)
    await expect(page).not.toHaveURL('/admin/utilisateurs', { timeout: 5000 })
  })
})
```

**Step 3 : Lancer les tests**

```bash
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app npx playwright test tests/auth/user-identifiers.spec.ts --project=chromium --workers=1 --headed
```

Attendu : 4/4 PASS

**Step 4 : Commit final**

```bash
git add components/layout/dashboard-shell.tsx tests/auth/user-identifiers.spec.ts
git commit -m "feat(auth): add /admin/utilisateurs sidebar link + E2E tests (4 tests)"
```

---

## Task 16 : Push + déploiement production

**Step 1 : Vérifier l'état git**

```bash
git log --oneline -10
git status
```

**Step 2 : Push**

```bash
git push origin main
```

**Step 3 : Déployer en production**

```bash
vercel --prod
```

Attendu : URL de déploiement + `✅ Production`

**Step 4 : Smoke tests production**

```bash
PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app npx playwright test tests/exports/ tests/auth/user-identifiers.spec.ts --project=chromium --workers=1
```

---

## Récapitulatif des commits attendus

| Task | Commit |
|------|--------|
| T1 | `feat(excel): add applyFormula engine` |
| T2 | `feat(excel): add optional formula field to ExcelColumn` |
| T4 | `feat(pdf): add layout utility` |
| T5 | `feat(pdf): add orientation param to createPDFDocument` |
| T6 | `feat(pdf): pass orientation in PDF export actions` |
| T7 | `feat(pdf): add orientation + preview params to PDF API routes` |
| T8 | `feat(pdf): add PDFExportModal component` |
| T9 | `feat(pdf): update ExportMenu to open PDFExportModal` |
| T10 | `test(pdf): update E2E tests for PDF modal flow` |
| T11 | `feat(auth): add UserIdentifier Prisma model` |
| T12 | `feat(auth): support login via UserIdentifier secondary emails` |
| T13 | `feat(auth): add user-identifiers server actions` |
| T14 | `feat(auth): add /admin/utilisateurs page` |
| T15 | `feat(auth): sidebar link + E2E tests` |
| T16 | push + deploy |
