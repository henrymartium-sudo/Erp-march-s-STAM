// lib/alertes/engine/rule-evaluator.ts

import type { RuleConditions, RuleCondition } from "@/lib/alertes/types"

/**
 * Évalue si un payload satisfait les conditions d'une règle.
 * Retourne true si toutes les conditions (AND) ou au moins une (OR) sont vérifiées.
 */
export function evaluateConditions(
  conditions: RuleConditions,
  payload: Record<string, unknown>
): boolean {
  if (!conditions.conditions || conditions.conditions.length === 0) {
    return true // Pas de condition = toujours déclencher
  }

  const results = conditions.conditions.map((c) => evaluateSingle(c, payload))

  return conditions.operator === "AND"
    ? results.every(Boolean)
    : results.some(Boolean)
}

function evaluateSingle(
  condition: RuleCondition,
  payload: Record<string, unknown>
): boolean {
  const rawValue = payload[condition.field]
  const condValue = condition.value

  // Champ absent = condition non satisfaite
  if (rawValue === undefined || rawValue === null) return false

  try {
    switch (condition.op) {
      case "eq":  return String(rawValue) === String(condValue)
      case "neq": return String(rawValue) !== String(condValue)
      case "gt":  return Number(rawValue) > Number(condValue)
      case "gte": return Number(rawValue) >= Number(condValue)
      case "lt":  return Number(rawValue) < Number(condValue)
      case "lte": return Number(rawValue) <= Number(condValue)
      case "in":
        return Array.isArray(condValue)
          ? condValue.map(String).includes(String(rawValue))
          : false
      case "nin":
        return Array.isArray(condValue)
          ? !condValue.map(String).includes(String(rawValue))
          : true
      default:
        return false
    }
  } catch {
    return false
  }
}
