'use server'

import ExcelJS from 'exceljs'
import { format } from 'date-fns'
import { prisma } from '@/lib/db/prisma'
import { requireRole, getMarcheStatutRestriction } from '@/lib/utils/permissions'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { ActionResult } from '@/types'
import {
  createExcelFile,
  formatStatutForExcel,
  formatTypeForExcel,
  type ExcelColumn,
} from '@/lib/utils/excel'
import {
  createPDFDocument,
  type PDFColumn,
  type PDFSummaryItem,
} from '@/lib/utils/pdf'
import { formatDateCourt } from '@/lib/utils/format'

// Limite maximale de lignes par export (protection mémoire)
const EXPORT_MAX_ROWS = 1000;

// ============================================================================
// TYPES
// ============================================================================

interface ExportFilters {
  statut?: string
  type?: string
  dateDebut?: string
  dateFin?: string
  search?: string
  orientation?: 'portrait' | 'landscape' // pour les exports PDF
}

// ============================================================================
// EXPORT MARCHÉS
// ============================================================================

export async function exportMarches(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    // Vérification permissions (EXPLOITATION minimum)
    const session = await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // Construction du filtre Prisma — EXPLOITATION restreint à EN_EXECUTION
    const where: any = {}
    const statutRestriction = getMarcheStatutRestriction(session.user.role)

    if (statutRestriction) {
      where.statut = statutRestriction
    } else if (filters?.statut) {
      where.statut = filters.statut
    }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.dateDebut || filters?.dateFin) {
      where.dateNotification = {}
      if (filters.dateDebut) {
        where.dateNotification.gte = new Date(filters.dateDebut)
      }
      if (filters.dateFin) {
        where.dateNotification.lte = new Date(filters.dateFin)
      }
    }

    // Récupération des marchés
    const marches = await prisma.marche.findMany({
      where,
      take: EXPORT_MAX_ROWS,
      orderBy: { numero: 'asc' },
      include: {
        user: { select: { name: true } },
      },
    })

    // Configuration des colonnes
    const columns: ExcelColumn[] = [
      { header: 'N° Marché', key: 'numero', width: 20 },
      { header: 'Objet', key: 'objet', width: 40 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Statut', key: 'statut', width: 25 },
      { header: 'Montant (FCFA)', key: 'montant', width: 15 },
      { header: 'Date Notification', key: 'dateNotification', width: 15 },
      {
        header: "Date Ordre Service",
        key: 'dateOrdreService',
        width: 15,
      },
      { header: 'Délai (jours)', key: 'delaiExecution', width: 12 },
      { header: 'Date Fin Prévue', key: 'dateFinPrevue', width: 15 },
      { header: 'Date Réception', key: 'dateReception', width: 15 },
      {
        header: 'Autorité Contractante',
        key: 'autoriteContractanteNom',
        width: 30,
      },
      { header: 'Contact', key: 'autoriteContractanteContact', width: 20 },
      { header: 'Email', key: 'autoriteContractanteEmail', width: 25 },
      { header: 'Téléphone', key: 'autoriteContractanteTel', width: 15 },
      { header: 'Gestionnaire', key: 'userName', width: 20 },
    ]

    // Formatage des données
    const data = marches.map((marche) => ({
      numero: marche.numero,
      objet: marche.objet,
      type: formatTypeForExcel(marche.type),
      statut: formatStatutForExcel(marche.statut),
      montant: marche.montant,
      dateNotification: marche.dateNotification,
      dateOrdreService: marche.dateOrdreService || '',
      delaiExecution: marche.delaiExecution,
      dateFinPrevue: marche.dateFinPrevue || '',
      dateReception: marche.dateReception || '',
      autoriteContractanteNom: marche.autoriteContractanteNom,
      autoriteContractanteContact: marche.autoriteContractanteContact || '',
      autoriteContractanteEmail: marche.autoriteContractanteEmail || '',
      autoriteContractanteTel: marche.autoriteContractanteTel || '',
      userName: marche.user.name,
    }))

    // Génération du fichier Excel
    const buffer = await createExcelFile({
      filename: `marches_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Marchés',
      title: 'Export des Marchés Publics',
      columns,
      data,
      includeTimestamp: true,
    })

    const filename = `marches_${new Date().toISOString().split('T')[0]}.xlsx`

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'EXCEL', module: 'MARCHE', filters },
    })

    return {
      success: true,
      data: { buffer, filename },
    }
  } catch (error: any) {
    console.error('[EXPORT_MARCHES]', error)
    return {
      success: false,
      error: error.message || "Erreur lors de l'export des marchés",
    }
  }
}

// ============================================================================
// EXPORT CAUTIONS
// ============================================================================

export async function exportCautions(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    // Vérification permissions (EXPLOITATION minimum)
    const session = await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // Construction du filtre Prisma
    const where: any = {}

    if (filters?.statut) {
      where.statut = filters.statut
    }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.dateDebut || filters?.dateFin) {
      where.dateEmission = {}
      if (filters.dateDebut) {
        where.dateEmission.gte = new Date(filters.dateDebut)
      }
      if (filters.dateFin) {
        where.dateEmission.lte = new Date(filters.dateFin)
      }
    }

    // Récupération des cautions
    const cautions = await prisma.caution.findMany({
      where,
      take: EXPORT_MAX_ROWS,
      orderBy: { reference: 'asc' },
      include: {
        marche: { select: { numero: true, objet: true } },
        user: { select: { name: true } },
      },
    })

    // Configuration des colonnes
    const columns: ExcelColumn[] = [
      { header: 'Référence', key: 'reference', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Statut', key: 'statut', width: 15 },
      { header: 'Montant (FCFA)', key: 'montant', width: 15 },
      { header: 'Date Émission', key: 'dateEmission', width: 15 },
      { header: 'Date Échéance', key: 'dateEcheance', width: 15 },
      { header: 'Jours Restants', key: 'joursRestants', width: 12 },
      { header: 'Banque', key: 'banqueNom', width: 25 },
      { header: 'Contact Banque', key: 'banqueContact', width: 20 },
      { header: 'N° Marché', key: 'marcheNumero', width: 20 },
      { header: 'Objet Marché', key: 'marcheObjet', width: 40 },
      { header: 'Gestionnaire', key: 'userName', width: 20 },
    ]

    // Formatage des données
    const today = new Date()
    const data = cautions.map((caution) => {
      const joursRestants = Math.ceil(
        (new Date(caution.dateEcheance).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      )

      return {
        reference: caution.reference,
        type: formatTypeForExcel(caution.type),
        statut: formatStatutForExcel(caution.statut),
        montant: caution.montant,
        dateEmission: caution.dateEmission,
        dateEcheance: caution.dateEcheance,
        joursRestants: joursRestants > 0 ? joursRestants : 0,
        banqueNom: caution.banqueNom,
        banqueContact: caution.banqueContact || '',
        marcheNumero: caution.marche?.numero || 'N/A',
        marcheObjet: caution.marche?.objet || 'Aucun marché associé',
        userName: caution.user.name,
      }
    })

    // Génération du fichier Excel
    const buffer = await createExcelFile({
      filename: `cautions_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Cautions',
      title: 'Export des Cautions Bancaires',
      columns,
      data,
      includeTimestamp: true,
    })

    const filename = `cautions_${new Date().toISOString().split('T')[0]}.xlsx`

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'EXCEL', module: 'CAUTION', filters },
    })

    return {
      success: true,
      data: { buffer, filename },
    }
  } catch (error: any) {
    console.error('[EXPORT_CAUTIONS]', error)
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'export des cautions',
    }
  }
}

