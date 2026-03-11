/**
 * lib/email/opportunite-reporting-templates.ts
 *
 * Template email "Suivi Opportunités" pour le module de reporting.
 */

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { formatMontant } from "@/lib/utils/format"
import { STATUT_OPPORTUNITE_LABELS } from "@/lib/validations/opportunite"

// ============================================================
// TYPES
// ============================================================

interface DossierInfo {
  id: string
  progression: number
  statut: string
}

export interface OpportuniteForReporting {
  id: string
  reference: string | null
  objet: string
  autoriteContractante: string
  statut: string
  montantEstime: unknown
  montantPropose: unknown
  dateLimite: Date | null
  periodeValiditeDebut: Date | null
  periodeValiditeFin: Date | null
  echeanceAttributionProv: Date | null
  notes: string | null
  dossiers: DossierInfo[]
}

// ============================================================
// CONSTANTES
// ============================================================

const EMAIL_WIDTH = 900
const NAVY = "#1E3A5F"
const GOLD = "#C49A1A"

// ============================================================
// HELPERS
// ============================================================

function diffJours(date: Date, today: Date): number {
  return Math.ceil((date.getTime() - today.getTime()) / 86400000)
}

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return format(date, "dd/MM/yyyy")
}

function joursLabel(date: Date | null, today: Date): string {
  if (!date) return "—"
  const diff = diffJours(date, today)
  if (diff < 0) return `⛔ ${Math.abs(diff)}j dépassé`
  if (diff === 0) return "🔴 Aujourd'hui"
  if (diff <= 3) return `🔴 ${diff}j`
  if (diff <= 7) return `🟠 ${diff}j`
  return `🟢 ${diff}j`
}

function joursColor(date: Date | null, today: Date): string {
  if (!date) return "#9ca3af"
  const diff = diffJours(date, today)
  if (diff < 0) return "#7f1d1d"
  if (diff <= 3) return "#dc2626"
  if (diff <= 7) return "#ea580c"
  return "#16a34a"
}

function montantStr(val: unknown): string {
  if (val === null || val === undefined) return "—"
  const n = Number(val)
  if (isNaN(n)) return "—"
  return formatMontant(n)
}

function td(content: string, opts: {
  width?: number
  bold?: boolean
  color?: string
  align?: "left" | "center" | "right"
  bg?: string
  borderLeft?: string
  nowrap?: boolean
}): string {
  const styles = [
    opts.width ? `width:${opts.width}px;max-width:${opts.width}px` : "",
    "padding:7px 8px",
    "font-size:11px",
    "border-bottom:1px solid #f0f0f0",
    `background:${opts.bg ?? "#ffffff"}`,
    `color:${opts.color ?? "#374151"}`,
    `text-align:${opts.align ?? "left"}`,
    opts.bold ? "font-weight:600" : "",
    opts.borderLeft ? `border-left:4px solid ${opts.borderLeft}` : "",
    opts.nowrap ? "white-space:nowrap" : "white-space:normal;word-break:break-word",
  ].filter(Boolean).join(";")
  return `<td style="${styles}">${content}</td>`
}

function th(label: string, width: number, align: "left" | "center" | "right" = "left"): string {
  return `<th style="width:${width}px;max-width:${width}px;padding:8px;text-align:${align};color:#ffffff;font-size:10px;font-weight:600;white-space:nowrap;overflow:hidden;">${label}</th>`
}

// ============================================================
// LIGNE OPPORTUNITÉ
// ============================================================

function buildRow(opp: OpportuniteForReporting, today: Date, rowIndex: number): string {
  const rowBg = rowIndex % 2 === 0 ? "#ffffff" : "#f9fafb"
  const statut = opp.statut
  const isTerminal = statut === "NO_GO" || statut === "PERDUE"
  const borderLeft = isTerminal ? "#d1d5db" : NAVY

  const dossier = opp.dossiers[0]
  const dossierStr = dossier
    ? `✅ ${dossier.progression}%`
    : "—"

  const notesStr = opp.notes
    ? opp.notes.length > 60
      ? opp.notes.slice(0, 57) + "..."
      : opp.notes
    : "—"

  // Décomptes
  const dateLimiteLabel    = joursLabel(opp.dateLimite, today)
  const dateLimiteColor    = joursColor(opp.dateLimite, today)
  const validiteFinLabel   = joursLabel(opp.periodeValiditeFin, today)
  const validiteFinColor   = joursColor(opp.periodeValiditeFin, today)
  const echeanceLabel      = joursLabel(opp.echeanceAttributionProv, today)
  const echeanceColor      = joursColor(opp.echeanceAttributionProv, today)

  return `<tr>
    ${td(opp.reference ?? "—",     { width: 80,  bold: true, color: "#111827", bg: rowBg, borderLeft, nowrap: true })}
    ${td(opp.objet,                 { width: 160, bg: rowBg })}
    ${td(opp.autoriteContractante,  { width: 120, bg: rowBg })}
    ${td(STATUT_OPPORTUNITE_LABELS[statut] ?? statut, { width: 100, bg: rowBg, nowrap: true })}
    ${td(montantStr(opp.montantEstime),  { width: 90, align: "right", bg: rowBg, nowrap: true })}
    ${td(montantStr(opp.montantPropose), { width: 90, align: "right", bg: rowBg, nowrap: true })}
    ${td(formatDate(opp.dateLimite),    { width: 72, align: "center", bg: rowBg, nowrap: true })}
    ${td(dateLimiteLabel,               { width: 72, align: "center", bg: rowBg, bold: true, color: dateLimiteColor, nowrap: true })}
    ${td(
      opp.periodeValiditeDebut
        ? `${formatDate(opp.periodeValiditeDebut)} → ${formatDate(opp.periodeValiditeFin)}`
        : "—",
      { width: 110, align: "center", bg: rowBg, nowrap: true }
    )}
    ${td(opp.periodeValiditeFin ? validiteFinLabel : "—", { width: 62, align: "center", bg: rowBg, bold: true, color: validiteFinColor, nowrap: true })}
    ${td(formatDate(opp.echeanceAttributionProv), { width: 72, align: "center", bg: rowBg, nowrap: true })}
    ${td(opp.echeanceAttributionProv ? echeanceLabel : "—", { width: 62, align: "center", bg: rowBg, bold: true, color: echeanceColor, nowrap: true })}
    ${td(dossierStr,  { width: 55, align: "center", bg: rowBg, nowrap: true })}
    ${td(notesStr,    { width: 100, bg: rowBg })}
  </tr>`
}

