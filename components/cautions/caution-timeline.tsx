'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CautionBadge } from './caution-badge';
import {
  formatDateCourte,
  formatMontant,
  getNiveauAlerte,
  getCouleurNiveauAlerte,
  getJoursRestants,
  comparerParEcheance,
} from '@/lib/utils/caution';
import { cn } from '@/lib/utils';
import { Calendar, AlertCircle } from 'lucide-react';
import { format, startOfMonth, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SerializedCaution } from '@/types/serialized';
import Link from 'next/link';

interface CautionTimelineProps {
  cautions: SerializedCaution[];
  className?: string;
  maxItems?: number;
}

interface GroupedCaution {
  month: Date;
  cautions: Array<
    SerializedCaution & {
      marche?: {
        id: string;
        numero: string;
        objet: string;
      };
    }
  >;
}

/**
 * Timeline visuelle des échéances de cautions
 * Affiche les cautions groupées par mois sur un axe temporel
 */
export function CautionTimeline({
  cautions,
  className,
  maxItems = 10,
}: CautionTimelineProps) {
  // Grouper les cautions par mois
  const groupedCautions = useMemo(() => {
    // Trier par date d'échéance (les dates sont des strings ISO)
    const sorted = [...cautions].sort((a, b) =>
      new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime()
    );

    // Limiter le nombre d'items
    const limited = sorted.slice(0, maxItems);

    // Grouper par mois
    const groups: GroupedCaution[] = [];
    limited.forEach((caution) => {
      const month = startOfMonth(new Date(caution.dateEcheance));
      const existingGroup = groups.find((g) =>
        isSameMonth(g.month, month)
      );

      if (existingGroup) {
        existingGroup.cautions.push(caution);
      } else {
        groups.push({
          month,
          cautions: [caution],
        });
      }
    });

    return groups;
  }, [cautions, maxItems]);

  const today = new Date();

  if (cautions.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Aucune caution à afficher</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>
          Affichage des {Math.min(cautions.length, maxItems)} prochaines échéances
          {cautions.length > maxItems && ` sur ${cautions.length} cautions`}
        </span>
      </div>

      <div className="relative">
        {/* Ligne verticale de la timeline */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-8">
          {groupedCautions.map((group, groupIndex) => {
            const isCurrentMonth = isSameMonth(group.month, today);

            return (
              <div key={groupIndex} className="relative pl-12">
                {/* Point sur la timeline */}
                <div
                  className={cn(
                    'absolute left-2 top-1 h-5 w-5 rounded-full border-4 bg-background',
                    isCurrentMonth
                      ? 'border-primary'
                      : 'border-muted-foreground'
                  )}
                />

                {/* Mois */}
                <div className="mb-3">
                  <h3 className={cn(
                    'font-semibold text-lg',
                    isCurrentMonth && 'text-primary'
                  )}>
                    {format(group.month, 'MMMM yyyy', { locale: fr })}
                  </h3>
                  {isCurrentMonth && (
                    <Badge variant="outline" className="mt-1">
                      Mois en cours
                    </Badge>
                  )}
                </div>

                {/* Cautions du mois */}
                <div className="space-y-3">
                  {group.cautions.map((caution) => {
                    const dateEcheance = new Date(caution.dateEcheance);
                    const joursRestants = getJoursRestants(dateEcheance);
                    const niveauAlerte = getNiveauAlerte(
                      caution.statut,
                      dateEcheance
                    );
                    const couleurAlerte = getCouleurNiveauAlerte(niveauAlerte);
                    const montantNumber = caution.montant;

                    return (
                      <TooltipProvider key={caution.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/cautions/${caution.id}`}>
                              <Card
                                className={cn(
                                  'p-4 cursor-pointer transition-all hover:shadow-md',
                                  niveauAlerte === 'CRITIQUE' &&
                                    'border-red-500 border-2',
                                  niveauAlerte === 'ATTENTION' &&
                                    'border-orange-400'
                                )}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <CautionBadge
                                        variant="type"
                                        value={caution.type}
                                        size="sm"
                                      />
                                      <CautionBadge
                                        variant="statut"
                                        value={caution.statut}
                                        size="sm"
                                      />
                                    </div>

                                    <p className="font-medium">
                                      {caution.reference || 'Sans numéro'}
                                    </p>

                                    <p className="text-sm text-muted-foreground">
                                      {caution.banqueNom}
                                    </p>

                                    {caution.marche && (
                                      <p className="text-xs text-muted-foreground">
                                        {caution.marche.numero}
                                      </p>
                                    )}
                                  </div>

                                  <div className="text-right space-y-1">
                                    <p className="font-semibold">
                                      {formatMontant(montantNumber)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDateCourte(caution.dateEcheance)}
                                    </p>
                                    {niveauAlerte !== 'AUCUN' && (
                                      <div
                                        className={cn(
                                          'flex items-center gap-1 justify-end',
                                          couleurAlerte
                                        )}
                                      >
                                        <AlertCircle className="h-3 w-3" />
                                        <span className="text-xs font-medium">
                                          {joursRestants > 0
                                            ? `${joursRestants}j`
                                            : 'Expirée'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-medium">
                                {caution.reference || 'Sans numéro'}
                              </p>
                              {caution.marche && (
                                <p className="text-sm">
                                  {caution.marche.objet}
                                </p>
                              )}
                              <p className="text-sm">
                                Échéance: {formatDateCourte(caution.dateEcheance)}
                              </p>
                              {joursRestants > 0 && (
                                <p className="text-sm">
                                  Dans {joursRestants} jour{joursRestants > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cautions.length > maxItems && (
        <div className="text-center">
          <Link
            href="/cautions"
            className="text-sm text-primary hover:underline"
          >
            Voir toutes les cautions ({cautions.length})
          </Link>
        </div>
      )}
    </div>
  );
}