// ============================================================================
// EXPORT VÉHICULES
// ============================================================================

export async function exportVehicules(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    // Vérification permissions (EXPLOITATION minimum)
    const session = await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // Construction du filtre Prisma
    const where: any = {}

    if (filters?.statut) {
      where.statut = filters.statut
    }

    if (filters?.dateDebut || filters?.dateFin) {
      where.dateLivraison = {}
      if (filters.dateDebut) {
        where.dateLivraison.gte = new Date(filters.dateDebut)
      }
      if (filters.dateFin) {
        where.dateLivraison.lte = new Date(filters.dateFin)
      }
    }

    // Récupération des véhicules
    const vehicules = await prisma.vehicule.findMany({
      where,
      take: EXPORT_MAX_ROWS,
      orderBy: { immatriculation: 'asc' },
      include: {
        marcheVehicules: { include: { marche: { select: { numero: true, objet: true } } } },
      },
    })

    // Configuration des colonnes
    const columns: ExcelColumn[] = [
      { header: 'Immatriculation', key: 'immatriculation', width: 20 },
      { header: 'Marque', key: 'marque', width: 15 },
      { header: 'Modèle', key: 'modele', width: 20 },
      { header: 'Année', key: 'annee', width: 10 },
      { header: 'Statut', key: 'statut', width: 25 },
      { header: 'Date Livraison', key: 'dateLivraison', width: 15 },
      { header: 'Bon Livraison', key: 'bonLivraisonRef', width: 20 },
      {
        header: 'Date Réception Provisoire',
        key: 'dateReceptionProvisoire',
        width: 20,
      },
      {
        header: 'Date Réception Définitive',
        key: 'dateReceptionDefinitive',
        width: 20,
      },
      { header: 'Réserves Réception', key: 'reservesReception', width: 30 },
      { header: 'N° Marché', key: 'marcheNumero', width: 20 },
      { header: 'Objet Marché', key: 'marcheObjet', width: 40 },
    ]

    // Formatage des données
    const data = vehicules.map((vehicule) => ({
      immatriculation: vehicule.immatriculation,
      marque: vehicule.marque,
      modele: vehicule.modele,
      annee: vehicule.annee || '',
      statut: formatStatutForExcel(vehicule.statut),
      dateLivraison: vehicule.dateLivraison || '',
      bonLivraisonRef: vehicule.bonLivraisonRef || '',
      dateReceptionProvisoire: vehicule.dateReceptionProvisoire || '',
      dateReceptionDefinitive: vehicule.dateReceptionDefinitive || '',
      reservesReception: vehicule.reservesReception || '',
      marcheNumero: vehicule.marcheVehicules?.[0]?.marche?.numero || '',
      marcheObjet: vehicule.marcheVehicules?.[0]?.marche?.objet || '',
    }))

    // Génération du fichier Excel
    const buffer = await createExcelFile({
      filename: `vehicules_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Véhicules',
      title: 'Export des Véhicules',
      columns,
      data,
      includeTimestamp: true,
    })

    const filename = `vehicules_${new Date().toISOString().split('T')[0]}.xlsx`

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'EXCEL', module: 'VEHICULE', filters },
    })

    return {
      success: true,
      data: { buffer, filename },
    }
  } catch (error: any) {
    console.error('[EXPORT_VEHICULES]', error)
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'export des véhicules',
    }
  }
}

// ============================================================================
// EXPORT DOCUMENTS
// ============================================================================

export async function exportDocuments(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    // Vérification permissions (EXPLOITATION minimum)
    const session = await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // Construction du filtre Prisma
    const where: any = {
      deleted: false, // Exclure documents supprimés
    }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.dateDebut || filters?.dateFin) {
      where.createdAt = {}
      if (filters.dateDebut) {
        where.createdAt.gte = new Date(filters.dateDebut)
      }
      if (filters.dateFin) {
        where.createdAt.lte = new Date(filters.dateFin)
      }
    }

    // Récupération des documents
    const documents = await prisma.document.findMany({
      where,
      take: EXPORT_MAX_ROWS,
      orderBy: { createdAt: 'desc' },
      include: {
        marche: { select: { numero: true, objet: true } },
        user: { select: { name: true } },
      },
    })

    // Configuration des colonnes
    const columns: ExcelColumn[] = [
      { header: 'Nom', key: 'nom', width: 30 },
      { header: 'Nom Original', key: 'nomOriginal', width: 25 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Phase Marché', key: 'phase', width: 15 },
      { header: 'Taille', key: 'taille', width: 12 },
      { header: 'Date Création', key: 'createdAt', width: 15 },
      { header: 'Date Validité', key: 'dateValidite', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Tags', key: 'tags', width: 25 },
      { header: 'N° Marché', key: 'marcheNumero', width: 20 },
      { header: 'Objet Marché', key: 'marcheObjet', width: 40 },
      { header: 'Gestionnaire', key: 'userName', width: 20 },
    ]

    // Formatage des données
    const data = documents.map((document) => {
      // Conversion taille en format lisible (KB ou MB)
      const tailleMo = document.taille / (1024 * 1024)
      const tailleKo = document.taille / 1024
      const tailleFormatee =
        tailleMo >= 1
          ? `${tailleMo.toFixed(2)} MB`
          : `${tailleKo.toFixed(2)} KB`

      return {
        nom: document.nom,
        nomOriginal: document.nomOriginal,
        type: formatTypeForExcel(document.type),
        phase: document.phase ? formatTypeForExcel(document.phase) : '',
        taille: tailleFormatee,
        createdAt: document.createdAt,
        dateValidite: document.dateValidite || '',
        description: document.description || '',
        tags: document.tags.join(', '),
        marcheNumero: document.marche?.numero || '',
        marcheObjet: document.marche?.objet || '',
        userName: document.user.name,
      }
    })

    // Génération du fichier Excel
    const buffer = await createExcelFile({
      filename: `documents_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Documents',
      title: 'Export des Documents',
      columns,
      data,
      includeTimestamp: true,
    })

    const filename = `documents_${new Date().toISOString().split('T')[0]}.xlsx`

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'EXCEL', module: 'DOCUMENT', filters },
    })

    return {
      success: true,
      data: { buffer, filename },
    }
  } catch (error: any) {
    console.error('[EXPORT_DOCUMENTS]', error)
    return {
      success: false,
      error: error.message || "Erreur lors de l'export des documents",
    }
  }
}

