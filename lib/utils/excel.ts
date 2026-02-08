import ExcelJS from 'exceljs'
import { formatDateCourt, formatMontantSansDevise } from './format'

// ============================================================================
// TYPES
// ============================================================================

export interface ExcelColumn {
  header: string
  key: string
  width?: number
  style?: Partial<ExcelJS.Style>
}

export interface ExcelExportOptions {
  filename: string
  sheetName: string
  title: string
  columns: ExcelColumn[]
  data: any[]
  includeTimestamp?: boolean
}

// ============================================================================
// STYLES EXCEL
// ============================================================================

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6B46C1' }, // Violet (theme principal)
  },
  alignment: { vertical: 'middle', horizontal: 'center' },
  border: {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  },
}

const TITLE_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 14, color: { argb: 'FF6B46C1' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
}

const CELL_STYLE: Partial<ExcelJS.Style> = {
  font: { size: 10 },
  alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
  border: {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  },
}

const NUMBER_STYLE: Partial<ExcelJS.Style> = {
  ...CELL_STYLE,
  alignment: { vertical: 'middle', horizontal: 'right' },
  numFmt: '#,##0.00',
}

const DATE_STYLE: Partial<ExcelJS.Style> = {
  ...CELL_STYLE,
  alignment: { vertical: 'middle', horizontal: 'center' },
  numFmt: 'dd/mm/yyyy',
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Convertit une valeur en format Excel approprié
 */
function formatValueForExcel(value: any, column: ExcelColumn): any {
  if (value === null || value === undefined) return ''

  // Dates
  if (value instanceof Date) {
    return value
  }

  // Montants (Decimal Prisma)
  if (value && typeof value.toNumber === 'function') {
    return value.toNumber()
  }

  // Montants numériques
  if (typeof value === 'number' && column.key.includes('montant')) {
    return value
  }

  // Booléens
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non'
  }

  // Strings
  return String(value)
}

/**
 * Applique un style à une cellule en fonction du type de donnée
 */
function applyCellStyle(cell: ExcelJS.Cell, column: ExcelColumn, value: any) {
  // Style personnalisé de la colonne
  if (column.style) {
    cell.style = { ...CELL_STYLE, ...column.style }
    return
  }

  // Style automatique basé sur le type
  if (value instanceof Date) {
    cell.style = DATE_STYLE
  } else if (typeof value === 'number' || column.key.includes('montant')) {
    cell.style = NUMBER_STYLE
  } else {
    cell.style = CELL_STYLE
  }
}

// ============================================================================
// GÉNÉRATION EXCEL
// ============================================================================

/**
 * Crée un fichier Excel avec des données formatées
 */
export async function createExcelFile(
  options: ExcelExportOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(options.sheetName, {
    properties: { defaultRowHeight: 20 },
  })

  // ============================================
  // TITRE DU DOCUMENT
  // ============================================

  let currentRow = 1

  // Ligne de titre
  const titleCell = worksheet.getCell(`A${currentRow}`)
  titleCell.value = options.title
  titleCell.style = TITLE_STYLE

  // Fusionner les cellules du titre
  worksheet.mergeCells(
    `A${currentRow}:${String.fromCharCode(64 + options.columns.length)}${currentRow}`
  )

  currentRow++

  // Timestamp si demandé
  if (options.includeTimestamp !== false) {
    const timestampCell = worksheet.getCell(`A${currentRow}`)
    timestampCell.value = `Généré le ${formatDateCourt(new Date())} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    timestampCell.style = {
      font: { size: 9, italic: true, color: { argb: 'FF6B7280' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
    }
    worksheet.mergeCells(
      `A${currentRow}:${String.fromCharCode(64 + options.columns.length)}${currentRow}`
    )
    currentRow++
  }

  // Ligne vide
  currentRow++

  // ============================================
  // EN-TÊTES
  // ============================================

  const headerRow = worksheet.getRow(currentRow)
  headerRow.height = 25

  options.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = column.header
    cell.style = HEADER_STYLE

    // Largeur de colonne
    worksheet.getColumn(index + 1).width = column.width || 15
  })

  currentRow++

  // ============================================
  // DONNÉES
  // ============================================

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

  // ============================================
  // LIGNE DE TOTAL (si montants présents)
  // ============================================

  const montantColumns = options.columns.filter((col) =>
    col.key.includes('montant')
  )

  if (montantColumns.length > 0 && options.data.length > 0) {
    // Ligne vide
    currentRow++

    const totalRow = worksheet.getRow(currentRow)
    totalRow.height = 25

    // Cellule "TOTAL"
    const totalLabelCell = totalRow.getCell(1)
    totalLabelCell.value = 'TOTAL'
    totalLabelCell.style = {
      ...HEADER_STYLE,
      alignment: { vertical: 'middle', horizontal: 'right' },
    }

    // Fusionner jusqu'à la première colonne de montant
    const firstMontantIndex = options.columns.findIndex((col) =>
      col.key.includes('montant')
    )
    if (firstMontantIndex > 0) {
      worksheet.mergeCells(
        `A${currentRow}:${String.fromCharCode(64 + firstMontantIndex)}${currentRow}`
      )
    }

    // Calcul des totaux
    montantColumns.forEach((column) => {
      const columnIndex =
        options.columns.findIndex((col) => col.key === column.key) + 1
      const cell = totalRow.getCell(columnIndex)

      const total = options.data.reduce((sum, row) => {
        const value = row[column.key]
        if (value && typeof value.toNumber === 'function') {
          return sum + value.toNumber()
        }
        if (typeof value === 'number') {
          return sum + value
        }
        return sum
      }, 0)

      cell.value = total
      cell.style = {
        ...NUMBER_STYLE,
        font: { ...NUMBER_STYLE.font, bold: true },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        },
      }
    })
  }

  // ============================================
  // AUTOFILTER
  // ============================================

  const headerRowIndex = options.includeTimestamp !== false ? 4 : 3
  worksheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: options.columns.length },
  }

  // ============================================
  // PROTECTION & PROPRIÉTÉS
  // ============================================

  workbook.creator = 'ERP Marchés STAM'
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.lastPrinted = new Date()

  // ============================================
  // GÉNÉRATION BUFFER
  // ============================================

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ============================================================================
// HELPERS SPÉCIFIQUES
// ============================================================================

/**
 * Formatte un statut pour l'affichage Excel
 */
export function formatStatutForExcel(statut: string): string {
  return statut
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Formatte un type pour l'affichage Excel
 */
export function formatTypeForExcel(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}
