// Calculs du module Pilotage — fonctions pures, sans accès base (testées en unitaire).

import { STATUTS_ATTRIBUES } from '@/lib/constants/marche'

export type StatutFactureLite = 'BROUILLON' | 'EMISE' | 'EN_ATTENTE' | 'PAYEE' | 'REJETEE' | 'ANNULEE'

export interface Periode { dateDebut: Date; dateFin: Date }

/** Élément signalé, avec le lien vers sa fiche. */
export interface ElementLie { libelle: string; href: string }

export interface MarchePilotage {
  id: string
  numero: string
  objet: string
  statut: string
  montant: number
  /** dateAttributionDefinitive, ou date du passage en statut attribué dans l'historique */
  dateAttribution: Date | null
  dateDepotOffre: Date | null
  /** vrai si le marché a atteint ATTRIBUE_DEFINITIVEMENT ou un statut ultérieur, même s'il a été résilié/annulé ensuite */
  attribueUnJour: boolean
  factures: { statut: StatutFactureLite; montantTTC: number }[]
  /** motif de résiliation / annulation / infructueux renseigné selon le statut */
  motifRenseigne: boolean
  dateFinPrevue: Date | null
  /** vrai si une opportunité est liée au marché (dans un sens ou dans l'autre) */
  aOpportunite: boolean
  /** concurrent gagnant renseigné sur le marché (texte libre), sinon null */
  concurrentGagnant: string | null
  /** date du dernier changement de statut (date propre au statut, sinon dernière ligne d'historique) */
  dateDernierStatut: Date | null
}

export interface ResultatConversion {
  valeurAttribuee: number
  facture: number
  encaisse: number
  perduApresAttribution: number
  nbPerdusApresAttribution: number
  taux: number | null
  tauxEncaisse: number | null
  alerte: boolean
  marches: { id: string; numero: string; objet: string; montant: number; facture: number; perdu: boolean; auDelaContractuel: boolean; recent: boolean }[]
  exclusSansDate: ElementLie[]
}

export const SEUIL_CONVERSION = 30
/** Un marché attribué depuis moins de ce nombre de jours et non encore facturé n'est pas un retard. */
export const JOURS_MARCHE_RECENT = 30
const STATUTS_FACTURES_COMPTEES: StatutFactureLite[] = ['EMISE', 'EN_ATTENTE', 'PAYEE']
const STATUTS_PERDUS = ['RESILIE', 'ANNULE']

/**
 * Vrai si le marché a été attribué un jour. Une résiliation suppose toujours une attribution
 * préalable (règle métier STAM) ; une annulation peut survenir avant : l'historique tranche.
 */
export function estAttribueUnJour(statut: string, dateAttributionDefinitive: Date | null, premierPassage: Date | null): boolean {
  return dateAttributionDefinitive !== null
    || statut === 'RESILIE'
    || (STATUTS_ATTRIBUES as string[]).includes(statut)
    || premierPassage !== null
}

function dansPeriode(d: Date, p: Periode): boolean {
  return d >= p.dateDebut && d <= p.dateFin
}

export function intituleLot(reference: string | null, objet: string | null, numero: number): string {
  const base = reference?.trim() || objet?.trim() || 'Sans intitulé'
  return `${base} — Lot ${numero}`
}

const lienMarche = (m: MarchePilotage): ElementLie => ({ libelle: m.numero, href: `/marches/${m.id}` })
const lienLot = (l: LotPilotage): ElementLie => ({ libelle: l.libelle, href: `/opportunites/${l.opportuniteId}` })

function pourcentage(num: number, den: number): number | null {
  return den > 0 ? Math.round((num / den) * 100) : null
}

export function montantFacture(m: MarchePilotage): number {
  return m.factures
    .filter((f) => STATUTS_FACTURES_COMPTEES.includes(f.statut))
    .reduce((s, f) => s + f.montantTTC, 0)
}

