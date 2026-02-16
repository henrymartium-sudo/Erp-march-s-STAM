'use server'

import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
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

// ============================================================================
// TYPES
// ============================================================================

interface ExportFilters {
  statut?: string
  type?: string
  dateDebut?: string
  dateFin?: string
  search?: string
}

// ============================================================================
// EXPORT MARCHÉS
// ============================================================================

export async function exportMarches(
  filters?: ExportFilters
): Promise<ActionResult<{ buffer: Buffer; filename: string }>> {
  try {
    // Vérification permissions (EXPLOITATION minimum)
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // Construction du filtre Prisma
    const where: any = {}

    if (filters?.statut) {
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
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

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
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

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
      orderBy: { immatriculation: 'asc' },
      include: {
        marche: { select: { numero: true, objet: true } },
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
      marcheNumero: vehicule.marche?.numero || '',
      marcheObjet: vehicule.marche?.objet || '',
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
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

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
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

    // Construction du filtre Prisma (même que Excel)
    const where: any = {}

    if (filters?.statut) {
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
    })

    const filename = `marches_${new Date().toISOString().split('T')[0]}.pdf`

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
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

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
    })

    const filename = `cautions_${new Date().toISOString().split('T')[0]}.pdf`

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
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

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
    })

    const filename = `documents_${new Date().toISOString().split('T')[0]}.pdf`

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
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION'])

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
      orderBy: { immatriculation: 'asc' },
      include: {
        marche: { select: { numero: true, objet: true } },
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
      marcheNumero: vehicule.marche?.numero || '-',
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
    })

    const filename = `vehicules_${new Date().toISOString().split('T')[0]}.pdf`

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
