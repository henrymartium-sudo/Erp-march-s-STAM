import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  TYPE_CAUTION_COLORS,
  STATUT_CAUTION_COLORS,
} from '@/lib/constants/caution';
import {
  getTypeCautionLabel,
  getStatutCautionLabel,
} from '@/lib/utils/caution';
import type { TypeCaution, StatutCaution } from '@prisma/client';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

/**
 * Correspondance entre les couleurs métier déclarées dans lib/constants/caution.ts
 * et les variantes réellement supportées par le composant Badge.
 * Sans cette table, les valeurs ('blue', 'green', ...) étaient injectées telles quelles
 * en className : ni variante Badge valide, ni classe Tailwind existante — donc inertes.
 */
const TYPE_COLOR_TO_VARIANT: Record<
  (typeof TYPE_CAUTION_COLORS)[TypeCaution],
  BadgeVariant
> = {
  blue: 'info',
  green: 'success',
  purple: 'secondary',
  orange: 'warning',
};

const STATUT_COLOR_TO_VARIANT: Record<
  (typeof STATUT_CAUTION_COLORS)[StatutCaution],
  BadgeVariant
> = {
  success: 'success',
  destructive: 'danger',
  warning: 'warning',
  default: 'muted',
};

interface CautionBadgeProps {
  variant: 'type' | 'statut';
  value: TypeCaution | StatutCaution;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Badge d'affichage pour type ou statut de caution
 * Affiche le label traduit avec la couleur appropriée
 */
export function CautionBadge({
  variant,
  value,
  className,
  size = 'md',
}: CautionBadgeProps) {
  const isType = variant === 'type';
  const label = isType
    ? getTypeCautionLabel(value as TypeCaution)
    : getStatutCautionLabel(value as StatutCaution);

  const badgeVariant: BadgeVariant = isType
    ? TYPE_COLOR_TO_VARIANT[TYPE_CAUTION_COLORS[value as TypeCaution]]
    : STATUT_COLOR_TO_VARIANT[STATUT_CAUTION_COLORS[value as StatutCaution]];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge
      variant={badgeVariant}
      className={cn(sizeClasses[size], 'font-medium', className)}
    >
      {label}
    </Badge>
  );
}
