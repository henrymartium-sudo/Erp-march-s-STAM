/**
 * Wrapper Sonner avec durées par type configurées globalement.
 *
 * Durées :
 *   success  → 3 000 ms
 *   error    → 5 000 ms
 *   warning  → persistant (Infinity)
 *   info     → 4 000 ms
 *
 * Usage : importer `toast` depuis ici au lieu de `sonner`.
 * Les options (description, id, etc.) sont transmises telles quelles.
 * Une `duration` explicite dans les options prend le dessus.
 */

import { toast as sonnerToast, type ExternalToast } from 'sonner'

const DURATIONS = {
  success: 3000,
  error: 5000,
  warning: Infinity,
  info: 4000,
} as const

function success(message: string, opts?: ExternalToast) {
  return sonnerToast.success(message, { duration: DURATIONS.success, ...opts })
}

function error(message: string | null | undefined, opts?: ExternalToast) {
  return sonnerToast.error(message ?? 'Une erreur est survenue', { duration: DURATIONS.error, ...opts })
}

function warning(message: string, opts?: ExternalToast) {
  return sonnerToast.warning(message, { duration: DURATIONS.warning, ...opts })
}

function info(message: string, opts?: ExternalToast) {
  return sonnerToast.info(message, { duration: DURATIONS.info, ...opts })
}

export const toast = {
  success,
  error,
  warning,
  info,
  /** Accès direct à l'API Sonner pour les cas avancés (loading, dismiss, etc.) */
  loading: sonnerToast.loading.bind(sonnerToast),
  dismiss: sonnerToast.dismiss.bind(sonnerToast),
  promise: sonnerToast.promise.bind(sonnerToast),
}