export function calculerConversion(marches: MarchePilotage[], periode: Periode, aujourdHui: Date = new Date()): ResultatConversion {
  const exclusSansDate: ElementLie[] = []
  const retenus: ResultatConversion['marches'] = []
  let valeurAttribuee = 0, facture = 0, encaisse = 0, perduApresAttribution = 0, nbPerdusApresAttribution = 0

  for (const m of marches) {
    if (!m.attribueUnJour) continue
    if (!m.dateAttribution) { exclusSansDate.push(lienMarche(m)); continue }
    if (!dansPeriode(m.dateAttribution, periode)) continue

    const fac = montantFacture(m)
    const perdu = STATUTS_PERDUS.includes(m.statut)
    valeurAttribuee += m.montant
    facture += fac
    encaisse += m.factures.filter((f) => f.statut === 'PAYEE').reduce((s, f) => s + f.montantTTC, 0)
    if (perdu) { perduApresAttribution += m.montant; nbPerdusApresAttribution++ }
    const auDelaContractuel = fac > m.montant * TOLERANCE_FACTURE
    const recent = fac === 0 && (aujourdHui.getTime() - m.dateAttribution.getTime()) <= JOURS_MARCHE_RECENT * 86_400_000
    retenus.push({ id: m.id, numero: m.numero, objet: m.objet, montant: m.montant, facture: fac, perdu, auDelaContractuel, recent })
  }

  const taux = pourcentage(facture, valeurAttribuee)
  return {
    valeurAttribuee, facture, encaisse, perduApresAttribution, nbPerdusApresAttribution,
    taux, tauxEncaisse: pourcentage(encaisse, valeurAttribuee),
    alerte: taux !== null && taux < SEUIL_CONVERSION,
    marches: retenus, exclusSansDate,
  }
}

// ── Issue des offres et écart de prix ─────────────────────────────────────────────────

export interface LotPilotage {
  id: string
  opportuniteId: string
  /** « <référence opportunité> — Lot <n> » pour l'affichage */
  libelle: string
  resultat: 'EN_COURS' | 'ATTRIBUE_PROVISOIREMENT' | 'GAGNE' | 'PERDU' | 'INFRUCTUEUX'
  montantPropose: number | null
  montantOffreConcurrent: number | null
  /** dateLimite de l'opportunité */
  dateDepot: Date | null
  /** opportunité au statut OFFRE_SOUMISE ou ultérieur */
  soumis: boolean
  motifRenseigne: boolean
  autorite: string
  concurrentGagnant: string | null
  /** motif de perte (texte libre) */
  motif: string | null
}

export interface Repartition { nombre: number; valeur: number }

export type IssueLot = 'Gagné' | 'Perdu' | 'Sans suite' | 'En attente'

export interface LigneIssue {
  id: string
  opportuniteId: string
  libelle: string
  autorite: string
  issue: IssueLot
  montantPropose: number | null
  concurrentGagnant: string | null
  montantOffreConcurrent: number | null
  ecartFcfa: number | null
  ecartPct: number | null
  motif: string | null
}

export interface ResultatIssueOffres {
  lotsSoumis: number
  gagnes: Repartition
  perdus: Repartition
  /** lots infructueux : procédure sans suite, hors taux */
  sansSuite: Repartition
  /** lots en cours ou attribués provisoirement : issue inconnue, hors taux */
  enAttente: Repartition
  /** perdus ÷ (gagnés + perdus), sur les seuls dossiers clos */
  tauxPerte: number | null
  /** complément exact du taux de perte (règle « Résultats par lot ») */
  tauxSucces: number | null
  /** vrai si au moins MIN_CAS_ECART dossiers clos : en dessous, le taux n'est pas fiable */
  suffisant: boolean
  exclusSansDate: ElementLie[]
  /** toutes les issues des lots soumis de la période (drill-down) */
  detail: LigneIssue[]
}

export interface ResultatEcartPrix {
  n: number
  ecartMoyen: number | null
  suffisant: boolean
  cas: { id: string; opportuniteId: string; libelle: string; notreOffre: number; offreGagnante: number; ecart: number }[]
}

export const MIN_CAS_ECART = 3

