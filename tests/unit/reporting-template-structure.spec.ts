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

  test('version texte : une ligne par opportunité avec référence, statut et date limite', () => {
    const { text } = rapport([opp({ reference: 'REF-9', statut: 'GO', dateLimite: new Date('2026-10-21T00:00:00Z') })])
    expect(text).toContain('REF-9')
    expect(text).toContain('21/10/2026')
  })
})