// ============================================================
// TEMPLATE PRINCIPAL
// ============================================================

export function buildOpportuniteReportingEmail(
  ruleName: string,
  opportunites: OpportuniteForReporting[],
  now: Date = new Date()
): { subject: string; html: string; text: string } {
  const dateLabel = format(now, "EEEE d MMMM yyyy", { locale: fr })
  const subject = `📋 Suivi Opportunités — ${ruleName} — ${format(now, "dd/MM/yyyy")}`

  const headers = `
    ${th("Réf.", 80)}
    ${th("Objet", 160)}
    ${th("Autorité contr.", 120)}
    ${th("Statut", 100)}
    ${th("Mnt. estimé", 90, "right")}
    ${th("Mnt. proposé", 90, "right")}
    ${th("Date limite", 72, "center")}
    ${th("J. rest.", 72, "center")}
    ${th("Période validité", 110, "center")}
    ${th("J. val.", 62, "center")}
    ${th("Échéance attr.", 72, "center")}
    ${th("J. attr.", 62, "center")}
    ${th("Dossier", 55, "center")}
    ${th("Notes", 100)}
  `

  const rows = opportunites
    .map((opp, i) => buildRow(opp, now, i))
    .join("")

  // Résumé par statut
  const statsCounts: Record<string, number> = {}
  for (const opp of opportunites) {
    statsCounts[opp.statut] = (statsCounts[opp.statut] ?? 0) + 1
  }
  const statsHtml = Object.entries(statsCounts)
    .map(([statut, count]) =>
      `<span style="display:inline-block;margin:2px 4px;padding:3px 8px;background:#f3f4f6;border-radius:4px;font-size:11px;color:#374151;">
        <strong>${STATUT_OPPORTUNITE_LABELS[statut] ?? statut}</strong> · ${count}
      </span>`
    )
    .join("")

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="${EMAIL_WIDTH}" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:${NAVY};padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">
                📋 Suivi Opportunités — ${ruleName}
              </h1>
              <p style="margin:8px 0 0 0;color:${GOLD};font-size:13px;font-weight:500;">
                ${dateLabel}
              </p>
            </td>
          </tr>

          <!-- Résumé statuts -->
          <tr>
            <td style="padding:16px 28px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#374151;">
                📊 ${opportunites.length} opportunité${opportunites.length > 1 ? "s" : ""} au total
              </p>
              <div>${statsHtml}</div>
            </td>
          </tr>

          <!-- Tableau -->
          <tr>
            <td style="padding:24px 16px;overflow-x:auto;">
              <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;table-layout:fixed;width:100%;min-width:${EMAIL_WIDTH - 32}px;">
                <thead>
                  <tr style="background:${NAVY};">${headers}</tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </td>
          </tr>

          <!-- Légende décomptes -->
          <tr>
            <td style="padding:0 28px 16px 28px;">
              <p style="margin:0;font-size:10px;color:#9ca3af;">
                Décomptes jours : 🟢 &gt;7j · 🟠 ≤7j · 🔴 ≤3j · ⛔ dépassé — Dossier : ✅ progression%
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:18px 28px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#6b7280;font-size:12px;">
                Cet email est généré automatiquement par ERP Marchés STAM
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  // Version texte brut
  const textLines = [
    `SUIVI OPPORTUNITÉS — ${ruleName.toUpperCase()}`,
    `${format(now, "dd/MM/yyyy")}`,
    `Total : ${opportunites.length} opportunité(s)`,
    "",
  ]
  for (const opp of opportunites) {
    textLines.push(
      `- [${opp.reference ?? "—"}] ${opp.objet} | ${STATUT_OPPORTUNITE_LABELS[opp.statut] ?? opp.statut} | ` +
      `Estimé: ${montantStr(opp.montantEstime)} | Proposé: ${montantStr(opp.montantPropose)} | ` +
      `Date limite: ${formatDate(opp.dateLimite)}`
    )
  }

  return { subject, html, text: textLines.join("\n") }
}
