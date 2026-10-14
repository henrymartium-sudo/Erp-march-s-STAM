// tests/unit/echeances-orchestration.spec.ts
import { test, expect } from '@playwright/test'
import { envoyerEcheancesMatin } from '../../lib/cron/echeances-matin'
import type { OffreEcheance } from '../../lib/echeances/classement'

const NOW = new Date(Date.UTC(2026, 9, 15, 8, 0))
const offre = (id: string, statut: OffreEcheance['statut'], h: number): OffreEcheance => ({
  id, reference: id, objet: `Objet ${id}`, autoriteContractante: 'Autorité', statut,
  dateLimite: new Date(Date.UTC(2026, 9, 16, h)), lots: [],
})

function deps(offres: OffreEcheance[], echoue: string[] = []) {
  const envois: { to: string; subject: string }[] = []
  return {
    envois,
    charger: async () => offres,
    transporteur: {
      async sendMail(o: { to: string; subject: string }) {
        if (echoue.includes(o.to)) throw new Error('refusé')
        envois.push({ to: o.to, subject: o.subject })
        return {}
      },
    },
    from: 'ERP <noreply@x.test>',
    baseUrl: 'https://app.exemple.invalid',
  }
}

test.describe('orchestration du mail échéances', () => {
  test('envoie à tous les destinataires, objet résumé', async () => {
    const d = deps([offre('a', 'GO', 9)])
    const r = await envoyerEcheancesMatin(['a@x.test', 'b@x.test'], NOW, d)
    expect(r).toEqual({ envoyes: 2, echecs: [] })
    expect(d.envois.map((e) => e.to)).toEqual(['a@x.test', 'b@x.test'])
    expect(d.envois[0]?.subject).toBe('1 offre à rendre : 1 aujourd\'hui ou demain')
  })

  test('aucune offre à rendre : le mail vide part quand même', async () => {
    const d = deps([offre('x', 'PERDUE', 9)])
    const r = await envoyerEcheancesMatin(['a@x.test'], NOW, d)
    expect(r.envoyes).toBe(1)
    expect(d.envois[0]?.subject).toBe('Aucune offre à rendre dans les 7 jours')
  })

  test('un échec d\'envoi est remonté', async () => {
    const d = deps([], ['b@x.test'])
    const r = await envoyerEcheancesMatin(['a@x.test', 'b@x.test'], NOW, d)
    expect(r.envoyes).toBe(1)
    expect(r.echecs).toHaveLength(1)
  })
})
