"use server";

/**
 * Server Actions pour le système d'alertes automatiques
 * Détection des échéances critiques et envoi d'emails
 */

import { prisma } from "@/lib/db/prisma";
import { createEmailTransport, emailConfig } from "@/lib/config/email";
import {
  dailyAlertsEmailTemplate,
  type CautionAlert,
  type MarcheAlert,
} from "@/lib/email/templates";
import { differenceInDays } from "date-fns";
import { STATUT_LABELS } from "@/lib/constants/marche";
import { TYPE_CAUTION_LABELS } from "@/lib/constants/caution";
import type { ActionResult } from "@/types";
import { requireAuth } from "@/lib/utils/permissions";

/**
 * Récupère les cautions qui arrivent à échéance dans moins de 30 jours
 * Exclut les cautions déjà libérées (avec mainlevée)
 *
 * @returns Liste des cautions à surveiller
 */
export async function getAlertsCautionsExpiring(): Promise<
  ActionResult<CautionAlert[]>
> {
  try {
    await requireAuth();
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    // Récupérer les cautions actives qui expirent dans moins de 30 jours
    const cautions = await prisma.caution.findMany({
      where: {
        dateEcheance: {
          gte: today,
          lte: in30Days,
        },
        // Uniquement les cautions actives (exclure libérées, expirées, appelées)
        statut: "ACTIVE",
      },
      include: {
        marche: {
          select: {
            numero: true,
          },
        },
      },
      orderBy: {
        dateEcheance: "asc",
      },
    });

    // Transformer en format pour email avec niveau de criticité
    const alerts: CautionAlert[] = cautions.map((caution) => {
      const joursRestants = differenceInDays(caution.dateEcheance, today);

      // Déterminer le niveau de criticité
      const niveau = joursRestants <= 7 ? "CRITIQUE" : "ATTENTION";

      return {
        id: caution.id,
        reference: caution.reference,
        type: TYPE_CAUTION_LABELS[caution.type] || caution.type,
        montant: Number(caution.montant),
        dateEcheance: caution.dateEcheance,
        joursRestants,
        marcheReference: caution.marche?.numero,
        niveau, // Ajout du niveau de criticité
      };
    });

    return {
      success: true,
      data: alerts,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des alertes cautions :", error);
    return {
      success: false,
      error: "Impossible de récupérer les alertes cautions",
    };
  }
}

/**
 * Récupère les marchés qui arrivent en fin d'exécution dans moins de 60 jours
 * Concerne les marchés avec statut EN_COURS_EXECUTION
 *
 * @returns Liste des marchés à surveiller
 */
export async function getAlertesMarchesExpiring(): Promise<
  ActionResult<MarcheAlert[]>
> {
  try {
    await requireAuth();
    const today = new Date();
    const in60Days = new Date();
    in60Days.setDate(today.getDate() + 60);

    // Récupérer les marchés en cours qui arrivent en fin d'exécution
    const marches = await prisma.marche.findMany({
      where: {
        dateFinPrevue: {
          not: null,
          gte: today,
          lte: in60Days,
        },
        // Marchés en cours d'exécution uniquement
        statut: {
          in: [
            "EN_EXECUTION",
            "EXECUTE_ATTENTE_GARANTIES",
          ],
        },
      },
      orderBy: {
        dateFinPrevue: "asc",
      },
    });

    // Transformer en format pour email
    const alerts: MarcheAlert[] = marches.map((marche) => {
      // dateFinPrevue est garanti non-null car filtré dans la requête
      const dateFinPrevue = marche.dateFinPrevue!;
      const joursRestants = differenceInDays(dateFinPrevue, today);

      return {
        id: marche.id,
        reference: marche.numero,
        objet: marche.objet,
        montant: Number(marche.montant || 0),
        dateFinExecution: dateFinPrevue,
        joursRestants,
        statut: STATUT_LABELS[marche.statut] || marche.statut,
      };
    });

    return {
      success: true,
      data: alerts,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des alertes marchés :", error);
    return {
      success: false,
      error: "Impossible de récupérer les alertes marchés",
    };
  }
}

/**
 * Envoie l'email quotidien d'alertes avec cautions et marchés
 * Appelé par le cron job quotidien
 *
 * @returns Résultat de l'envoi (succès ou erreur)
 */
export async function sendDailyAlertsEmail(): Promise<
  ActionResult<{ cautionsCount: number; marchesCount: number }>
> {
  try {
    await requireAuth();
    // 1. Récupérer les alertes
    const [cautionsResult, marchesResult] = await Promise.all([
      getAlertsCautionsExpiring(),
      getAlertesMarchesExpiring(),
    ]);

    if (!cautionsResult.success || !marchesResult.success) {
      throw new Error("Erreur lors de la récupération des alertes");
    }

    const cautions = cautionsResult.data || [];
    const marches = marchesResult.data || [];

    // Si aucune alerte, ne pas envoyer d'email
    if (cautions.length === 0 && marches.length === 0) {
      console.log("✅ Aucune alerte à envoyer aujourd'hui");
      return {
        success: true,
        data: {
          cautionsCount: 0,
          marchesCount: 0,
        },
      };
    }

    // 2. Générer le template email
    const emailTemplate = dailyAlertsEmailTemplate(cautions, marches);

    // 3. Vérifier les destinataires
    if (emailConfig.alertRecipients.length === 0) {
      console.warn(
        "⚠️  Aucun destinataire configuré (ALERT_EMAIL_TO). Email non envoyé."
      );
      return {
        success: false,
        error: "Aucun destinataire configuré pour les alertes",
      };
    }

    // 4. Créer le transport et envoyer l'email
    const transporter = createEmailTransport();

    const info = await transporter.sendMail({
      from: emailConfig.from,
      to: emailConfig.alertRecipients.join(", "),
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    console.log("✅ Email d'alertes envoyé avec succès :", info.messageId);
    console.log(`   - ${cautions.length} caution(s) proche(s) échéance`);
    console.log(`   - ${marches.length} marché(s) en fin d'exécution`);
    console.log(`   - Destinataires : ${emailConfig.alertRecipients.join(", ")}`);

    return {
      success: true,
      data: {
        cautionsCount: cautions.length,
        marchesCount: marches.length,
      },
    };
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email d'alertes :", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de l'envoi de l'email d'alertes",
    };
  }
}

/**
 * Teste le système d'alertes (pour debug)
 * Retourne les alertes sans envoyer d'email
 *
 * @returns Résumé des alertes détectées
 */
export async function testAlertsSystem(): Promise<
  ActionResult<{
    cautions: CautionAlert[];
    marches: MarcheAlert[];
    emailPreview: {
      subject: string;
      recipients: string[];
    };
  }>
> {
  try {
    await requireAuth();
    const [cautionsResult, marchesResult] = await Promise.all([
      getAlertsCautionsExpiring(),
      getAlertesMarchesExpiring(),
    ]);

    if (!cautionsResult.success || !marchesResult.success) {
      throw new Error("Erreur lors de la récupération des alertes");
    }

    const cautions = cautionsResult.data || [];
    const marches = marchesResult.data || [];

    const emailTemplate = dailyAlertsEmailTemplate(cautions, marches);

    return {
      success: true,
      data: {
        cautions,
        marches,
        emailPreview: {
          subject: emailTemplate.subject,
          recipients: emailConfig.alertRecipients,
        },
      },
    };
  } catch (error) {
    console.error("Erreur lors du test du système d'alertes :", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors du test du système d'alertes",
    };
  }
}
