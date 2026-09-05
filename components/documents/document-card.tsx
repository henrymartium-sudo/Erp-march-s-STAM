'use client'

import { DocumentIcon } from './document-icon'
import { DocumentBadge } from './document-badge'
import { formatTaille } from '@/lib/utils/document'
import { Download, Eye, Trash2, MoreVertical, History } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Document } from '@prisma/client'
import type { TypeDocument } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DocumentCardProps {
  document: Document
  onPreview?: (document: Document) => void
  onDownload?: (document: Document) => void
  onDelete?: (document: Document) => void
  onViewVersions?: (document: Document) => void
  compact?: boolean
}

/* Barre couleur top + icône colorée selon le type de document */
const TYPE_TOP_BAR: Record<TypeDocument, string> = {
  DAO:               'bg-blue-400',
  DRP:               'bg-green-400',
  CAUTION_BANCAIRE:  'bg-orange-400',
  COURRIER:          'bg-purple-400',
  PV_RECEPTION:      'bg-pink-400',
  ORDRE_SERVICE:     'bg-indigo-400',
  DOCUMENT_VEHICULE: 'bg-cyan-400',
  AUTRE:             'bg-gray-300',
}

const TYPE_ICON_COLOR: Record<TypeDocument, string> = {
  DAO:               'text-blue-500',
  DRP:               'text-green-500',
  CAUTION_BANCAIRE:  'text-orange-500',
  COURRIER:          'text-purple-500',
  PV_RECEPTION:      'text-pink-500',
  ORDRE_SERVICE:     'text-indigo-500',
  DOCUMENT_VEHICULE: 'text-cyan-500',
  AUTRE:             'text-gray-400',
}

export function DocumentCard({
  document,
  onPreview,
  onDownload,
  onDelete,
  onViewVersions,
  compact = false,
}: DocumentCardProps) {
  const createdDate = format(new Date(document.createdAt), 'dd MMM yyyy', { locale: fr })
  const hasVersions = document.version > 1
  const topBar = TYPE_TOP_BAR[document.type]
  const iconColor = TYPE_ICON_COLOR[document.type]

  /* ── Mode compact (vue liste dans une page détail) ── */
  if (compact) {
    return (
      <div className="group flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors duration-150">
        <DocumentIcon type={document.type} size={24} className={iconColor} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{document.nom}</p>
          <p className="text-xs text-muted-foreground">
            {formatTaille(document.taille)} • {createdDate}
          </p>
        </div>
        <DocumentBadge type={document.type} />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions pour ${document.nom}`}
            className="lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
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
            {hasVersions && onViewVersions && (
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
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  /* ── Mode grille (vue principale) ── */
  return (
    <div className="group bg-white rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">

      {/* Barre couleur type */}
      <div className={`h-1 w-full ${topBar}`} />

      {/* Header : icône + nom + dropdown */}
      <div className="flex items-start gap-3 p-5 pb-3">
        <div className="flex-shrink-0 mt-0.5">
          <DocumentIcon type={document.type} size={36} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug truncate text-foreground">
            {document.nom}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {document.nomOriginal}
          </p>
          {/* Badges type + phase + version */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <DocumentBadge type={document.type} />
            {document.phase && <DocumentBadge phase={document.phase} />}
            {hasVersions && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                v{document.version}
              </Badge>
            )}
          </div>
        </div>
        {/* Dropdown secondaire (supprimer / versions) */}
        {(onDelete || (hasVersions && onViewVersions)) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions pour ${document.nom}`}
              className="lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100 flex-shrink-0"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hasVersions && onViewVersions && (
                <DropdownMenuItem onClick={() => onViewVersions(document)}>
                  <History className="mr-2 h-4 w-4" />
                  Versions ({document.version})
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  {hasVersions && onViewVersions && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() => onDelete(document)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Corps : description + métadonnées + tags */}
      <div className="px-5 pb-4 flex-1 space-y-2">
        {document.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {document.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTaille(document.taille)}</span>
          <span>·</span>
          <span>{createdDate}</span>
          {document.dateValidite && (
            <>
              <span>·</span>
              <span className="text-amber-600">
                Valide jusqu'au {format(new Date(document.dateValidite), 'dd/MM/yy', { locale: fr })}
              </span>
            </>
          )}
        </div>

        {document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {document.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {(onPreview || onDownload) && (
        <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 bg-gray-50/50">
          {onPreview && (
            <button
              onClick={() => onPreview(document)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-stam-accent hover:text-stam-accent/80 py-1.5 px-3 rounded-lg hover:bg-blue-50 transition-colors duration-150"
            >
              <Eye className="h-3.5 w-3.5" />
              Prévisualiser
            </button>
          )}
          {onPreview && onDownload && <div className="w-px h-4 bg-gray-200" />}
          {onDownload && (
            <button
              onClick={() => onDownload(document)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-lg hover:bg-gray-100 transition-colors duration-150"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger
            </button>
          )}
        </div>
      )}
    </div>
  )
}