export function calculerIssueOffres(lots: LotPilotage[], periode: Periode): ResultatIssueOffres {
  const exclusSansDate: ElementLie[] = []
  const detail: ResultatIssueOffres['detail'] = []
  const vide = (): Repartition => ({ nombre: 0, valeur: 0 })
  const gagnes = vide(), perdus = vide(), sansSuite = vide(), enAttente = vide()
  let soumis = 0

  for (const l of lots) {
    if (!l.soumis) continue
    if (!l.dateDepot) { exclusSansDate.push(lienLot(l)); continue }
    if (!dansPeriode(l.dateDepot, periode)) continue
    soumis++
    const cible = l.resultat === 'GAGNE' ? gagnes : l.resultat === 'PERDU' ? perdus : l.resultat === 'INFRUCTUEUX' ? sansSuite : enAttente
    cible.nombre++
    cible.valeur += l.montantPropose ?? 0
    const issue: IssueLot = l.resultat === 'GAGNE' ? 'Gagné' : l.resultat === 'PERDU' ? 'Perdu' : l.resultat === 'INFRUCTUEUX' ? 'Sans suite' : 'En attente'
    const ecartCalculable = l.resultat === 'PERDU' && !!l.montantPropose && !!l.montantOffreConcurrent
    detail.push({
      id: l.id, opportuniteId: l.opportuniteId, libelle: l.libelle, autorite: l.autorite, issue,
      montantPropose: l.montantPropose,
      concurrentGagnant: l.concurrentGagnant,
      montantOffreConcurrent: l.montantOffreConcurrent,
      ecartFcfa: ecartCalculable ? l.montantPropose! - l.montantOffreConcurrent! : null,
      ecartPct: ecartCalculable ? Math.round(((l.montantPropose! - l.montantOffreConcurrent!) / l.montantOffreConcurrent!) * 100) : null,
      motif: l.motif,
    })
  }

  const tauxPerte = pourcentage(perdus.nombre, gagnes.nombre + perdus.nombre)
  return {
    lotsSoumis: soumis, gagnes, perdus, sansSuite, enAttente,
    tauxPerte,
    tauxSucces: tauxPerte === null ? null : 100 - tauxPerte,
    suffisant: gagnes.nombre + perdus.nombre >= MIN_CAS_ECART,
    exclusSansDate,
    detail,
  }
}

export function calculerEcartPrix(lots: LotPilotage[], periode: Periode): ResultatEcartPrix {
  const cas: ResultatEcartPrix['cas'] = []
  for (const l of lots) {
    if (!l.soumis || l.resultat !== 'PERDU' || !l.dateDepot || !dansPeriode(l.dateDepot, periode)) continue
    if (!l.montantPropose || !l.montantOffreConcurrent) continue
    const ecart = ((l.montantPropose - l.montantOffreConcurrent) / l.montantOffreConcurrent) * 100
    cas.push({ id: l.id, opportuniteId: l.opportuniteId, libelle: l.libelle, notreOffre: l.montantPropose, offreGagnante: l.montantOffreConcurrent, ecart: Math.round(ecart) })
  }
  const n = cas.length
  const somme = cas.reduce((s, c) => s + ((c.notreOffre - c.offreGagnante) / c.offreGagnante) * 100, 0)
  return { n, ecartMoyen: n > 0 ? Math.round(somme / n) : null, suffisant: n >= MIN_CAS_ECART, cas }
}

// ── Qualité des données ─────────────────────────────────────────────────────

export interface ElementQualite {
  cle: 'SANS_FACTURE' | 'ECHEANCE_DEPASSEE' | 'ECHEC_SANS_MOTIF' | 'SANS_DATE' | 'FACTURE_SUPERIEURE' | 'SANS_OPPORTUNITE' | 'STATUT_CONCURRENT_INCOHERENT'
  libelle: string
  elements: ElementLie[]
}

export const TOLERANCE_FACTURE = 1.02
const STATUTS_DEVANT_ETRE_FACTURES = ['EN_EXECUTION', 'EXECUTE_ATTENTE_GARANTIES', 'CLOTURE']
const STATUTS_EN_COURS_EXECUTION = ['ATTRIBUE_DEFINITIVEMENT', 'EN_ATTENTE_LIVRAISON_OS', 'EN_EXECUTION']
const STATUTS_ECHEC_MARCHE = ['ANNULE', 'RESILIE', 'INFRUCTUEUX']
const STATUTS_AVANT_DEPOT = ['OPPORTUNITE_IDENTIFIEE', 'DOSSIER_EN_PREPARATION']

// ── Marchés historiques (sans opportunité liée), présentés à part, sans taux ──────────

export type IssueHistorique = 'GAGNE' | 'PERDU_APRES_ATTRIBUTION' | 'SANS_SUITE' | 'A_QUALIFIER'

export interface LigneHistorique {
  id: string
  numero: string
  objet: string
  montant: number
  issue: IssueHistorique
  href: string
}

export interface ResultatMarchesHistoriques {
  total: Repartition
  parIssue: Record<IssueHistorique, Repartition>
  lignes: LigneHistorique[]
  exclusSansDate: ElementLie[]
}

const STATUTS_A_QUALIFIER = ['OFFRE_DEPOSEE', 'EN_ATTENTE_ATTRIBUTION', 'ATTRIBUE_PROVISOIREMENT']

export function estMarcheHistorique(m: MarchePilotage): boolean {
  return !m.aOpportunite && !STATUTS_AVANT_DEPOT.includes(m.statut)
}