// ============================================================================
// EXPORT MARCHÉS PDF
// ============================================================================

export async function exportMarchesPDF(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    // Vérification permissions (EXPLOITATION minimum)
    const session = await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // Construction du filtre Prisma (même que Excel) — EXPLOITATION restreint à EN_EXECUTION
    const where: any = {}
    const statutRestriction = getMarcheStatutRestriction(session.user.role)

    if (statutRestriction) {
      where.statut = statutRestriction
    } else if (filters?.statut) {
      where.statut = filters.statut
    }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.dateDebut || filters?.dateFin) {
      where.dateNotification = {}
      if (filters.dateDebut) {
        where.dateNotification.gte = new Date(filters.dateDebut)
      }
      if (filters.dateFin) {
        where.dateNotification.lte = new Date(filters.dateFin)
      }
    }

    // Récupération des marchés
    const marches = await prisma.marche.findMany({
      where,
      take: EXPORT_MAX_ROWS,
      orderBy: { numero: 'asc' },
      include: {
        user: { select: { name: true } },
      },
    })

    // Configuration des colonnes PDF
    const columns: PDFColumn[] = [
      { header: 'N° Marché', key: 'numero', width: '12%', align: 'left' },
      { header: 'Objet', key: 'objet', width: '25%', align: 'left' },
      { header: 'Type', key: 'type', width: '12%', align: 'left' },
      { header: 'Statut', key: 'statut', width: '15%', align: 'left' },
      {
        header: 'Montant',
        key: 'montant',
        width: '12%',
        align: 'right',
        format: 'currency',
      },
      {
        header: 'Date Notif.',
        key: 'dateNotification',
        width: '12%',
        align: 'center',
        format: 'date',
      },
      {
        header: 'Délai (j)',
        key: 'delaiExecution',
        width: '8%',
        align: 'right',
        format: 'number',
      },
    ]

    // Formatage des données
    const data = marches.map((marche) => ({
      numero: marche.numero,
      objet: marche.objet,
      type: formatTypeForExcel(marche.type),
      statut: formatStatutForExcel(marche.statut),
      montant: marche.montant,
      dateNotification: marche.dateNotification,
      delaiExecution: marche.delaiExecution,
    }))

    // Calcul des statistiques
    const totalMontant = marches.reduce(
      (sum, m) => sum + (m.montant?.toNumber() || 0),
      0
    )

    const summary: PDFSummaryItem[] = [
      { label: 'Nombre total de marchés', value: marches.length },
      {
        label: 'Montant total',
        value: `${totalMontant.toLocaleString('fr-FR')} FCFA`,
      },
      {
        label: 'Montant moyen',
        value:
          marches.length > 0
            ? `${Math.round(totalMontant / marches.length).toLocaleString('fr-FR')} FCFA`
            : '0 FCFA',
      },
    ]

    // Génération du PDF
    const buffer = await createPDFDocument({
      title: 'Export des Marchés Publics',
      subtitle: `${marches.length} marché${marches.length > 1 ? 's' : ''}`,
      columns,
      data,
      summary,
      orientation: filters?.orientation ?? 'portrait',
    })

    const filename = `marches_${new Date().toISOString().split('T')[0]}.pdf`

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'PDF', module: 'MARCHE', filters },
    })

    return {
      success: true,
      data: { buffer, filename },
    }
  } catch (error: any) {
    console.error('[EXPORT_MARCHES_PDF]', error)
    return {
      success: false,
      error: error.message || "Erreur lors de l'export PDF des marchés",
    }
  }
}

