'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CautionBadge } from './caution-badge';
import { formatMontant } from '@/lib/utils/format';
import {
  formatDate,
  formatDateCourte,
  getJoursRestants,
  getDureeCaution,
  getNiveauAlerte,
  getCouleurNiveauAlerte,
  getMessageAlerte,
  formatDureeRestante,
} from '@/lib/utils/caution';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Building2,
  Clock,
  User,
  Pencil,
  Trash2,
  ExternalLink,
  AlertCircle,
  CreditCard,
  Phone,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

interface CautionDetailProps {
  caution: {
    id: string;
    reference: string;
    type: any;
    montant: number | { toNumber: () => number };
    dateEmission: Date | string;
    dateEcheance: Date | string;
    statut: any;
    banqueNom: string;
    banqueContact: string | null;
    marcheId: string;
    userId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    marche?: {
      id: string;
      numero: string;
      objet: string;
      montant: number | { toNumber: () => number };
    };
    user?: {
      id: string;
      nom: string;
      prenom: string;
    };
  };
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  className?: string;
}

/**
 * Vue détaillée d'une caution
 * Affiche toutes les informations et métadonnées
 */
export function CautionDetail({
  caution,
  onEdit,
  onDelete,
  showActions = true,
  className,
}: CautionDetailProps) {
  // Les dates peuvent être des Date ou des strings ISO (après sérialisation RSC)
  const dateEcheance = typeof caution.dateEcheance === 'string'
    ? new Date(caution.dateEcheance)
    : caution.dateEcheance;
  const dateEmission = typeof caution.dateEmission === 'string'
    ? new Date(caution.dateEmission)
    : caution.dateEmission;

  const joursRestants = getJoursRestants(dateEcheance);
  const niveauAlerte = getNiveauAlerte(caution.statut, dateEcheance);
  const couleurAlerte = getCouleurNiveauAlerte(niveauAlerte);
  const messageAlerte = getMessageAlerte(niveauAlerte, joursRestants);
  const dureeTotale = getDureeCaution(dateEmission, dateEcheance);
  const dureeRestante = formatDureeRestante(dateEcheance);

  // Le montant peut être un number ou un Decimal Prisma
  const montantNumber = typeof caution.montant === 'number'
    ? caution.montant
    : Number(caution.montant);

  const montantMarcheNumber = caution.marche
    ? typeof caution.marche.montant === 'number'
      ? caution.marche.montant
      : Number(caution.marche.montant)
    : null;

  const pourcentageMarche = montantMarcheNumber
    ? ((montantNumber / montantMarcheNumber) * 100).toFixed(2)
    : null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* En-tête avec actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <CautionBadge variant="type" value={caution.type} />
                <CautionBadge variant="statut" value={caution.statut} />
              </div>
              <CardTitle className="text-2xl">{caution.reference}</CardTitle>
              {caution.marche && (
                <CardDescription className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <Link
                    href={`/marches/${caution.marche.id}`}
                    className="hover:underline flex items-center gap-1"
                  >
                    {caution.marche.numero} - {caution.marche.objet}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </CardDescription>
              )}
            </div>

            {showActions && (
              <div className="flex gap-2">
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                )}
                {onDelete && (
                  <Button variant="destructive" size="sm" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        {/* Alerte */}
        {niveauAlerte !== 'AUCUN' && (
          <CardContent className="pt-0">
            <Alert
              variant={niveauAlerte === 'CRITIQUE' || niveauAlerte === 'EXPIRE' ? 'destructive' : 'default'}
              className={cn(
                niveauAlerte === 'ATTENTION' && 'border-orange-400 bg-orange-50',
                niveauAlerte === 'INFO' && 'border-yellow-400 bg-yellow-50'
              )}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className={couleurAlerte}>
                <span className="font-semibold">{messageAlerte}</span>
                {joursRestants > 0 && (
                  <span className="ml-2">({dureeRestante})</span>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Informations financières */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Informations financières
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Montant de la caution</p>
              <p className="text-2xl font-bold">{formatMontant(montantNumber)}</p>
            </div>

            {montantMarcheNumber && pourcentageMarche && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pourcentage du marché</p>
                <p className="text-2xl font-bold">{pourcentageMarche}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sur {formatMontant(montantMarcheNumber)}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground mb-1">Banque émettrice</p>
            <p className="font-medium">{caution.banqueNom}</p>
            {caution.banqueContact && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                {caution.banqueContact.includes('@') ? (
                  <Mail className="h-3 w-3" />
                ) : (
                  <Phone className="h-3 w-3" />
                )}
                {caution.banqueContact}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dates et durées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Dates et durées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Date d&apos;émission</p>
              <p className="font-medium">{formatDate(caution.dateEmission)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateCourte(caution.dateEmission)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Date d&apos;échéance</p>
              <p className="font-medium">{formatDate(caution.dateEcheance)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateCourte(caution.dateEcheance)}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Durée totale</p>
              <p className="font-medium">{dureeTotale} jours</p>
              <p className="text-xs text-muted-foreground">
                {Math.floor(dureeTotale / 30)} mois environ
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Jours restants</p>
              {joursRestants > 0 ? (
                <>
                  <p className={cn('font-medium', couleurAlerte)}>
                    {joursRestants} jour{joursRestants > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{dureeRestante}</p>
                </>
              ) : (
                <p className="font-medium text-red-600">Expirée</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Informations système
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Créé le</p>
              <p className="font-medium">{formatDate(caution.createdAt)}</p>
              {caution.user && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <User className="h-3 w-3" />
                  {caution.user.prenom} {caution.user.nom}
                </p>
              )}
            </div>

            <div>
              <p className="text-muted-foreground mb-1">Modifié le</p>
              <p className="font-medium">{formatDate(caution.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
