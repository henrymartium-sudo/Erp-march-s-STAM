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
import { formatMontant } from '@/lib/utils/format'
import type * as ExcelJSTypes from 'exceljs'

function periodeLabel(periode: Periode) {
  return `${format(periode.dateDebut, 'dd/MM/yyyy', { locale: fr })} – ${format(periode.dateFin, 'dd/MM/yyyy', { locale: fr })}`
}

const AUCUNE_DONNEE = 'Aucune donnée sur la période'
const NON_DISPONIBLE = 'n.d.'

/** Un délai moyen de 0 jour signifie « aucune donnée » (le calcul renvoie 0 faute d'échantillon). */
function delaiOuND(jours: number): number | string {
  return jours > 0 ? jours : NON_DISPONIBLE
}

export async function exportAnalytiquesExcel(
  periode: Periode
): Promise<ActionResult<{ buffer: number[]; filename: string }>> {
  try {
    const session = await requireRole(['ADMIN', 'AVANCE'])
    const data = await getAllAnalyticsData(periode)
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'ERP Marchés STAM'
    workbook.created = new Date()

    // ── Styles réutilisables ────────────────────────────────────────────────
    const headerStyle: Partial<ExcelJSTypes.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { bottom: { style: 'medium', color: { argb: 'FFC49A1A' } } },
    }
    const sectionStyle: Partial<ExcelJSTypes.Style> = {
      font: { bold: true, color: { argb: 'FF1E3A5F' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } },
    }
    const altRowFill: ExcelJSTypes.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }
    const MONTANT_FMT = '#,##0 "FCFA"'
    const PCT_FMT = '0.0"%"'

    function applyHeaderStyle(row: ExcelJSTypes.Row) {
      row.height = 22
      row.eachCell((cell) => { cell.style = headerStyle as ExcelJSTypes.Style })
    }
    function applyAltRow(row: ExcelJSTypes.Row, idx: number) {
      if (idx % 2 === 0) row.eachCell((cell) => { cell.fill = altRowFill })
    }
    /** Évite un tableau réduit à son en-tête : une ligne explicite quand il n'y a rien à lister. */
    function ligneSiVide(ws: ExcelJSTypes.Worksheet, nbLignes: number) {
      if (nbLignes === 0) ws.addRow([AUCUNE_DONNEE]).getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } }
    }

    // ── Onglet Synthèse (couverture) ────────────────────────────────────────
    const wsSynth = workbook.addWorksheet('Synthèse')
    wsSynth.properties.tabColor = { argb: 'FF1E3A5F' }
    wsSynth.columns = [{ width: 42 }, { width: 24 }]
    const titleRow = wsSynth.addRow(['Rapport analytique — Marchés Publics', ''])
    titleRow.height = 36
    titleRow.getCell(1).font = { bold: true, size: 18, color: { argb: 'FF1E3A5F' } }
    wsSynth.addRow([])
    wsSynth.addRow(['Période analysée', periodeLabel(periode)])
    wsSynth.addRow(['Généré le', format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })])
    wsSynth.addRow([])
    const kpiHeader = wsSynth.addRow(['Indicateur', 'Valeur'])
    applyHeaderStyle(kpiHeader)
    // Deux notions distinctes, deux libellés : le CA contractualisé ne compte que les marchés
    // attribués / en exécution / clôturés ; le montant total couvre tous les marchés de la période.
    const kpiRows = [
      ['Total marchés', data.performance.totalMarches],
      ['CA contractualisé', data.financiere.caContractualise],
      ['Montant total des marchés (tous statuts)', data.performance.montantTotal],
      ['CA encaissé', data.financiere.caEncaisse],
      ['Total interventions SAV', data.sav.totalInterventions],
      ['Coût total SAV', data.sav.coutTotal],
    ]
    kpiRows.forEach(([label, val], i) => {
      const row = wsSynth.addRow([label, val])
      if (
        label === 'CA contractualisé' ||
        label === 'Montant total des marchés (tous statuts)' ||
        label === 'CA encaissé' ||
        label === 'Coût total SAV'
      ) {
        row.getCell(2).numFmt = MONTANT_FMT
      }
      applyAltRow(row, i)
    })

    // ── Bloc Pipeline Commercial ─────────────────────────────────────────────
    // RÈGLE MÉTIER : les opportunités converties en marchés ne comptent qu'une fois
    // côté Marché — le pipeline n'affiche que les opportunités actives et pré-commerciales.
    wsSynth.addRow([])
    const pipelineTitle = wsSynth.addRow(['PIPELINE COMMERCIAL', ''])
    pipelineTitle.getCell(1).style = sectionStyle as ExcelJSTypes.Style
    pipelineTitle.height = 18
    const pipelineHdr = wsSynth.addRow(['Indicateur', 'Valeur'])
    applyHeaderStyle(pipelineHdr)
    const opp = data.opportunites
    const pipelineRows: [string, number | string][] = [
      ['Total opportunités actives (en cours)', opp.totalEnCours],
      ['Montant estimatif total (pipeline)', opp.montantEstimeTotal],
      ['Montant proposé total', opp.montantProposeTotal],
    ]
    pipelineRows.forEach(([label, val], i) => {
      const row = wsSynth.addRow([label, val])
      if (
        label === 'Montant estimatif total (pipeline)' ||
        label === 'Montant proposé total'
      ) {
        row.getCell(2).numFmt = MONTANT_FMT
      }
      applyAltRow(row, i)
    })

    // ── Onglet 1 : Performance ──────────────────────────────────────────────
    const wsPerf = workbook.addWorksheet('Performance')
    wsPerf.properties.tabColor = { argb: 'FF2563EB' }
    wsPerf.views = [{ state: 'frozen', ySplit: 1 }]

    // KPIs section
    // Largeurs fixées une seule fois : réaffecter `columns` plus bas écraserait les colonnes suivantes
    wsPerf.columns = [{ width: 42 }, { width: 22 }, { width: 22 }]
    const perfTitle = wsPerf.addRow(['PERFORMANCE MARCHÉS — ' + periodeLabel(periode), ''])
    Object.assign(perfTitle.getCell(1), { style: sectionStyle })
    perfTitle.height = 20
    wsPerf.addRow([])

    const perfKpiHdr = wsPerf.addRow(['Indicateur', 'Valeur'])
    applyHeaderStyle(perfKpiHdr)
    const perfKpis: [string, number | string][] = [
      ['Total marchés', data.performance.totalMarches],
      ['Marchés déposés', data.performance.marchesDeposes],
      ['Marchés gagnés', data.performance.marchesGagnes],
      ['Montant total des marchés (tous statuts)', data.performance.montantTotal],
      ['Montant moyen', data.performance.montantMoyen],
      ['Délai moyen exécution', delaiOuND(data.performance.delaiMoyenJours)],
    ]
    perfKpis.forEach(([label, val], i) => {
      const row = wsPerf.addRow([label, val])
      if (label === 'Montant total des marchés (tous statuts)' || label === 'Montant moyen') row.getCell(2).numFmt = MONTANT_FMT
      else if (label === 'Délai moyen exécution') row.getCell(2).numFmt = '0 "jours"'
      applyAltRow(row, i)
    })

    // Statuts
    wsPerf.addRow([])
    const perfStatutHdr = wsPerf.addRow(['Statut', 'Nombre'])
    applyHeaderStyle(perfStatutHdr)
    data.performance.parStatut.forEach((s, i) => {
      const row = wsPerf.addRow([s.label, s.count])
      applyAltRow(row, i)
    })
    ligneSiVide(wsPerf, data.performance.parStatut.length)

    // Par type
    wsPerf.addRow([])
    const perfTypeHdr = wsPerf.addRow(['Type', 'Total', 'Montant'])
    applyHeaderStyle(perfTypeHdr)
    data.performance.parType.forEach((t, i) => {
      const row = wsPerf.addRow([t.label, t.count, t.montant])
      row.getCell(3).numFmt = MONTANT_FMT
      applyAltRow(row, i)
    })
    ligneSiVide(wsPerf, data.performance.parType.length)

    // ── Onglet 2 : Finances ─────────────────────────────────────────────────
    const wsFin = workbook.addWorksheet('Finances')
    wsFin.properties.tabColor = { argb: 'FF10B981' }
    wsFin.views = [{ state: 'frozen', ySplit: 1 }]
    wsFin.columns = [{ width: 32 }, { width: 22 }, { width: 22 }]

    const finTitle = wsFin.addRow(['ANALYSE FINANCIÈRE — ' + periodeLabel(periode), ''])
    Object.assign(finTitle.getCell(1), { style: sectionStyle })
    finTitle.height = 20
    wsFin.addRow([])

    const finKpiHdr = wsFin.addRow(['Indicateur', 'Montant'])
    applyHeaderStyle(finKpiHdr)
    const finKpis: [string, number][] = [
      ['CA contractualisé', data.financiere.caContractualise],
      ['CA encaissé', data.financiere.caEncaisse],
      ['CA en attente', data.financiere.caEnAttente],
      ['Cautions actives', data.financiere.cautionsActives],
      ['Cautions libérées', data.financiere.cautionsLiberees],
    ]
    finKpis.forEach(([label, val], i) => {
      const row = wsFin.addRow([label, val])
      row.getCell(2).numFmt = MONTANT_FMT
      applyAltRow(row, i)
    })

    wsFin.addRow([])
    const finFactHdr = wsFin.addRow(['Statut Facture', 'Nombre', 'Montant TTC'])
    applyHeaderStyle(finFactHdr)
    data.financiere.facturesParStatut.forEach((f, i) => {
      const row = wsFin.addRow([f.statut, f.count, f.montant])
      row.getCell(3).numFmt = MONTANT_FMT
      applyAltRow(row, i)
    })
    ligneSiVide(wsFin, data.financiere.facturesParStatut.length)

    // ── Onglet 3 : Capitalisation ───────────────────────────────────────────
    const wsCap = workbook.addWorksheet('Capitalisation')
    wsCap.properties.tabColor = { argb: 'FFC49A1A' }
    wsCap.views = [{ state: 'frozen', ySplit: 1 }]
    // Colonne 5 : "Opp. en cours" — enrichissement prospectif (pipeline actif par AC)
    wsCap.columns = [{ width: 36 }, { width: 10 }, { width: 10 }, { width: 22 }, { width: 14 }]

    const capTitle = wsCap.addRow(['CAPITALISATION STRATÉGIQUE — ' + periodeLabel(periode)])
    Object.assign(capTitle.getCell(1), { style: sectionStyle })
    capTitle.height = 20
    wsCap.addRow([])

    const capAChdr = wsCap.addRow(['Autorité Contractante', 'Total', 'Gagnés', 'Montant', 'Opp. en cours'])
    applyHeaderStyle(capAChdr)
    data.capitalisation.topAC.forEach((ac, i) => {
      const row = wsCap.addRow([ac.nom, ac.total, ac.gagnes, ac.montant, ac.opportunitesEnCours])
      row.getCell(4).numFmt = MONTANT_FMT
      applyAltRow(row, i)
    })
    ligneSiVide(wsCap, data.capitalisation.topAC.length)

    wsCap.addRow([])
    const capSegHdr = wsCap.addRow(['Segment', 'Total', 'Gagnés', 'Montant'])
    applyHeaderStyle(capSegHdr)
    data.capitalisation.parSegment.forEach((s, i) => {
      const row = wsCap.addRow([s.label, s.total, s.gagnes, s.montant])
      row.getCell(4).numFmt = MONTANT_FMT
      applyAltRow(row, i)
    })
    ligneSiVide(wsCap, data.capitalisation.parSegment.length)

    wsCap.addRow([])
    const capSaisHdr = wsCap.addRow(["Mois", "Appels d'offres"])
    applyHeaderStyle(capSaisHdr)
    data.capitalisation.saisonnalite.forEach((m, i) => {
      const row = wsCap.addRow([m.label, m.count])
      applyAltRow(row, i)
    })
    ligneSiVide(wsCap, data.capitalisation.saisonnalite.length)

    // ── Onglet 4 : Opportunités ──────────────────────────────────────────────
    const wsOpp = workbook.addWorksheet('Opportunités')
    wsOpp.properties.tabColor = { argb: 'FF8B5CF6' }
    wsOpp.views = [{ state: 'frozen', ySplit: 1 }]

    const oppTitle = wsOpp.addRow(['PIPELINE OPPORTUNITÉS — ' + periodeLabel(periode)])
    Object.assign(oppTitle.getCell(1), { style: sectionStyle })
    oppTitle.height = 20
    wsOpp.addRow([])

    // A) Vue générale — KPIs
    // Largeurs fixées une seule fois : réaffecter `columns` plus bas écrasait les colonnes C et D
    // (retour à la largeur par défaut, donc « ######## » sur les montants en FCFA).
    wsOpp.columns = [{ width: 44 }, { width: 22 }, { width: 22 }, { width: 22 }]
    const oppKpiHdr = wsOpp.addRow(['Indicateur', 'Valeur'])
    applyHeaderStyle(oppKpiHdr)
    const oppData = data.opportunites
    const oppKpis: [string, number][] = [
      ['Total opportunités', oppData.totalOpportunites],
      ['Opportunités actives (en cours)', oppData.totalEnCours],
      ['Opportunités gagnées', oppData.totalGagnees],
      ['Offres soumises', oppData.totalOffressoumises],
      ['Montant estimatif total pipeline', oppData.montantEstimeTotal],
      ['Montant proposé total', oppData.montantProposeTotal],
    ]
    oppKpis.forEach(([label, val], i) => {
      const row = wsOpp.addRow([label, val])
      if (label === 'Montant estimatif total pipeline' || label === 'Montant proposé total') {
        row.getCell(2).numFmt = MONTANT_FMT
      }
      applyAltRow(row, i)
    })

    // B) Répartition par statut (nombre + montants)
    wsOpp.addRow([])
    const oppStatutHdr = wsOpp.addRow(['Statut', 'Nombre', 'Montant estimé', 'Montant proposé'])
    applyHeaderStyle(oppStatutHdr)
    oppData.parStatut.forEach((s, i) => {
      const row = wsOpp.addRow([s.label, s.count, s.montantEstime, s.montantPropose])
      row.getCell(3).numFmt = MONTANT_FMT
      row.getCell(4).numFmt = MONTANT_FMT
      applyAltRow(row, i)
    })
    ligneSiVide(wsOpp, oppData.parStatut.length)

    // C) Pipeline → Marchés : opportunités converties
    // RÈGLE MÉTIER : zéro doublon — ces opportunités ne comptent que dans les totaux Marchés.
    wsOpp.addRow([])
    const oppPipelineHdr = wsOpp.addRow(['Opportunité convertie', 'N° Marché', 'Montant contractualisé'])
    applyHeaderStyle(oppPipelineHdr)
    if (oppData.pipelineMarches.length > 0) {
      oppData.pipelineMarches.forEach((m, i) => {
        const row = wsOpp.addRow([m.objet, m.marcheNumero, m.marcheMontant])
        row.getCell(3).numFmt = MONTANT_FMT
        applyAltRow(row, i)
      })
    } else {
      wsOpp.addRow(['Aucune opportunité convertie en marché sur la période'])
    }

    // D) Top autorités contractantes
    wsOpp.addRow([])
    const oppACHdr = wsOpp.addRow(['Autorité Contractante', 'Total Opp.', 'Gagnées', 'Montant estimé'])
    applyHeaderStyle(oppACHdr)
    oppData.topAC.forEach((ac, i) => {
      const row = wsOpp.addRow([ac.nom, ac.count, ac.gagnees, ac.montantEstime])
      row.getCell(4).numFmt = MONTANT_FMT
      applyAltRow(row, i)
    })
    ligneSiVide(wsOpp, oppData.topAC.length)

    // E) Évolution mensuelle des opportunités identifiées
    wsOpp.addRow([])
    const oppEvolHdr = wsOpp.addRow(['Mois', 'Opportunités identifiées'])
    applyHeaderStyle(oppEvolHdr)
    oppData.evolutionMensuelle.forEach((m, i) => {
      const row = wsOpp.addRow([m.label, m.count])
      applyAltRow(row, i)
    })
    ligneSiVide(wsOpp, oppData.evolutionMensuelle.length)

    // F) Délais moyens
    wsOpp.addRow([])
    const oppDelaiHdr = wsOpp.addRow(['Indicateur délai', 'Valeur'])
    applyHeaderStyle(oppDelaiHdr)
    const oppDelais: [string, number | string][] = [
      ['Délai moyen identification → soumission', delaiOuND(oppData.delaiMoyenIdentificationSoumissionJours)],
      ['Délai moyen soumission → attribution', delaiOuND(oppData.delaiMoyenSoumissionAttributionJours)],
    ]
    oppDelais.forEach(([label, val], i) => {
      const row = wsOpp.addRow([label, val])
      row.getCell(2).numFmt = '0 "jours"'
      applyAltRow(row, i)
    })

    // ── Onglet 5 : SAV ──────────────────────────────────────────────────────
    const wsSAV = workbook.addWorksheet('SAV')
    wsSAV.properties.tabColor = { argb: 'FFEF4444' }
    wsSAV.views = [{ state: 'frozen', ySplit: 1 }]
    wsSAV.columns = [{ width: 32 }, { width: 20 }, { width: 22 }, { width: 16 }, { width: 20 }]

    const savTitle = wsSAV.addRow(['SAV & INTERVENTIONS — ' + periodeLabel(periode)])
    Object.assign(savTitle.getCell(1), { style: sectionStyle })
    savTitle.height = 20
    wsSAV.addRow([])

    const savKpiHdr = wsSAV.addRow(['Indicateur', 'Valeur'])
    applyHeaderStyle(savKpiHdr)
    const savKpis: [string, number | string][] = [
      ['Total interventions', data.sav.totalInterventions],
      ['Interventions résolues', data.sav.interventionsResolues],
      ['Taux de résolution', data.sav.totalInterventions > 0 ? data.sav.tauxResolution / 100 : NON_DISPONIBLE],
      ['Délai moyen résolution', delaiOuND(data.sav.delaiMoyenResolutionJours)],
      ['Coût total', data.sav.coutTotal],
    ]
    savKpis.forEach(([label, val], i) => {
      const row = wsSAV.addRow([label, val])
      if (label === 'Coût total') row.getCell(2).numFmt = MONTANT_FMT
      else if (label === 'Taux de résolution') row.getCell(2).numFmt = PCT_FMT
      else if (label === 'Délai moyen résolution') row.getCell(2).numFmt = '0 "jours"'
      applyAltRow(row, i)
    })

    wsSAV.addRow([])
    const savTypeHdr = wsSAV.addRow(['Type d\'intervention', 'Nombre', 'Coût'])
    applyHeaderStyle(savTypeHdr)
    data.sav.parType.forEach((t, i) => {
      const row = wsSAV.addRow([t.label, t.count, t.cout])
      row.getCell(3).numFmt = MONTANT_FMT
      applyAltRow(row, i)
    })
    ligneSiVide(wsSAV, data.sav.parType.length)

    wsSAV.addRow([])
    const savVehHdr = wsSAV.addRow(['Immatriculation', 'Marque', 'Modèle', 'Nb interventions', 'Coût total'])
    applyHeaderStyle(savVehHdr)
    data.sav.topVehicules.forEach((v, i) => {
      const row = wsSAV.addRow([v.immatriculation, v.marque, v.modele, v.count, v.cout])
      row.getCell(5).numFmt = MONTANT_FMT
      applyAltRow(row, i)
    })
    ligneSiVide(wsSAV, data.sav.topVehicules.length)

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
    const session = await requireRole(['ADMIN', 'AVANCE'])
    const data = await getAllAnalyticsData(periode)

    // Rapport capitalisation (tableau principal : Top AC)
    const columns: PDFColumn[] = [
      { header: 'Autorité Contractante', key: 'nom', width: '48%', align: 'left' },
      { header: 'Total', key: 'total', width: '15%', align: 'right', format: 'number' },
      { header: 'Gagnés', key: 'gagnes', width: '15%', align: 'right', format: 'number' },
      { header: 'Montant', key: 'montant', width: '22%', align: 'right', format: 'currency' },
    ]

    const tableData = data.capitalisation.topAC.map((ac) => ({
      nom: ac.nom,
      total: ac.total,
      gagnes: ac.gagnes,
      montant: ac.montant,
    }))

    const summary: PDFSummaryItem[] = [
      { label: 'Période analysée', value: periodeLabel(periode) },
      { label: 'Total marchés', value: data.performance.totalMarches },
      // Même définition que l'Excel et la page : marchés attribués / en exécution / clôturés.
      // Montants exacts (et non arrondis au million) : un rapport doit pouvoir se recouper.
      { label: 'CA contractualisé', value: formatMontant(data.financiere.caContractualise) },
      { label: 'CA encaissé', value: formatMontant(data.financiere.caEncaisse) },
      { label: 'Cautions actives', value: formatMontant(data.financiere.cautionsActives) },
      { label: 'Interventions SAV', value: data.sav.totalInterventions },
      {
        label: 'Taux résolution SAV',
        value: data.sav.totalInterventions > 0 ? data.sav.tauxResolution + '%' : NON_DISPONIBLE,
      },
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
