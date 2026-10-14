/**
 * lib/email/opportunite-reporting-templates.ts
 *
 * Template email "Suivi Opportunités" pour le module de reporting.
 */

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { formatMontant } from "@/lib/utils/format"
import { calculerAvancementLots, totalMontantPropose } from "@/lib/utils/lots"
import { STATUT_OPPORTUNITE_LABELS } from "@/lib/validations/opportunite"
import {
  classerOpportunites,
  diffJours,
  SEUIL_URGENCE_JOURS,
  type ATraiter,
} from "./opportunite-reporting-sections"

// ============================================================
// TYPES
// ============================================================

export interface OpportuniteForReporting {
  id: string
  reference: string | null
  objet: string
  autoriteContractante: string
  statut: string
  montantEstime: unknown
  lots: { montantPropose: unknown; dossier: { progression: number } | null }[]
  dateLimite: Date | null
  periodeValiditeDebut: Date | null
  periodeValiditeFin: Date | null
  echeanceAttributionProv: Date | null
  notes: string | null
}

// ============================================================
// CONSTANTES
// ============================================================

const NAVY = "#1E3A5F"
const GOLD = "#C49A1A"
const MAX_WIDTH = 680
const NOTES_MAX = 160

const COULEURS_STATUT: Record<string, { fort: string; pale: string }> = {
  GO: { fort: "#15803d", pale: "#dcfce7" },
  NO_GO: { fort: "#6b7280", pale: "#f3f4f6" },
  GAGNEE: { fort: "#1d4ed8", pale: "#dbeafe" },
  PERDUE: { fort: "#b91c1c", pale: "#fee2e2" },
  EN_ATTENTE_ATTRIBUTION: { fort: "#b45309", pale: "#fef3c7" },
}
const NEUTRE = { fort: "#475569", pale: "#f1f5f9" }

const MOTIFS: Record<ATraiter["motif"], string> = {
  GO_ECHEANCE: "GO — offre à rendre",
  ATTENTE_ATTRIBUTION: "En attente d'attribution",
}

// ============================================================
// HELPERS
// ============================================================

const couleurStatut = (s: string) => COULEURS_STATUT[s] ?? NEUTRE
const libelleStatut = (s: string) => STATUT_OPPORTUNITE_LABELS[s] ?? s

