import type { ResultatLot, StatutOpportunite, StatutPiece } from '@prisma/client'

export type EtatDossier = 'EN_PREPARATION' | 'SOUMIS' | 'CLOS' | 'AUCUN'

/** Statuts de l'opportunité dans lesquels les lots se créent, se modifient et se suppriment. */
export const STATUTS_EDITION_LOTS: StatutOpportunite[] = ['EN_ANALYSE', 'GO', 'DOSSIER_EN_PREPARATION']

/** Statuts de l'opportunité dans lesquels le résultat d'un lot peut être saisi. */
export const STATUTS_SAISIE_RESULTAT: StatutOpportunite[] = [
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
  'PERDUE',
]

/**
 * Les résultats des lots ne se modifient plus quand le marché lié a été créé depuis les lots : il est alors postérieur
 * à l'opportunité et reprend ses lots gagnés. Un marché converti en opportunité existait avant elle (lié dès la
 * création, quel que soit son statut actuel) : il ne fige rien.
 */
export function resultatsLotsFiges(opportunite: { createdAt: Date; marche: { createdAt: Date } | null }): boolean {
  return opportunite.marche !== null && opportunite.marche.createdAt > opportunite.createdAt
}

/** Statuts de l'opportunité dans lesquels les véhicules proposés d'un lot se saisissent (design §5). */
export const STATUTS_EDITION_VEHICULES: StatutOpportunite[] = [
  'DOSSIER_EN_PREPARATION',
  'OFFRE_SOUMISE',
  'SOUMISE',
  'EN_ATTENTE_ATTRIBUTION',
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
]

/** Les véhicules se modifient de la préparation à l'attribution, jusqu'à la création du marché depuis les lots. */
export function vehiculesModifiables(opportunite: {
  statut: StatutOpportunite
  createdAt: Date
  marche: { createdAt: Date } | null
}): boolean {
  return STATUTS_EDITION_VEHICULES.includes(opportunite.statut) && !resultatsLotsFiges(opportunite)
}

/** Total d'une ligne en centimes entiers, pour éviter la dérive des flottants. */
export function totalLigneVehicule(v: { quantite: number; prixUnitaire: number }): number {
  return (Math.round(v.prixUnitaire * 100) * v.quantite) / 100
}

/** Montant proposé d'un lot déduit de ses véhicules ; null s'il n'y en a aucun. */
export function calculerMontantVehicules(vehicules: { quantite: number; prixUnitaire: number }[]): number | null {
  if (vehicules.length === 0) return null
  const centimes = vehicules.reduce((somme, v) => somme + Math.round(v.prixUnitaire * 100) * v.quantite, 0)
  return centimes / 100
}

/** Statuts de l'opportunité qui ne se fixent plus à la main mais via les résultats des lots. */
export const STATUTS_PILOTES_PAR_LOTS: StatutOpportunite[] = [
  'ATTRIBUE_PROVISOIREMENT',
  'GAGNEE',
  'PERDUE',
]

/** Statut de l'opportunité déduit des résultats de ses lots (design §5). */
export function agregerStatutOpportunite(resultats: ResultatLot[]): StatutOpportunite | null {
  if (resultats.length === 0) return null
  if (resultats.includes('GAGNE')) return 'GAGNEE'
  if (resultats.includes('ATTRIBUE_PROVISOIREMENT')) return 'ATTRIBUE_PROVISOIREMENT'
  if (resultats.includes('EN_COURS')) return 'EN_ATTENTE_ATTRIBUTION'
  return 'PERDUE'
}

/** État d'un dossier, dérivé du statut de son opportunité (design §4). */
export function deriverEtatDossier(statut: StatutOpportunite): EtatDossier {
  switch (statut) {
    case 'DOSSIER_EN_PREPARATION':
      return 'EN_PREPARATION'
    case 'OFFRE_SOUMISE':
    case 'SOUMISE':
    case 'EN_ATTENTE_ATTRIBUTION':
      return 'SOUMIS'
    case 'ATTRIBUE_PROVISOIREMENT':
    case 'GAGNEE':
    case 'PERDUE':
      return 'CLOS'
    default:
      return 'AUCUN'
  }
}

export function piecesModifiables(statut: StatutOpportunite): boolean {
  return deriverEtatDossier(statut) === 'EN_PREPARATION'
}

export function calculerProgression(pieces: { statut: StatutPiece }[]): number {
  if (pieces.length === 0) return 0
  const faites = pieces.filter((p) => p.statut === 'COMPLET' || p.statut === 'VALIDE').length
  return Math.round((faites / pieces.length) * 100)
}