// ============================================================================
// EXPORT CAUTIONS PDF
// ============================================================================

export async function exportCautionsPDF(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    // Vérification permissions (EXPLOITATION minimum)
    const session = await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // Construction du filtre Prisma
    const where: any = {}

    if (filters?.statut) {
      where.statut = filters.statut
    }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.dateDebut || filters?.dateFin) {
      where.dateEmission = {}
      if (filters.dateDebut) {
        where.dateEmission.gte = new Date(filters.dateDebut)
      }
      if (filters.dateFin) {
        where.dateEmission.lte = new Date(filters.dateFin)
      }
    }

    // Récupération des cautions
    const cautions = await prisma.caution.findMany({
      where,
      take: EXPORT_MAX_ROWS,
      orderBy: { reference: 'asc' },
      include: {
        marche: { select: { numero: true, objet: true } },
        user: { select: { name: true } },
      },
    })

    // Configuration des colonnes PDF
    const columns: PDFColumn[] = [
      { header: 'Référence', key: 'reference', width: '15%', align: 'left' },
      { header: 'Type', key: 'type', width: '18%', align: 'left' },
      { header: 'Statut', key: 'statut', width: '12%', align: 'left' },
      {
        header: 'Montant',
        key: 'montant',
        width: '13%',
        align: 'right',
        format: 'currency',
      },
      {
        header: 'Échéance',
        key: 'dateEcheance',
        width: '12%',
        align: 'center',
        format: 'date',
      },
      {
        header: 'Jours',
        key: 'joursRestants',
        width: '8%',
        align: 'right',
        format: 'number',
      },
      { header: 'Banque', key: 'banqueNom', width: '15%', align: 'left' },
      { header: 'N° Marché', key: 'marcheNumero', width: '12%', align: 'left' },
    ]

    // Formatage des données
    const today = new Date()
    const data = cautions.map((caution) => {
      const joursRestants = Math.ceil(
        (new Date(caution.dateEcheance).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      )

      return {
        reference: caution.reference,
        type: formatTypeForExcel(caution.type),
        statut: formatStatutForExcel(caution.statut),
        montant: caution.montant,
        dateEcheance: caution.dateEcheance,
        joursRestants: joursRestants > 0 ? joursRestants : 0,
        banqueNom: caution.banqueNom,
        marcheNumero: caution.marche?.numero || 'N/A',
      }
    })

    // Calcul des statistiques
    const totalMontant = cautions.reduce(
      (sum, c) => sum + (c.montant?.toNumber() || 0),
      0
    )
    const cautionsActives = cautions.filter((c) => c.statut === 'ACTIVE').length

    const summary: PDFSummaryItem[] = [
      { label: 'Nombre total de cautions', value: cautions.length },
      { label: 'Cautions actives', value: cautionsActives },
      {
        label: 'Montant total',
        value: `${totalMontant.toLocaleString('fr-FR')} FCFA`,
      },
    ]

    // Génération du PDF
    const buffer = await createPDFDocument({
      title: 'Export des Cautions Bancaires',
      subtitle: `${cautions.length} caution${cautions.length > 1 ? 's' : ''}`,
      columns,
      data,
      summary,
      orientation: filters?.orientation ?? 'portrait',
    })

    const filename = `cautions_${new Date().toISOString().split('T')[0]}.pdf`

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'PDF', module: 'CAUTION', filters },
    })

    return {
      success: true,
      data: { buffer, filename },
    }
  } catch (error: any) {
    console.error('[EXPORT_CAUTIONS_PDF]', error)
    return {
      success: false,
      error: error.message || "Erreur lors de l'export PDF des cautions",
    }
  }
}

