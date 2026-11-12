/**
 * Ce que chaque rôle reçoit du tableau de bord, contrôlé côté serveur :
 * - finances (encaissements, reste à facturer, factures échues) et montants : ADMIN et AVANCE seulement
 *   (décision 3 du cadrage ; montants masqués à VISITEUR et EXPLOITATION, décision d'Abel du 2026-11-12) ;
 * - passation (opportunités, pipeline, dépôts, taux de succès) : masquée à EXPLOITATION (même décision).
 *
 * Module pur : `lib/utils/permissions.ts` importe NextAuth et ne se charge pas en test unitaire.
 * La restriction EXPLOITATION reprend donc `getMarcheStatutRestriction` à l'identique.
 */

import type { ResultatATraiter } from './a-traiter'
import type { ResultatPipeline } from './pipeline'

export interface DroitsTableauDeBord { finances: boolean; passation: boolean; restrictionMarche: 'EN_EXECUTION' | undefined }

export function droitsTableauDeBord(role: string | null | undefined): DroitsTableauDeBord {
  return {
    finances: role === 'ADMIN' || role === 'AVANCE',
    passation: role !== 'EXPLOITATION',
    restrictionMarche: role === 'EXPLOITATION' ? 'EN_EXECUTION' : undefined,
  }
}

export function masquerMontantsATraiter(r: ResultatATraiter): ResultatATraiter {
  return { ...r, lignes: r.lignes.map((l) => ({ ...l, montant: null })) }
}

export function masquerMontantsPipeline(p: ResultatPipeline): ResultatPipeline {
  return {
    phases: p.phases.map((ph) => ({ ...ph, montant: null })),
    total: { ...p.total, montant: null },
  }
}
