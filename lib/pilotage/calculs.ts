// Calculs du module Pilotage — fonctions pures, sans accès base (testées en unitaire).

export type StatutFactureLite = 'BROUILLON' | 'EMISE' | 'EN_ATTENTE' | 'PAYEE' | 'REJETEE' | 'ANNULEE'

export interface Periode { dateDebut: Date; dateFin: Date }

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
}

export interface ResultatConversion {
  valeurAttribuee: number
  facture: number
  encaisse: number
  perduApresAttribution: number
  taux: number | null
  tauxEncaisse: number | null
  alerte: boolean
  marches: { id: string; numero: string; objet: string; montant: number; facture: number; perdu: boolean }[]
  exclusSansDate: string[]
}

export const SEUIL_CONVERSION = 30
const STATUTS_FACTURES_COMPTEES: StatutFactureLite[] = ['EMISE', 'EN_ATTENTE', 'PAYEE']
const STATUTS_PERDUS = ['RESILIE', 'ANNULE']

function dansPeriode(d: Date, p: Periode): boolean {
  return d >= p.dateDebut && d <= p.dateFin
}

function pourcentage(num: number, den: number): number | null {
  return den > 0 ? Math.round((num / den) * 100) : null
}

export function montantFacture(m: MarchePilotage): number {
  return m.factures
    .filter((f) => STATUTS_FACTURES_COMPTEES.includes(f.statut))
    .reduce((s, f) => s + f.montantTTC, 0)
}

export function calculerConversion(marches: MarchePilotage[], periode: Periode): ResultatConversion {
  const exclusSansDate: string[] = []
  const retenus: ResultatConversion['marches'] = []
  let valeurAttribuee = 0, facture = 0, encaisse = 0, perduApresAttribution = 0

  for (const m of marches) {
    if (!m.attribueUnJour) continue
    if (!m.dateAttribution) { exclusSansDate.push(m.numero); continue }
    if (!dansPeriode(m.dateAttribution, periode)) continue

    const fac = montantFacture(m)
    const perdu = STATUTS_PERDUS.includes(m.statut)
    valeurAttribuee += m.montant
    facture += fac
    encaisse += m.factures.filter((f) => f.statut === 'PAYEE').reduce((s, f) => s + f.montantTTC, 0)
    if (perdu) perduApresAttribution += m.montant
    retenus.push({ id: m.id, numero: m.numero, objet: m.objet, montant: m.montant, facture: fac, perdu })
  }

  const taux = pourcentage(facture, valeurAttribuee)
  return {
    valeurAttribuee, facture, encaisse, perduApresAttribution,
    taux, tauxEncaisse: pourcentage(encaisse, valeurAttribuee),
    alerte: taux !== null && taux < SEUIL_CONVERSION,
    marches: retenus, exclusSansDate,
  }
}

// ── Échecs et écart de prix ─────────────────────────────────────────────────

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
}

export interface ResultatEchecs {
  lotsSoumis: number
  lotsGagnes: number
  lotsPerdus: number
  lotsInfructueux: number
  valeurPerdue: number
  marchesAnnulesOuResilies: number
  valeurMarchesPerdus: number
  tauxEchec: number | null
  tauxSucces: number | null
  exclusSansDate: string[]
  /** lots perdus / infructueux et marchés annulés ou résiliés de la période (drill-down) */
  detail: { id: string; libelle: string; resultat: string }[]
}

export interface ResultatEcartPrix {
  n: number
  ecartMoyen: number | null
  suffisant: boolean
  cas: { id: string; libelle: string; notreOffre: number; offreGagnante: number; ecart: number }[]
}

export const MIN_CAS_ECART = 3

export function calculerEchecs(lots: LotPilotage[], marches: MarchePilotage[], periode: Periode): ResultatEchecs {
  const exclusSansDate: string[] = []
  const detail: ResultatEchecs['detail'] = []
  let soumis = 0, gagnes = 0, perdus = 0, infructueux = 0, valeurPerdue = 0

  for (const l of lots) {
    if (!l.soumis) continue
    if (!l.dateDepot) { exclusSansDate.push(l.libelle); continue }
    if (!dansPeriode(l.dateDepot, periode)) continue
    soumis++
    if (l.resultat === 'GAGNE') gagnes++
    if (l.resultat === 'PERDU') { perdus++; valeurPerdue += l.montantPropose ?? 0; detail.push({ id: l.id, libelle: l.libelle, resultat: 'Perdu' }) }
    if (l.resultat === 'INFRUCTUEUX') { infructueux++; detail.push({ id: l.id, libelle: l.libelle, resultat: 'Infructueux' }) }
  }

  let marchesAnnulesOuResilies = 0, valeurMarchesPerdus = 0
  for (const m of marches) {
    if (!m.attribueUnJour || !STATUTS_PERDUS.includes(m.statut)) continue
    if (!m.dateAttribution || !dansPeriode(m.dateAttribution, periode)) continue
    marchesAnnulesOuResilies++
    valeurMarchesPerdus += m.montant
    detail.push({ id: m.id, libelle: m.numero, resultat: m.statut === 'RESILIE' ? 'Résilié' : 'Annulé' })
  }

  return {
    lotsSoumis: soumis, lotsGagnes: gagnes, lotsPerdus: perdus, lotsInfructueux: infructueux, valeurPerdue,
    marchesAnnulesOuResilies, valeurMarchesPerdus,
    tauxEchec: pourcentage(perdus + infructueux, soumis),
    tauxSucces: pourcentage(gagnes, gagnes + perdus),
    exclusSansDate,
    detail,
  }
}