// ============================================================================
// EXPORT DOCUMENTS PDF
// ============================================================================

export async function exportDocumentsPDF(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    // Vérification permissions (EXPLOITATION minimum)
    const session = await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // Construction du filtre Prisma
    const where: any = {
      deleted: false,
    }

    if (filters?.type) {
      where.type = filters.type
    }

    if (filters?.dateDebut || filters?.dateFin) {
      where.createdAt = {}
      if (filters.dateDebut) {
        where.createdAt.gte = new Date(filters.dateDebut)
      }
      if (filters.dateFin) {
        where.createdAt.lte = new Date(filters.dateFin)
      }
    }

    // Récupération des documents
    const documents = await prisma.document.findMany({
      where,
      take: EXPORT_MAX_ROWS,
      orderBy: { createdAt: 'desc' },
      include: {
        marche: { select: { numero: true, objet: true } },
        user: { select: { name: true } },
      },
    })

    // Configuration des colonnes PDF
    const columns: PDFColumn[] = [
      { header: 'Nom', key: 'nom', width: '22%', align: 'left' },
      { header: 'Type', key: 'type', width: '15%', align: 'left' },
      { header: 'Phase', key: 'phase', width: '12%', align: 'left' },
      { header: 'Taille', key: 'taille', width: '10%', align: 'right' },
      {
        header: 'Date Création',
        key: 'createdAt',
        width: '12%',
        align: 'center',
        format: 'date',
      },
      {
        header: 'Date Validité',
        key: 'dateValidite',
        width: '12%',
        align: 'center',
        format: 'date',
      },
      { header: 'N° Marché', key: 'marcheNumero', width: '12%', align: 'left' },
    ]

    // Formatage des données
    const data = documents.map((document) => {
      // Conversion taille en format lisible
      const tailleMo = document.taille / (1024 * 1024)
      const tailleKo = document.taille / 1024
      const tailleFormatee =
        tailleMo >= 1 ? `${tailleMo.toFixed(2)} MB` : `${tailleKo.toFixed(2)} KB`

      return {
        nom: document.nom,
        type: formatTypeForExcel(document.type),
        phase: document.phase ? formatTypeForExcel(document.phase) : '-',
        taille: tailleFormatee,
        createdAt: document.createdAt,
        dateValidite: document.dateValidite || null,
        marcheNumero: document.marche?.numero || '-',
      }
    })

    // Calcul des statistiques
    const totalTaille = documents.reduce((sum, d) => sum + d.taille, 0)
    const totalTailleMB = (totalTaille / (1024 * 1024)).toFixed(2)

    const summary: PDFSummaryItem[] = [
      { label: 'Nombre total de documents', value: documents.length },
      { label: 'Taille totale', value: `${totalTailleMB} MB` },
    ]

    // Génération du PDF
    const buffer = await createPDFDocument({
      title: 'Export des Documents',
      subtitle: `${documents.length} document${documents.length > 1 ? 's' : ''}`,
      columns,
      data,
      summary,
      orientation: filters?.orientation ?? 'portrait',
    })

    const filename = `documents_${new Date().toISOString().split('T')[0]}.pdf`

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'PDF', module: 'DOCUMENT', filters },
    })

    return {
      success: true,
      data: { buffer, filename },
    }
  } catch (error: any) {
    console.error('[EXPORT_DOCUMENTS_PDF]', error)
    return {
      success: false,
      error: error.message || "Erreur lors de l'export PDF des documents",
    }
  }
}

// ============================================================================
// EXPORT VÉHICULES PDF
// ============================================================================

