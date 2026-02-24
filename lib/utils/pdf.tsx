import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from '@react-pdf/renderer'
import { formatDateCourt, formatMontant } from './format'
import { getPageLayout, type PDFOrientation } from '@/lib/pdf/layout'

// ============================================================================
// TYPES
// ============================================================================

export interface PDFColumn {
  header: string
  key: string
  width?: string | number // '20%' ou 100 (pixels)
  align?: 'left' | 'center' | 'right'
  format?: 'text' | 'date' | 'number' | 'currency'
}

export interface PDFSummaryItem {
  label: string
  value: string | number
}

export interface PDFExportOptions {
  title: string
  subtitle?: string
  columns: PDFColumn[]
  data: any[]
  summary?: PDFSummaryItem[]
  orientation?: PDFOrientation // défaut : 'portrait'
}

// ============================================================================
// STYLES PDF
// ============================================================================

const COLORS = {
  primary: '#6B46C1', // Violet
  secondary: '#9333EA',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  background: '#F9FAFB',
  white: '#FFFFFF',
  success: '#10B981',
  danger: '#EF4444',
}

const pdfStyles = StyleSheet.create({
  // ============================================
  // PAGE
  // ============================================
  page: {
    padding: 30,
    paddingTop: 80, // Espace pour header fixe
    paddingBottom: 60, // Espace pour footer fixe
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },

  // ============================================
  // HEADER (fixe sur toutes les pages)
  // ============================================
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 10,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    borderBottom: `2px solid ${COLORS.secondary}`,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.9,
  },
  headerDate: {
    fontSize: 8,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 4,
  },

  // ============================================
  // FOOTER (fixe sur toutes les pages)
  // ============================================
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    paddingTop: 10,
    borderTop: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.background,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: COLORS.textLight,
  },
  footerPageNumber: {
    fontSize: 8,
    color: COLORS.textLight,
    fontFamily: 'Helvetica-Bold',
  },

  // ============================================
  // TABLEAU
  // ============================================
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableHeaderCell: {
    color: COLORS.white,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${COLORS.border}`,
    paddingVertical: 8,
    paddingHorizontal: 5,
    minHeight: 30,
  },
  tableRowEven: {
    backgroundColor: COLORS.background,
  },
  tableCell: {
    fontSize: 9,
    color: COLORS.text,
    paddingHorizontal: 4,
    textAlign: 'left',
    flexWrap: 'wrap',
  },
  tableCellCenter: {
    textAlign: 'center',
  },
  tableCellRight: {
    textAlign: 'right',
  },

  // ============================================
  // SUMMARY (statistiques en fin de document)
  // ============================================
  summary: {
    marginTop: 30,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    borderLeft: `4px solid ${COLORS.primary}`,
  },
  summaryTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
  },

  // ============================================
  // UTILITAIRES
  // ============================================
  textBold: {
    fontFamily: 'Helvetica-Bold',
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  mt10: {
    marginTop: 10,
  },
  mb10: {
    marginBottom: 10,
  },
})

// ============================================================================
// COMPOSANTS PDF RÉUTILISABLES
// ============================================================================

/**
 * Header fixe sur toutes les pages
 */
interface PDFHeaderProps {
  title: string
  subtitle?: string
}

const PDFHeader: React.FC<PDFHeaderProps> = ({ title, subtitle }) => (
  <View style={pdfStyles.header} fixed>
    <Text style={pdfStyles.headerTitle}>{title}</Text>
    {subtitle && <Text style={pdfStyles.headerSubtitle}>{subtitle}</Text>}
    <Text style={pdfStyles.headerDate}>
      Généré le {formatDateCourt(new Date())} à{' '}
      {new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </Text>
  </View>
)

/**
 * Footer fixe sur toutes les pages avec pagination
 */
const PDFFooter: React.FC = () => (
  <View style={pdfStyles.footer} fixed>
    <View style={pdfStyles.footerContent}>
      <Text style={pdfStyles.footerText}>
        Généré par ERP Marchés STAM • Document confidentiel
      </Text>
      <Text
        style={pdfStyles.footerPageNumber}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  </View>
)

/**
 * Tableau avec colonnes configurables
 */
interface PDFTableProps {
  columns: PDFColumn[]
  data: any[]
}

const PDFTable: React.FC<PDFTableProps> = ({ columns, data }) => {
  /**
   * Formatte une valeur selon le format de la colonne
   */
  const formatCellValue = (value: any, column: PDFColumn): string => {
    if (value === null || value === undefined) return ''

    switch (column.format) {
      case 'date':
        return value instanceof Date
          ? formatDateCourt(value)
          : String(value)

      case 'currency':
        const numValue =
          typeof value === 'number'
            ? value
            : typeof value.toNumber === 'function'
              ? value.toNumber()
              : parseFloat(value)
        return !isNaN(numValue) ? formatMontant(numValue) : ''

      case 'number':
        return typeof value === 'number'
          ? value.toLocaleString('fr-FR')
          : String(value)

      default:
        return String(value)
    }
  }

  /**
   * Détermine la largeur d'une colonne
   */
  const getColumnWidth = (column: PDFColumn): string => {
    if (!column.width) return '1fr' // Largeur automatique
    if (typeof column.width === 'string') return column.width
    return `${column.width}px`
  }

  /**
   * Détermine le style d'alignement d'une cellule
   */
  const getCellAlignStyle = (align?: string) => {
    if (align === 'center') return pdfStyles.tableCellCenter
    if (align === 'right') return pdfStyles.tableCellRight
    return {}
  }

  return (
    <View style={pdfStyles.table}>
      {/* Header du tableau */}
      <View style={pdfStyles.tableHeader}>
        {columns.map((column, index) => (
          <Text
            key={index}
            style={[
              pdfStyles.tableHeaderCell,
              { width: getColumnWidth(column) },
              getCellAlignStyle(column.align),
            ]}
          >
            {column.header}
          </Text>
        ))}
      </View>

      {/* Lignes de données */}
      {data.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            pdfStyles.tableRow,
            rowIndex % 2 === 0 ? {} : pdfStyles.tableRowEven,
          ]}
          wrap={false} // Empêche la coupure d'une ligne entre deux pages
        >
          {columns.map((column, colIndex) => (
            <Text
              key={colIndex}
              style={[
                pdfStyles.tableCell,
                { width: getColumnWidth(column) },
                getCellAlignStyle(column.align),
              ]}
            >
              {formatCellValue(row[column.key], column)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

/**
 * Section Summary avec statistiques
 */
interface PDFSummaryProps {
  title?: string
  items: PDFSummaryItem[]
}

const PDFSummary: React.FC<PDFSummaryProps> = ({
  title = 'Récapitulatif',
  items,
}) => (
  <View style={pdfStyles.summary} wrap={false}>
    <Text style={pdfStyles.summaryTitle}>{title}</Text>
    {items.map((item, index) => (
      <View key={index} style={pdfStyles.summaryRow}>
        <Text style={pdfStyles.summaryLabel}>{item.label}</Text>
        <Text style={pdfStyles.summaryValue}>{item.value}</Text>
      </View>
    ))}
  </View>
)

// ============================================================================
// GÉNÉRATION PDF PRINCIPALE
// ============================================================================

/**
 * Crée un document PDF complet avec header, tableau, footer et summary
 */
export async function createPDFDocument(
  options: PDFExportOptions
): Promise<Buffer> {
  const orientation = options.orientation ?? 'portrait'

  // Composant Document React
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
