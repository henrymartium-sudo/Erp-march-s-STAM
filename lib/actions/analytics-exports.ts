'use server'

import { requireRole } from '@/lib/utils/permissions'
import { getAllAnalyticsData } from './analytics'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import type { ActionResult } from '@/types'
import type { Periode } from '@/lib/analytics/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  createPDFDocument,
  type PDFColumn,
  type PDFSummaryItem,
} from '@/lib/utils/pdf'

function formatMontant(val: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(val)) + ' FCFA'
}

function periodeLabel(periode: Periode) {
  return `${format(periode.dateDebut, 'dd/MM/yyyy', { locale: fr })} – ${format(periode.dateFin, 'dd/MM/yyyy', { locale: fr })}`
}

export async function exportAnalytiquesExcel(
  periode: Periode
): Promise<ActionResult<{ buffer: number[]; filename: string }>> {
  try {
    const session = await requireRole(['ADMIN'])
    const data = await getAllAnalyticsData(periode)
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'ERP Marchés STAM'
    workbook.created = new Date()

    // ── Onglet 1 : Performance ──────────────────────────────────────────────
    const wsPerf = workbook.addWorksheet('Performance')
    wsPerf.addRow(['PERFORMANCE MARCHÉS — ' + periodeLabel(periode)])
    wsPerf.addRow([])
    wsPerf.addRow(['Total marchés', data.performance.totalMarches])
    wsPerf.addRow(['Marchés déposés', data.performance.marchesDeposes])
    wsPerf.addRow(['Marchés gagnés', data.performance.marchesGagnes])
    wsPerf.addRow(['Taux de succès', data.performance.winRate + '%'])
    wsPerf.addRow(['Montant total', formatMontant(data.performance.montantTotal)])
    wsPerf.addRow(['Montant moyen', formatMontant(data.performance.montantMoyen)])
    wsPerf.addRow(['Délai moyen exécution', data.performance.delaiMoyenJours + ' jours'])
    wsPerf.addRow([])
    wsPerf.addRow(['Statut', 'Nombre'])
    for (const s of data.performance.parStatut) wsPerf.addRow([s.label, s.count])
    wsPerf.addRow([])
    wsPerf.addRow(['Type', 'Total', 'Win Rate', 'Montant'])
    for (const t of data.performance.parType) {
      wsPerf.addRow([t.label, t.count, t.winRate + '%', formatMontant(t.montant)])
    }

    // ── Onglet 2 : Financière ───────────────────────────────────────────────
    const wsFin = workbook.addWorksheet('Financière')
    wsFin.addRow(['ANALYSE FINANCIÈRE — ' + periodeLabel(periode)])
    wsFin.addRow([])
    wsFin.addRow(['CA contractualisé', formatMontant(data.financiere.caContractualise)])
    wsFin.addRow(['CA encaissé', formatMontant(data.financiere.caEncaisse)])
    wsFin.addRow(['CA en attente', formatMontant(data.financiere.caEnAttente)])
    wsFin.addRow(['Taux de recouvrement', data.financiere.tauxRecouvrement + '%'])
    wsFin.addRow(['Cautions actives', formatMontant(data.financiere.cautionsActives)])
    wsFin.addRow(['Cautions libérées', formatMontant(data.financiere.cautionsLiberees)])
    wsFin.addRow([])
    wsFin.addRow(['Statut Facture', 'Nombre', 'Montant TTC'])
    for (const f of data.financiere.facturesParStatut) {
      wsFin.addRow([f.statut, f.count, formatMontant(f.montant)])
    }

    // ── Onglet 3 : Capitalisation ───────────────────────────────────────────
    const wsCap = workbook.addWorksheet('Capitalisation')
    wsCap.addRow(['CAPITALISATION STRATÉGIQUE — ' + periodeLabel(periode)])
    wsCap.addRow([])
    wsCap.addRow(['Top Autorités Contractantes'])
    wsCap.addRow(['Autorité', 'Total', 'Gagnés', 'Win Rate %', 'Montant'])
    for (const ac of data.capitalisation.topAC) {
      wsCap.addRow([ac.nom, ac.total, ac.gagnes, ac.winRate + '%', formatMontant(ac.montant)])
    }
    wsCap.addRow([])
    wsCap.addRow(['Par Segment'])
    wsCap.addRow(['Segment', 'Total', 'Gagnés', 'Win Rate %', 'Montant'])
    for (const s of data.capitalisation.parSegment) {
      wsCap.addRow([s.label, s.total, s.gagnes, s.winRate + '%', formatMontant(s.montant)])
    }
    wsCap.addRow([])
    wsCap.addRow(['Saisonnalité'])
    wsCap.addRow(["Mois", "Nombre appels d'offres"])
    for (const m of data.capitalisation.saisonnalite) {
      wsCap.addRow([m.label, m.count])
    }

    // ── Onglet 4 : SAV ──────────────────────────────────────────────────────
    const wsSAV = workbook.addWorksheet('SAV')
    wsSAV.addRow(['SAV & INTERVENTIONS — ' + periodeLabel(periode)])
    wsSAV.addRow([])
    wsSAV.addRow(['Total interventions', data.sav.totalInterventions])
    wsSAV.addRow(['Interventions résolues', data.sav.interventionsResolues])
    wsSAV.addRow(['Taux de résolution', data.sav.tauxResolution + '%'])
    wsSAV.addRow(['Délai moyen résolution', data.sav.delaiMoyenResolutionJours + ' jours'])
    wsSAV.addRow(['Coût total', formatMontant(data.sav.coutTotal)])
    wsSAV.addRow([])
    wsSAV.addRow(['Par Type', 'Nombre', 'Coût'])
    for (const t of data.sav.parType) {
      wsSAV.addRow([t.label, t.count, formatMontant(t.cout)])
    }
    wsSAV.addRow([])
    wsSAV.addRow(['Top Véhicules Défaillants'])
    wsSAV.addRow(['Immatriculation', 'Marque', 'Modèle', 'Nb interventions', 'Coût total'])
    for (const v of data.sav.topVehicules) {
      wsSAV.addRow([v.immatriculation, v.marque, v.modele, v.count, formatMontant(v.cout)])
    }

    // Génération buffer — retourner un tableau de nombres (sérialisable en Server Action)
    const rawBuffer = await workbook.xlsx.writeBuffer()
    const buffer = Array.from(new Uint8Array(rawBuffer))
    const filename = `analytiques_${format(new Date(), 'yyyy-MM-dd')}.xlsx`

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata: { format: 'EXCEL', module: 'ANALYTIQUE' },
    })

    return { success: true, data: { buffer, filename } }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur export Excel analytiques'
    console.error('[EXPORT_ANALYTIQUES_EXCEL]', error)
    return { success: false, error: msg }
  }
}