export async function exportVehiculesPDF(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    // Vérification permissions (EXPLOITATION minimum)
    const session = await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // Construction du filtre Prisma
    const where: any = {}

    if (filters?.statut) {
      where.statut = filters.statut
    }

    if (filters?.dateDebut || filters?.dateFin) {
      where.dateLivraison = {}
      if (filters.dateDebut) {
        where.dateLivraison.gte = new Date(filters.dateDebut)
      }
      if (filters.dateFin) {
        where.dateLivraison.lte = new Date(filters.dateFin)
      }
    }

    // Récupération des véhicules
    const vehicules = await prisma.vehicule.findMany({
      where,
      take: EXPORT_MAX_ROWS,
      orderBy: { immatriculation: 'asc' },
      include: {
        marcheVehicules: { include: { marche: { select: { numero: true, objet: true } } } },
      },
    })

    // Configuration des colonnes PDF
    const columns: PDFColumn[] = [
      {
        header: 'Immatriculation',
        key: 'immatriculation',
        width: '15%',
        align: 'left',
      },
      { header: 'Marque', key: 'marque', width: '12%', align: 'left' },
      { header: 'Modèle', key: 'modele', width: '15%', align: 'left' },
      {
        header: 'Année',
        key: 'annee',
        width: '8%',
        align: 'center',
        format: 'number',
      },
      { header: 'Statut', key: 'statut', width: '18%', align: 'left' },
      {
        header: 'Date Livraison',
        key: 'dateLivraison',
        width: '12%',
        align: 'center',
        format: 'date',
      },
      { header: 'N° Marché', key: 'marcheNumero', width: '12%', align: 'left' },
    ]

    // Formatage des données
    const data = vehicules.map((vehicule) => ({
      immatriculation: vehicule.immatriculation,
      marque: vehicule.marque,
      modele: vehicule.modele,
      annee: vehicule.annee || '-',
      statut: formatStatutForExcel(vehicule.statut),
      dateLivraison: vehicule.dateLivraison || null,
      marcheNumero: vehicule.marcheVehicules?.[0]?.marche?.numero || '-',
    }))

    // Calcul des statistiques
    const vehiculesLivres = vehicules.filter(
      (v) => v.statut === 'LIVRE'
    ).length
    const vehiculesEnAttente = vehicules.filter(
      (v) => v.statut === 'EN_ATTENTE_LIVRAISON'
    ).length

    const summary: PDFSummaryItem[] = [
      { label: 'Nombre total de véhicules', value: vehicules.length },
      { label: 'Véhicules livrés', value: vehiculesLivres },
      { label: 'Véhicules en attente', value: vehiculesEnAttente },
    ]

    // Génération du PDF
    const buffer = await createPDFDocument({
      title: 'Export des Véhicules',
      subtitle: `${vehicules.length} véhicule${vehicules.length > 1 ? 's' : ''}`,
      columns,
      data,
      summary,
      orientation: filters?.orientation ?? 'portrait',
    })

    const filename = `vehicules_${new Date().toISOString().split('T')[0]}.pdf`

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'PDF', module: 'VEHICULE', filters },
    })

    return {
      success: true,
      data: { buffer, filename },
    }
  } catch (error: any) {
    console.error('[EXPORT_VEHICULES_PDF]', error)
    return {
      success: false,
      error: error.message || "Erreur lors de l'export PDF des véhicules",
    }
  }
}

// ============================================================================
// EXPORT OPPORTUNITÉS
// ============================================================================

const STATUT_OPP_LABELS: Record<string, string> = {
  IDENTIFIEE:              'Identifiée',
  EN_ANALYSE:              'En analyse',
  GO:                      'GO',
  NO_GO:                   'NO GO',
  SOUMISE:                 'Soumise',
  DOSSIER_EN_PREPARATION:  'Dossier en préparation',
  OFFRE_SOUMISE:           'Offre soumise',
  EN_ATTENTE_ATTRIBUTION:  'En attente attribution',
  ATTRIBUE_PROVISOIREMENT: 'Attribué provisoirement',
  GAGNEE:                  'Gagnée',
  PERDUE:                  'Perdue',
}

