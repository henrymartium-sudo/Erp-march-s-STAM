'use server'

import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/utils/permissions'
import type { Periode, PerformanceStats, FinancialStats, CapitalisationStats, SAVStats, OpportunitesStats } from '@/lib/analytics/types'
import { STATUT_LABELS, TYPE_MARCHE_LABELS } from '@/lib/constants/marche'
import { STATUT_OPPORTUNITE_LABELS } from '@/lib/validations/opportunite'
import { StatutMarche, StatutFacture, StatutOpportunite } from '@prisma/client'
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

// Statuts "en cours" pour le module Opportunités (actives, hors NO_GO et PERDUE)
const STATUTS_EN_COURS_OPP: StatutOpportunite[] = [
  StatutOpportunite.EN_ANALYSE,
  StatutOpportunite.GO,
  StatutOpportunite.DOSSIER_EN_PREPARATION,
  StatutOpportunite.OFFRE_SOUMISE,
  StatutOpportunite.EN_ATTENTE_ATTRIBUTION,
  StatutOpportunite.ATTRIBUE_PROVISOIREMENT,
]

// Statuts "offre soumise ou ultérieure" (pour calcul taux de gain global)
const STATUTS_OFFRE_SOUMISE_OPP: string[] = [
  'SOUMISE',               // legacy alias
  'OFFRE_SOUMISE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
  'PERDUE',
]

