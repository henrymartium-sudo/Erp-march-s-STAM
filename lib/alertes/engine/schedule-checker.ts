// lib/alertes/engine/schedule-checker.ts
import type { ScheduleConfig } from "@/lib/alertes/types"

/** Date de référence fixe pour le calcul des intervalles */
const INTERVAL_REFERENCE = new Date("2024-01-01").getTime()

/**
 * Détermine si une règle doit s'exécuter aujourd'hui selon sa planification.
 *
 * @param config - Configuration de planification (null = toujours exécuter)
 * @param date   - Date à vérifier (défaut : maintenant)
 * @returns true si la règle doit s'exécuter, false sinon
 *
 * Compatibilité : config === null → true (comportement actuel préservé)
 */
export function shouldRunRuleToday(
  config: ScheduleConfig | null | undefined,
  date: Date = new Date()
): boolean {
  if (!config) return true

  switch (config.type) {
    case "DAILY":
      return true

    case "WEEKLY": {
      if (!config.daysOfWeek || config.daysOfWeek.length === 0) return true
      return config.daysOfWeek.includes(date.getDay())
    }

    case "MONTHLY": {
      if (!config.dayOfMonth) return true
      return date.getDate() === config.dayOfMonth
    }

    case "INTERVAL": {
      const intervalDays = config.intervalDays ?? 1
      if (intervalDays <= 1) return true
      const daysSinceRef = Math.floor(
        (date.getTime() - INTERVAL_REFERENCE) / (24 * 60 * 60 * 1000)
      )
      return daysSinceRef % intervalDays === 0
    }

    default:
      return true
  }
}
