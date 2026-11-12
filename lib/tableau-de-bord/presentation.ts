/**
 * Décisions de présentation de la page d'accueil — fonctions pures, sans accès base ni NextAuth
 * (`lib/utils/permissions.ts` ne se charge pas en test unitaire, voir `droits.ts`).
 * Aucune règle de calcul ici : les règles et les états restent ceux de `lib/tableau-de-bord/`.
 */

import type { LigneATraiter, NatureEcheance, ResultatATraiter } from './a-traiter'
import { joursDepuis, type Horizon } from './dates'
import type { EtatVoyant } from './voyants'

export type Vue = 'tout' | 'passation' | 'exec'

const MS_JOUR = 24 * 60 * 60 * 1000

/** Vue demandée dans l'adresse (`?vue=`). EXPLOITATION n'a que l'exécution, quoi qu'on demande. */
export function parseVue(param: string | string[] | undefined, role: string | null | undefined): Vue {
  if (role === 'EXPLOITATION') return 'exec'
  const valeur = Array.isArray(param) ? param[0] : param
  if (valeur === 'passation') return 'passation'
  if (valeur === 'execution') return 'exec'
  return 'tout'
}

/** Valeur du paramètre `vue` pour une vue ; undefined pour « tout » (adresse sans paramètre). */
export function paramVue(v: Vue): string | undefined {
  if (v === 'passation') return 'passation'
  if (v === 'exec') return 'execution'
  return undefined
}

/** Garde les lignes et les données manquantes du domaine de la vue. */
export function filtrerATraiter(r: ResultatATraiter, vue: Vue): ResultatATraiter {
  if (vue === 'tout') return r
  const domaine = vue === 'exec' ? 'exec' : 'passation'
  const m = r.manquants
  return {
    lignes: r.lignes.filter((l) => l.domaine === domaine),
    manquants: vue === 'exec'
      ? { opportunitesSansDateDepot: [], marchesSansDateLivraison: m.marchesSansDateLivraison, marchesEnExecutionSansFin: m.marchesEnExecutionSansFin, facturesSansDate: m.facturesSansDate }
      : { opportunitesSansDateDepot: m.opportunitesSansDateDepot, marchesSansDateLivraison: [], marchesEnExecutionSansFin: [], facturesSansDate: [] },
  }
}

export function compteursHorizon(lignes: LigneATraiter[]): {
  retard: number; semaine: number; mois: number; sansRattrapage: Record<Horizon, number>
} {
  const c = { retard: 0, semaine: 0, mois: 0, sansRattrapage: { retard: 0, semaine: 0, mois: 0 } }
  for (const l of lignes) {
    c[l.horizon] += 1
    if (l.sansRattrapage) c.sansRattrapage[l.horizon] += 1
  }
  return c
}

export function libelleDelai(echeance: Date, aujourdHui: Date): string {
  const jours = joursDepuis(echeance, aujourdHui)
  if (jours > 0) return `Échue depuis ${jours} j`
  if (jours === 0) return "Aujourd'hui"
  return `J-${-jours}`
}

export const VERBES_ACTION: Record<NatureEcheance, string> = {
  DEPOT_OFFRE: 'Finaliser le dossier',
  FIN_VALIDITE_OFFRE: 'Proroger ou classer',
  ATTRIBUTION_PROVISOIRE: 'Suivre',
  LIVRAISON_EN_RETARD: 'Mettre à jour la livraison',
  FIN_EXECUTION_PROCHE: 'Préparer la réception',
  RECEPTION_DEFINITIVE: "Relancer l'autorité",
  GARANTIES_A_LIBERER: 'Demander la mainlevée',
  CAUTION_A_LIBERER: 'Demander la mainlevée',
  CAUTION_A_RENOUVELER: 'Renouveler',
  FACTURE_ECHUE: 'Relancer',
}

type NomVoyant = 'encaissements' | 'cautions' | 'resteAFacturer' | 'tauxSucces' | 'depots'

export function voyantsVisibles(vue: Vue): Record<NomVoyant, boolean> {
  const exec = vue !== 'passation'
  const passation = vue !== 'exec'
  return { encaissements: exec, cautions: exec, resteAFacturer: exec, tauxSucces: passation, depots: passation }
}

export function pipelineVisible(vue: Vue): boolean {
  return vue !== 'exec'
}

/**
 * Liste existante la plus proche de chaque voyant (choix 1 du plan : surensembles, aucun filtre nouveau).
 * Le taux de succès mène à /pilotage, réservé à ADMIN et AVANCE : pas de lien pour les autres.
 */
export function lienVoyant(nom: NomVoyant, role: string | null | undefined, aujourdHui: Date): string | null {
  switch (nom) {
    case 'encaissements': return '/factures'
    case 'resteAFacturer': return '/marches'
    case 'cautions': {
      const jour = new Date(Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth(), aujourdHui.getUTCDate()) + 30 * MS_JOUR)
      return `/cautions?dateEcheanceFin=${jour.toISOString().slice(0, 10)}`
    }
    case 'depots': return '/opportunites?echeance=a-venir'
    case 'tauxSucces': return role === 'ADMIN' || role === 'AVANCE' ? '/pilotage' : null
  }
}

export const SEUILS_EN_CLAIR: Record<NomVoyant, string> = {
  encaissements: 'Orange dès 20 % en retard, rouge dès 40 % ou une facture en retard de plus de 45 j',
  resteAFacturer: 'Orange si un reste à facturer date de plus de 15 j après la réception, rouge au-delà de 30 j',
  cautions: "Orange sous 30 j, rouge sous 7 j avant l'échéance",
  depots: 'Dépôts des 14 prochains jours ; rouge sans dossier ou à 3 j ou moins avec pièces manquantes',
  tauxSucces: 'Orange dès 10 points sous la moyenne de 24 mois, rouge dès 20 points ; gris sous 5 résultats',
}

export const ETATS_VOYANT: Record<EtatVoyant, string> = {
  vert: 'Correct',
  ambre: 'À surveiller',
  rouge: 'Urgent',
  gris: 'Pas assez de données',
}
