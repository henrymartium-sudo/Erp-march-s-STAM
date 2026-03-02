/**
 * lib/email/reporting-templates.ts
 *
 * Template email "Synthèse Marchés" pour le module de reporting.
 * NE PAS modifier — template dédié, indépendant de lib/email/templates.ts
 */

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { formatMontant } from "@/lib/utils/format"
import { STATUT_LABELS } from "@/lib/constants/marche"
import type { StatutMarche } from "@prisma/client"
import type { MarcheForReporting } from "@/lib/cron/getMarchesForReporting"

// ============================================================
// CONSTANTES
// ============================================================

const EMAIL_WIDTH = 800
const EMAIL_PADDING_H = 56
const TABLE_WIDTH = EMAIL_WIDTH - EMAIL_PADDING_H // 744px

// Statuts pour lesquels on affiche les jours restants
const STATUTS_WITH_DAYS_LEFT: StatutMarche[] = [
  "OPPORTUNITE_IDENTIFIEE",
  "DOSSIER_EN_PREPARATION",
  "EN_ATTENTE_LIVRAISON_OS",
  "EN_EXECUTION",
  "EXECUTE_ATTENTE_GARANTIES",
]

// Statuts terminaux — fond neutre, pas d'indicateur d'urgence
const STATUTS_TERMINAUX: StatutMarche[] = [
  "CLOTURE",
  "RESILIE",
  "ANNULE",
  "INFRUCTUEUX",
]

// ============================================================
// MAPPING DATE PERTINENTE PAR STATUT
// ============================================================

function getDatePertinente(
  m: MarcheForReporting
): { date: Date | null; label: string } {
  switch (m.statut) {
    case "OPPORTUNITE_IDENTIFIEE":
    case "DOSSIER_EN_PREPARATION":
      return { date: m.dateDepotPrevue, label: "Dépôt prévu" }
    case "OFFRE_DEPOSEE":
      return { date: m.dateDepotOffre, label: "Dépôt offre" }
    case "EN_ATTENTE_ATTRIBUTION":
      return { date: m.dateAttributionProvisoire, label: "Attrib. prov." }
    case "ATTRIBUE_PROVISOIREMENT":
      return { date: m.dateAttributionDefinitive, label: "Attrib. déf." }
    case "ATTRIBUE_DEFINITIVEMENT":
      return { date: m.dateOrdreService, label: "Ordre de service" }
    case "EN_ATTENTE_LIVRAISON_OS": {
      // Utiliser dateLivraisonPrevue ou calculer depuis dateOrdreService + delaiExecution
      if (m.dateLivraisonPrevue) return { date: m.dateLivraisonPrevue, label: "Livraison prévue" }
      if (m.dateOrdreService) {
        const calc = new Date(m.dateOrdreService)
        calc.setDate(calc.getDate() + m.delaiExecution)
        return { date: calc, label: "Livraison calc." }
      }
      return { date: null, label: "Livraison prévue" }
    }
    case "EN_EXECUTION":
      return { date: m.dateFinPrevue, label: "Fin d'exéc." }
    case "EXECUTE_ATTENTE_GARANTIES":
      return { date: m.dateReceptionDefinitive ?? m.dateReceptionProvisoirePrevue, label: "Réception déf." }
    case "CLOTURE":
      return { date: m.dateClotureAdministrative, label: "Clôture" }
    case "RESILIE":
      return { date: m.dateResiliation, label: "Résiliation" }
    case "ANNULE":
      return { date: m.dateAnnulation, label: "Annulation" }
    case "INFRUCTUEUX":
      return { date: m.dateInfructueux, label: "Infructueux" }
    default:
      return { date: null, label: "Date" }
  }
}

// ============================================================
// HELPERS HTML
// ============================================================

