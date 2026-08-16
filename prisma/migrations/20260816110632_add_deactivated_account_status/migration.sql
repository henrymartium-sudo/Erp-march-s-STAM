-- Ajout du statut DEACTIVATED : permet à un ADMIN de désactiver un compte ACTIVE.
-- Transition réversible (contrairement à REJECTED, qui ne s'applique qu'aux
-- demandes d'accès PENDING et reste définitive) — cf. reactivateUser().

ALTER TYPE "AccountStatus" ADD VALUE 'DEACTIVATED';
