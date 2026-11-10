import type { ResultatLot, StatutMarche, StatutOpportunite, StatutPiece } from '@prisma/client'

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

/** Un lot rattaché à un marché est figé : son résultat, ses véhicules et son montant ne se modifient plus. */
export function lotEstFige(lot: { marcheId: string | null }): boolean {
  return lot.marcheId !== null
}

/**
 * Marché converti en opportunité : il existait avant elle (lié dès la création, quel que soit son statut actuel).
 * La création de marché depuis les lots reste refusée pour lui et ses lots ne sont pas figés.
 */
export function marchePreexistant(opportunite: { createdAt: Date; marche: { createdAt: Date } | null }): boolean {
  return opportunite.marche !== null && opportunite.marche.createdAt <= opportunite.createdAt
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

/** Les véhicules d'un lot se modifient de la préparation à l'attribution, tant que le lot n'est pas rattaché à un marché. */
export function vehiculesModifiables(statut: StatutOpportunite, lot: { marcheId: string | null }): boolean {
  return STATUTS_EDITION_VEHICULES.includes(statut) && !lotEstFige(lot)
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

type MarcheLu = { id: string; numero: string; montant: unknown }

/**
 * Tous les marchés d'une opportunité : ceux créés depuis elle (`marches`) et le marché désigné par
 * `Opportunite.marcheId` (`marche`, seul présent pour un marché préexistant), sans doublon.
 * Renvoie les numéros joints par « , » et la somme des montants ; null si aucun marché.
 */
export function resumerMarchesOpportunite(opp: {
  marche: MarcheLu | null
  marches: MarcheLu[]
}): { numeros: string; montant: number } | null {
  const tous = [...opp.marches, ...(opp.marche && !opp.marches.some((m) => m.id === opp.marche?.id) ? [opp.marche] : [])]
  if (tous.length === 0) return null
  return {
    numeros: tous.map((m) => m.numero).join(', '),
    montant: tous.reduce((somme, m) => somme + Number(m.montant ?? 0), 0),
  }
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

export type LotMarche = {
  id: string
  numero: number
  resultat: ResultatLot
  montantPropose: unknown
  marcheId: string | null
}

/** Lots qu'un nouveau marché peut reprendre : gagnés et pas encore rattachés à un marché. */
export function lotsRattachables<T extends LotMarche>(lots: T[]): T[] {
  return lots.filter((l) => l.resultat === 'GAGNE' && l.marcheId === null)
}

/** Message de refus d'une sélection de lots pour un nouveau marché, ou null si elle est valide. */
export function validerSelectionLots(lotIds: string[], lots: LotMarche[]): string | null {
  if (lotIds.length === 0) return 'Sélectionnez au moins un lot gagné.'
  if (new Set(lotIds).size !== lotIds.length) return 'Un lot est sélectionné plusieurs fois.'
  const rattachables = new Set(lotsRattachables(lots).map((l) => l.id))
  const connus = new Set(lots.map((l) => l.id))
  if (lotIds.some((id) => !connus.has(id))) return "Un lot sélectionné n'appartient pas à cette opportunité."
  if (lotIds.some((id) => !rattachables.has(id))) return 'Seuls les lots gagnés et pas encore rattachés à un marché peuvent être sélectionnés.'
  return null
}

/** Objet d'un marché : celui de l'opportunité, suffixé des numéros de lots quand elle en compte plusieurs. */
export function libelleObjetMarche(objetOpportunite: string, numeros: number[], nbLotsTotal: number): string {
  if (nbLotsTotal <= 1) return objetOpportunite
  const tries = [...numeros].sort((a, b) => a - b)
  return `${objetOpportunite} — ${tries.length > 1 ? 'Lots' : 'Lot'} ${tries.join(', ')}`
}

/** Objet et montant du marché regroupant les lots sélectionnés ; null si la sélection est invalide. */
export function preparerMarcheDepuisLots(objet: string, lots: LotMarche[], lotIds: string[]): MarcheDepuisLots | null {
  if (validerSelectionLots(lotIds, lots) !== null) return null
  const choisis = lots.filter((l) => lotIds.includes(l.id))
  return {
    objet: libelleObjetMarche(objet, choisis.map((l) => l.numero), lots.length),
    montant: totalMontantPropose(choisis) ?? 0,
  }
}

/**
 * Retrait d'un lot d'un marché : montant recalculé sur les lots restants. L'objet n'est recalculé que s'il est
 * encore celui qu'on aurait généré ; un objet modifié à la main est conservé. Le numéro du marché n'est jamais touché.
 */
export function calculerRetraitLot(p: {
  objetOpportunite: string
  nbLotsTotal: number
  marche: { objet: string; montant: number }
  lotsDuMarche: LotMarche[]
  lotRetireId: string
}): { refus: string } | { montant: number; objet: string; objetConserve: boolean } {
  if (!p.lotsDuMarche.some((l) => l.id === p.lotRetireId)) return { refus: "Ce lot n'appartient pas à ce marché." }
  const restants = p.lotsDuMarche.filter((l) => l.id !== p.lotRetireId)
  if (restants.length === 0) {
    return { refus: 'Impossible de retirer le dernier lot : supprimez le marché à la place.' }
  }
  const objetGenere = libelleObjetMarche(p.objetOpportunite, p.lotsDuMarche.map((l) => l.numero), p.nbLotsTotal)
  const objetConserve = p.marche.objet !== objetGenere
  return {
    montant: totalMontantPropose(restants) ?? 0,
    objet: objetConserve ? p.marche.objet : libelleObjetMarche(p.objetOpportunite, restants.map((l) => l.numero), p.nbLotsTotal),
    objetConserve,
  }
}

/** Statuts de marché dans lesquels un lot peut encore en être retiré (design D7). */
const STATUTS_RETRAIT_LOT: StatutMarche[] = ['ATTRIBUE_DEFINITIVEMENT', 'EN_ATTENTE_LIVRAISON_OS']

/** Message de refus du retrait d'un lot (facture ou statut avancé), ou null s'il est autorisé. */
export function retraitMarcheAutorise(marche: { statut: StatutMarche; nbFactures: number }): string | null {
  if (marche.nbFactures > 0) return 'Ce marché a des factures : le retrait d’un lot est refusé.'
  if (!STATUTS_RETRAIT_LOT.includes(marche.statut)) {
    return "Le marché a dépassé l'attente d'ordre de service : le retrait d'un lot est refusé."
  }
  return null
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
