"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireRole } from "@/lib/utils/permissions";
import type { ActionResult } from "@/types";
import { createEmailTransport, emailConfig } from "@/lib/config/email";
import { dailyAlertsEmailTemplate } from "@/lib/email/templates";
import type {
  CautionAlert as EmailCautionAlert,
  MarcheAlert as EmailMarcheAlert,
} from "@/lib/email/templates";

// ============================================
// TYPES
// ============================================

export type CautionAlert = {
  id: string;
  reference: string;
  type: string;
  montant: number;
  dateEcheance: Date;
  joursRestants: number;
  marcheNumero: string;
  marcheObjet: string;
};

export type MarcheAlert = {
  id: string;
  numero: string;
  objet: string;
  montant: number;
  dateFinPrevue: Date;
  joursRestants: number;
  statut: string;
};

export type AlertesActuelles = {
  cautions: CautionAlert[];
  marches: MarcheAlert[];
};

export type AlerteDestinataire = {
  id: string;
  email: string;
  nom: string | null;
  actif: boolean;
};

// ============================================
// RÉCUPÉRATION DES ALERTES
// ============================================

/**
 * Récupère les alertes actuelles (cautions <30j, marchés <60j)
 */
export async function getAlertesActuelles(): Promise<
  ActionResult<AlertesActuelles>
