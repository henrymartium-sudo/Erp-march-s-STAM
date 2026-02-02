'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DocumentIcon } from './document-icon'
import { DocumentBadge } from './document-badge'
import { formatTaille } from '@/lib/utils/document'
import { Download, Eye, Trash2, MoreVertical, History } from 'lucide-react'
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
import { cn } from '@/lib/utils'

interface DocumentCardProps {
  document: Document
  onPreview?: (document: Document) => void
  onDownload?: (document: Document) => void
  onDelete?: (document: Document) => void
  onViewVersions?: (document: Document) => void
  compact?: boolean
}

/**
 * Card d'affichage d'un document avec actions rapides
 */
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

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors">
        <DocumentIcon type={document.type} size={24} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{document.nom}</p>
          <p className="text-sm text-muted-foreground">
            {formatTaille(document.taille)} • {createdDate}
          </p>
        </div>
        <DocumentBadge type={document.type} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
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
                  className="text-destructive"
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <DocumentIcon type={document.type} size={32} />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{document.nom}</CardTitle>
              <CardDescription className="truncate">
                {document.nomOriginal}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
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
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <DocumentBadge type={document.type} />
            {document.phase && <DocumentBadge phase={document.phase} />}
            {hasVersions && (
              <Badge variant="outline">v{document.version}</Badge>
            )}
          </div>

          {/* Description */}
          {document.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {document.description}
            </p>
          )}

          {/* Métadonnées */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{formatTaille(document.taille)}</span>
            <span>•</span>
            <span>{createdDate}</span>
            {document.dateValidite && (
              <>
                <span>•</span>
                <span>
                  Valide jusqu'au{' '}
                  {format(new Date(document.dateValidite), 'dd/MM/yyyy', { locale: fr })}
                </span>
              </>
            )}
          </div>

          {/* Tags */}
          {document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {document.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions rapides */}
          <div className="flex gap-2 pt-2">
            {onPreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreview(document)}
                className="flex-1"
              >
                <Eye className="mr-2 h-4 w-4" />
                Prévisualiser
              </Button>
            )}
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(document)}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
