/**
 * Configuration Nodemailer pour l'envoi d'emails automatiques
 * Supports SMTP avec gestion dev/prod
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Crée un transport Nodemailer configuré selon l'environnement
 *
 * En production : utilise SMTP réel avec variables d'environnement
 * En développement : utilise SMTP réel ou console (selon config)
 *
 * Variables d'environnement requises :
 * - SMTP_HOST : Hôte SMTP (ex: smtp.gmail.com, smtp.sendgrid.net)
 * - SMTP_PORT : Port SMTP (587 pour TLS, 465 pour SSL)
 * - SMTP_SECURE : "true" pour SSL (port 465), "false" pour TLS (port 587)
 * - SMTP_USER : Nom d'utilisateur SMTP
 * - SMTP_PASS : Mot de passe SMTP
 * - SMTP_FROM : Adresse email expéditeur (ex: "ERP STAM <noreply@stam.com>")
 *
 * @returns Transport Nodemailer configuré
 */
export function createEmailTransport(): Transporter {
  const isProduction = process.env.NODE_ENV === "production";

  // Vérifier les variables d'environnement requises
  const requiredVars = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0 && isProduction) {
    throw new Error(
      `Variables d'environnement manquantes pour SMTP : ${missingVars.join(", ")}`
    );
  }

  // En dev, si pas de config SMTP, logger dans console
  if (missingVars.length > 0 && !isProduction) {
    console.warn(
      "⚠️  Configuration SMTP incomplète. Les emails seront loggés dans la console."
    );
    console.warn(`Variables manquantes : ${missingVars.join(", ")}`);

    // Transport de test qui log dans console
    return nodemailer.createTransport({
      streamTransport: true,
      newline: "windows",
    });
  }

  // Configuration SMTP réelle
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true pour 465, false pour 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Pooling pour réutiliser les connexions (performances)
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  };

  return nodemailer.createTransport(smtpConfig);
}

/**
 * Vérifie que la configuration SMTP est valide
 * Utile pour tester la connexion au démarrage
 *
 * @returns Promise<boolean> true si connexion OK
 */
export async function verifyEmailTransport(): Promise<boolean> {
  try {
    const transporter = createEmailTransport();
    await transporter.verify();
    console.log("✅ Configuration SMTP validée - Prêt à envoyer des emails");
    return true;
  } catch (error) {
    console.error("❌ Erreur de configuration SMTP :", error);
    return false;
  }
}

/**
 * Configuration des emails
 */
export const emailConfig = {
  from: process.env.SMTP_FROM || '"ERP Marchés STAM" <noreply@stam.com>',
  // Destinataires des alertes (séparés par virgule)
  alertRecipients: process.env.ALERT_EMAIL_TO?.split(",").map((email) => email.trim()) || [],
};
