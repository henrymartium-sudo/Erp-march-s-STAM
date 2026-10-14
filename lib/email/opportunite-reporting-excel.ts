/**
 * Classeur Excel joint au mail « Suivi Opportunités » : toutes les colonnes,
 * notes intégrales, une ligne par opportunité (actives puis terminées).
 */

import ExcelJS from "exceljs"
import { calculerAvancementLots, totalMontantPropose } from "@/lib/utils/lots"
import { STATUT_OPPORTUNITE_LABELS } from "@/lib/validations/opportunite"
import { classerOpportunites, diffJours } from "./opportunite-reporting-sections"
import type { OpportuniteForReporting } from "./opportunite-reporting-templates"

const NAVY_ARGB = "FF1E3A5F"

const COLONNES: { header: string; key: string; width: number }[] = [
  { header: "Référence", key: "reference", width: 26 },
  { header: "Objet", key: "objet", width: 50 },
  { header: "Autorité contractante", key: "autorite", width: 36 },
  { header: "Statut", key: "statut", width: 22 },
  { header: "Montant estimé", key: "estime", width: 18 },
  { header: "Montant proposé", key: "propose", width: 18 },
  { header: "Date limite", key: "dateLimite", width: 13 },
  { header: "Jours restants", key: "jours", width: 13 },
  { header: "Validité début", key: "validiteDebut", width: 14 },
  { header: "Validité fin", key: "validiteFin", width: 14 },
  { header: "Échéance attribution", key: "echeance", width: 18 },
  { header: "Avancement dossier (%)", key: "avancement", width: 16 },
  { header: "Notes", key: "notes", width: 70 },
]

function nombreOuNull(val: unknown): number | null {
  if (val === null || val === undefined) return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

export async function buildOpportuniteReportingExcel(
  opportunites: OpportuniteForReporting[],
  now: Date
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Opportunités", { views: [{ state: "frozen", ySplit: 1 }] })
  ws.columns = COLONNES

  const { actives, terminees } = classerOpportunites(opportunites, now)
  for (const opp of [...actives, ...terminees]) {
    ws.addRow({
      reference: opp.reference,
      objet: opp.objet,
      autorite: opp.autoriteContractante,
      statut: STATUT_OPPORTUNITE_LABELS[opp.statut] ?? opp.statut,
      estime: nombreOuNull(opp.montantEstime),
      propose: nombreOuNull(totalMontantPropose(opp.lots)),
      dateLimite: opp.dateLimite,
      jours: opp.dateLimite ? diffJours(opp.dateLimite, now) : null,
      validiteDebut: opp.periodeValiditeDebut,
      validiteFin: opp.periodeValiditeFin,
      echeance: opp.echeanceAttributionProv,
      avancement: calculerAvancementLots(opp.lots).progressionMoyenne,
      notes: opp.notes,
    })
  }

  const entete = ws.getRow(1)
  entete.font = { bold: true, color: { argb: "FFFFFFFF" } }
  entete.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_ARGB } }
  entete.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  entete.height = 30

  ws.eachRow((row, n) => {
    if (n === 1) return
    row.alignment = { vertical: "top", wrapText: true }
  })
  for (const cle of ["estime", "propose"]) ws.getColumn(cle).numFmt = "#,##0"
  for (const cle of ["dateLimite", "validiteDebut", "validiteFin", "echeance"]) {
    ws.getColumn(cle).numFmt = "dd/mm/yyyy"
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLONNES.length } }

  return Buffer.from(await wb.xlsx.writeBuffer())
}
