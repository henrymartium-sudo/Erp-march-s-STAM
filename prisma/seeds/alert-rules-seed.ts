// prisma/seeds/alert-rules-seed.ts

import { PrismaClient } from "@prisma/client"
import type { RuleConditions } from "../../lib/alertes/types"

export async function seedAlertRules(prisma: PrismaClient) {
  const rules: Array<{
    id: string
    name: string
    description: string
    eventType: string
    conditions: RuleConditions
    channels: string[]
    targetRoles: string[]
    cooldownMinutes: number
  }> = [
    {
      id: "default_CAUTION_EXPIRING_critique",
      name: "Caution critique (≤ 7 jours)",
      description: "Alerte quand une caution active expire dans 7 jours ou moins",
      eventType: "CAUTION_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [
          { field: "joursRestants", op: "lte", value: 7 },
          { field: "statut", op: "eq", value: "ACTIVE" },
        ],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
    },
    {
      id: "default_CAUTION_EXPIRING_attention",
      name: "Caution attention (8–30 jours)",
      description: "Alerte préventive pour les cautions expirant entre 8 et 30 jours",
      eventType: "CAUTION_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [
          { field: "joursRestants", op: "lte", value: 30 },
          { field: "joursRestants", op: "gt", value: 7 },
          { field: "statut", op: "eq", value: "ACTIVE" },
        ],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
    },
    {
      id: "default_MARCHE_EXPIRING_imminente",
      name: "Marché fin imminente (≤ 14 jours)",
      description: "Alerte urgente pour les marchés finissant dans 14 jours",
      eventType: "MARCHE_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [{ field: "joursRestants", op: "lte", value: 14 }],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE", "EXPLOITATION"],
      cooldownMinutes: 1440,
    },
    {
      id: "default_MARCHE_EXPIRING_proche",
      name: "Marché fin proche (15–60 jours)",
      description: "Alerte préventive pour les marchés finissant entre 15 et 60 jours",
      eventType: "MARCHE_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [
          { field: "joursRestants", op: "lte", value: 60 },
          { field: "joursRestants", op: "gt", value: 14 },
        ],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
    },
    {
      id: "default_SAV_TICKET_CREATED",
      name: "Ticket SAV créé",
      description: "Notification in-app à chaque création de ticket SAV",
      eventType: "SAV_TICKET_CREATED",
      conditions: { operator: "AND", conditions: [] },
      channels: ["IN_APP"],
      targetRoles: ["ADMIN", "EXPLOITATION"],
      cooldownMinutes: 0,
    },
    {
      id: "default_SAV_TICKET_ESCALATED",
      name: "Ticket SAV escaladé",
      description: "Alerte email + in-app quand un ticket SAV est escaladé",
      eventType: "SAV_TICKET_ESCALATED",
      conditions: { operator: "AND", conditions: [] },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE", "EXPLOITATION"],
      cooldownMinutes: 60,
    },
    {
      id: "default_SAV_SLA_BREACH",
      name: "SLA SAV dépassé",
      description: "Alerte email + in-app pour dépassement de SLA",
      eventType: "SAV_SLA_BREACH",
      conditions: { operator: "AND", conditions: [] },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 120,
    },
    {
      id: "default_DOCUMENT_EXPIRING",
      name: "Document expirant (≤ 30 jours)",
      description: "Alerte pour les documents dont la date d'expiration approche",
      eventType: "DOCUMENT_EXPIRING",
      conditions: {
        operator: "AND",
        conditions: [{ field: "joursRestants", op: "lte", value: 30 }],
      },
      channels: ["EMAIL", "IN_APP"],
      targetRoles: ["ADMIN", "AVANCE"],
      cooldownMinutes: 1440,
    },
  ]

  for (const rule of rules) {
    await prisma.alertRule.upsert({
      where: { id: rule.id },
      update: {},
      create: {
        ...rule,
        conditions: rule.conditions as unknown as import('@prisma/client').Prisma.InputJsonValue,
        targetUserIds: [],
      },
    })
  }
  console.log(`✅ ${rules.length} règles d'alerte par défaut seedées`)
}
