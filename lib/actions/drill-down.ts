'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/utils/permissions'
import { STATUT_LABELS } from '@/lib/constants/marche'
import { TYPE_CAUTION_LABELS, STATUT_CAUTION_LABELS } from '@/lib/constants/caution'
import { STATUT_VEHICULE_LABELS } from '@/lib/constants/vehicule'
import { STATUT_OPPORTUNITE_LABELS } from '@/lib/validations/opportunite'
import { startOfMonth, endOfMonth } from 'date-fns'

// ── Type partagé ──────────────────────────────────────────────────────────────

export interface DrillDownItem {
  id: string
  label: string
  sublabel?: string
  montant?: number
  statut?: string
  href?: string
}

// ── Marchés ───────────────────────────────────────────────────────────────────

export async function getMarchesByStatut(statut: string): Promise<DrillDownItem[]> {
  await requireAuth()
  const marches = await prisma.marche.findMany({
    where: { statut: statut as any },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, numero: true, objet: true, montant: true, statut: true },
  })
  return marches.map((m) => ({
    id: m.id,
    label: m.numero || m.objet,
    sublabel: m.objet !== m.numero ? m.objet : undefined,
    montant: m.montant ? Number(m.montant) : undefined,
    statut: STATUT_LABELS[m.statut] ?? m.statut,
    href: `/marches/${m.id}`,
  }))
}

export async function getMarchesByMois(moisIso: string): Promise<DrillDownItem[]> {
  await requireAuth()
  const parts = moisIso.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const date = new Date(year, month - 1, 1)
  const marches = await prisma.marche.findMany({
    where: { dateNotification: { gte: startOfMonth(date), lte: endOfMonth(date) } },
    orderBy: { montant: 'desc' },
    take: 50,
    select: { id: true, numero: true, objet: true, montant: true, statut: true },
  })
  return marches.map((m) => ({
    id: m.id,
    label: m.numero || m.objet,
    sublabel: m.objet !== m.numero ? m.objet : undefined,
    montant: m.montant ? Number(m.montant) : undefined,
    statut: STATUT_LABELS[m.statut] ?? m.statut,
    href: `/marches/${m.id}`,
  }))
}

// ── Cautions ──────────────────────────────────────────────────────────────────

export async function getCautionsByType(type: string): Promise<DrillDownItem[]> {
  await requireAuth()
  const cautions = await prisma.caution.findMany({
    where: { type: type as any },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, reference: true, montant: true, statut: true, banqueNom: true },
  })
  return cautions.map((c) => ({
    id: c.id,
    label: c.reference || `Caution ${c.id.slice(0, 8)}`,
    sublabel: c.banqueNom,
    montant: c.montant ? Number(c.montant) : undefined,
    statut: STATUT_CAUTION_LABELS?.[c.statut] ?? c.statut,
    href: `/cautions/${c.id}`,
  }))
}

// ── Véhicules ─────────────────────────────────────────────────────────────────

export async function getVehiculesByStatut(statut: string): Promise<DrillDownItem[]> {
  await requireAuth()
  const vehicules = await prisma.vehicule.findMany({
    where: { statut: statut as any },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, immatriculation: true, marque: true, modele: true, statut: true },
  })
  return vehicules.map((v) => ({
    id: v.id,
    label: v.immatriculation || `${v.marque} ${v.modele}`,
    sublabel: `${v.marque} ${v.modele}`,
    statut: STATUT_VEHICULE_LABELS?.[v.statut] ?? v.statut,
    href: `/vehicules/${v.id}`,
  }))
}

// ── Opportunités ──────────────────────────────────────────────────────────────

export async function getOpportunitesByStatut(statut: string): Promise<DrillDownItem[]> {
  await requireAuth()
  const opps = await prisma.opportunite.findMany({
    where: { statut: statut as any },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      reference: true,
      objet: true,
      montantEstime: true,
      statut: true,
      autoriteContractante: true,
    },
  })
  return opps.map((o) => ({
    id: o.id,
    label: o.reference ? `${o.reference} — ${o.objet}` : o.objet,
    sublabel: o.autoriteContractante,
    montant: o.montantEstime ? Number(o.montantEstime) : undefined,
    statut: STATUT_OPPORTUNITE_LABELS[o.statut] ?? o.statut,
    href: `/opportunites/${o.id}`,
  }))
}

export async function getOpportunitesByAC(ac: string): Promise<DrillDownItem[]> {
  await requireAuth()
  const opps = await prisma.opportunite.findMany({
    where: { autoriteContractante: ac },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      reference: true,
      objet: true,
      montantEstime: true,
      statut: true,
    },
  })
  return opps.map((o) => ({
    id: o.id,
    label: o.reference ? `${o.reference} — ${o.objet}` : o.objet,
    montant: o.montantEstime ? Number(o.montantEstime) : undefined,
    statut: STATUT_OPPORTUNITE_LABELS[o.statut] ?? o.statut,
    href: `/opportunites/${o.id}`,
  }))
}