function tdStyle(opts: {
  width: number
  align?: string
  bold?: boolean
  color?: string
  bg: string
  borderLeft?: string
}): string {
  const base = [
    `width: ${opts.width}px`,
    `max-width: ${opts.width}px`,
    `padding: 7px 8px`,
    `font-size: 11px`,
    `border-bottom: 1px solid #f0f0f0`,
    `overflow: hidden`,
    `text-overflow: ellipsis`,
    `white-space: nowrap`,
    `background-color: ${opts.bg}`,
    `color: ${opts.color ?? "#374151"}`,
    `text-align: ${opts.align ?? "left"}`,
  ]
  if (opts.bold) base.push("font-weight: 600")
  if (opts.borderLeft) base.push(`border-left: 4px solid ${opts.borderLeft}`)
  return base.join("; ")
}

// ============================================================
// SECTION PAR STATUT
// ============================================================

function buildStatutSection(
  statut: StatutMarche,
  marches: MarcheForReporting[],
  today: Date
): string {
  const isTerminal = STATUTS_TERMINAUX.includes(statut)
  const showDaysLeft = STATUTS_WITH_DAYS_LEFT.includes(statut)

  // Colonnes : N°(90) | Objet(200) | Autorité(160) | Montant(110) | Date(82) | J.rest(62=si applicable)
  const hasJoursCol = showDaysLeft
  const dateColWidth = 82
  const joursColWidth = hasJoursCol ? 62 : 0
  // Redistribuer les 62px sur Objet si pas de colonne J.rest
  const objetWidth = hasJoursCol ? 200 : 262

  const cols = [
    { label: "N° Marché",       width: 90,          align: "left" },
    { label: "Objet",           width: objetWidth,  align: "left" },
    { label: "Autorité contr.", width: 160,         align: "left" },
    { label: "Montant",         width: 110,         align: "right" },
    { label: getDatePertinente(marches[0]!).label, width: dateColWidth, align: "center" },
    ...(hasJoursCol ? [{ label: "J. rest.", width: joursColWidth, align: "center" }] : []),
  ]

  const thStyle = (col: typeof cols[0]) =>
    `width: ${col.width}px; max-width: ${col.width}px; padding: 8px; text-align: ${col.align}; color: #ffffff; font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`

  const headers = cols.map((c) => `<th style="${thStyle(c)}">${c.label}</th>`).join("")

  const rows = marches
    .map((m) => {
      const { date } = getDatePertinente(m)
      const dateLabel = date ? format(date, "dd/MM/yyyy") : "—"

      let joursRestants: number | null = null
      if (showDaysLeft && date) {
        joursRestants = Math.ceil((date.getTime() - today.getTime()) / 86400000)
      }

      const isUrgent = !isTerminal && joursRestants !== null && joursRestants <= 15
      const rowBg = isTerminal
        ? "#f9fafb"
        : isUrgent
          ? "#fef2f2"
          : "#fff7ed"
      const borderLeft = isTerminal
        ? "#d1d5db"
        : isUrgent
          ? "#ef4444"
          : "#f97316"

      let joursLabel = ""
      if (hasJoursCol) {
        if (joursRestants === null) {
          joursLabel = "—"
        } else if (joursRestants <= 15) {
          joursLabel = `🔴 ${joursRestants}j`
        } else {
          joursLabel = `🟠 ${joursRestants}j`
        }
      }

      const joursColor = !isTerminal && joursRestants !== null && joursRestants <= 15
        ? "#dc2626"
        : "#ea580c"

      return `
        <tr>
          <td style="${tdStyle({ width: 90, bg: rowBg, borderLeft, bold: true, color: "#111827" })}">${m.numero}</td>
          <td style="${tdStyle({ width: objetWidth, bg: rowBg })}" title="${m.objet}">${m.objet}</td>
          <td style="${tdStyle({ width: 160, bg: rowBg })}">${m.autoriteContractanteNom}</td>
          <td style="${tdStyle({ width: 110, bg: rowBg, align: "right" })}">${formatMontant(m.montant)}</td>
          <td style="${tdStyle({ width: dateColWidth, bg: rowBg, align: "center" })}">${dateLabel}</td>
          ${hasJoursCol ? `<td style="${tdStyle({ width: joursColWidth, bg: rowBg, align: "center", bold: true, color: joursColor })}">${joursLabel}</td>` : ""}
        </tr>
      `
    })
    .join("")

  const labelStatut = STATUT_LABELS[statut] ?? statut

  return `
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 15px; font-weight: 700; border-left: 4px solid #1E3A5F; padding-left: 10px;">
        ${labelStatut}
        <span style="font-size: 12px; font-weight: 400; color: #6b7280; margin-left: 8px;">${marches.length} marché${marches.length > 1 ? "s" : ""}</span>
      </h2>

      <table width="${TABLE_WIDTH}" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; table-layout: fixed; margin-top: 10px;">
        <thead>
          <tr style="background-color: #1E3A5F;">${headers}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

// ============================================================
// TEMPLATE PRINCIPAL
// ============================================================

export function buildReportingEmail(
  ruleName: string,
  grouped: Map<StatutMarche, MarcheForReporting[]>,
  now: Date = new Date()
): { subject: string; html: string; text: string } {
  const totalMarches = Array.from(grouped.values()).reduce((s, a) => s + a.length, 0)

  // Ordre d'affichage : ordre logique du cycle de vie
  const ORDER: StatutMarche[] = [
    "OPPORTUNITE_IDENTIFIEE",
    "DOSSIER_EN_PREPARATION",
    "OFFRE_DEPOSEE",
    "EN_ATTENTE_ATTRIBUTION",
    "ATTRIBUE_PROVISOIREMENT",
    "ATTRIBUE_DEFINITIVEMENT",
    "EN_ATTENTE_LIVRAISON_OS",
    "EN_EXECUTION",
    "EXECUTE_ATTENTE_GARANTIES",
    "CLOTURE",
    "RESILIE",
    "ANNULE",
    "INFRUCTUEUX",
  ]

  const sections = ORDER
    .filter((s) => grouped.has(s))
    .map((s) => buildStatutSection(s, grouped.get(s)!, now))
    .join("")

  const dateLabel = format(now, "EEEE d MMMM yyyy", { locale: fr })
  const subject = `📊 Synthèse Marchés — ${ruleName} — ${format(now, "dd/MM/yyyy")}`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="${EMAIL_WIDTH}" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #1E3A5F; padding: 28px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">
                📊 Synthèse Marchés — ${ruleName}
              </h1>
              <p style="margin: 8px 0 0 0; color: #C49A1A; font-size: 13px; font-weight: 500;">
                ${dateLabel}
              </p>
            </td>
          </tr>

          <!-- Contenu -->
          <tr>
            <td style="padding: 32px 28px;">
              ${sections}

              <!-- Résumé -->
              <div style="margin-top: 16px; padding: 14px 18px; background-color: #f9fafb; text-align: center; border: 1px solid #e5e7eb; border-radius: 4px;">
                <p style="margin: 0; color: #374151; font-size: 13px; font-weight: 600;">
                  📊 Total : ${totalMarches} marché${totalMarches > 1 ? "s" : ""} · ${grouped.size} statut${grouped.size > 1 ? "s" : ""}
                </p>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 11px;">
                  Consultez l'application pour plus de détails
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 18px 28px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Cet email est généré automatiquement par ERP Marchés STAM
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  // Version texte brut
  const textLines: string[] = [
    `SYNTHÈSE MARCHÉS — ${ruleName.toUpperCase()}`,
    `${format(now, "dd/MM/yyyy")}`,
    `Total : ${totalMarches} marché(s)`,
    "",
  ]
  for (const [statut, marches] of grouped) {
    textLines.push(`== ${STATUT_LABELS[statut] ?? statut} (${marches.length}) ==`)
    for (const m of marches) {
      textLines.push(`  - ${m.numero} | ${m.objet} | ${formatMontant(m.montant)}`)
    }
    textLines.push("")
  }

  return { subject, html, text: textLines.join("\n") }
}
