'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CautionBadge } from './caution-badge';
import {
  formatMontant,
  formatDateCourte,
  getJoursRestants,
  getNiveauAlerte,
  getCouleurNiveauAlerte,
  getMessageAlerte,
} from '@/lib/utils/caution';
import { Eye, Pencil, Trash2, MoreVertical, Building2, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Caution } from '@prisma/client';
import Link from 'next/link';

interface CautionCardProps {
  caution: Caution & {
    marche?: {
      id: string;
      numero: string;
      objet: string;
    };
  };
  mode?: 'compact' | 'normal';
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

/**
 * Card d'affichage d'une caution avec actions rapides
 * Affiche le type, statut, montant, organisme, échéance et niveau d'alerte
 */
export function CautionCard({
  caution,
  mode = 'normal',
  onEdit,
  onDelete,
  className,
}: CautionCardProps) {
  const joursRestants = getJoursRestants(caution.dateEcheance);
  const niveauAlerte = getNiveauAlerte(caution.statut, caution.dateEcheance);
  const couleurAlerte = getCouleurNiveauAlerte(niveauAlerte);
  const messageAlerte = getMessageAlerte(niveauAlerte, joursRestants);

  // Convertir Prisma.Decimal en number
  const montantNumber = typeof caution.montant === 'number'
    ? caution.montant
    : caution.montant.toNumber();

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      niveauAlerte === 'CRITIQUE' && 'border-red-500 border-2',
      niveauAlerte === 'ATTENTION' && 'border-orange-400',
      className
    )}>
      <CardHeader className={mode === 'compact' ? 'pb-3' : undefined}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <CautionBadge variant="type" value={caution.type} size="sm" />
            <CautionBadge variant="statut" value={caution.statut} size="sm" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/cautions/${caution.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Voir détails
                </Link>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(caution.id)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(caution.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardTitle className="text-lg">
          {caution.reference || 'Sans référence'}
        </CardTitle>

        {mode === 'normal' && caution.marche && (
          <CardDescription className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            <Link
              href={`/marches/${caution.marche.id}`}
              className="hover:underline"
            >
              {caution.marche.numero} - {caution.marche.objet}
            </Link>
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className={mode === 'compact' ? 'py-3' : undefined}>
        <div className="space-y-2">
          {/* Montant */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Montant</span>
            <span className="font-semibold text-lg">
              {formatMontant(montantNumber)}
            </span>
          </div>

          {/* Banque */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Banque</span>
            <span className="text-sm font-medium">
              {caution.banqueNom}
            </span>
          </div>

          {/* Date échéance */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Échéance
            </span>
            <span className="text-sm font-medium">
              {formatDateCourte(caution.dateEcheance)}
            </span>
          </div>

          {/* Alerte */}
          {niveauAlerte !== 'AUCUN' && (
            <div className={cn(
              'flex items-center gap-2 p-2 rounded-md border',
              niveauAlerte === 'CRITIQUE' && 'bg-red-50 border-red-200',
              niveauAlerte === 'ATTENTION' && 'bg-orange-50 border-orange-200',
              niveauAlerte === 'INFO' && 'bg-yellow-50 border-yellow-200',
              niveauAlerte === 'EXPIRE' && 'bg-gray-50 border-gray-200'
            )}>
              <AlertCircle className={cn('h-4 w-4', couleurAlerte)} />
              <span className={cn('text-sm font-medium', couleurAlerte)}>
                {messageAlerte}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {mode === 'normal' && (
        <CardFooter className="pt-0">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/cautions/${caution.id}`}>
              Voir détails
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
