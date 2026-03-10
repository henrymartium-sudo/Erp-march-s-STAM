'use server'

import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import type { Periode, PerformanceStats, FinancialStats, CapitalisationStats, SAVStats, OpportunitesStats } from '@/lib/analytics/types'
import { STATUT_LABELS, TYPE_MARCHE_LABELS } from '@/lib/constants/marche'
import { STATUT_OPPORTUNITE_LABELS } from '@/lib/validations/opportunite'
import { StatutMarche, StatutFacture } from '@prisma/client'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Statuts considérés comme "marchés déposés" (soumissionnés)
const STATUTS_DEPOSES: StatutMarche[] = [
  StatutMarche.OFFRE_DEPOSEE,
  StatutMarche.EN_ATTENTE_ATTRIBUTION,
  StatutMarche.ATTRIBUE_PROVISOIREMENT,
  StatutMarche.ATTRIBUE_DEFINITIVEMENT,
  StatutMarche.EN_ATTENTE_LIVRAISON_OS,
  StatutMarche.EN_EXECUTION,
  StatutMarche.EXECUTE_ATTENTE_GARANTIES,
  StatutMarche.CLOTURE,
  StatutMarche.RESILIE,
]

// Statuts considérés comme "marchés gagnés" (attribués)
const STATUTS_GAGNES: StatutMarche[] = [
  StatutMarche.ATTRIBUE_DEFINITIVEMENT,
  StatutMarche.EN_ATTENTE_LIVRAISON_OS,
  StatutMarche.EN_EXECUTION,
  StatutMarche.EXECUTE_ATTENTE_GARANTIES,
  StatutMarche.CLOTURE,
]

