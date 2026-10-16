import { test, expect } from '@playwright/test'
import { buildOpportuniteReportingEmail, type OpportuniteForReporting } from '../../lib/email/opportunite-reporting-templates'

const now = new Date('2026-10-14T08:00:00Z')

function opp(over: Partial<OpportuniteForReporting>): OpportuniteForReporting {
  return {
    id: 'x', reference: 'REF-1', objet: 'Objet', autoriteContractante: 'Autorité', statut: 'GO',
    montantEstime: null, lots: [], dateLimite: null, periodeValiditeDebut: null, periodeValiditeFin: null,
    echeanceAttributionProv: null, notes: null, ...over,
  }
}
const rapport = (opps: OpportuniteForReporting[]) => buildOpportuniteReportingEmail('Règle', opps, now)

test.describe('gabarit « Suivi Opportunités » : structure', () => {
  test('affiche le total et un compteur par statut', () => {
    const { html } = rapport([opp({ id: '1', statut: 'GO' }), opp({ id: '2', statut: 'NO_GO' }), opp({ id: '3', statut: 'NO_GO' })])
    expect(html).toContain('3 opportunités')
    expect(html).toMatch(/>2<\/div><div[^>]*>No Go</)
  })

  test('largeur fluide plafonnée à 680 px, plus de tableau fixe de 14 colonnes', () => {
    const { html } = rapport([opp({})])
    expect(html).toContain('max-width:680px')
    expect(html).not.toContain('table-layout:fixed')
    expect(html).not.toContain('min-width:868px')
  })

  test('bloc « À traiter » : GO à échéance proche présent, omis s’il n’y a rien à traiter', () => {
    const avec = rapport([opp({ statut: 'GO', dateLimite: new Date('2026-10-21T00:00:00Z') })]).html
    expect(avec).toContain('À TRAITER')
    const sans = rapport([opp({ statut: 'GO', dateLimite: new Date('2026-12-21T00:00:00Z') })]).html
    expect(sans).not.toContain('À TRAITER')
  })

  test('section TERMINÉES : une ligne par No Go / Perdue, sans carte ; section EN COURS omise si aucune active', () => {
    const { html } = rapport([opp({ id: '1', statut: 'NO_GO', objet: 'Marché abandonné' })])
    expect(html).toContain('TERMINÉES')
    expect(html).toContain('Marché abandonné')
    expect(html).not.toContain('EN COURS')
  })

  test('un seul statut actif, aucune terminée : pas de section TERMINÉES', () => {
    expect(rapport([opp({})]).html).not.toContain('TERMINÉES')
  })

  test('échappe le HTML venant de la base (objet, autorité, notes)', () => {
    const { html } = rapport([opp({ objet: '<script>alert(1)</script> & Cie', autoriteContractante: 'A "B"', notes: '<b>gras</b>' })])
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>gras</b>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp; Cie')
  })

  test('notes longues tronquées à 160 caractères dans le mail', () => {
    const { html } = rapport([opp({ notes: 'N'.repeat(400) })])
    expect(html).not.toContain('N'.repeat(161))
    expect(html).toContain('N'.repeat(160))
    expect(html).toContain('Excel')
  })

  test('opportunité sans date ni lot ni montant : aucune cellule « — » inutile, pas de plantage', () => {
    const { html } = rapport([opp({ statut: 'EN_ANALYSE' })])
    expect(html).not.toContain('>—<')
    expect(html).toContain('En analyse')
  })

  test('statut inconnu : libellé de repli, pas de plantage', () => {
    expect(rapport([opp({ statut: 'STATUT_INCONNU' })]).html).toContain('STATUT_INCONNU')
  })

  test('décompte de jours sans emoji', () => {
    const { html } = rapport([opp({ statut: 'GO', dateLimite: new Date('2026-10-21T00:00:00Z') })])
    expect(html).toContain('J-7')
    // Le sujet (donc le <title>) garde son emoji : on contrôle le corps
    expect(html.replace(/<title>[^]*?<\/title>/, '')).not.toMatch(/[\u{1F300}-\u{1FAFF}✅⛔]/u)
  })

  test("échéance le jour même à 10 h, vue à 9 h : « aujourd'hui », pas J-1", () => {
    const { html } = buildOpportuniteReportingEmail('Règle', [opp({ statut: 'GO', dateLimite: new Date('2026-10-14T10:00:00Z') })], new Date('2026-10-14T09:00:00Z'))
    expect(html).toContain("aujourd'hui")
    expect(html).not.toContain('J-1')
  })

  test("échéance hier à 15 h, vue à 9 h : dépassée de 1 j, pas « aujourd'hui »", () => {
    const { html } = buildOpportuniteReportingEmail('Règle', [opp({ statut: 'GO', dateLimite: new Date('2026-10-13T15:00:00Z') })], new Date('2026-10-14T09:00:00Z'))
    expect(html).toContain('dépassée de 1 j')
  })

  test('affaire gagnée : dates passées sans « dépassée de N j » ; une GO dépassée garde l\'alerte', () => {
    const passee = new Date('2026-04-29T00:00:00Z')
    const gagnee = rapport([opp({ statut: 'GAGNEE', dateLimite: passee, periodeValiditeFin: passee, echeanceAttributionProv: passee })]).html
    expect(gagnee).toContain('29/04/2026')
    expect(gagnee).not.toContain('dépassée de')
    expect(rapport([opp({ statut: 'GO', dateLimite: passee })]).html).toContain('dépassée de')
  })

  test('ligne terminée : le montant dit s\'il est proposé ou estimé', () => {
    const proposé = rapport([opp({ statut: 'PERDUE', lots: [{ montantPropose: 58_400_000, dossier: null }], montantEstime: 60_000_000 })]).html
    expect(proposé).toContain('proposé 58')
    const estimé = rapport([opp({ statut: 'NO_GO', montantEstime: 60_000_000 })]).html
    expect(estimé).toContain('estimé 60')
    expect(rapport([opp({ statut: 'NO_GO' })]).html).not.toMatch(/proposé|estimé/)
  })

  test('version texte : une ligne par opportunité avec référence, statut et date limite', () => {
    const { text } = rapport([opp({ reference: 'REF-9', statut: 'GO', dateLimite: new Date('2026-10-21T00:00:00Z') })])
    expect(text).toContain('REF-9')
    expect(text).toContain('21/10/2026')
  })
})
