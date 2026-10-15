/**
 * Assemble le mail « Suivi Opportunités » complet : sujet, HTML, texte
 * et classeur Excel en pièce jointe.
 */

import { format } from "date-fns"
import { buildOpportuniteReportingExcel } from "./opportunite-reporting-excel"
import {
  buildOpportuniteReportingEmail,
  type OpportuniteForReporting,
} from "./opportunite-reporting-templates"

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function construireSuiviOpportunites(
  ruleName: string,
  opportunites: OpportuniteForReporting[],
  now: Date
): Promise<{
  subject: string
  html: string
  text: string
  attachments: { filename: string; content: Buffer; contentType: string }[]
}> {
  const { subject, html, text } = buildOpportuniteReportingEmail(ruleName, opportunites, now)
  const content = await buildOpportuniteReportingExcel(opportunites, now)
  return {
    subject,
    html,
    text,
    attachments: [
      {
        filename: `suivi-opportunites-${format(now, "yyyy-MM-dd")}.xlsx`,
        content,
        contentType: XLSX_MIME,
      },
    ],
  }
}
