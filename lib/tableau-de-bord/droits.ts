/**
 * Ce que chaque rôle reçoit du tableau de bord. Les finances (encaissements, reste à facturer,
 * factures échues) sont réservées à ADMIN et AVANCE (décision 3 du cadrage), contrôlé côté serveur.
 *
 * Module pur : `lib/utils/permissions.ts` importe NextAuth et ne se charge pas en test unitaire.
 * La restriction EXPLOITATION reprend donc `getMarcheStatutRestriction` à l'identique.
 */

export interface DroitsTableauDeBord { finances: boolean; restrictionMarche: 'EN_EXECUTION' | undefined }

export function droitsTableauDeBord(role: string | null | undefined): DroitsTableauDeBord {
  return {
    finances: role === 'ADMIN' || role === 'AVANCE',
    restrictionMarche: role === 'EXPLOITATION' ? 'EN_EXECUTION' : undefined,
  }
}
