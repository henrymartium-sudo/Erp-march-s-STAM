'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DocumentIcon } from './document-icon'
import { DocumentBadge } from './document-badge'
import { formatTaille } from '@/lib/utils/document'
import type { DocumentAvecMarche } from '@/lib/utils/document'
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
import { Download, Eye, FileText, Link2, Loader2, MoreVertical, Trash2, History, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { ColonneTri, SensTri } from '@/lib/utils/documents-tri'
import { copierLienDocument } from '@/lib/utils/documents-lien'

interface DocumentTableProps {
  documents: DocumentAvecMarche[]
  onPreview?: (document: Document) => void
  onDownload?: (document: Document) => void
  telechargementId?: string | null
  onDelete?: (document: Document) => void
  onViewVersions?: (document: Document) => void
  selectable?: boolean
  onSelectionChange?: (selected: string[]) => void
  /** Tri global en cours (porté par l'URL) et demande de changement de tri */
  tri: ColonneTri
  sens: SensTri
  onTriChange: (colonne: ColonneTri) => void
}

interface ActionsMenuProps {
  document: Document
  onPreview?: (document: Document) => void
  onDownload?: (document: Document) => void
  telechargementId?: string | null
  onDelete?: (document: Document) => void
  onViewVersions?: (document: Document) => void
}

/** Menu d'actions d'un document — cible tactile de 44 px (table et cartes) */
function ActionsMenu({ document, onPreview, onDownload, telechargementId, onDelete, onViewVersions }: ActionsMenuProps) {
  const enCours = telechargementId === document.id
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Actions pour ${document.nom}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/documents/${document.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            Voir le détail
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copierLienDocument(document.id)}>
          <Link2 className="mr-2 h-4 w-4" />
          Copier le lien
        </DropdownMenuItem>
        {onPreview && (
          <DropdownMenuItem onClick={() => onPreview(document)}>
            <Eye className="mr-2 h-4 w-4" />
            Prévisualiser
          </DropdownMenuItem>
        )}
        {onDownload && (
          <DropdownMenuItem disabled={enCours} onClick={() => onDownload(document)}>
            {enCours ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {enCours ? 'Téléchargement…' : 'Télécharger'}
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
            <DropdownMenuItem onClick={() => onDelete(document)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface EnteteTriProps {
  colonne: ColonneTri
  libelle: string
  tri: ColonneTri
  sens: SensTri
  onTriChange: (colonne: ColonneTri) => void
  className?: string
}

/** En-tête de colonne triable : le sens courant est annoncé (aria-sort) et montré (flèche) */
function EnteteTri({ colonne, libelle, tri, sens, onTriChange, className }: EnteteTriProps) {
  const actif = tri === colonne
  const Fleche = !actif ? ArrowUpDown : sens === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead
      className={className}
      aria-sort={actif ? (sens === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <Button
        variant="ghost"
        onClick={() => onTriChange(colonne)}
        className="hover:bg-transparent p-0 h-auto font-semibold"
      >
        {libelle}
        <Fleche className="ml-2 h-4 w-4" aria-hidden="true" />
      </Button>
    </TableHead>
  )
}

/**
 * Table d'affichage des documents avec tri et sélection
 */
export function DocumentTable({
  documents,
  onPreview,
  onDownload,
  telechargementId,
  onDelete,
  onViewVersions,
  selectable = false,
  onSelectionChange,
  tri,
  sens,
  onTriChange,
}: DocumentTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Le tri est fait par le serveur (global, toutes pages) : l'ordre reçu est l'ordre affiché
  const sortedDocuments = documents

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

  const actionsProps = { onPreview, onDownload, telechargementId, onDelete, onViewVersions }

  const allSelected = documents.length > 0 && selectedIds.size === documents.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < documents.length

  return (
    <>
      {/* Sous 768 px : une carte par document (pas de tableau) */}
      <ul className="space-y-3 md:hidden">
        {sortedDocuments.map((document) => (
          <li
            key={document.id}
            data-testid="document-ligne"
            className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-card"
          >
            <DocumentIcon type={document.type} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="font-medium break-words">
                <Link href={`/documents/${document.id}`} className="hover:underline">
                  {document.nom}
                </Link>
              </p>
              {document.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{document.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <DocumentBadge type={document.type} />
                {document.phase && <DocumentBadge phase={document.phase} />}
                {document.version > 1 && (
                  <span className="text-xs text-muted-foreground">v{document.version}</span>
                )}
              </div>
              {document.marche && (
                <p className="text-xs text-muted-foreground">
                  Marché :{' '}
                  <Link href={`/marches/${document.marche.id}`} title={document.marche.objet} className="text-stam-accent hover:underline">
                    {document.marche.numero}
                  </Link>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatTaille(document.taille)} · {format(new Date(document.createdAt), 'dd MMM yyyy', { locale: fr })}
              </p>
            </div>
            <ActionsMenu document={document} {...actionsProps} />
          </li>
        ))}
      </ul>

    <div
      role="region"
      aria-label="Liste des documents"
      tabIndex={0}
      className="hidden md:block border rounded-lg overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <Table>
        <TableCaption className="sr-only">Liste des documents</TableCaption>
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
            <EnteteTri colonne="nom" libelle="Nom" tri={tri} sens={sens} onTriChange={onTriChange} />
            <EnteteTri colonne="type" libelle="Type" tri={tri} sens={sens} onTriChange={onTriChange} className="hidden lg:table-cell" />
            <EnteteTri colonne="taille" libelle="Taille" tri={tri} sens={sens} onTriChange={onTriChange} className="hidden lg:table-cell" />
            <EnteteTri colonne="createdAt" libelle="Date" tri={tri} sens={sens} onTriChange={onTriChange} className="hidden lg:table-cell" />
            <TableHead className="hidden lg:table-cell">Marché</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedDocuments.map((document) => (
            <TableRow key={document.id} data-testid="document-ligne">
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
                  <p className="font-medium truncate">
                    <Link href={`/documents/${document.id}`} className="hover:underline">
                      {document.nom}
                    </Link>
                  </p>
                  {document.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {document.description}
                    </p>
                  )}
                  {/* Sous lg, Type / Taille / Date sont repliés sous le nom */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground lg:hidden">
                    <DocumentBadge type={document.type} />
                    {document.phase && <DocumentBadge phase={document.phase} />}
                    {document.version > 1 && <span>v{document.version}</span>}
                    <span>
                      {formatTaille(document.taille)} · {format(new Date(document.createdAt), 'dd MMM yyyy', { locale: fr })}
                    </span>
                    {document.marche && (
                      <Link href={`/marches/${document.marche.id}`} title={document.marche.objet} className="text-stam-accent hover:underline">
                        Marché {document.marche.numero}
                      </Link>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-wrap gap-2">
                  <DocumentBadge type={document.type} />
                  {document.phase && <DocumentBadge phase={document.phase} />}
                  {document.version > 1 && (
                    <span className="text-xs text-muted-foreground">v{document.version}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">{formatTaille(document.taille)}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {format(new Date(document.createdAt), 'dd MMM yyyy', { locale: fr })}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {document.marche ? (
                  <Link href={`/marches/${document.marche.id}`} title={document.marche.objet} className="text-stam-accent hover:underline">
                    {document.marche.numero}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <ActionsMenu document={document} {...actionsProps} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  )
}