/** Le statut prime sur le concurrent gagnant. Une annulation avant attribution est une procédure sans suite. */
export function issueMarcheHistorique(m: MarchePilotage): IssueHistorique | null {
  if ((STATUTS_ATTRIBUES as string[]).includes(m.statut)) return 'GAGNE'
  if (m.statut === 'RESILIE' || (m.statut === 'ANNULE' && m.attribueUnJour)) return 'PERDU_APRES_ATTRIBUTION'
  if (m.statut === 'INFRUCTUEUX' || m.statut === 'ANNULE') return 'SANS_SUITE'
  if (STATUTS_A_QUALIFIER.includes(m.statut)) return 'A_QUALIFIER'
  return null
}

const dateRattachement = (m: MarchePilotage): Date | null => m.dateAttribution ?? m.dateDernierStatut

export function calculerMarchesHistoriques(marches: MarchePilotage[], periode: Periode): ResultatMarchesHistoriques {
  const vide = (): Repartition => ({ nombre: 0, valeur: 0 })
  const parIssue: Record<IssueHistorique, Repartition> = {
    GAGNE: vide(), PERDU_APRES_ATTRIBUTION: vide(), SANS_SUITE: vide(), A_QUALIFIER: vide(),
  }
  const total = vide()
  const lignes: LigneHistorique[] = []
  const exclusSansDate: ElementLie[] = []

  for (const m of marches) {
    if (!estMarcheHistorique(m)) continue
    const issue = issueMarcheHistorique(m)
    if (issue === null) continue
    const date = dateRattachement(m)
    if (!date) { exclusSansDate.push(lienMarche(m)); continue }
    if (!dansPeriode(date, periode)) continue
    parIssue[issue].nombre++
    parIssue[issue].valeur += m.montant
    total.nombre++
    total.valeur += m.montant
    lignes.push({ id: m.id, numero: m.numero, objet: m.objet, montant: m.montant, issue, href: `/marches/${m.id}` })
  }
  return { total, parIssue, lignes, exclusSansDate }
}

export function calculerQualite(
  marches: MarchePilotage[],
  lots: LotPilotage[],
  conversion: ResultatConversion,
  offres: ResultatIssueOffres,
  aujourdHui: Date,
): ElementQualite[] {
  return [
    {
      cle: 'SANS_FACTURE',
      libelle: 'Marchés en exécution ou clôturés sans facture',
      elements: marches
        .filter((m) => STATUTS_DEVANT_ETRE_FACTURES.includes(m.statut) && montantFacture(m) === 0)
        .map(lienMarche),
    },
    {
      cle: 'ECHEANCE_DEPASSEE',
      libelle: 'Échéance dépassée sans changement de statut',
      elements: marches
        .filter((m) => STATUTS_EN_COURS_EXECUTION.includes(m.statut) && m.dateFinPrevue !== null && m.dateFinPrevue < aujourdHui)
        .map(lienMarche),
    },
    {
      cle: 'ECHEC_SANS_MOTIF',
      libelle: 'Échecs sans motif renseigné',
      elements: [
        ...marches.filter((m) => STATUTS_ECHEC_MARCHE.includes(m.statut) && !m.motifRenseigne).map(lienMarche),
        ...lots.filter((l) => (l.resultat === 'PERDU' || l.resultat === 'INFRUCTUEUX') && !l.motifRenseigne).map(lienLot),
      ],
    },
    {
      cle: 'SANS_DATE',
      libelle: 'Exclus des calculs faute de date (attribution ou dépôt)',
      elements: [
        ...conversion.exclusSansDate,
        ...offres.exclusSansDate,
        ...marches.filter((m) => estMarcheHistorique(m) && issueMarcheHistorique(m) !== null && dateRattachement(m) === null).map(lienMarche),
      ],
    },
    {
      cle: 'FACTURE_SUPERIEURE',
      libelle: 'Facturé TTC supérieur au montant contractuel (+2 %)',
      elements: marches.filter((m) => montantFacture(m) > m.montant * TOLERANCE_FACTURE).map(lienMarche),
    },
    {
      cle: 'SANS_OPPORTUNITE',
      libelle: 'Marchés historiques (sans opportunité liée), présentés à part, sans taux',
      elements: marches.filter(estMarcheHistorique).map(lienMarche),
    },
    {
      cle: 'STATUT_CONCURRENT_INCOHERENT',
      libelle: 'Marchés historiques au statut tranché mais avec un concurrent gagnant renseigné',
      elements: marches
        .filter((m) => estMarcheHistorique(m) && m.concurrentGagnant !== null
          && ['GAGNE', 'PERDU_APRES_ATTRIBUTION', 'SANS_SUITE'].includes(issueMarcheHistorique(m) ?? ''))
        .map(lienMarche),
    },
  ]
}
