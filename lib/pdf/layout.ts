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
