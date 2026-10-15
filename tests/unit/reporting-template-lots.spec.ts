import { test, expect } from '@playwright/test'
import { buildOpportuniteReportingEmail, type OpportuniteForReporting } from '../../lib/email/opportunite-reporting-templates'
import { formatMontant } from '../../lib/utils/format'

function opportunite(lots: OpportuniteForReporting['lots']): OpportuniteForReporting {
  return {
    id: 'opp-1',
    reference: 'REF-001',
    objet: 'Fourniture de véhicules',
    autoriteContractante: 'Autorité test',
    statut: 'OFFRE_SOUMISE',
    montantEstime: 5000000,
    lots,
    dateLimite: null,
    periodeValiditeDebut: null,
    periodeValiditeFin: null,
    echeanceAttributionProv: null,
    notes: null,
  }
}

test.describe("gabarit du reporting d'opportunités : montant proposé issu des lots", () => {
  test('affiche le total des lots, en HTML et en texte', () => {
    const total = formatMontant(4000000)
    const { html, text } = buildOpportuniteReportingEmail(
      'Règle test',
      [opportunite([{ montantPropose: 1500000, dossier: null }, { montantPropose: 2500000, dossier: null }, { montantPropose: null, dossier: null }])],
      new Date('2026-01-15T08:00:00Z')
    )
    expect(html).toContain(total)
    expect(text).toContain(`Proposé: ${total}`)
  })

  test('sans lot, le montant proposé affiche « — »', () => {
    const { html, text } = buildOpportuniteReportingEmail('Règle test', [opportunite([])], new Date('2026-01-15T08:00:00Z'))
    expect(text).toContain('Proposé: —')
    // Dans la carte, un champ vide disparaît : l'estimé est affiché, aucune étiquette « Proposé »
    expect(html).toContain(formatMontant(5000000))
    expect(html).not.toContain('>Proposé<')
  })
})

test.describe("gabarit du reporting d'opportunités : progression des dossiers issue des lots", () => {
  const rapport = (lots: OpportuniteForReporting['lots']) =>
    buildOpportuniteReportingEmail('Règle test', [opportunite(lots)], new Date('2026-01-15T08:00:00Z')).html

  test('affiche la moyenne des dossiers de tous les lots, pas celle du dernier dossier créé', () => {
    const html = rapport([
      { montantPropose: null, dossier: { progression: 25 } },
      { montantPropose: null, dossier: { progression: 0 } },
    ])
    expect(html).toContain('Dossier 13 %')
    expect(html).not.toContain('Dossier 25 %')
    expect(html).not.toContain('Dossier 0 %')
  })

  test('un lot sans dossier compte pour 0 dans la moyenne', () => {
    const html = rapport([
      { montantPropose: null, dossier: { progression: 50 } },
      { montantPropose: null, dossier: null },
    ])
    expect(html).toContain('Dossier 25 %')
  })

  test("sans dossier sur aucun lot, la progression n'est pas affichée", () => {
    // On cherche une valeur chiffrée
    expect(rapport([{ montantPropose: null, dossier: null }])).not.toMatch(/Dossier \d+ %/)
    expect(rapport([])).not.toMatch(/Dossier \d+ %/)
  })
})