export interface AvancementLots {
  nbLots: number
  /** Moyenne des progressions des dossiers, arrondie ; null tant qu'aucun lot n'a de dossier. */
  progressionMoyenne: number | null
}

/**
 * Résumé des lots affiché dans la liste des opportunités : nombre de lots et progression moyenne des dossiers.
 * La moyenne porte sur tous les lots — un lot sans dossier compte pour 0, comme la barre par lot de la fiche.
 */
export function calculerAvancementLots(lots: { dossier: { progression: number } | null }[]): AvancementLots {
  const nbLots = lots.length
  if (!lots.some((l) => l.dossier)) return { nbLots, progressionMoyenne: null }
  const somme = lots.reduce((total, l) => total + (l.dossier?.progression ?? 0), 0)
  return { nbLots, progressionMoyenne: Math.round(somme / nbLots) }
}

/** Numéro proposé à la création d'un lot : le plus grand numéro existant + 1 (1 s'il n'y a pas de lot). */
export function prochainNumeroLot(numeros: number[]): number {
  return numeros.length === 0 ? 1 : Math.max(...numeros) + 1
}

export interface TotauxLots {
  nbLots: number
  nbGagnes: number
  totalEstime: number
  totalPropose: number
}

/** Agrégats affichés sur la fiche : nombre de lots, lots gagnés, totaux des montants estimé et proposé. */
export function calculerTotauxLots(
  lots: { montantEstime: number | null; montantPropose: number | null; resultat: ResultatLot }[]
): TotauxLots {
  return {
    nbLots: lots.length,
    nbGagnes: lots.filter((l) => l.resultat === 'GAGNE').length,
    totalEstime: lots.reduce((somme, l) => somme + (l.montantEstime ?? 0), 0),
    totalPropose: lots.reduce((somme, l) => somme + (l.montantPropose ?? 0), 0),
  }
}

/** Somme des montants proposés des lots ; null si aucun lot n'a de montant. */
export function totalMontantPropose(lots: { montantPropose: unknown }[]): number | null {
  const montants = lots.filter((l) => l.montantPropose != null)
  if (montants.length === 0) return null
  return montants.reduce((somme, l) => somme + Number(l.montantPropose), 0)
}

/** Numéros (croissants) des lots dont le montant proposé n'est pas renseigné. */
export function lotsSansMontantPropose(lots: { numero: number; montantPropose: unknown }[]): number[] {
  return lots
    .filter((l) => l.montantPropose == null)
    .map((l) => l.numero)
    .sort((a, b) => a - b)
}

/** Message de refus de la soumission de l'offre quand des lots n'ont pas de montant proposé. */
export function messageMontantsLotsManquants(numeros: number[]): string {
  return `Renseignez le montant proposé de chaque lot avant de soumettre l'offre : ${numeros.length > 1 ? 'lots' : 'lot'} n° ${numeros.join(', ')}.`
}

export interface MarcheDepuisLots {
  objet: string
  montant: number
}

/** Objet et montant du marché unique regroupant les lots gagnés ; null s'il n'y a aucun lot gagné. */
export function preparerMarcheDepuisLots(
  objet: string,
  lots: { numero: number; resultat: ResultatLot; montantPropose: unknown }[]
): MarcheDepuisLots | null {
  const gagnes = lots.filter((l) => l.resultat === 'GAGNE')
  if (gagnes.length === 0) return null
  const numeros = gagnes.map((l) => l.numero).sort((a, b) => a - b)
  return {
    objet: lots.length > 1 ? `${objet} — Lots ${numeros.join(', ')}` : objet,
    montant: totalMontantPropose(gagnes) ?? 0,
  }
}

export interface StatsLots {
  total: number
  gagnes: number
  perdus: number
  infructueux: number
  enCours: number
  tauxReussite: number
}

/** Décompte des résultats de lots ; l'infructueux est compté à part, hors du taux de réussite (gagnés / (gagnés + perdus)). */
export function calculerStatsResultatsLots(resultats: ResultatLot[]): StatsLots {
  const gagnes = resultats.filter((r) => r === 'GAGNE').length
  const perdus = resultats.filter((r) => r === 'PERDU').length
  const infructueux = resultats.filter((r) => r === 'INFRUCTUEUX').length
  const enCours = resultats.filter((r) => r === 'EN_COURS' || r === 'ATTRIBUE_PROVISOIREMENT').length
  const tauxReussite = gagnes + perdus > 0 ? Math.round((gagnes / (gagnes + perdus)) * 100) : 0
  return { total: resultats.length, gagnes, perdus, infructueux, enCours, tauxReussite }
}