> {
  try {
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION']);

    const now = new Date();
    const treateJoursDate = new Date(now);
    treateJoursDate.setDate(now.getDate() + 30);

    const soixanteJoursDate = new Date(now);
    soixanteJoursDate.setDate(now.getDate() + 60);

    // Récupérer cautions proches échéance
    const cautions = await prisma.caution.findMany({
      where: {
        dateEcheance: { lte: treateJoursDate },
        statut: "ACTIVE",
      },
      include: {
        marche: {
          select: {
            numero: true,
            objet: true,
          },
        },
      },
      orderBy: { dateEcheance: "asc" },
    });

    // Récupérer marchés en fin d'exécution
    const marches = await prisma.marche.findMany({
      where: {
        dateFinPrevue: {
          not: null,
          lte: soixanteJoursDate,
        },
        statut: {
          in: ["EN_EXECUTION", "EXECUTE_ATTENTE_GARANTIES"],
        },
      },
      orderBy: { dateFinPrevue: "asc" },
    });

    // Formater les alertes cautions
    const cautionsAlerts: CautionAlert[] = cautions.map((caution) => {
      const joursRestants = Math.ceil(
        (caution.dateEcheance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: caution.id,
        reference: caution.reference,
        type: caution.type,
        montant: Number(caution.montant),
        dateEcheance: caution.dateEcheance,
        joursRestants,
        marcheNumero: caution.marche?.numero || 'N/A',
        marcheObjet: caution.marche?.objet || 'Aucun marché associé',
      };
    });

    // Formater les alertes marchés
    const marchesAlerts: MarcheAlert[] = marches.map((marche) => {
      const joursRestants = Math.ceil(
        (marche.dateFinPrevue!.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      return {
        id: marche.id,
        numero: marche.numero,
        objet: marche.objet,
        montant: Number(marche.montant),
        dateFinPrevue: marche.dateFinPrevue!,
        joursRestants,
        statut: marche.statut,
      };
    });

    return {
      success: true,
      data: {
        cautions: cautionsAlerts,
        marches: marchesAlerts,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des alertes:", error);
    return {
      success: false,
      error: "Impossible de récupérer les alertes",
    };
  }
}

// ============================================
// GESTION DES DESTINATAIRES
// ============================================

/**
 * Récupère la liste des destinataires
 */
export async function getDestinataires(): Promise<
  ActionResult<AlerteDestinataire[]>
> {
  try {
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION']);

    const destinataires = await prisma.alerteDestinataire.findMany({
      orderBy: [{ actif: "desc" }, { email: "asc" }],
    });

    return {
      success: true,
      data: destinataires,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des destinataires:", error);
    return {
      success: false,
      error: "Impossible de récupérer les destinataires",
    };
  }
}

/**
 * Ajoute un nouveau destinataire
 */
export async function addDestinataire(
  email: string,
  nom?: string
): Promise<ActionResult<AlerteDestinataire>> {
  try {
    await requireRole(['ADMIN']);

    // Valider l'email
    if (!email || !email.includes("@")) {
      return {
        success: false,
        error: "Email invalide",
      };
    }

    const destinataire = await prisma.alerteDestinataire.create({
      data: {
        email: email.toLowerCase().trim(),
        nom: nom?.trim() || null,
        actif: true,
      },
    });

    revalidatePath("/admin/alertes");

    return {
      success: true,
      data: destinataire,
    };
  } catch (error: any) {
    console.error("Erreur lors de l'ajout du destinataire:", error);

    if (error.code === "P2002") {
      return {
        success: false,
        error: "Cet email existe déjà dans la liste des destinataires",
      };
    }

    return {
      success: false,
      error: "Impossible d'ajouter le destinataire",
    };
  }
}

/**
 * Supprime un destinataire
 */
export async function removeDestinataire(
  id: string
): Promise<ActionResult<void>> {
  try {
    await requireRole(['ADMIN']);

    await prisma.alerteDestinataire.delete({
      where: { id },
    });

    revalidatePath("/admin/alertes");

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Erreur lors de la suppression du destinataire:", error);
    return {
      success: false,
      error: "Impossible de supprimer le destinataire",
    };
  }
}

/**
 * Active/désactive un destinataire
 */
export async function toggleDestinataire(
  id: string,
  actif: boolean
): Promise<ActionResult<AlerteDestinataire>> {
  try {
    await requireRole(['ADMIN']);

    const destinataire = await prisma.alerteDestinataire.update({
      where: { id },
      data: { actif },
    });

    revalidatePath("/admin/alertes");

    return {
      success: true,
      data: destinataire,
    };
  } catch (error) {
    console.error(
      "Erreur lors de la modification du destinataire:",
      error
    );
    return {
      success: false,
      error: "Impossible de modifier le destinataire",
    };
  }
}

// ============================================
// ENVOI EMAIL MANUEL
// ============================================

/**
 * Génère un aperçu de l'email d'alerte
 */
export async function previewAlertEmail(): Promise<
  ActionResult<{ html: string; subject: string; summary: string }>
> {
  try {
    await requireRole(['ADMIN', 'AVANCE', 'EXPLOITATION']);

    // Récupérer les alertes
    const alertesResult = await getAlertesActuelles();
    if (!alertesResult.success || !alertesResult.data) {
      return {
        success: false,
        error: "Impossible de récupérer les alertes",
      };
    }

    const { cautions, marches } = alertesResult.data;

    // Adapter les données au format attendu par les templates
    const cautionsForEmail: EmailCautionAlert[] = cautions.map((c) => ({
      ...c,
      marcheReference: c.marcheNumero,
    }));

    const marchesForEmail: EmailMarcheAlert[] = marches.map((m) => ({
      ...m,
      reference: m.numero,
      dateFinExecution: m.dateFinPrevue,
    }));

    // Générer le template HTML
    const emailData = dailyAlertsEmailTemplate(cautionsForEmail, marchesForEmail);
    const { html, subject, text: summary } = emailData;

    return {
      success: true,
      data: { html, subject, summary },
    };
  } catch (error) {
    console.error("Erreur lors de la prévisualisation de l'email:", error);
    return {
      success: false,
      error: "Impossible de générer la prévisualisation",
    };
  }
}

/**
 * Envoie l'email d'alerte aux destinataires sélectionnés
 */
export async function sendAlertEmailManual(
  destinataireIds: string[]
): Promise<ActionResult<{ emailsSent: number }>> {
  try {
    await requireRole(['ADMIN', 'AVANCE']);

    // Valider les entrées
    if (!destinataireIds || destinataireIds.length === 0) {
      return {
        success: false,
        error: "Aucun destinataire sélectionné",
      };
    }

    // Récupérer les destinataires
    const destinataires = await prisma.alerteDestinataire.findMany({
      where: {
        id: { in: destinataireIds },
        actif: true,
      },
    });

    if (destinataires.length === 0) {
      return {
        success: false,
        error: "Aucun destinataire actif trouvé",
      };
    }

    // Récupérer les alertes
    const alertesResult = await getAlertesActuelles();
    if (!alertesResult.success || !alertesResult.data) {
      return {
        success: false,
        error: "Impossible de récupérer les alertes",
      };
    }

    const { cautions, marches } = alertesResult.data;

    // Vérifier s'il y a des alertes
    if (cautions.length === 0 && marches.length === 0) {
      return {
        success: false,
        error: "Aucune alerte à envoyer",
      };
    }

    // Adapter les données au format attendu par les templates
    const cautionsForEmail: EmailCautionAlert[] = cautions.map((c) => ({
      ...c,
      marcheReference: c.marcheNumero,
    }));

    const marchesForEmail: EmailMarcheAlert[] = marches.map((m) => ({
      ...m,
      reference: m.numero,
      dateFinExecution: m.dateFinPrevue,
    }));

    // Générer le template HTML
    const emailData = dailyAlertsEmailTemplate(cautionsForEmail, marchesForEmail);
    const { html, subject, text } = emailData;

    // Envoyer l'email
    const emailsTo = destinataires.map((d) => d.email).join(", ");
    const transporter = createEmailTransport();

    await transporter.sendMail({
      from: emailConfig.from,
      to: emailsTo,
      subject,
      html,
      text,
    });

    console.log(
      `✅ Email d'alertes envoyé à ${destinataires.length} destinataire(s)`
    );
    console.log(`   - ${cautions.length} caution(s)`);
    console.log(`   - ${marches.length} marché(s)`);

    return {
      success: true,
      data: { emailsSent: destinataires.length },
    };
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return {
      success: false,
      error: "Impossible d'envoyer l'email",
    };
  }
}
