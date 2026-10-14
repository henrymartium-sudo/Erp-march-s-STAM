// tests/unit/echeances-envoi.spec.ts
import { test, expect } from '@playwright/test'
import { envoyerAChaqueDestinataire, nettoyerDestinataires, MAX_DESTINATAIRES } from '../../lib/email/envoi-destinataires'

const contenu = { subject: 'Objet', html: '<p>x</p>', text: 'x' }

function fauxTransporteur(echoue: string[] = []) {
  const envois: { to: string }[] = []
  return {
    envois,
    async sendMail(opts: { to: string }) {
      if (echoue.includes(opts.to)) throw new Error('refusé')
      envois.push({ to: opts.to })
      return {}
    },
  }
}

test.describe('envoi à plusieurs destinataires', () => {
  test('nettoyage : espaces, casse, doublons, adresses invalides', () => {
    expect(nettoyerDestinataires([' A@x.test ', 'a@x.test', 'b@x.test', 'pas-un-mail', ''])).toEqual(['a@x.test', 'b@x.test'])
  })

  test('un envoi individuel par destinataire, sans exposer les autres adresses', async () => {
    const t = fauxTransporteur()
    const r = await envoyerAChaqueDestinataire(t, 'ERP <noreply@x.test>', ['a@x.test', 'b@x.test'], contenu)
    expect(t.envois.map((e) => e.to)).toEqual(['a@x.test', 'b@x.test'])
    expect(r).toEqual({ envoyes: 2, echecs: [] })
  })

  test('un destinataire en échec n\'empêche pas les autres et est signalé', async () => {
    const t = fauxTransporteur(['b@x.test'])
    const r = await envoyerAChaqueDestinataire(t, 'ERP <noreply@x.test>', ['a@x.test', 'b@x.test', 'c@x.test'], contenu)
    expect(t.envois.map((e) => e.to)).toEqual(['a@x.test', 'c@x.test'])
    expect(r.envoyes).toBe(2)
    expect(r.echecs).toEqual([{ email: 'b@x.test', erreur: 'refusé' }])
  })

  test('aucun destinataire valide : rien n\'est envoyé', async () => {
    const t = fauxTransporteur()
    const r = await envoyerAChaqueDestinataire(t, 'ERP <noreply@x.test>', [], contenu)
    expect(r).toEqual({ envoyes: 0, echecs: [] })
  })

  test('limite de destinataires exposée', () => {
    expect(MAX_DESTINATAIRES).toBe(20)
  })
})
