/**
 * Templates HTML pour emails d'alertes
 * Styles inline pour compatibilité maximale avec clients email
 */

import { formatMontant } from "@/lib/utils/format";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ============================================================
// TYPES
// ============================================================

export interface CautionAlert {
  id: string;
  reference: string;
  banque?: string;
  type: string;
  montant: number;
  dateEcheance: Date;
  joursRestants: number;
  marcheReference?: string;
  autoriteContractante?: string;
  niveau?: "CRITIQUE" | "ATTENTION";
}

export interface MarcheAlert {
  id: string;
  reference: string;
  objet: string;
  autoriteContractante?: string;
  montant: number;
  dateFinExecution: Date;
  joursRestants: number;
  statut: string;
}

// ============================================================
// TEMPLATE DE BASE — header STAM navy
// ============================================================

function baseEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alertes ERP Marchés STAM</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header STAM navy -->
          <tr>
            <td style="background-color: #1E3A5F; padding: 28px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">
                🔔 Alertes ERP Marchés STAM
              </h1>
              <p style="margin: 8px 0 0 0; color: #C49A1A; font-size: 13px; font-weight: 500;">
                ${format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </td>
          </tr>

          <!-- Contenu -->
          <tr>
            <td style="padding: 32px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 18px 28px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Cet email est généré automatiquement par ERP Marchés STAM
              </p>
              <p style="margin: 6px 0 0 0; color: #9ca3af; font-size: 11px;">
                Pour toute question, contactez votre administrateur système
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================================
// SECTION CAUTIONS — tableau HTML
// ============================================================

function buildCautionsSection(cautions: CautionAlert[]): string {
  const critiques = cautions.filter(
    (c) => c.niveau === "CRITIQUE" || c.joursRestants <= 7
  ).length;
  const attention = cautions.length - critiques;

  const rows = cautions
    .map((c) => {
      const isCritique = c.niveau === "CRITIQUE" || c.joursRestants <= 7;
      const rowBg = isCritique ? "#fef2f2" : "#fffbeb";
      const borderLeft = isCritique ? "#ef4444" : "#f59e0b";
      const joursColor = isCritique ? "#dc2626" : "#d97706";
      const joursLabel = isCritique ? `🔴 ${c.joursRestants}j` : `🟠 ${c.joursRestants}j`;

      return `
        <tr style="background-color: ${rowBg};">
          <td style="border-left: 4px solid ${borderLeft}; padding: 7px 9px; font-size: 11px; font-weight: 600; color: #111827; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${c.reference}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #374151; border-bottom: 1px solid #f0f0f0;">${c.banque || "—"}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #374151; border-bottom: 1px solid #f0f0f0;">${c.type}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #374151; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${formatMontant(c.montant)}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #374151; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${format(c.dateEcheance, "dd/MM/yyyy")}</td>
          <td style="padding: 7px 9px; font-size: 11px; font-weight: 700; color: ${joursColor}; border-bottom: 1px solid #f0f0f0; white-space: nowrap; text-align: center;">${joursLabel}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #6b7280; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${c.marcheReference || "—"}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #374151; border-bottom: 1px solid #f0f0f0;">${c.autoriteContractante || "—"}</td>
        </tr>
      `;
    })
    .join("");

  const subtitle = [
    `${cautions.length} caution${cautions.length > 1 ? "s" : ""} à surveiller dans les 30 prochains jours`,
    critiques > 0
      ? `<span style="color: #dc2626; font-weight: 600;">${critiques} critique${critiques > 1 ? "s" : ""} (&lt; 7j)</span>`
      : "",
    attention > 0 ? `${attention} en attention` : "",
  ]
    .filter(Boolean)
    .join(" — ");

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 16px; font-weight: 700;">
        ⚠️ Cautions proches de l'échéance
      </h2>
      <p style="margin: 0 0 14px 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
        ${subtitle}
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; table-layout: fixed;">
        <colgroup>
          <col style="width: 13%;">
          <col style="width: 14%;">
          <col style="width: 12%;">
          <col style="width: 15%;">
          <col style="width: 11%;">
          <col style="width: 9%;">
          <col style="width: 12%;">
          <col style="width: 14%;">
        </colgroup>
        <thead>
          <tr style="background-color: #1E3A5F;">
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600; white-space: nowrap;">Référence</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600;">Banque</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600;">Type</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600; white-space: nowrap;">Montant</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600; white-space: nowrap;">Échéance</th>
            <th style="padding: 8px 9px; text-align: center; color: #C49A1A; font-size: 10px; font-weight: 600; white-space: nowrap;">J. rest.</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600;">Marché</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600;">Autorité contr.</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-top: 12px; padding: 10px 14px; background-color: #eff6ff; border-left: 3px solid #3b82f6;">
        <p style="margin: 0; color: #1e40af; font-size: 11px; line-height: 1.5;">
          💡 <strong>Rappel :</strong> Les cautions doivent être renouvelées ou la mainlevée demandée avant l'échéance pour éviter toute pénalité.
        </p>
      </div>
    </div>
  `;
}

// ============================================================
// SECTION MARCHÉS — tableau HTML
// ============================================================

function buildMarchesSection(marches: MarcheAlert[]): string {
  const rows = marches
    .map((m) => {
      const isUrgent = m.joursRestants <= 15;
      const rowBg = isUrgent ? "#fef2f2" : "#fff7ed";
      const borderLeft = isUrgent ? "#ef4444" : "#f97316";
      const joursColor = isUrgent ? "#dc2626" : "#ea580c";
      const joursLabel = isUrgent ? `🔴 ${m.joursRestants}j` : `🟠 ${m.joursRestants}j`;
      const objetTrunc =
        m.objet.length > 40 ? m.objet.substring(0, 37) + "..." : m.objet;

      return `
        <tr style="background-color: ${rowBg};">
          <td style="border-left: 4px solid ${borderLeft}; padding: 7px 9px; font-size: 11px; font-weight: 600; color: #111827; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${m.reference}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #374151; border-bottom: 1px solid #f0f0f0;" title="${m.objet}">${objetTrunc}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #374151; border-bottom: 1px solid #f0f0f0;">${m.autoriteContractante || "—"}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #374151; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${formatMontant(m.montant)}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #374151; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${format(m.dateFinExecution, "dd/MM/yyyy")}</td>
          <td style="padding: 7px 9px; font-size: 11px; font-weight: 700; color: ${joursColor}; border-bottom: 1px solid #f0f0f0; white-space: nowrap; text-align: center;">${joursLabel}</td>
          <td style="padding: 7px 9px; font-size: 11px; color: #374151; border-bottom: 1px solid #f0f0f0; white-space: nowrap;">${m.statut}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 16px; font-weight: 700;">
        ⚠️ Marchés en fin d'exécution
      </h2>
      <p style="margin: 0 0 14px 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
        ${marches.length} marché${marches.length > 1 ? "s" : ""} arrivant à échéance dans les 60 prochains jours
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; table-layout: fixed;">
        <colgroup>
          <col style="width: 12%;">
          <col style="width: 24%;">
          <col style="width: 20%;">
          <col style="width: 15%;">
          <col style="width: 11%;">
          <col style="width: 9%;">
          <col style="width: 9%;">
        </colgroup>
        <thead>
          <tr style="background-color: #1E3A5F;">
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600; white-space: nowrap;">N° Marché</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600;">Objet</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600;">Autorité contr.</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600; white-space: nowrap;">Montant</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600; white-space: nowrap;">Fin exéc.</th>
            <th style="padding: 8px 9px; text-align: center; color: #C49A1A; font-size: 10px; font-weight: 600; white-space: nowrap;">J. rest.</th>
            <th style="padding: 8px 9px; text-align: left; color: #ffffff; font-size: 10px; font-weight: 600;">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-top: 12px; padding: 10px 14px; background-color: #eff6ff; border-left: 3px solid #3b82f6;">
        <p style="margin: 0; color: #1e40af; font-size: 11px; line-height: 1.5;">
          💡 <strong>Rappel :</strong> Anticiper la préparation des documents de clôture, réception définitive et libération des cautions.
        </p>
      </div>
    </div>
  `;
}

// ============================================================
// VERSIONS TEXTE BRUT
// ============================================================

function buildCautionsText(cautions: CautionAlert[]): string {
  const lines = [
    `ALERTES CAUTIONS - ${format(new Date(), "dd/MM/yyyy")}`,
    `${cautions.length} caution(s) proche(s) de l'échéance (< 30 jours) :`,
    "",
    ...cautions.map((c) => {
      const niveau =
        c.niveau === "CRITIQUE" || c.joursRestants <= 7
          ? "CRITIQUE"
          : "ATTENTION";
      return [
        `- ${c.reference} [${niveau}]`,
        c.banque ? `  Banque : ${c.banque}` : "",
        `  Type : ${c.type}`,
        `  Montant : ${formatMontant(c.montant)}`,
        `  Échéance : ${format(c.dateEcheance, "dd/MM/yyyy")}`,
        `  Jours restants : ${c.joursRestants}`,
        c.marcheReference ? `  Marché : ${c.marcheReference}` : "",
        c.autoriteContractante
          ? `  Autorité : ${c.autoriteContractante}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }),
    "",
    "Action requise : Renouvellement ou mainlevée à prévoir.",
  ];
  return lines.join("\n");
}

function buildMarchesText(marches: MarcheAlert[]): string {
  const lines = [
    `ALERTES MARCHÉS - ${format(new Date(), "dd/MM/yyyy")}`,
    `${marches.length} marché(s) en fin d'exécution (< 60 jours) :`,
    "",
    ...marches.map((m) =>
      [
        `- ${m.reference}`,
        `  Objet : ${m.objet}`,
        m.autoriteContractante ? `  Autorité : ${m.autoriteContractante}` : "",
        `  Montant : ${formatMontant(m.montant)}`,
        `  Fin d'exécution : ${format(m.dateFinExecution, "dd/MM/yyyy")}`,
        `  Jours restants : ${m.joursRestants}`,
        `  Statut : ${m.statut}`,
      ]
        .filter(Boolean)
        .join("\n")
    ),
    "",
    "Action requise : Préparer clôture et réception définitive.",
  ];
  return lines.join("\n");
}

// ============================================================
// EXPORTS — templates publics
// ============================================================

/**
 * Template pour alertes cautions proches échéance
 */
export function cautionsExpiringEmailTemplate(cautions: CautionAlert[]): {
  subject: string;
  html: string;
  text: string;
} {
  if (cautions.length === 0) {
    return { subject: "Aucune caution à échéance", html: "", text: "" };
  }

  const subject = `⚠️ ${cautions.length} caution${cautions.length > 1 ? "s" : ""} proche${cautions.length > 1 ? "s" : ""} de l'échéance`;

  return {
    subject,
    html: baseEmailTemplate(buildCautionsSection(cautions)),
    text: buildCautionsText(cautions),
  };
}

/**
 * Template pour alertes marchés fin d'exécution
 */
export function marchesExpiringEmailTemplate(marches: MarcheAlert[]): {
  subject: string;
  html: string;
  text: string;
} {
  if (marches.length === 0) {
    return {
      subject: "Aucun marché en fin d'exécution",
      html: "",
      text: "",
    };
  }

  const subject = `⚠️ ${marches.length} marché${marches.length > 1 ? "s" : ""} en fin d'exécution`;

  return {
    subject,
    html: baseEmailTemplate(buildMarchesSection(marches)),
    text: buildMarchesText(marches),
  };
}

/**
 * Template pour email récapitulatif quotidien (cautions + marchés)
 */
export function dailyAlertsEmailTemplate(
  cautions: CautionAlert[],
  marches: MarcheAlert[]
): {
  subject: string;
  html: string;
  text: string;
} {
  if (cautions.length === 0 && marches.length === 0) {
    return { subject: "Aucune alerte", html: "", text: "" };
  }

  const subject = `🔔 Rapport quotidien : ${cautions.length} caution(s) + ${marches.length} marché(s) à surveiller`;

  let content = `
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 4px 0; color: #111827; font-size: 18px; font-weight: 700;">
        Rapport quotidien des alertes
      </h2>
      <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
        Récapitulatif des échéances importantes nécessitant votre attention.
      </p>
    </div>
  `;

  if (cautions.length > 0) {
    content += buildCautionsSection(cautions);
  }

  if (marches.length > 0) {
    content += buildMarchesSection(marches);
  }

  content += `
    <div style="margin-top: 24px; padding: 14px 18px; background-color: #f9fafb; text-align: center; border: 1px solid #e5e7eb; border-radius: 4px;">
      <p style="margin: 0; color: #374151; font-size: 13px; font-weight: 600;">
        📊 Résumé : ${cautions.length} caution(s) • ${marches.length} marché(s)
      </p>
      <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 11px;">
        Consultez l'application pour plus de détails
      </p>
    </div>
  `;

  const textParts = [
    `RAPPORT QUOTIDIEN - ${format(new Date(), "dd/MM/yyyy")}`,
    "",
    cautions.length > 0 ? buildCautionsText(cautions) : null,
    marches.length > 0 ? buildMarchesText(marches) : null,
    `Résumé : ${cautions.length} caution(s) • ${marches.length} marché(s)`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    subject,
    html: baseEmailTemplate(content),
    text: textParts.trim(),
  };
}