export async function exportAnalytiquesPDF(
  periode: Periode
): Promise<ActionResult<{ buffer: number[]; filename: string }>> {
  try {
    const session = await requireRole(['ADMIN'])
    const data = await getAllAnalyticsData(periode)

    // Rapport capitalisation (tableau principal : Top AC)
    const columns: PDFColumn[] = [
      { header: 'Autorité Contractante', key: 'nom', width: '40%', align: 'left' },
      { header: 'Total', key: 'total', width: '12%', align: 'right', format: 'number' },
      { header: 'Gagnés', key: 'gagnes', width: '12%', align: 'right', format: 'number' },
      { header: 'Win Rate', key: 'winRateStr', width: '15%', align: 'right' },
      { header: 'Montant', key: 'montant', width: '21%', align: 'right', format: 'currency' },
    ]

    const tableData = data.capitalisation.topAC.map((ac) => ({
      nom: ac.nom,
      total: ac.total,
      gagnes: ac.gagnes,
      winRateStr: ac.winRate + '%',
      montant: ac.montant,
    }))

    const summary: PDFSummaryItem[] = [
      { label: 'Période analysée', value: periodeLabel(periode) },
      { label: 'Total marchés', value: data.performance.totalMarches },
      { label: 'Taux de succès global', value: data.performance.winRate + '%' },
      { label: 'CA contractualisé', value: formatMontant(data.performance.montantTotal) },
      { label: 'CA encaissé', value: formatMontant(data.financiere.caEncaisse) },
      { label: 'Taux recouvrement', value: data.financiere.tauxRecouvrement + '%' },
      { label: 'Cautions actives', value: formatMontant(data.financiere.cautionsActives) },
      { label: 'Interventions SAV', value: data.sav.totalInterventions },
      { label: 'Taux résolution SAV', value: data.sav.tauxResolution + '%' },
    ]

    const rawBuffer = await createPDFDocument({
      title: 'Rapport Analytique — Marchés Publics',
      subtitle: periodeLabel(periode),
      columns,
      data: tableData,
      summary,
      orientation: 'landscape',
    })

    const buffer = Array.from(new Uint8Array(rawBuffer))
    const filename = `rapport_analytique_${format(new Date(), 'yyyy-MM-dd')}.pdf`

    await logAction({
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      action: AUDIT_ACTION.EXPORT,
      entityType: AUDIT_ENTITY.EXPORT,
      metadata: { format: 'PDF', module: 'ANALYTIQUE' },
    })

    return { success: true, data: { buffer, filename } }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur export PDF analytiques'
    console.error('[EXPORT_ANALYTIQUES_PDF]', error)
    return { success: false, error: msg }
  }
}
