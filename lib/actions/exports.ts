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
import { formatDateCourt } from '@/lib/utils/format'

// ============================================================================
// TYPES
// ============================================================================

interface ExportFilters {
  statut?: string
  type?: string
  dateDebut?: string
  dateFin?: string
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
      { header: 'Montant (DH)', key: 'montant', width: 15 },
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
      { header: 'Montant (DH)', key: 'montant', width: 15 },
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
        marcheNumero: caution.marche.numero,
        marcheObjet: caution.marche.objet,
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
