'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebounce } from '@/hooks/use-debounce'
import { STATUT_OPPORTUNITE_LABELS } from '@/lib/validations/opportunite'
import {
  DEFAULT_PHASE,
  ECHEANCE_LABELS,
  PHASE_LABELS,
  PHASE_STATUTS,
  TRI_LABELS,
  type OpportunitePhase,
} from '@/lib/utils/opportunite-filters'

interface OpportuniteFiltersProps {
  phaseCounts: Record<OpportunitePhase, number>
  filteredCount: number
  /** Résultats (liste + pagination), rendus dans le panneau de l'onglet actif */
  children: ReactNode
}

const PHASES = Object.keys(PHASE_LABELS) as OpportunitePhase[]

export function OpportuniteFilters({ phaseCounts, filteredCount, children }: OpportuniteFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const phase = (searchParams.get('phase') as OpportunitePhase) || DEFAULT_PHASE
  const statut = searchParams.get('statut') || 'tous'
  const echeance = searchParams.get('echeance') || 'toutes'
  const tri = searchParams.get('tri') || 'echeance'

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const pushParams = (update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    update(params)
    params.delete('page')
    const qs = params.toString()
    router.push(`/opportunites${qs ? `?${qs}` : ''}`)
  }

  // Synchronisation URL — recherche (uniquement si la valeur a changé)
  useEffect(() => {
    if ((searchParams.get('search') || '') === debouncedSearch) return
    pushParams((params) => {
      if (debouncedSearch) params.set('search', debouncedSearch)
      else params.delete('search')
    })
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateParam = (key: string, value: string, defaultValue: string) => {
    pushParams((params) => {
      if (value && value !== defaultValue) params.set(key, value)
      else params.delete(key)
    })
  }

  // Changer de phase réinitialise le statut précis, qui peut ne plus appartenir à la phase
  const changePhase = (value: string) => {
    pushParams((params) => {
      if (value !== DEFAULT_PHASE) params.set('phase', value)
      else params.delete('phase')
      params.delete('statut')
    })
  }

  const handleReset = () => {
    setSearchQuery('')
    const params = new URLSearchParams()
    if (phase !== DEFAULT_PHASE) params.set('phase', phase)
    const qs = params.toString()
    router.push(`/opportunites${qs ? `?${qs}` : ''}`)
  }

  const hasFilters = searchQuery !== '' || statut !== 'tous' || echeance !== 'toutes'

  // Statuts proposés : ceux de la phase courante (hors statuts legacy, jamais affichés)
  const statutsProposes = (
    phase === 'toutes'
      ? [...PHASE_STATUTS['en-cours'], ...PHASE_STATUTS.gagnees, ...PHASE_STATUTS.perdues]
      : PHASE_STATUTS[phase]
  ).filter((s) => s in STATUT_OPPORTUNITE_LABELS)

  return (
    <Tabs value={phase} onValueChange={changePhase} className="space-y-4">
      <TabsList className="h-auto flex-wrap justify-start" aria-label="Phases du pipeline">
        {PHASES.map((p) => (
          <TabsTrigger key={p} value={p} className="gap-2">
            {PHASE_LABELS[p]}
            <span className="rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs tabular-nums">
              {phaseCounts[p]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="rounded-xl border border-border bg-card p-3 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par objet, référence ou autorité…"
              aria-label="Rechercher une opportunité"
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                aria-label="Effacer la recherche"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex">
            <Select value={statut} onValueChange={(v) => updateParam('statut', v, 'tous')}>
              <SelectTrigger className="lg:w-[200px]" aria-label="Filtrer par statut">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {statutsProposes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUT_OPPORTUNITE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={echeance} onValueChange={(v) => updateParam('echeance', v, 'toutes')}>
              <SelectTrigger className="lg:w-[180px]" aria-label="Filtrer par date limite">
                <SelectValue placeholder="Date limite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les dates</SelectItem>
                {Object.entries(ECHEANCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tri} onValueChange={(v) => updateParam('tri', v, 'echeance')}>
              <SelectTrigger className="lg:w-[170px]" aria-label="Trier par">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRI_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    Tri : {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span aria-live="polite">
          {filteredCount} opportunité{filteredCount > 1 ? 's' : ''} sur {phaseCounts[phase]}
        </span>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            Effacer les filtres
          </Button>
        )}
      </div>

      {PHASES.map((p) => (
        <TabsContent key={p} value={p} className="mt-0 space-y-6">
          {p === phase ? children : null}
        </TabsContent>
      ))}
    </Tabs>
  )
}
