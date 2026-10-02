import { test, expect } from '@playwright/test'
import { groupAlerts } from '../../lib/alertes/groupAlertsForEmail'
import { dailyAlertsEmailTemplate } from '../../lib/email/templates'

// Aperçu de l'e-mail d'échéance pour une caution sans marché : fonctions pures, aucun envoi.
const dans = (jours: number) => new Date(Date.now() + jours * 86400000)

const cautionMarche = {
  id: 'c-marche',
  reference: 'CAU-MARCHE-1',
  banqueNom: 'Banque A',
  type: 'Caution de bonne exécution',
  montant: 5_000_000,
  dateEcheance: dans(10),
  joursRestants: 10,
  marcheReference: 'MARCHE-2026-004',
  autoriteContractanteNom: 'Ministère des Transports',
}

const cautionOpportunite = {
  id: 'c-opp',
  reference: 'CAU-OPP-1',
  banqueNom: 'Banque B',
  type: 'Caution de soumission',
  montant: 1_500_000,
  dateEcheance: dans(5),
  joursRestants: 5,
  marcheReference: null,
  autoriteContractanteNom: 'Mairie de Lomé',
  opportuniteReference: 'AO-2026-017',
  opportuniteObjet: 'Fourniture de 4 véhicules pick-up double cabine',
}

test.describe('groupAlerts : caution d\'opportunité', () => {
  test('transmet la référence et l\'objet de l\'opportunité, sans marché', () => {
    const { cautions } = groupAlerts([cautionOpportunite], [])
    expect(cautions).toHaveLength(1)
    expect(cautions[0]?.marcheReference).toBeUndefined()
    expect(cautions[0]?.opportuniteReference).toBe('AO-2026-017')
    expect(cautions[0]?.opportuniteObjet).toBe('Fourniture de 4 véhicules pick-up double cabine')
  })

  test('une caution de marché ne porte aucune information d\'opportunité', () => {
    const { cautions } = groupAlerts([cautionMarche], [])
    expect(cautions[0]?.marcheReference).toBe('MARCHE-2026-004')
    expect(cautions[0]?.opportuniteObjet).toBeUndefined()
  })
})

test.describe('e-mail d\'échéance : caution sans marché', () => {
  const { cautions } = groupAlerts([cautionMarche, cautionOpportunite], [])
  const { html, text, subject } = dailyAlertsEmailTemplate(cautions, [])

  test('le message compte les deux cautions', () => {
    expect(subject).toContain('2 caution(s)')
  })

  test('HTML : l\'opportunité (référence et objet) remplace le marché vide', () => {
    expect(html).toContain('Opp. AO-2026-017')
    expect(html).toContain('Fourniture de 4 véhicules pick-up double cabine')
    expect(html).toContain('MARCHE-2026-004')
    expect(html).toContain('Mairie de Lomé')
  })

  test('texte : ligne « Opportunité » pour la caution sans marché seulement', () => {
    expect(text).toContain('Opportunité : Opp. AO-2026-017 — Fourniture de 4 véhicules pick-up double cabine')
    expect(text.match(/Opportunité :/g)).toHaveLength(1)
    expect(text).toContain('Marché : MARCHE-2026-004')
  })

  test('opportunité sans référence : libellé neutre, sans « undefined »', () => {
    const sansRef = groupAlerts([{ ...cautionOpportunite, opportuniteReference: null }], [])
    const rendu = dailyAlertsEmailTemplate(sansRef.cautions, [])
    expect(rendu.html).not.toContain('undefined')
    expect(rendu.text).toContain('Opportunité : Opportunité — Fourniture')
  })

  test('l\'objet saisi par un utilisateur est échappé dans le HTML', () => {
    const piege = groupAlerts([{ ...cautionOpportunite, opportuniteObjet: '<script>alert(1)</script> & "x"' }], [])
    const rendu = dailyAlertsEmailTemplate(piege.cautions, [])
    expect(rendu.html).not.toContain('<script>')
    expect(rendu.html).toContain('&lt;script&gt;')
    expect(rendu.html).toContain('&amp;')
  })

  test('caution sans marché ni opportunité : tiret inchangé', () => {
    const orpheline = groupAlerts(
      [{ ...cautionOpportunite, opportuniteReference: null, opportuniteObjet: null }],
      []
    )
    const rendu = dailyAlertsEmailTemplate(orpheline.cautions, [])
    expect(rendu.text).not.toContain('Opportunité :')
  })
})
