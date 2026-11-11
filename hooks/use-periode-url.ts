'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Periode } from '@/lib/analytics/types'
import { avecPeriode, lirePeriodeUrl } from '@/lib/veille/periode'

/**
 * Période de la page, lue et écrite dans l'adresse (?debut=&fin=). Sans paramètre valide : 12 mois glissants.
 * L'objet `periode` ne change que si les paramètres changent (il sert de dépendance à des effets).
 */
export function usePeriodeUrl(): { periode: Periode; setPeriode: (p: Periode) => void } {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debut = searchParams.get('debut')
  const fin = searchParams.get('fin')

  const periode = useMemo(() => lirePeriodeUrl(debut, fin), [debut, fin])
  const setPeriode = useCallback(
    (p: Periode) => router.replace(`${pathname}?${avecPeriode(searchParams.toString(), p)}`, { scroll: false }),
    [router, pathname, searchParams],
  )
  return { periode, setPeriode }
}
