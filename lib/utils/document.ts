import { TypeDocument, PhaseMarche } from '@prisma/client'
import {
  FileText,
  Image,
  FileSpreadsheet,
  Mail,
  FileCheck,
  Clipboard,
  Car,
  File,
  type LucideIcon,
} from 'lucide-react'

/**
 * FORMATAGE
 */

/**
 * Formate une taille de fichier en bytes vers un format lisible
 * @param bytes - Taille en bytes
 * @returns Chaîne formatée (ex: "2.5 MB", "150 KB")
 */
export function formatTaille(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * ICÔNES PAR TYPE
 */

/**
 * Retourne l'icône Lucide appropriée pour un type de document
 * @param type - Type de document
 * @returns Composant icône Lucide
 */
export function getIconByType(type: TypeDocument): LucideIcon {
  const iconMap: Record<TypeDocument, LucideIcon> = {
    DAO: FileText,
    DRP: FileText,
    CAUTION_BANCAIRE: FileCheck,
    COURRIER: Mail,
    PV_RECEPTION: Clipboard,
    ORDRE_SERVICE: FileCheck,
    DOCUMENT_VEHICULE: Car,
    AUTRE: File,
  }

  return iconMap[type] || File
}

/**
 * COULEURS PAR TYPE
 */

/**
 * Retourne la classe de couleur Tailwind pour un type de document
 * @param type - Type de document
 * @returns Classe Tailwind (ex: "text-blue-600")
 */
export function getColorByType(type: TypeDocument): string {
  const colorMap: Record<TypeDocument, string> = {
    DAO: 'text-blue-600 bg-blue-50',
    DRP: 'text-green-600 bg-green-50',
    CAUTION_BANCAIRE: 'text-orange-600 bg-orange-50',
    COURRIER: 'text-purple-600 bg-purple-50',
    PV_RECEPTION: 'text-pink-600 bg-pink-50',
    ORDRE_SERVICE: 'text-indigo-600 bg-indigo-50',
    DOCUMENT_VEHICULE: 'text-cyan-600 bg-cyan-50',
    AUTRE: 'text-gray-600 bg-gray-50',
  }

  return colorMap[type] || 'text-gray-600 bg-gray-50'
}

/**
 * LABELS
 */

/**
 * Labels français pour les types de documents
 */
export const TYPE_DOCUMENT_LABELS: Record<TypeDocument, string> = {
  DAO: 'DAO',
  DRP: 'DRP',
  CAUTION_BANCAIRE: 'Caution bancaire',
  COURRIER: 'Courrier',
  PV_RECEPTION: 'PV Réception',
  ORDRE_SERVICE: 'Ordre de service',
  DOCUMENT_VEHICULE: 'Document véhicule',
  AUTRE: 'Autre',
}

/**
 * Labels français pour les phases de marché
 */
export const PHASE_MARCHE_LABELS: Record<PhaseMarche, string> = {
  PREPARATION: 'Préparation',
  SOUMISSION: 'Soumission',
  ATTRIBUTION: 'Attribution',
  EXECUTION: 'Exécution',
  CLOTURE: 'Clôture',
}

/**
 * GÉNÉRATION CHEMIN STORAGE
 */

/**
 * Génère le chemin de stockage dans Supabase Storage
 * Format : {type}/{marcheId}/{timestamp}_{fileName}
 * @param marcheId - ID du marché (optionnel)
 * @param type - Type de document
 * @param fileName - Nom du fichier original
 * @returns Chemin de stockage
 */
export function generateStoragePath(
  type: TypeDocument,
  fileName: string,
  marcheId?: string
): string {
  const timestamp = Date.now()
  const sanitizedFileName = sanitizeFileName(fileName)

  // Format : {type}/{marcheId ou "general"}/{timestamp}_{fileName}
  const folder = marcheId || 'general'
  const typePath = type.toLowerCase()

  return `${typePath}/${folder}/${timestamp}_${sanitizedFileName}`
}

/**
 * MANIPULATION FICHIERS
 */

/**
 * Extrait l'extension d'un fichier
 * @param fileName - Nom du fichier
 * @returns Extension (ex: "pdf", "jpg")
 */
export function extractFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

/**
 * Sanitize un nom de fichier (supprime caractères spéciaux)
 * @param fileName - Nom du fichier
 * @returns Nom nettoyé
 */
export function sanitizeFileName(fileName: string): string {
  // Remplacer espaces par underscores
  let sanitized = fileName.replace(/\s+/g, '_')

  // Garder seulement alphanumériques, underscores, tirets, et points
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\-\.]/g, '')

  // Limiter à 100 caractères
  if (sanitized.length > 100) {
    const ext = extractFileExtension(sanitized)
    const nameWithoutExt = sanitized.substring(
      0,
      sanitized.lastIndexOf('.')
    )
    sanitized = nameWithoutExt.substring(0, 95) + '.' + ext
  }

  return sanitized
}

/**
 * VALIDATION MIME TYPE
 */

/**
 * Vérifie si un type MIME est autorisé
 * @param mimeType - Type MIME
 * @returns true si autorisé
 */
export function validateMimeType(mimeType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel',
  ]

  return allowedTypes.includes(mimeType)
}

/**
 * Vérifie si un fichier est une image
 * @param mimeType - Type MIME
 * @returns true si image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Vérifie si un fichier est un PDF
 * @param mimeType - Type MIME
 * @returns true si PDF
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

/**
 * Vérifie si un fichier peut être prévisualisé
 * @param mimeType - Type MIME
 * @returns true si prévisualisable (PDF ou image)
 */
export function isPreviewable(mimeType: string): boolean {
  return isPdfFile(mimeType) || isImageFile(mimeType)
}

/**
 * HELPERS VERSIONING
 */

/**
 * Génère le nom de fichier avec numéro de version
 * @param fileName - Nom du fichier original
 * @param version - Numéro de version
 * @returns Nom avec version (ex: "document_v2.pdf")
 */
export function generateVersionedFileName(
  fileName: string,
  version: number
): string {
  const ext = extractFileExtension(fileName)
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))

  return `${nameWithoutExt}_v${version}.${ext}`
}

/**
 * HELPERS DATES
 */

/**
 * Vérifie si un document est expiré
 * @param dateValidite - Date de validité
 * @returns true si expiré
 */
export function isDocumentExpired(dateValidite: Date | null): boolean {
  if (!dateValidite) return false
  return dateValidite < new Date()
}

/**
 * Calcule le nombre de jours restants avant expiration
 * @param dateValidite - Date de validité
 * @returns Nombre de jours (négatif si expiré)
 */
export function getDaysUntilExpiration(dateValidite: Date | null): number | null {
  if (!dateValidite) return null

  const today = new Date()
  const diffTime = dateValidite.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * HELPERS RECHERCHE
 */

/**
 * Normalise une chaîne pour la recherche (minuscules, sans accents)
 * @param str - Chaîne à normaliser
 * @returns Chaîne normalisée
 */
export function normalizeSearchString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