export function calculerEcartPrix(lots: LotPilotage[], periode: Periode): ResultatEcartPrix {
  const cas: ResultatEcartPrix['cas'] = []
  for (const l of lots) {
    if (l.resultat !== 'PERDU' || !l.dateDepot || !dansPeriode(l.dateDepot, periode)) continue
    if (!l.montantPropose || !l.montantOffreConcurrent) continue
    const ecart = ((l.montantPropose - l.montantOffreConcurrent) / l.montantOffreConcurrent) * 100
    cas.push({ id: l.id, libelle: l.libelle, notreOffre: l.montantPropose, offreGagnante: l.montantOffreConcurrent, ecart: Math.round(ecart) })
  }
  const n = cas.length
  const somme = cas.reduce((s, c) => s + ((c.notreOffre - c.offreGagnante) / c.offreGagnante) * 100, 0)
  return { n, ecartMoyen: n > 0 ? Math.round(somme / n) : null, suffisant: n >= MIN_CAS_ECART, cas }
}

// ── Qualité des données ─────────────────────────────────────────────────────

export interface ElementQualite {
  cle: 'SANS_FACTURE' | 'ECHEANCE_DEPASSEE' | 'ECHEC_SANS_MOTIF' | 'SANS_DATE' | 'FACTURE_SUPERIEURE'
  libelle: string
  elements: string[]
}

export const TOLERANCE_FACTURE = 1.02
const STATUTS_DEVANT_ETRE_FACTURES = ['EN_EXECUTION', 'EXECUTE_ATTENTE_GARANTIES', 'CLOTURE']
const STATUTS_EN_COURS_EXECUTION = ['ATTRIBUE_DEFINITIVEMENT', 'EN_ATTENTE_LIVRAISON_OS', 'EN_EXECUTION']
const STATUTS_ECHEC_MARCHE = ['ANNULE', 'RESILIE', 'INFRUCTUEUX']

export function calculerQualite(
  marches: MarchePilotage[],
  lots: LotPilotage[],
  conversion: ResultatConversion,
  echecs: ResultatEchecs,
  aujourdHui: Date,
): ElementQualite[] {
  return [
    {
      cle: 'SANS_FACTURE',
      libelle: 'Marchés en exécution ou clôturés sans facture',
      elements: marches
        .filter((m) => STATUTS_DEVANT_ETRE_FACTURES.includes(m.statut) && montantFacture(m) === 0)
        .map((m) => m.numero),
    },
    {
      cle: 'ECHEANCE_DEPASSEE',
      libelle: 'Échéance dépassée sans changement de statut',
      elements: marches
        .filter((m) => STATUTS_EN_COURS_EXECUTION.includes(m.statut) && m.dateFinPrevue !== null && m.dateFinPrevue < aujourdHui)
        .map((m) => m.numero),
    },
    {
      cle: 'ECHEC_SANS_MOTIF',
      libelle: 'Échecs sans motif renseigné',
      elements: [
        ...marches.filter((m) => STATUTS_ECHEC_MARCHE.includes(m.statut) && !m.motifRenseigne).map((m) => m.numero),
        ...lots.filter((l) => (l.resultat === 'PERDU' || l.resultat === 'INFRUCTUEUX') && !l.motifRenseigne).map((l) => l.libelle),
      ],
    },
    {
      cle: 'SANS_DATE',
      libelle: 'Exclus des calculs faute de date (attribution ou dépôt)',
      elements: [...conversion.exclusSansDate, ...echecs.exclusSansDate],
    },
    {
      cle: 'FACTURE_SUPERIEURE',
      libelle: 'Facturé TTC supérieur au montant contractuel (+2 %)',
      elements: marches.filter((m) => montantFacture(m) > m.montant * TOLERANCE_FACTURE).map((m) => m.numero),
    },
  ]
}
