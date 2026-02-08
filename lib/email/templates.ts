/**
 * Templates HTML pour emails d'alertes
 * Styles inline pour compatibilité maximale avec clients email
 */

import { formatMontant } from "@/lib/utils/format";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Types pour les données des alertes
 */
export interface CautionAlert {
  id: string;
  reference: string;
  type: string;
  montant: number;
  dateEcheance: Date;
  joursRestants: number;
  marcheReference?: string;
  niveau?: "CRITIQUE" | "ATTENTION"; // Ajout niveau de criticité
}

export interface MarcheAlert {
  id: string;
  reference: string;
  objet: string;
  montant: number;
  dateFinExecution: Date;
  joursRestants: number;
  statut: string;
}

/**
 * Template de base HTML responsive
 */
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🔔 Alertes ERP Marchés STAM
              </h1>
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">
                ${format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Cet email est généré automatiquement par ERP Marchés STAM
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
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

/**
 * Template pour alertes cautions proches échéance
 */
export function cautionsExpiringEmailTemplate(cautions: CautionAlert[]): {
  subject: string;
  html: string;
  text: string;
} {
  if (cautions.length === 0) {
    return {
      subject: "Aucune caution à échéance",
      html: "",
      text: "",
    };
  }

  const subject = `⚠️ ${cautions.length} caution${cautions.length > 1 ? "s" : ""} proche${cautions.length > 1 ? "s" : ""} de l'échéance`;

  const cautionsHtml = cautions
    .map(
      (caution) => {
        // Couleurs selon niveau de criticité
        const isCritique = caution.niveau === "CRITIQUE" || caution.joursRestants <= 7;
        const borderColor = isCritique ? "#ef4444" : "#f59e0b"; // Rouge vs Orange
        const bgColor = isCritique ? "#fef2f2" : "#fffbeb";
        const textColor = isCritique ? "#991b1b" : "#92400e";
        const lightTextColor = isCritique ? "#7f1d1d" : "#78350f";
        const badgeBg = isCritique ? "#fee2e2" : "#fef3c7";
        const niveauLabel = isCritique ? "🔴 CRITIQUE" : "🟠 ATTENTION";

        return `
        <div style="border-left: 4px solid ${borderColor}; background-color: ${bgColor}; padding: 16px; margin-bottom: 16px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div>
              <h3 style="margin: 0; color: ${textColor}; font-size: 16px; font-weight: 600;">
                ${caution.reference}
                <span style="margin-left: 8px; font-size: 11px; font-weight: 500;">${niveauLabel}</span>
              </h3>
              <p style="margin: 4px 0 0 0; color: ${lightTextColor}; font-size: 13px;">
                ${caution.type}
              </p>
            </div>
            <div style="background-color: ${badgeBg}; padding: 4px 12px; border-radius: 12px;">
              <span style="color: ${textColor}; font-size: 12px; font-weight: 600;">
                ${caution.joursRestants} jour${caution.joursRestants > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div style="background-color: #ffffff; padding: 12px; border-radius: 4px; margin-bottom: 8px;">
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 13px;">
              <strong>Montant :</strong> ${formatMontant(caution.montant)}
            </p>
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 13px;">
              <strong>Échéance :</strong> ${format(caution.dateEcheance, "dd/MM/yyyy")}
            </p>
            ${
              caution.marcheReference
                ? `<p style="margin: 0; color: #374151; font-size: 13px;">
              <strong>Marché :</strong> ${caution.marcheReference}
            </p>`
                : ""
            }
          </div>

          <p style="margin: 0; color: ${textColor}; font-size: 12px; font-style: italic;">
            ⚡ Action ${isCritique ? "URGENTE" : "requise"} : Renouvellement ou mainlevée à prévoir
          </p>
        </div>
      `;
      }
    )
    .join("");

  // Compter les cautions par niveau
  const critiques = cautions.filter(c => c.niveau === "CRITIQUE" || c.joursRestants <= 7).length;
  const attention = cautions.length - critiques;

  const content = `
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Cautions proches de l'échéance
      </h2>
      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        ${cautions.length} caution${cautions.length > 1 ? "s" : ""} arrive${cautions.length > 1 ? "nt" : ""} à échéance dans moins de <strong>30 jours</strong>
        ${critiques > 0 ? ` (<span style="color: #ef4444; font-weight: 600;">${critiques} critique${critiques > 1 ? "s" : ""} &lt; 7j</span>` : ""}${attention > 0 ? `, ${attention} attention` : ""}).
        Veuillez prendre les dispositions nécessaires.
      </p>
    </div>

    ${cautionsHtml}

    <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border-radius: 4px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0; color: #1e40af; font-size: 13px; line-height: 1.6;">
        💡 <strong>Rappel :</strong> Les cautions doivent être renouvelées ou la mainlevée doit être demandée avant l'échéance pour éviter toute pénalité.
      </p>
    </div>
  `;

  const html = baseEmailTemplate(content);

  // Version texte brut
  const text = `
ALERTES CAUTIONS - ${format(new Date(), "dd/MM/yyyy")}

${cautions.length} caution(s) proche(s) de l'échéance (< 30 jours) :

${cautions
  .map(
    (c) => `
- ${c.reference} (${c.type})
  Montant : ${formatMontant(c.montant)}
  Échéance : ${format(c.dateEcheance, "dd/MM/yyyy")}
  Jours restants : ${c.joursRestants}
  ${c.marcheReference ? `Marché : ${c.marcheReference}` : ""}
`
  )
  .join("\n")}

Action requise : Renouvellement ou mainlevée à prévoir.
  `.trim();

  return { subject, html, text };
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

  const marchesHtml = marches
    .map(
      (marche) => `
        <div style="border-left: 4px solid #ef4444; background-color: #fef2f2; padding: 16px; margin-bottom: 16px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div>
              <h3 style="margin: 0; color: #991b1b; font-size: 16px; font-weight: 600;">
                ${marche.reference}
              </h3>
              <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 13px;">
                ${marche.objet.length > 80 ? marche.objet.substring(0, 77) + "..." : marche.objet}
              </p>
            </div>
            <div style="background-color: #fee2e2; padding: 4px 12px; border-radius: 12px;">
              <span style="color: #991b1b; font-size: 12px; font-weight: 600;">
                ${marche.joursRestants} jour${marche.joursRestants > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div style="background-color: #ffffff; padding: 12px; border-radius: 4px; margin-bottom: 8px;">
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 13px;">
              <strong>Montant :</strong> ${formatMontant(marche.montant)}
            </p>
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 13px;">
              <strong>Fin d'exécution :</strong> ${format(marche.dateFinExecution, "dd/MM/yyyy")}
            </p>
            <p style="margin: 0; color: #374151; font-size: 13px;">
              <strong>Statut :</strong> ${marche.statut}
            </p>
          </div>

          <p style="margin: 0; color: #991b1b; font-size: 12px; font-style: italic;">
            ⚡ Action requise : Préparer clôture et réception définitive
          </p>
        </div>
      `
    )
    .join("");

  const content = `
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Marchés en fin d'exécution
      </h2>
      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        ${marches.length} marché${marches.length > 1 ? "s" : ""} arrive${marches.length > 1 ? "nt" : ""} en fin d'exécution dans moins de <strong>60 jours</strong>.
        Veuillez préparer les procédures de clôture.
      </p>
    </div>

    ${marchesHtml}

    <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border-radius: 4px; border-left: 4px solid #3b82f6;">
      <p style="margin: 0; color: #1e40af; font-size: 13px; line-height: 1.6;">
        💡 <strong>Rappel :</strong> Anticiper la préparation des documents de clôture, réception définitive, et libération des cautions.
      </p>
    </div>
  `;

  const html = baseEmailTemplate(content);

  // Version texte brut
  const text = `
ALERTES MARCHÉS - ${format(new Date(), "dd/MM/yyyy")}

${marches.length} marché(s) en fin d'exécution (< 60 jours) :

${marches
  .map(
    (m) => `
- ${m.reference}
  Objet : ${m.objet}
  Montant : ${formatMontant(m.montant)}
  Fin d'exécution : ${format(m.dateFinExecution, "dd/MM/yyyy")}
  Jours restants : ${m.joursRestants}
  Statut : ${m.statut}
`
  )
  .join("\n")}

Action requise : Préparer clôture et réception définitive.
  `.trim();

  return { subject, html, text };
}

/**
 * Template pour email récapitulatif (cautions + marchés)
 */
export function dailyAlertsEmailTemplate(
  cautions: CautionAlert[],
  marches: MarcheAlert[]
): {
  subject: string;
  html: string;
  text: string;
} {
  // Si aucune alerte, ne pas envoyer d'email
  if (cautions.length === 0 && marches.length === 0) {
    return {
      subject: "Aucune alerte",
      html: "",
      text: "",
    };
  }

  const subject = `🔔 Rapport quotidien : ${cautions.length} caution(s) + ${marches.length} marché(s) à surveiller`;

  let content = `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 20px; font-weight: 600;">
        Rapport quotidien des alertes
      </h2>
      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Voici le récapitulatif des échéances importantes nécessitant votre attention.
      </p>
    </div>
  `;

  // Section cautions
  if (cautions.length > 0) {
    const cautionsTemplate = cautionsExpiringEmailTemplate(cautions);
    // Extraire le contenu entre les balises body (sans header/footer)
    const cautionsContent = cautionsTemplate.html
      .split('<td style="padding: 40px;">')[1]
      ?.split("</td>")[0];
    content += `<div style="margin-bottom: 32px;">${cautionsContent}</div>`;
  }

  // Section marchés
  if (marches.length > 0) {
    const marchesTemplate = marchesExpiringEmailTemplate(marches);
    const marchesContent = marchesTemplate.html
      .split('<td style="padding: 40px;">')[1]
      ?.split("</td>")[0];
    content += `<div style="margin-bottom: 32px;">${marchesContent}</div>`;
  }

  // Résumé final
  content += `
    <div style="margin-top: 32px; padding: 20px; background-color: #f9fafb; border-radius: 4px; text-align: center;">
      <p style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">
        📊 Résumé : ${cautions.length} caution(s) • ${marches.length} marché(s)
      </p>
      <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px;">
        Consultez l'application pour plus de détails
      </p>
    </div>
  `;

  const html = baseEmailTemplate(content);

  // Version texte brut
  const cautionsText =
    cautions.length > 0 ? cautionsExpiringEmailTemplate(cautions).text : "";
  const marchesText =
    marches.length > 0 ? marchesExpiringEmailTemplate(marches).text : "";

  const text = `
RAPPORT QUOTIDIEN - ${format(new Date(), "dd/MM/yyyy")}

${cautionsText}

${marchesText}

Résumé : ${cautions.length} caution(s) • ${marches.length} marché(s)
  `.trim();

  return { subject, html, text };
}