export async function exportOpportunites(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    const session = await requireRole(['ADMIN', 'AVANCE', 'VISITEUR'])

    const where: any = {}
    if (filters?.statut) where.statut = filters.statut

    const opportunites = await prisma.opportunite.findMany({
      where,
      take: EXPORT_MAX_ROWS,
      orderBy: { createdAt: 'desc' },
      include: {
        marche:   { select: { numero: true } },
        user:     { select: { name: true } },
        dossiers: {
          select: { progression: true, statut: true },
          take: 1,
          orderBy: { updatedAt: 'desc' },
        },
      },
    })

    const today = new Date()

    // ----------------------------------------------------------------
    // Helpers couleur
    // ----------------------------------------------------------------
    function joursRestants(date: Date | null | undefined): number | null {
      if (!date) return null
      return Math.ceil((new Date(date).getTime() - today.getTime()) / 86400000)
    }

    function urgenceBg(date: Date | null | undefined): string {
      if (!date) return 'FFFFFFFF'
      const diff = joursRestants(date)!
      if (diff <= 3) return 'FFFEE2E2'   // rouge clair
      if (diff <= 7) return 'FFFEF3C7'   // amber clair
      return 'FFDCFCE7'                   // vert clair
    }

    function statutBg(statut: string): string {
      switch (statut) {
        case 'GAGNEE':                  return 'FFDCFCE7'
        case 'PERDUE':
        case 'NO_GO':                   return 'FFF3F4F6'
        case 'SOUMISE':
        case 'OFFRE_SOUMISE':
        case 'EN_ATTENTE_ATTRIBUTION':
        case 'ATTRIBUE_PROVISOIREMENT': return 'FFDBEAFE'
        default:                        return 'FFFFFFFF'
      }
    }

    const NAVY = 'FF1E3A5F'

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'ERP Marchés STAM'
    workbook.created = today

    // ================================================================
    // FEUILLE 1 — LISTE COMPLÈTE
    // ================================================================

    const ws = workbook.addWorksheet('Opportunités', {
      properties: { defaultRowHeight: 18 },
    })

    // Titre
    ws.mergeCells('A1:M1')
    const titleCell = ws.getCell('A1')
    titleCell.value = 'Export des Opportunités'
    titleCell.style = {
      font: { bold: true, size: 14, color: { argb: NAVY } },
      alignment: { vertical: 'middle', horizontal: 'center' },
    }
    ws.getRow(1).height = 30

    // Timestamp
    ws.mergeCells('A2:M2')
    const tsCell = ws.getCell('A2')
    tsCell.value = `Généré le ${format(today, 'dd/MM/yyyy')} à ${format(today, 'HH:mm')}`
    tsCell.style = {
      font: { size: 9, italic: true, color: { argb: 'FF6B7280' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
    }

    const COLS = [
      { header: 'Réf.',                 key: 'reference',            width: 18 },
      { header: 'Objet',                key: 'objet',                width: 38 },
      { header: 'Autorité contr.',      key: 'autoriteContractante', width: 28 },
      { header: 'Statut',               key: 'statut',               width: 22 },
      { header: 'Mnt. estimé (FCFA)',   key: 'montantEstime',        width: 18 },
      { header: 'Mnt. proposé (FCFA)',  key: 'montantPropose',       width: 18 },
      { header: 'Date limite',          key: 'dateLimite',           width: 14 },
      { header: 'J. restants',          key: 'joursDateLimite',      width: 12 },
      { header: 'Période validité',     key: 'periodeValidite',      width: 24 },
      { header: 'Échéance attr.',       key: 'echeanceAttr',         width: 14 },
      { header: 'J. échéance',          key: 'joursEcheance',        width: 12 },
      { header: 'Dossier offre',        key: 'dossier',              width: 14 },
      { header: 'Notes',                key: 'notes',                width: 30 },
    ]

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: {
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right:  { style: 'thin',   color: { argb: 'FFE5E7EB' } },
      },
    }

    // En-têtes (ligne 4)
    const hRow = ws.getRow(4)
    hRow.height = 25
    COLS.forEach((col, i) => {
      const cell = hRow.getCell(i + 1)
      cell.value = col.header
      cell.style = headerStyle
      ws.getColumn(i + 1).width = col.width
    })
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: COLS.length } }

    // Données
    opportunites.forEach((opp, idx) => {
      const rowBg    = statutBg(opp.statut)
      const row      = ws.getRow(5 + idx)
      row.height     = 18

      const jDL      = joursRestants(opp.dateLimite)
      const jEA      = joursRestants(opp.echeanceAttributionProv)

      const periodeStr = opp.periodeValiditeDebut
        ? `${format(new Date(opp.periodeValiditeDebut), 'dd/MM/yyyy')} → ${format(new Date(opp.periodeValiditeFin!), 'dd/MM/yyyy')}`
        : ''

      const dossier    = opp.dossiers?.[0]
      const dossierStr = dossier
        ? `${dossier.statut === 'SOUMIS' ? '✓ ' : ''}${dossier.progression}%`
        : ''

      const values: any[] = [
        opp.reference ?? '',
        opp.objet,
        opp.autoriteContractante,
        STATUT_OPP_LABELS[opp.statut] ?? opp.statut,
        opp.montantEstime?.toNumber()  ?? '',
        opp.montantPropose?.toNumber() ?? '',
        opp.dateLimite                 ? new Date(opp.dateLimite)                 : '',
        jDL !== null ? jDL : '',
        periodeStr,
        opp.echeanceAttributionProv    ? new Date(opp.echeanceAttributionProv)    : '',
        jEA !== null ? jEA : '',
        dossierStr,
        opp.notes ?? '',
      ]

      values.forEach((val, i) => {
        const cell  = row.getCell(i + 1)
        cell.value  = val
        const key   = COLS[i]?.key ?? ''
        const isDate    = val instanceof Date
        const isMontant = key.includes('montant')
        const isJours   = key.includes('jours')

        const bgArgb =
          key === 'joursDateLimite' && opp.dateLimite            ? urgenceBg(opp.dateLimite) :
          key === 'joursEcheance'   && opp.echeanceAttributionProv ? urgenceBg(opp.echeanceAttributionProv) :
          rowBg

        cell.style = {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } },
          font: { size: 10 },
          alignment: {
            vertical: 'middle',
            horizontal: isDate || isJours ? 'center' : isMontant ? 'right' : 'left',
            wrapText: key === 'objet' || key === 'notes',
          },
          border: {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
          },
          ...(isDate                              ? { numFmt: 'dd/mm/yyyy' } : {}),
          ...(isMontant && typeof val === 'number' ? { numFmt: '#,##0'      } : {}),
        }
      })
    })

    // ================================================================
    // FEUILLE 2 — SYNTHÈSE PAR STATUT
    // ================================================================

    const ws2 = workbook.addWorksheet('Synthèse')

    ws2.mergeCells('A1:D1')
    const t2 = ws2.getCell('A1')
    t2.value = 'Synthèse des opportunités par statut'
    t2.style = {
      font: { bold: true, size: 14, color: { argb: NAVY } },
      alignment: { vertical: 'middle', horizontal: 'center' },
    }
    ws2.getRow(1).height = 30

    const synthCols = [
      { header: 'Statut',                       width: 28 },
      { header: 'Nombre',                        width: 10 },
      { header: 'Montant estimé total (FCFA)',   width: 28 },
      { header: 'Montant proposé total (FCFA)',  width: 28 },
    ]
    const hRow2 = ws2.getRow(3)
    hRow2.height = 22
    synthCols.forEach(({ header, width }, i) => {
      const cell = hRow2.getCell(i + 1)
      cell.value = header
      cell.style = {
        font:      { bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border:    { bottom: { style: 'medium', color: { argb: 'FF000000' } } },
      }
      ws2.getColumn(i + 1).width = width
    })

    // Agrégation
    const byStatut: Record<string, { count: number; estimeTotal: number; proposeTotal: number }> = {}
    for (const opp of opportunites) {
      const entry = byStatut[opp.statut] ?? { count: 0, estimeTotal: 0, proposeTotal: 0 }
      entry.count++
      entry.estimeTotal  += opp.montantEstime?.toNumber()  || 0
      entry.proposeTotal += opp.montantPropose?.toNumber() || 0
      byStatut[opp.statut] = entry
    }

    let sr = 4
    for (const [statut, agg] of Object.entries(byStatut)) {
      const bg = statutBg(statut)
      const cells: any[] = [
        STATUT_OPP_LABELS[statut] ?? statut,
        agg.count,
        agg.estimeTotal  || '',
        agg.proposeTotal || '',
      ]
      cells.forEach((val, i) => {
        const cell = ws2.getRow(sr).getCell(i + 1)
        cell.value = val
        cell.style = {
          fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
          font:      { size: 10 },
          alignment: { vertical: 'middle', horizontal: i === 0 ? 'left' : i === 1 ? 'center' : 'right' },
          border:    { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } },
          ...(i >= 2 && typeof val === 'number' ? { numFmt: '#,##0' } : {}),
        }
      })
      sr++
    }

    // Ligne TOTAL
    const totalEstime  = opportunites.reduce((s, o) => s + (o.montantEstime?.toNumber()  || 0), 0)
    const totalPropose = opportunites.reduce((s, o) => s + (o.montantPropose?.toNumber() || 0), 0)
    const totalData: any[] = ['TOTAL', opportunites.length, totalEstime || '', totalPropose || '']
    totalData.forEach((val, i) => {
      const cell = ws2.getRow(sr + 1).getCell(i + 1)
      cell.value = val
      cell.style = {
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } },
        font:      { bold: true, size: 10 },
        alignment: { vertical: 'middle', horizontal: i === 0 ? 'left' : i === 1 ? 'center' : 'right' },
        border: {
          top:    { style: 'medium', color: { argb: NAVY } },
          bottom: { style: 'thin',   color: { argb: 'FFE5E7EB' } },
        },
        ...(i >= 2 && typeof val === 'number' ? { numFmt: '#,##0' } : {}),
      }
    })

    const buffer   = await workbook.xlsx.writeBuffer()
    const filename = `opportunites_${new Date().toISOString().split('T')[0]}.xlsx`

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'EXCEL', module: 'OPPORTUNITE', filters },
    })

    return { success: true, data: { buffer: Buffer.from(buffer), filename } }
  } catch (error: any) {
    console.error('[EXPORT_OPPORTUNITES]', error)
    return { success: false, error: error.message || "Erreur lors de l'export des opportunités" }
  }
}

