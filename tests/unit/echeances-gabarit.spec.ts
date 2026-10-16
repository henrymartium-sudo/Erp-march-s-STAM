// tests/unit/echeances-gabarit.spec.ts
import { test, expect } from '@playwright/test'
import { buildEcheancesMatinEmail } from '../../lib/email/echeances-matin-templates'
import { grouperEcheances, type OffreEcheance } from '../../lib/echeances/classement'

const NOW = new Date(Date.UTC(2026, 9, 15, 8, 0))
const jour = (n: number, h = 0, m = 0) => new Date(Date.UTC(2026, 9, 15 + n, h, m))
const BASE = 'https://app.exemple.invalid'

function offre(id: string, dateLimite: Date, extra: Partial<OffreEcheance> = {}): OffreEcheance {
  return { id, reference: `REF-${id}`, objet: `Objet ${id}`, autoriteContractante: 'Autorité', statut: 'GO', dateLimite, lots: [], ...extra }
}
const mail = (offres: OffreEcheance[]) => buildEcheancesMatinEmail(grouperEcheances(offres, NOW), NOW, BASE)
const compter = (html: string, motif: string) => html.split(motif).length - 1

test.describe('gabarit du mail échéances', () => {
  test('mail vide : produit un mail, avec un message clair', () => {
    const { subject, html, text } = mail([])
    expect(subject).toBe('Aucune offre à rendre dans les 7 jours')
    expect(html).toContain('Rien à rendre dans les 7 prochains jours')
    expect(text).toContain('Aucune offre à rendre')
  })

  test('une carte par offre urgente, un bouton vers la fiche', () => {
    const { html } = mail([offre('a', jour(-1, 17)), offre('b', jour(0, 12)), offre('c', jour(1, 9))])
    expect(compter(html, 'Ouvrir la fiche')).toBe(3)
    expect(html).toContain(`${BASE}/opportunites/a`)
  })

  test('bloc bleu : cartes jusqu\'à 5 offres, lignes compactes au-delà', () => {
    const cinq = Array.from({ length: 5 }, (_, i) => offre(`b${i}`, jour(3, 9 + i)))
    expect(compter(mail(cinq).html, 'Ouvrir la fiche')).toBe(5)
    const six = Array.from({ length: 6 }, (_, i) => offre(`b${i}`, jour(3, 9 + i)))
    expect(compter(mail(six).html, 'Ouvrir la fiche')).toBe(0)
    expect(compter(mail(six).html, `${BASE}/opportunites/b`)).toBe(6)
  })

  test('plafond de 15 offres : le reste va derrière un bouton ; les urgentes ne sont jamais coupées', () => {
    const urgentes = [offre('r', jour(-1, 17)), offre('o1', jour(0, 12)), offre('o2', jour(1, 9))]
    const bleues = Array.from({ length: 22 }, (_, i) => offre(`b${i}`, jour(2 + (i % 6), 9 + (i % 8))))
    const { html } = mail([...urgentes, ...bleues])
    expect(compter(html, 'Ouvrir la fiche')).toBe(3)
    expect(html).toContain('Voir les 10 autres dans l’ERP')
    expect(html).toContain(`${BASE}/opportunites?echeance=a-rendre`)
  })

  test('sans dépassement du plafond : pas de bouton « autres »', () => {
    expect(mail([offre('a', jour(2, 9))]).html).not.toContain('autres dans l’ERP')
  })

  test('le texte de l\'objet et de l\'autorité est échappé (pas d\'injection HTML)', () => {
    const piege = offre('p', jour(1, 9), { objet: '<script>alert(1)</script> & "x"', autoriteContractante: '<img src=x onerror=1>' })
    const { html } = mail([piege])
    expect(html).not.toContain('<script>alert')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp;')
  })

  test('« Plus tard » : une offre en analyse à J+30 est listée avec son décompte, en ligne compacte', () => {
    const { html, text, subject } = mail([offre('l', jour(30, 9), { statut: 'EN_ANALYSE' }), offre('u', jour(1, 9))])
    expect(html).toContain('Plus tard')
    expect(html).toContain('Dans 30 jours')
    expect(compter(html, 'Ouvrir la fiche')).toBe(1)
    expect(html).toContain(`${BASE}/opportunites/l`)
    expect(text).toContain('PLUS TARD')
    expect(subject).toBe('1 offre à rendre : 1 aujourd\'hui ou demain')
  })

  test('« Plus tard » seul : signalé dans l\'objet, message « rien d\'urgent » conservé', () => {
    const { html, subject } = mail([offre('l', jour(30, 9), { statut: 'EN_ANALYSE' })])
    expect(subject).toBe('Aucune offre à rendre dans les 7 jours (1 à suivre plus tard)')
    expect(html).toContain('Rien à rendre dans les 7 prochains jours')
    expect(html).toContain(`${BASE}/opportunites/l`)
  })

  test('plafond : « Plus tard » ne fait jamais dépasser 15 offres et renvoie vers les offres à venir', () => {
    const lointaines = Array.from({ length: 20 }, (_, i) => offre(`l${i}`, jour(10 + i, 9)))
    const { html } = mail([offre('u', jour(1, 9)), ...lointaines])
    expect(compter(html, `${BASE}/opportunites/l`)).toBe(14)
    expect(html).toContain('Voir les 6 autres dans l’ERP')
    expect(html).toContain(`${BASE}/opportunites?echeance=a-venir`)
  })

  test('une offre détectée proche est marquée « À décider », pas une offre en préparation', () => {
    const { html } = mail([offre('d', jour(1, 9), { statut: 'EN_ANALYSE' }), offre('e', jour(1, 10), { statut: 'DOSSIER_EN_PREPARATION' })])
    expect(compter(html, 'À décider')).toBe(1)
  })

  test('montant proposé et non estimé ; mention « À définir »', () => {
    const { html } = mail([offre('m', jour(1, 9), { lots: [{ numero: 1, montantPropose: 12_000_000, dossier: null }, { numero: 2, montantPropose: null, dossier: null }] }), offre('n', jour(1, 10))])
    expect(html).toContain('Montant proposé')
    expect(html).not.toContain('Montant estimé')
    expect(html).toContain('lot 2 sans montant')
    expect(html).toContain('À définir')
  })

  test('la version texte liste les offres par bloc', () => {
    const { text } = mail([offre('a', jour(-1, 17)), offre('b', jour(2, 9))])
    expect(text).toContain('À RÉGULARISER')
    expect(text).toContain('DANS LES 7 JOURS')
    expect(text).toContain('REF-a')
  })
  test('mode compact : une offre détectée à J+2 garde sa mention « À décider » (carte ou ligne)', () => {
    const six = Array.from({ length: 5 }, (_, i) => offre(`b${i}`, jour(4 + (i % 3), 9 + i)))
    const { html, text } = mail([...six, offre('d', jour(2, 9), { statut: 'EN_ANALYSE' })])
    expect(compter(html, 'Ouvrir la fiche')).toBe(0)
    expect(compter(html, 'À décider')).toBe(1)
    expect(text).toContain('À DÉCIDER')
  })

  test('largeur fluide : aucune table à largeur fixe (les applis mobiles ignorent le @media)', () => {
    const { html } = mail([offre('a', jour(1, 9))])
    expect(html).not.toMatch(/width="640"/)
    expect(html).not.toMatch(/[^-]width:640px/)
    expect(html).toContain('width:100%;max-width:640px')
  })
})
