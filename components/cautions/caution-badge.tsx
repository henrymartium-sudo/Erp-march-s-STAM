import { Badge } from '@/components/ui/badge';
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

  const colorClass = isType
    ? TYPE_CAUTION_COLORS[value as TypeCaution]
    : STATUT_CAUTION_COLORS[value as StatutCaution];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        colorClass,
        sizeClasses[size],
        'font-medium',
        className
      )}
    >
      {label}
    </Badge>
  );
}