export async function exportOpportunitesPDF(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    const session = await requireRole(['ADMIN', 'AVANCE', 'VISITEUR'])

    const where: any = {}
    if (filters?.statut) where.statut = filters.statut

    const opportunites = await prisma.opportunite.findMany({
      where,
      take: EXPORT_MAX_ROWS,
      orderBy: { createdAt: 'desc' },
      include: {
        marche: { select: { numero: true } },
      },
    })

    const columns: PDFColumn[] = [
      { header: 'Objet',                 key: 'objet',                width: '30%', align: 'left' },
      { header: 'Autorité Contractante', key: 'autoriteContractante', width: '22%', align: 'left' },
      { header: 'Statut',                key: 'statut',               width: '15%', align: 'left' },
      { header: 'Montant estimé',        key: 'montantEstime',        width: '15%', align: 'right', format: 'currency' },
      { header: 'Date limite',           key: 'dateLimite',           width: '10%', align: 'center', format: 'date' },
      { header: 'Marché',                key: 'marcheNumero',         width: '8%',  align: 'center' },
    ]

    const data = opportunites.map((o) => ({
      objet:                o.objet,
      autoriteContractante: o.autoriteContractante,
      statut:               STATUT_OPP_LABELS[o.statut] ?? o.statut,
      montantEstime:        o.montantEstime,
      dateLimite:           o.dateLimite,
      marcheNumero:         o.marche?.numero || '—',
    }))

    const totalEstime = opportunites.reduce(
      (sum, o) => sum + (o.montantEstime?.toNumber() || 0),
      0
    )

    const summary: PDFSummaryItem[] = [
      { label: "Nombre d'opportunités", value: opportunites.length },
      { label: 'Montant estimé total', value: `${totalEstime.toLocaleString('fr-FR')} FCFA` },
    ]

    const buffer = await createPDFDocument({
      title:       'Export des Opportunités',
      subtitle:    `${opportunites.length} opportunité${opportunites.length > 1 ? 's' : ''}`,
      columns,
      data,
      summary,
      orientation: filters?.orientation ?? 'landscape',
    })

    const filename = `opportunites_${new Date().toISOString().split('T')[0]}.pdf`

    await logAction({
      userId:     session.user.id,
      userEmail:  session.user.email,
      action:     AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata:   { format: 'PDF', module: 'OPPORTUNITE', filters },
    })

    return { success: true, data: { buffer, filename } }
  } catch (error: any) {
    console.error('[EXPORT_OPPORTUNITES_PDF]', error)
    return { success: false, error: error.message || "Erreur lors de l'export PDF des opportunités" }
  }
}
