'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { STATUT_LABELS } from '@/lib/utils/statut'
import { Search, X, SlidersHorizontal, Bookmark, Trash2, ChevronDown } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { getSavedFilters, createSavedFilter, deleteSavedFilter } from '@/lib/actions/saved-filters'
import { toast } from '@/lib/utils/toast'
import { countMarcheActiveFilters } from '@/lib/utils/filters'
import type { SavedFilter } from '@prisma/client'

const TYPE_LABELS: Record<string, string> = {
  TRAVAUX: 'Travaux',
  FOURNITURES: 'Fournitures',
  SERVICES: 'Services',
  PRESTATIONS_INTELLECTUELLES: 'Prestations intellectuelles',
}

interface MarcheFiltersProps {
  totalCount: number
  filteredCount: number
  isExploitation?: boolean
}

export function MarcheFilters({ totalCount, filteredCount, isExploitation }: MarcheFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Valeurs actuelles des filtres
  const statutActuel = searchParams.get('statut') || 'tous'
  const typeActuel = searchParams.get('type') || 'tous'
  const montantMin = searchParams.get('montantMin') || ''
  const montantMax = searchParams.get('montantMax') || ''
  const dateCreationDebut = searchParams.get('dateCreationDebut') || ''
  const dateCreationFin = searchParams.get('dateCreationFin') || ''

  // État de recherche
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebounce(searchQuery, 300)

  // État montant local (debounce avant push URL)
  const [montantMinInput, setMontantMinInput] = useState(montantMin)
  const [montantMaxInput, setMontantMaxInput] = useState(montantMax)
  const debouncedMontantMin = useDebounce(montantMinInput, 500)
  const debouncedMontantMax = useDebounce(montantMaxInput, 500)

  // Filtres sauvegardés
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Charger les filtres sauvegardés au montage
  useEffect(() => {
    getSavedFilters('marches').then((result) => {
      if (result.success) setSavedFilters(result.data)
    })
  }, [])

  // Synchronisation URL — recherche
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }
    params.delete('page')
    router.push(`/marches?${params.toString()}`)
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronisation URL — montant min
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedMontantMin) {
      params.set('montantMin', debouncedMontantMin)
    } else {
      params.delete('montantMin')
    }
    params.delete('page')
    router.push(`/marches?${params.toString()}`)
  }, [debouncedMontantMin]) // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronisation URL — montant max
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedMontantMax) {
      params.set('montantMax', debouncedMontantMax)
    } else {
      params.delete('montantMax')
    }
    params.delete('page')
    router.push(`/marches?${params.toString()}`)
  }, [debouncedMontantMax]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'tous') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/marches?${params.toString()}`)
  }

  const handleReset = () => {
    setSearchQuery('')
    setMontantMinInput('')
    setMontantMaxInput('')
    router.push('/marches')
  }

  // Filtre actifs count (hors search)
  const filterParams = {
    statut: searchParams.get('statut') || undefined,
    type: searchParams.get('type') || undefined,
    montantMin: montantMin || undefined,
    montantMax: montantMax || undefined,
    dateCreationDebut: dateCreationDebut || undefined,
    dateCreationFin: dateCreationFin || undefined,
  }
  const activeFilterCount = countMarcheActiveFilters(filterParams)
  const hasFilters = activeFilterCount > 0 || searchQuery !== ''

  // Appliquer un filtre sauvegardé
  const applyFilter = (filter: SavedFilter) => {
    const filtres = filter.filtres as Record<string, string>
    const params = new URLSearchParams()
    Object.entries(filtres).forEach(([k, v]) => { if (v) params.set(k, v) })

    // Mettre à jour les états locaux
    setSearchQuery(filtres.search || '')
    setMontantMinInput(filtres.montantMin || '')
    setMontantMaxInput(filtres.montantMax || '')

    router.push(`/marches?${params.toString()}`)
  }

  // Sauvegarder les filtres actuels
  const handleSaveFilter = async () => {
    if (!filterName.trim()) return

    const filtres: Record<string, string> = {}
    if (searchParams.get('statut')) filtres.statut = searchParams.get('statut')!
    if (searchParams.get('type')) filtres.type = searchParams.get('type')!
    if (searchParams.get('search')) filtres.search = searchParams.get('search')!
    if (montantMinInput) filtres.montantMin = montantMinInput
    if (montantMaxInput) filtres.montantMax = montantMaxInput
    if (dateCreationDebut) filtres.dateCreationDebut = dateCreationDebut
    if (dateCreationFin) filtres.dateCreationFin = dateCreationFin

    startTransition(async () => {
      const result = await createSavedFilter({
        nom: filterName.trim(),
        module: 'marches',
        filtres,
      })

      if (result.success) {
        setSavedFilters((prev) => [result.data, ...prev])
        toast.success(`Filtre "${filterName}" sauvegardé`)
        setFilterName('')
        setSaveDialogOpen(false)
      } else {
        toast.error(result.error || 'Erreur lors de la sauvegarde')
      }
    })
  }

  // Supprimer un filtre sauvegardé
  const handleDeleteFilter = async (id: string, nom: string) => {
    startTransition(async () => {
      const result = await deleteSavedFilter(id)
      if (result.success) {
        setSavedFilters((prev) => prev.filter((f) => f.id !== id))
        toast.success(`Filtre "${nom}" supprimé`)
      } else {
        toast.error(result.error || 'Erreur lors de la suppression')
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card">
      {/* Barre principale */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3">

        {/* Recherche */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher un marché..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Dropdowns + Actions */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {/* Statut — masqué pour EXPLOITATION (toujours restreint à EN_EXECUTION côté serveur) */}
          {!isExploitation && (
            <Select value={statutActuel} onValueChange={(v) => updateParam('statut', v)}>
              <SelectTrigger className="w-40 h-10">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {Object.entries(STATUT_LABELS)
                  .filter(([value]) => !['RESILIE', 'ANNULE', 'INFRUCTUEUX'].includes(value))
                  .map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Terminés</SelectLabel>
                  {['RESILIE', 'ANNULE', 'INFRUCTUEUX']
                    .filter((value) => STATUT_LABELS[value as keyof typeof STATUT_LABELS])
                    .map((value) => (
                      <SelectItem key={value} value={value}>
                        {STATUT_LABELS[value as keyof typeof STATUT_LABELS]}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}

          {/* Type */}
          <Select value={typeActuel} onValueChange={(v) => updateParam('type', v)}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtres avancés */}
          <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Avancé</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <p className="text-sm font-medium">Filtres avancés</p>

                {/* Plage montant */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Montant (FCFA)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={montantMinInput}
                      onChange={(e) => setMontantMinInput(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <span className="text-muted-foreground text-xs">–</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={montantMaxInput}
                      onChange={(e) => setMontantMaxInput(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Plage date création */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Date de création</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={dateCreationDebut}
                      onChange={(e) => updateParam('dateCreationDebut', e.target.value)}
                      className="h-9 text-sm"
                    />
                    <span className="text-muted-foreground text-xs">–</span>
                    <Input
                      type="date"
                      value={dateCreationFin}
                      onChange={(e) => updateParam('dateCreationFin', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {hasFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { handleReset(); setAdvancedOpen(false) }}
                    >
                      Effacer tout
                    </Button>
                  )}
                  {hasFilters && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => { setSaveDialogOpen(true); setAdvancedOpen(false) }}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      Sauvegarder
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtres sauvegardés */}
          {savedFilters.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-1.5">
                  <Bookmark className="h-4 w-4" />
                  <span className="hidden sm:inline">Sauvegardés</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <p className="text-xs text-muted-foreground px-2 py-1 mb-1">Filtres sauvegardés</p>
                {savedFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 group"
                  >
                    <button
                      className="flex-1 text-sm text-left truncate"
                      title={filter.nom}
                      onClick={() => applyFilter(filter)}
                    >
                      {filter.nom}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => handleDeleteFilter(filter.id, filter.nom)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          )}

          {/* Bouton reset (raccourci si filtres actifs) */}
          {hasFilters && !advancedOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground flex-shrink-0 h-10"
            >
              <X className="h-4 w-4 mr-1.5" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      {/* Chips filtres actifs */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {!isExploitation && filterParams.statut && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Statut : {STATUT_LABELS[filterParams.statut as keyof typeof STATUT_LABELS] || filterParams.statut}
              <button onClick={() => updateParam('statut', null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filterParams.type && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Type : {TYPE_LABELS[filterParams.type] || filterParams.type}
              <button onClick={() => updateParam('type', null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(filterParams.montantMin || filterParams.montantMax) && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Montant : {filterParams.montantMin ? `≥${Number(filterParams.montantMin).toLocaleString('fr-FR')}` : ''}{filterParams.montantMin && filterParams.montantMax ? ' – ' : ''}{filterParams.montantMax ? `≤${Number(filterParams.montantMax).toLocaleString('fr-FR')}` : ''} FCFA
              <button onClick={() => {
                setMontantMinInput('')
                setMontantMaxInput('')
                const params = new URLSearchParams(searchParams.toString())
                params.delete('montantMin')
                params.delete('montantMax')
                router.push(`/marches?${params.toString()}`)
              }}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(filterParams.dateCreationDebut || filterParams.dateCreationFin) && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Créé : {filterParams.dateCreationDebut || '…'} → {filterParams.dateCreationFin || '…'}
              <button onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.delete('dateCreationDebut')
                params.delete('dateCreationFin')
                router.push(`/marches?${params.toString()}`)
              }}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Compteur de résultats */}
      <div className="px-4 py-2 border-t border-gray-50">
        <p className="text-xs text-muted-foreground">
          {hasFilters ? (
            <><span className="font-semibold text-foreground">{filteredCount}</span> résultat{filteredCount > 1 ? 's' : ''} sur {totalCount}</>
          ) : (
            <><span className="font-semibold text-foreground">{totalCount}</span> marché{totalCount > 1 ? 's' : ''} au total</>
          )}
        </p>
      </div>

      {/* Dialog sauvegarde filtre */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sauvegarder ce filtre</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="filter-name">Nom du filtre</Label>
            <Input
              id="filter-name"
              placeholder="Ex: Marchés en exécution 2025"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveFilter} disabled={!filterName.trim() || isPending}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