function esc(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatDate(date: Date | null): string {
  return date ? format(date, "dd/MM/yyyy") : "—"
}

function montantStr(val: unknown): string {
  if (val === null || val === undefined) return "—"
  const n = Number(val)
  return isNaN(n) ? "—" : formatMontant(n)
}

function decompte(date: Date, today: Date): { texte: string; couleur: string } {
  const diff = diffJours(date, today)
  if (diff < 0) return { texte: `dépassée de ${Math.abs(diff)} j`, couleur: "#6b7280" }
  if (diff === 0) return { texte: "aujourd'hui", couleur: "#dc2626" }
  if (diff <= 3) return { texte: `J-${diff}`, couleur: "#dc2626" }
  if (diff <= SEUIL_URGENCE_JOURS) return { texte: `J-${diff}`, couleur: "#ea580c" }
  return { texte: `J-${diff}`, couleur: "#16a34a" }
}

function datePlusDecompte(date: Date | null, today: Date): string | null {
  if (!date) return null
  const d = decompte(date, today)
  return `${formatDate(date)} <span style="font-weight:400;font-size:11px;color:${d.couleur};">(${d.texte})</span>`
}

function pastille(statut: string): string {
  const c = couleurStatut(statut)
  return `<span style="display:inline-block;padding:2px 9px;border-radius:10px;background:${c.pale};color:${c.fort};font-size:11px;font-weight:700;">${esc(libelleStatut(statut))}</span>`
}

function tronquerNotes(notes: string): string {
  const brut = notes.trim()
  if (brut.length <= NOTES_MAX) return esc(brut)
  return `${esc(brut.slice(0, NOTES_MAX))}… <span style="color:${NAVY};text-decoration:underline;">détail dans le fichier Excel joint</span>`
}

function cellule(libelle: string, valeurHtml: string): string {
  return `<td valign="top" style="padding:6px 8px 6px 0;width:33%;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;">${libelle}</div><div style="font-size:13px;font-weight:600;color:#111827;">${valeurHtml}</div></td>`
}

function barreDossier(pct: number): string {
  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:6px;"><tr><td style="font-size:11px;color:#6b7280;padding-bottom:3px;">Dossier ${pct} %</td></tr><tr><td style="background:#e5e7eb;border-radius:3px;height:5px;line-height:5px;font-size:0;"><div style="width:${pct}%;background:${NAVY};height:5px;border-radius:3px;">&nbsp;</div></td></tr></table>`
}

// ============================================================
// BLOCS
// ============================================================

function carte(opp: OpportuniteForReporting, today: Date): string {
  const c = couleurStatut(opp.statut)
  const propose = totalMontantPropose(opp.lots)
  const { progressionMoyenne } = calculerAvancementLots(opp.lots)

  const champs: [string, string | null][] = [
    ["Estimé", montantStr(opp.montantEstime) !== "—" ? esc(montantStr(opp.montantEstime)) : null],
    ["Proposé", montantStr(propose) !== "—" ? esc(montantStr(propose)) : null],
    ["Date limite", datePlusDecompte(opp.dateLimite, today)],
    [
      "Validité",
      opp.periodeValiditeFin
        ? `${opp.periodeValiditeDebut ? formatDate(opp.periodeValiditeDebut) + " → " : ""}${datePlusDecompte(opp.periodeValiditeFin, today)}`
        : null,
    ],
    ["Attribution prévue", datePlusDecompte(opp.echeanceAttributionProv, today)],
  ]
  const presents = champs.filter((x): x is [string, string] => x[1] !== null)
  let lignes = ""
  for (let i = 0; i < presents.length; i += 3) {
    lignes += `<tr>${presents.slice(i, i + 3).map(([l, v]) => cellule(l, v)).join("")}</tr>`
  }
  const grille = lignes
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${lignes}</table>`
    : ""
  const notes = opp.notes?.trim()
    ? `<div style="margin-top:8px;padding:8px 10px;background:#f9fafb;border-radius:4px;font-size:12px;color:#4b5563;">${tronquerNotes(opp.notes)}</div>`
    : ""

  return `<tr><td style="padding:0 20px 12px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-left:4px solid ${c.fort};border-radius:6px;"><tr><td style="padding:12px 14px;">
<div style="font-size:11px;color:#6b7280;">${esc(opp.reference ?? "Sans référence")}</div>
<div style="font-size:14px;font-weight:700;margin:2px 0;color:#111827;">${esc(opp.objet)}</div>
<div style="font-size:12px;color:#4b5563;margin-bottom:6px;">${esc(opp.autoriteContractante)}</div>
${pastille(opp.statut)}${grille}${progressionMoyenne !== null ? barreDossier(progressionMoyenne) : ""}${notes}
</td></tr></table></td></tr>`
}

function ligneTerminee(opp: OpportuniteForReporting, premiere: boolean): string {
  const propose = montantStr(totalMontantPropose(opp.lots))
  const montant = propose !== "—" ? propose : montantStr(opp.montantEstime)
  const details = [
    opp.autoriteContractante,
    libelleStatut(opp.statut),
    montant !== "—" ? montant : null,
    opp.dateLimite ? `limite ${formatDate(opp.dateLimite)}` : null,
  ]
    .filter(Boolean)
    .map((d) => esc(String(d)))
    .join(" · ")
  const ref = opp.reference ? `${esc(opp.reference)} · ` : ""
  return `<tr><td style="padding:8px 12px;font-size:12px;${premiere ? "" : "border-top:1px solid #f1f5f9;"}"><b>${ref}</b>${esc(opp.objet)}<br><span style="color:#6b7280;">${details}</span></td></tr>`
}

function titreSection(titre: string, couleur: string, n: number): string {
  return `<tr><td style="padding:16px 20px 8px;"><span style="font-size:13px;font-weight:700;letter-spacing:.04em;color:${couleur};">${titre}</span> <span style="font-size:12px;color:#9ca3af;">· ${n}</span></td></tr>`
}

function blocATraiter(items: ATraiter[], today: Date): string {
  if (items.length === 0) return ""
  const cartes = items
    .map(({ opp, motif }) => {
      const pourGo = motif === "GO_ECHEANCE"
      const date = pourGo ? opp.dateLimite : opp.periodeValiditeFin
      const bord = pourGo ? "#b45309" : "#6b7280"
      const fond = pourGo ? "#fffbeb" : "#f9fafb"
      let suite = ""
      if (date) {
        const d = decompte(date, today)
        suite = pourGo
          ? ` — ${formatDate(date)} (${d.texte})`
          : ` — validité jusqu'au ${formatDate(date)} (${d.texte})`
      }
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${fond};border:1px solid #e5e7eb;border-left:4px solid ${bord};border-radius:6px;margin-bottom:8px;"><tr><td style="padding:10px 14px;font-size:13px;"><b>${esc(MOTIFS[motif] + suite)}</b><br><span style="color:#4b5563;">${esc(opp.reference ?? "Sans référence")} · ${esc(opp.objet)} · ${esc(opp.autoriteContractante)}</span></td></tr></table>`
    })
    .join("")
  return `<tr><td style="padding:16px 20px 0;"><div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:#b45309;margin-bottom:8px;">À TRAITER</div>${cartes}</td></tr>`
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
  const { aTraiter, actives, terminees, compteurs } = classerOpportunites(opportunites, now)
  const total = opportunites.length

  const compteursHtml = compteurs
    .map(({ statut, count }) => {
      const c = couleurStatut(statut)
      return `<div style="display:inline-block;min-width:84px;margin:3px;background:#ffffff;border:1px solid #e5e7eb;border-top:3px solid ${c.fort};border-radius:6px;padding:8px 6px;text-align:center;"><div style="font-size:20px;font-weight:700;color:${c.fort};">${count}</div><div style="font-size:10px;color:#6b7280;">${esc(libelleStatut(statut))}</div></div>`
    })
    .join("")

  const sectionActives = actives.length
    ? titreSection("EN COURS", NAVY, actives.length) + actives.map((o) => carte(o, now)).join("")
    : ""
  const sectionTerminees = terminees.length
    ? titreSection("TERMINÉES", "#6b7280", terminees.length) +
      `<tr><td style="padding:0 20px 14px;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;">${terminees.map((o, i) => ligneTerminee(o, i === 0)).join("")}</table></td></tr>`
    : ""

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#eef0f3;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3;">
    <tr><td align="center" style="padding:16px 8px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;max-width:${MAX_WIDTH}px;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:${NAVY};padding:22px 24px;">
          <div style="color:#ffffff;font-size:19px;font-weight:700;">Suivi des opportunités</div>
          <div style="color:${GOLD};font-size:13px;margin-top:4px;">${esc(ruleName)} · ${esc(dateLabel)} · ${total} opportunité${total > 1 ? "s" : ""}</div>
        </td></tr>
        <tr><td style="padding:12px 17px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:center;">${compteursHtml}</td></tr>
        ${blocATraiter(aTraiter, now)}
        ${sectionActives}
        ${sectionTerminees}
        <tr><td style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
          Détail complet de chaque opportunité dans le fichier Excel joint · Cet email est généré automatiquement par ERP Marchés STAM
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  // Version texte brut
  const textLines = [
    `SUIVI OPPORTUNITÉS — ${ruleName.toUpperCase()}`,
    format(now, "dd/MM/yyyy"),
    `Total : ${total} opportunité(s)`,
    "",
  ]
  for (const opp of [...actives, ...terminees]) {
    textLines.push(
      `- [${opp.reference ?? "—"}] ${opp.objet} | ${libelleStatut(opp.statut)} | ` +
        `Estimé: ${montantStr(opp.montantEstime)} | Proposé: ${montantStr(totalMontantPropose(opp.lots))} | ` +
        `Date limite: ${formatDate(opp.dateLimite)}`
    )
  }

  return { subject, html, text: textLines.join("\n") }
}