export async function getPerformanceStats(periode: Periode): Promise<PerformanceStats> {
  await requireRole(['ADMIN'])

  const where = {
    dateNotification: { gte: periode.dateDebut, lte: periode.dateFin },
  }

  // 1. Répartition par statut
  const parStatutRaw = await prisma.marche.groupBy({
    by: ['statut'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })

  // 2. Répartition par type + montants
  const parTypeRaw = await prisma.marche.groupBy({
    by: ['type', 'statut'],
    where,
    _count: { id: true },
    _sum: { montant: true },
  })

  // 3. Agrégats globaux + délai moyen
  const aggregate = await prisma.marche.aggregate({
    where,
    _count: { id: true },
    _sum: { montant: true },
    _avg: { delaiExecution: true },
  })

  // 4. Top concurrents (champ concurrentGagnant)
  const concurrentsRaw = await prisma.marche.groupBy({
    by: ['concurrentGagnant'],
    where: {
      ...where,
      concurrentGagnant: { not: null },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  // Post-traitement statuts
  const parStatut = parStatutRaw.map((s) => ({
    statut: s.statut,
    label: STATUT_LABELS[s.statut],
    count: s._count.id,
  }))

  // Post-traitement types — win rate par type
  const typeMap = new Map<string, { total: number; gagnes: number; montant: number }>()
  for (const row of parTypeRaw) {
    const existing = typeMap.get(row.type) || { total: 0, gagnes: 0, montant: 0 }
    existing.total += row._count.id
    existing.montant += Number(row._sum.montant || 0)
    if (STATUTS_GAGNES.includes(row.statut as StatutMarche)) {
      existing.gagnes += row._count.id
    }
    typeMap.set(row.type, existing)
  }

  const parType = Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    label: TYPE_MARCHE_LABELS[type as keyof typeof TYPE_MARCHE_LABELS] || type,
    count: data.total,
    montant: data.montant,
    winRate: data.total > 0 ? Math.round((data.gagnes / data.total) * 100) : 0,
  }))

  // Calcul win rate global
  const totalDeposes = parStatutRaw
    .filter((s) => STATUTS_DEPOSES.includes(s.statut as StatutMarche))
    .reduce((sum, s) => sum + s._count.id, 0)
  const totalGagnes = parStatutRaw
    .filter((s) => STATUTS_GAGNES.includes(s.statut as StatutMarche))
    .reduce((sum, s) => sum + s._count.id, 0)

  return {
    totalMarches: aggregate._count.id,
    marchesGagnes: totalGagnes,
    marchesDeposes: totalDeposes,
    winRate: totalDeposes > 0 ? Math.round((totalGagnes / totalDeposes) * 100) : 0,
    montantTotal: Number(aggregate._sum.montant || 0),
    montantMoyen: aggregate._count.id > 0
      ? Math.round(Number(aggregate._sum.montant || 0) / aggregate._count.id)
      : 0,
    delaiMoyenJours: Math.round(aggregate._avg.delaiExecution || 0),
    parStatut,
    parType,
    topConcurrents: concurrentsRaw
      .filter((c) => c.concurrentGagnant)
      .map((c) => ({ nom: c.concurrentGagnant!, count: c._count.id })),
  }
}

export async function getFinancialStats(periode: Periode): Promise<FinancialStats> {
  await requireRole(['ADMIN'])

  const wherePeriode = {
    dateNotification: { gte: periode.dateDebut, lte: periode.dateFin },
  }

  // CA contractualisé = SUM montant marchés "effectifs"
  const caContractualise = await prisma.marche.aggregate({
    where: {
      ...wherePeriode,
      statut: {
        in: [
          StatutMarche.EN_EXECUTION,
          StatutMarche.EXECUTE_ATTENTE_GARANTIES,
          StatutMarche.CLOTURE,
          StatutMarche.ATTRIBUE_DEFINITIVEMENT,
        ],
      },
    },
    _sum: { montant: true },
  })

  // Factures sur la période (dateEmission dans la période)
  const whereFactures = {
    marche: wherePeriode,
  }

  const facturesParStatutRaw = await prisma.facture.groupBy({
    by: ['statut'],
    where: whereFactures,
    _count: { id: true },
    _sum: { montantTTC: true },
  })

  const caEncaisse = facturesParStatutRaw
    .filter((f) => f.statut === StatutFacture.PAYEE)
    .reduce((sum, f) => sum + Number(f._sum.montantTTC || 0), 0)

  const caEnAttente = facturesParStatutRaw
    .filter((f) => (f.statut === StatutFacture.EMISE || f.statut === StatutFacture.EN_ATTENTE))
    .reduce((sum, f) => sum + Number(f._sum.montantTTC || 0), 0)

  // Cautions
  const cautionsActives = await prisma.caution.aggregate({
    where: { statut: 'ACTIVE' },
    _sum: { montant: true },
  })
  const cautionsLiberees = await prisma.caution.aggregate({
    where: { statut: 'LIBEREE' },
    _sum: { montant: true },
  })

  const caContractualiseVal = Number(caContractualise._sum.montant || 0)

  return {
    caContractualise: caContractualiseVal,
    caEncaisse,
    caEnAttente,
    cautionsActives: Number(cautionsActives._sum.montant || 0),
    cautionsLiberees: Number(cautionsLiberees._sum.montant || 0),
    tauxRecouvrement: caContractualiseVal > 0
      ? Math.round((caEncaisse / caContractualiseVal) * 100)
      : 0,
    facturesParStatut: facturesParStatutRaw.map((f) => ({
      statut: f.statut,
      count: f._count.id,
      montant: Number(f._sum.montantTTC || 0),
    })),
  }
}

export async function getCapitalisationStats(periode: Periode): Promise<CapitalisationStats> {
  await requireRole(['ADMIN'])

  const where = {
    dateNotification: { gte: periode.dateDebut, lte: periode.dateFin },
  }

  // 1. Tous les marchés de la période (pour calcul win rate par AC et par type)
  const marches = await prisma.marche.findMany({
    where,
    select: {
      autoriteContractanteNom: true,
      type: true,
      statut: true,
      montant: true,
      dateNotification: true,
    },
  })

  // Win rate par AC
  const acMap = new Map<string, { total: number; gagnes: number; montant: number }>()
  for (const m of marches) {
    const key = m.autoriteContractanteNom
    const existing = acMap.get(key) || { total: 0, gagnes: 0, montant: 0 }
    existing.total += 1
    existing.montant += Number(m.montant || 0)
    if (STATUTS_GAGNES.includes(m.statut as StatutMarche)) existing.gagnes += 1
    acMap.set(key, existing)
  }

  const topAC = Array.from(acMap.entries())
    .map(([nom, data]) => ({
      nom,
      total: data.total,
      gagnes: data.gagnes,
      montant: data.montant,
      winRate: data.total > 0 ? Math.round((data.gagnes / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 10)

  // Win rate par segment (type)
  const segmentMap = new Map<string, { total: number; gagnes: number; montant: number }>()
  for (const m of marches) {
    const existing = segmentMap.get(m.type) || { total: 0, gagnes: 0, montant: 0 }
    existing.total += 1
    existing.montant += Number(m.montant || 0)
    if (STATUTS_GAGNES.includes(m.statut as StatutMarche)) existing.gagnes += 1
    segmentMap.set(m.type, existing)
  }

  const parSegment = Array.from(segmentMap.entries()).map(([type, data]) => ({
    type,
    label: TYPE_MARCHE_LABELS[type as keyof typeof TYPE_MARCHE_LABELS] || type,
    total: data.total,
    gagnes: data.gagnes,
    montant: data.montant,
    winRate: data.total > 0 ? Math.round((data.gagnes / data.total) * 100) : 0,
  }))

  // Saisonnalité — marchés par mois (dateNotification)
  const moisMap = new Map<string, { label: string; count: number }>()
  for (const m of marches) {
    const key = format(m.dateNotification, 'yyyy-MM')
    const label = format(m.dateNotification, 'MMM yyyy', { locale: fr })
    const existing = moisMap.get(key) || { label, count: 0 }
    existing.count += 1
    moisMap.set(key, existing)
  }

  const saisonnalite = Array.from(moisMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mois, data]) => ({ mois, label: data.label, count: data.count }))

  return { topAC, parSegment, saisonnalite }
}

export async function getSAVStats(periode: Periode): Promise<SAVStats> {
  await requireRole(['ADMIN'])

  const where = {
    signaleAt: { gte: periode.dateDebut, lte: periode.dateFin },
  }

  // Répartition par statut
  const parStatutRaw = await prisma.intervention.groupBy({
    by: ['statut'],
    where,
    _count: { id: true },
    _sum: { cout: true },
  })

  // Répartition par type
  const parTypeRaw = await prisma.intervention.groupBy({
    by: ['type'],
    where,
    _count: { id: true },
    _sum: { cout: true },
  })

  // Toutes les interventions pour calcul délai moyen
  const interventions = await prisma.intervention.findMany({
    where,
    select: {
      statut: true,
      signaleAt: true,
      resolveAt: true,
      cout: true,
      vehiculeId: true,
      vehicule: {
        select: { immatriculation: true, marque: true, modele: true },
      },
    },
  })

  // Calcul délai moyen résolution
  const resolues = interventions.filter((i) => i.resolveAt)
  const delaiMoyen = resolues.length > 0
    ? resolues.reduce((sum, i) => {
        const jours = (i.resolveAt!.getTime() - i.signaleAt.getTime()) / (1000 * 60 * 60 * 24)
        return sum + jours
      }, 0) / resolues.length
    : 0

  // Top véhicules défaillants
  const vehiculeMap = new Map<string, {
    immatriculation: string; marque: string; modele: string
    count: number; cout: number
  }>()
  for (const i of interventions) {
    const existing = vehiculeMap.get(i.vehiculeId) || {
      immatriculation: i.vehicule.immatriculation,
      marque: i.vehicule.marque,
      modele: i.vehicule.modele,
      count: 0,
      cout: 0,
    }
    existing.count += 1
    existing.cout += Number(i.cout || 0)
    vehiculeMap.set(i.vehiculeId, existing)
  }

  const topVehicules = Array.from(vehiculeMap.entries())
    .map(([vehiculeId, data]) => ({ vehiculeId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const INTERVENTION_TYPE_LABELS: Record<string, string> = {
    PANNE: 'Panne',
    ENTRETIEN: 'Entretien',
    RAPPEL: 'Rappel',
  }
  const INTERVENTION_STATUT_LABELS: Record<string, string> = {
    SIGNALE: 'Signalé',
    DIAGNOSTIC: 'Diagnostic',
    EN_COURS: 'En cours',
    RESOLU: 'Résolu',
    CLOS: 'Clos',
  }

  const totalInterventions = interventions.length
  const interventionsResolues = interventions.filter(
    (i) => i.statut === 'RESOLU' || i.statut === 'CLOS'
  ).length
  const coutTotal = interventions.reduce((sum, i) => sum + Number(i.cout || 0), 0)

  return {
    totalInterventions,
    interventionsResolues,
    tauxResolution: totalInterventions > 0
      ? Math.round((interventionsResolues / totalInterventions) * 100)
      : 0,
    delaiMoyenResolutionJours: Math.round(delaiMoyen * 10) / 10,
    coutTotal,
    parType: parTypeRaw.map((t) => ({
      type: t.type,
      label: INTERVENTION_TYPE_LABELS[t.type] || t.type,
      count: t._count.id,
      cout: Number(t._sum.cout || 0),
    })),
    parStatut: parStatutRaw.map((s) => ({
      statut: s.statut,
      label: INTERVENTION_STATUT_LABELS[s.statut] || s.statut,
      count: s._count.id,
    })),
    topVehicules,
  }
}

const STATUTS_EN_COURS_OPP = [
  'EN_ANALYSE',
  'GO',
  'DOSSIER_EN_PREPARATION',
  'OFFRE_SOUMISE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
]

export async function getOpportunitesStats(periode: Periode): Promise<OpportunitesStats> {
  await requireRole(['ADMIN'])

  const where = {
    createdAt: { gte: periode.dateDebut, lte: periode.dateFin },
  }

  // 1. Répartition par statut
  const parStatutRaw = await prisma.opportunite.groupBy({
    by: ['statut'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })

  // 2. Agrégats globaux
  const aggregate = await prisma.opportunite.aggregate({
    where,
    _count: { id: true },
    _sum: { montantEstime: true, montantPropose: true },
  })

  // 3. Top 10 AC par nombre d'opportunités
  const topACRaw = await prisma.opportunite.groupBy({
    by: ['autoriteContractante'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  // 4. Gagnées par AC (pour les top 10)
  const topACNoms = topACRaw.map((ac) => ac.autoriteContractante)
  const gagneesByACRaw = await prisma.opportunite.groupBy({
    by: ['autoriteContractante'],
    where: { ...where, statut: 'GAGNEE', autoriteContractante: { in: topACNoms } },
    _count: { id: true },
  })
  const gagneesByACMap = new Map(gagneesByACRaw.map((g) => [g.autoriteContractante, g._count.id]))

  const totalOpportunites = aggregate._count.id
  const totalGagnees = parStatutRaw.find((s) => s.statut === 'GAGNEE')?._count.id ?? 0
  const totalEnCours = parStatutRaw
    .filter((s) => STATUTS_EN_COURS_OPP.includes(s.statut))
    .reduce((sum, s) => sum + s._count.id, 0)

  return {
    totalOpportunites,
    totalGagnees,
    totalEnCours,
    tauxConversion:
      totalOpportunites > 0 ? Math.round((totalGagnees / totalOpportunites) * 100) : 0,
    montantEstimeTotal: Number(aggregate._sum.montantEstime ?? 0),
    montantProposeTotal: Number(aggregate._sum.montantPropose ?? 0),
    parStatut: parStatutRaw.map((s) => ({
      statut: s.statut,
      label: STATUT_OPPORTUNITE_LABELS[s.statut] ?? s.statut,
      count: s._count.id,
    })),
    topAC: topACRaw.map((ac) => ({
      nom: ac.autoriteContractante,
      count: ac._count.id,
      gagnees: gagneesByACMap.get(ac.autoriteContractante) ?? 0,
    })),
  }
}

export async function getAllAnalyticsData(periode: Periode) {
  const [performance, financiere, capitalisation, sav, opportunites] = await Promise.all([
    getPerformanceStats(periode),
    getFinancialStats(periode),
    getCapitalisationStats(periode),
    getSAVStats(periode),
    getOpportunitesStats(periode),
  ])
  return { performance, financiere, capitalisation, sav, opportunites }
}
