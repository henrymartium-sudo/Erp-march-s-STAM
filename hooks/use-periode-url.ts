'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Periode } from '@/lib/analytics/types'
import { lirePeriodeUrl, parametresPeriode } from '@/lib/veille/periode'

/**
 * Période de la page, lue et écrite dans l'adresse (?debut=&fin=). Sans paramètre valide : 12 mois glissants.
 * L'objet `periode` ne change que si les paramètres changent (il sert de dépendance à des effets).
 */
export function usePeriodeUrl(): { periode: Periode; setPeriode: (p: Periode) => void; parametres: string } {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debut = searchParams.get('debut')
  const fin = searchParams.get('fin')

  const periode = useMemo(() => lirePeriodeUrl(debut, fin), [debut, fin])
  const setPeriode = useCallback(
    (p: Periode) => router.replace(`${pathname}?${parametresPeriode(p)}`, { scroll: false }),
    [router, pathname],
  )
  return { periode, setPeriode, parametres: parametresPeriode(periode) }
}
