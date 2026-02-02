'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { DocumentIcon } from './document-icon'
import { DocumentBadge } from './document-badge'
import { formatTaille } from '@/lib/utils/document'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Document } from '@prisma/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, Eye, MoreVertical, Trash2, History, ArrowUpDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

type SortField = 'nom' | 'type' | 'taille' | 'createdAt'
type SortDirection = 'asc' | 'desc'

interface DocumentTableProps {
  documents: Document[]
  onPreview?: (document: Document) => void
  onDownload?: (document: Document) => void
  onDelete?: (document: Document) => void
  onViewVersions?: (document: Document) => void
  selectable?: boolean
  onSelectionChange?: (selected: string[]) => void
}

/**
 * Table d'affichage des documents avec tri et sélection
 */
export function DocumentTable({
  documents,
  onPreview,
  onDownload,
  onDelete,
  onViewVersions,
  selectable = false,
  onSelectionChange,
}: DocumentTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Tri des documents
  const sortedDocuments = [...documents].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'taille':
        comparison = a.taille - b.taille
        break
      case 'nom':
      case 'type':
        comparison = a[sortField].toLowerCase().localeCompare(b[sortField].toLowerCase())
        break
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Gérer le tri
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sélection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(documents.map((d) => d.id))
      setSelectedIds(allIds)
      onSelectionChange?.(Array.from(allIds))
    } else {
      setSelectedIds(new Set())
      onSelectionChange?.([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedIds)
    if (checked) {
      newSelection.add(id)
    } else {
      newSelection.delete(id)
    }
    setSelectedIds(newSelection)
    onSelectionChange?.(Array.from(newSelection))
  }

  const allSelected = documents.length > 0 && selectedIds.size === documents.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < documents.length

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Aucun document trouvé</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Sélectionner tout"
                  className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
              </TableHead>
            )}
            <TableHead className="w-12"></TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('nom')}
                className="hover:bg-transparent p-0 h-auto font-semibold"
              >
                Nom
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('type')}
                className="hover:bg-transparent p-0 h-auto font-semibold"
              >
                Type
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('taille')}
                className="hover:bg-transparent p-0 h-auto font-semibold"
              >
                Taille
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('createdAt')}
                className="hover:bg-transparent p-0 h-auto font-semibold"
              >
                Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedDocuments.map((document) => (
            <TableRow key={document.id}>
              {selectable && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(document.id)}
                    onCheckedChange={(checked) =>
                      handleSelectOne(document.id, checked as boolean)
                    }
                    aria-label={`Sélectionner ${document.nom}`}
                  />
                </TableCell>
              )}
              <TableCell>
                <DocumentIcon type={document.type} />
              </TableCell>
              <TableCell>
                <div className="max-w-md">
                  <p className="font-medium truncate">{document.nom}</p>
                  {document.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {document.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <DocumentBadge type={document.type} />
                  {document.phase && <DocumentBadge phase={document.phase} />}
                  {document.version > 1 && (
                    <span className="text-xs text-muted-foreground">v{document.version}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatTaille(document.taille)}</TableCell>
              <TableCell>
                {format(new Date(document.createdAt), 'dd MMM yyyy', { locale: fr })}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onPreview && (
                      <DropdownMenuItem onClick={() => onPreview(document)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Prévisualiser
                      </DropdownMenuItem>
                    )}
                    {onDownload && (
                      <DropdownMenuItem onClick={() => onDownload(document)}>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </DropdownMenuItem>
                    )}
                    {document.version > 1 && onViewVersions && (
                      <DropdownMenuItem onClick={() => onViewVersions(document)}>
                        <History className="mr-2 h-4 w-4" />
                        Versions ({document.version})
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(document)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