export async function getPerformanceStats(periode: Periode): Promise<PerformanceStats> {
  await requireRole(['ADMIN'])

  const where = {
    dateNotification: { gte: periode.dateDebut, lte: periode.dateFin },
    // RÈGLE MÉTIER : exclure les marchés "Opportunité identifiée" — statut pré-commercial
    // traité dans le module Opportunités, jamais comptabilisé comme marché réel.
    statut: { not: StatutMarche.OPPORTUNITE_IDENTIFIEE },
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
    // RÈGLE MÉTIER : exclure les marchés "Opportunité identifiée"
    statut: { not: StatutMarche.OPPORTUNITE_IDENTIFIEE },
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

  // Enrichissement prospectif — opportunités en cours par AC (ÉTAPE 3C)
  // RÈGLE MÉTIER : combine vision historique (marchés réalisés) et prospective (pipeline actif)
  const allACNoms = Array.from(acMap.keys())
  const oppEnCoursRaw = allACNoms.length > 0
    ? await prisma.opportunite.groupBy({
        by: ['autoriteContractante'],
        where: {
          autoriteContractante: { in: allACNoms },
          statut: { in: STATUTS_EN_COURS_OPP },
        },
        _count: { id: true },
      })
    : []
  const oppEnCoursMap = new Map(oppEnCoursRaw.map((o) => [o.autoriteContractante, o._count.id]))

  const topAC = Array.from(acMap.entries())
    .map(([nom, data]) => ({
      nom,
      total: data.total,
      gagnes: data.gagnes,
      montant: data.montant,
      winRate: data.total > 0 ? Math.round((data.gagnes / data.total) * 100) : 0,
      opportunitesEnCours: oppEnCoursMap.get(nom) ?? 0,
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

export async function getOpportunitesStats(periode: Periode): Promise<OpportunitesStats> {
  await requireRole(['ADMIN'])

  const where = {
    createdAt: { gte: periode.dateDebut, lte: periode.dateFin },
  }

  // 1. Répartition par statut (avec montants)
  const parStatutRaw = await prisma.opportunite.groupBy({
    by: ['statut'],
    where,
    _count: { id: true },
    _sum: { montantEstime: true, montantPropose: true },
    orderBy: { _count: { id: 'desc' } },
  })

  // 2. Agrégats globaux
  const aggregate = await prisma.opportunite.aggregate({
    where,
    _count: { id: true },
    _sum: { montantEstime: true, montantPropose: true },
  })

  // 3. Top 10 AC par nombre d'opportunités (avec montant estimé)
  const topACRaw = await prisma.opportunite.groupBy({
    by: ['autoriteContractante'],
    where,
    _count: { id: true },
    _sum: { montantEstime: true },
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

  // 5. Pipeline → Marchés : opportunités converties en marché sur la période
  // RÈGLE MÉTIER : une opportunité gagnée génère un marché lié — ne pas comptabiliser les deux.
  const pipelineMarchesRaw = await prisma.opportunite.findMany({
    where: { ...where, marcheId: { not: null } },
    select: {
      objet: true,
      marche: { select: { numero: true, montant: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // 6. Données détail pour évolution mensuelle et délais moyens
  const oppDetails = await prisma.opportunite.findMany({
    where,
    select: { createdAt: true, dateLimite: true, echeanceAttributionProv: true },
    orderBy: { createdAt: 'asc' },
  })

  // ── Calculs KPIs ────────────────────────────────────────────────────────────
  const totalOpportunites = aggregate._count.id
  const totalGagnees = parStatutRaw.find((s) => s.statut === 'GAGNEE')?._count.id ?? 0
  const totalEnCours = parStatutRaw
    .filter((s) => STATUTS_EN_COURS_OPP.includes(s.statut as StatutOpportunite))
    .reduce((sum, s) => sum + s._count.id, 0)

  // Taux de gain global : offres soumises → gagnées
  const totalOffressoumises = parStatutRaw
    .filter((s) => STATUTS_OFFRE_SOUMISE_OPP.includes(s.statut))
    .reduce((sum, s) => sum + s._count.id, 0)
  const tauxGainGlobal = totalOffressoumises > 0
    ? Math.round((totalGagnees / totalOffressoumises) * 100)
    : 0

  // ── Évolution mensuelle ──────────────────────────────────────────────────────
  const moisMap = new Map<string, { label: string; count: number }>()
  for (const opp of oppDetails) {
    const key = format(opp.createdAt, 'yyyy-MM')
    const label = format(opp.createdAt, 'MMM yyyy', { locale: fr })
    const existing = moisMap.get(key) || { label, count: 0 }
    existing.count += 1
    moisMap.set(key, existing)
  }
  const evolutionMensuelle = Array.from(moisMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mois, data]) => ({ mois, label: data.label, count: data.count }))

  // ── Délais moyens ────────────────────────────────────────────────────────────
  // Délai identification → soumission (createdAt → dateLimite)
  const oppAvecDateLimite = oppDetails.filter((o) => o.dateLimite)
  const delaiMoyenIdentificationSoumissionJours = oppAvecDateLimite.length > 0
    ? Math.round(
        oppAvecDateLimite.reduce((sum, o) => {
          const jours = (o.dateLimite!.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          return sum + Math.max(0, jours)
        }, 0) / oppAvecDateLimite.length
      )
    : 0
  // Délai soumission → attribution (dateLimite → echeanceAttributionProv)
  const oppAvecDeuxDates = oppDetails.filter((o) => o.dateLimite && o.echeanceAttributionProv)
  const delaiMoyenSoumissionAttributionJours = oppAvecDeuxDates.length > 0
    ? Math.round(
        oppAvecDeuxDates.reduce((sum, o) => {
          const jours =
            (o.echeanceAttributionProv!.getTime() - o.dateLimite!.getTime()) / (1000 * 60 * 60 * 24)
          return sum + Math.max(0, jours)
        }, 0) / oppAvecDeuxDates.length
      )
    : 0

  return {
    totalOpportunites,
    totalGagnees,
    totalEnCours,
    totalOffressoumises,
    tauxConversion:
      totalOpportunites > 0 ? Math.round((totalGagnees / totalOpportunites) * 100) : 0,
    tauxGainGlobal,
    montantEstimeTotal: Number(aggregate._sum.montantEstime ?? 0),
    montantProposeTotal: Number(aggregate._sum.montantPropose ?? 0),
    parStatut: parStatutRaw.map((s) => ({
      statut: s.statut,
      label: STATUT_OPPORTUNITE_LABELS[s.statut] ?? s.statut,
      count: s._count.id,
      montantEstime: Number(s._sum.montantEstime ?? 0),
      montantPropose: Number(s._sum.montantPropose ?? 0),
    })),
    topAC: topACRaw.map((ac) => ({
      nom: ac.autoriteContractante,
      count: ac._count.id,
      gagnees: gagneesByACMap.get(ac.autoriteContractante) ?? 0,
      montantEstime: Number(ac._sum.montantEstime ?? 0),
    })),
    pipelineMarches: pipelineMarchesRaw
      .filter((o) => o.marche)
      .map((o) => ({
        objet: o.objet,
        marcheNumero: o.marche!.numero,
        marcheMontant: Number(o.marche!.montant ?? 0),
      })),
    evolutionMensuelle,
    delaiMoyenIdentificationSoumissionJours,
    delaiMoyenSoumissionAttributionJours,
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
