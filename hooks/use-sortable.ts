'use client'

import { useState, useMemo } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface SortConfig<T> {
  key: keyof T
  direction: SortDirection
}

/**
 * Hook générique pour trier un tableau de données.
 * Gère les types string (avec comparaison locale + détection ISO date), number et null.
 */
export function useSortable<T>(
  data: T[],
  initialSort?: SortConfig<T>
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(
    initialSort ?? null
  )

  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      // Nulls en dernier
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      // Dates ISO strings
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const aDate = Date.parse(aVal)
        const bDate = Date.parse(bVal)
        if (!isNaN(aDate) && !isNaN(bDate)) {
          return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate
        }
        // Chaînes normales (insensible à la casse, accents)
        const cmp = aVal.localeCompare(bVal, 'fr', { sensitivity: 'base' })
        return sortConfig.direction === 'asc' ? cmp : -cmp
      }

      // Nombres
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })
  }, [data, sortConfig])

  const onSort = (key: keyof T) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  return { sortedData, sortConfig, onSort }
}
