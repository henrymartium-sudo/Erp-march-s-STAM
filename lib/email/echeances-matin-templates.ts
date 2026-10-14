// lib/email/echeances-matin-templates.ts
/**
 * Mail « échéances du matin » : offres à rendre dans les 7 jours.
 * HTML en tableaux avec styles en ligne (compatibilité des clients de messagerie).
 */

import { calculerAvancementLots } from '@/lib/utils/lots'
import { STATUT_OPPORTUNITE_LABELS } from '@/lib/validations/opportunite'
import {
  alerteGras, type BlocEcheance, type GroupesEcheances, type OffreEcheance,
} from '@/lib/echeances/classement'
import { delaiTexte, echeanceLisible, montantProposeAffiche, objetMail } from '@/lib/echeances/affichage'

export const SEUIL_COMPACT = 5
export const SEUIL_TOTAL = 15

const NAVY = '#1E3A5F'
const GOLD = '#C49A1A'

const BLOCS: Record<BlocEcheance, { titre: string; sous: string; couleur: string; fond: string }> = {
  rouge: { titre: 'À régulariser', sous: 'Échéance déjà passée', couleur: '#B91C1C', fond: '#FEF2F2' },
  orange: { titre: 'Aujourd’hui et demain', sous: 'À finaliser en priorité', couleur: '#C2410C', fond: '#FFF7ED' },
  bleu: { titre: 'Dans les 7 jours', sous: 'À planifier', couleur: '#1D4ED8', fond: '#EFF6FF' },
}

const echapper = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const FORMAT_JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function etiquette(texte: string): string {
  return `<div style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#6B7280;margin-bottom:3px;">${texte}</div>`
}

function barre(progression: number | null): string {
  if (progression === null) return '<span style="color:#9CA3AF;">Pas commencé</span>'
  return `<span style="font-weight:600;">${progression} %</span><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:4px;"><tr><td width="${progression}%" style="background:${NAVY};height:6px;font-size:0;line-height:0;">&nbsp;</td><td style="background:#E5E7EB;height:6px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`
}

function carte(o: OffreEcheance, bloc: BlocEcheance, now: Date, baseUrl: string): string {
  const c = BLOCS[bloc]
  const gras = alerteGras(o, now)
  const { date, heure } = echeanceLisible(o.dateLimite as Date)
  const echeance = heure
    ? `${date} à ${heure}`
    : `${date}<br><span style="font-size:12px;font-weight:400;color:#6B7280;">heure non précisée</span>`
  const m = montantProposeAffiche(o.lots)
  const montant = m.vide
    ? `<span style="color:#9CA3AF;">${m.texte}</span>`
    : `<span style="font-weight:600;">${m.texte}</span>${m.note ? `<div style="font-size:12px;color:#C2410C;margin-top:2px;">${m.note}</div>` : ''}`
  const { progressionMoyenne } = calculerAvancementLots(o.lots)
  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 12px 0;border:1px solid #E5E7EB;border-left:5px solid ${c.couleur};background:#FFFFFF;">
  <tr><td style="padding:14px 16px 4px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
    <td style="font-size:12px;color:#6B7280;font-weight:600;">${echapper(o.reference ?? '—')}${gras ? ' <span style="color:#C2410C;">· À décider</span>' : ''}</td>
    <td align="right"><span style="display:inline-block;padding:2px 9px;background:#F3F4F6;color:#374151;font-size:11px;font-weight:600;white-space:nowrap;">${echapper(STATUT_OPPORTUNITE_LABELS[o.statut] ?? o.statut)}</span></td>
  </tr></table></td></tr>
  <tr><td style="padding:2px 16px 0 16px;font-size:16px;line-height:1.35;color:#111827;font-weight:${gras ? 700 : 600};">${echapper(o.objet)}</td></tr>
  <tr><td style="padding:2px 16px 10px 16px;font-size:13px;color:#4B5563;">${echapper(o.autoriteContractante)}</td></tr>
  <tr><td style="padding:0 16px 12px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #F0F0F0;">
    <tr>
      <td class="col" width="50%" valign="top" style="padding:10px 8px 6px 0;font-size:14px;color:#111827;">${etiquette('Échéance')}<span style="font-weight:600;">${echeance}</span></td>
      <td class="col" width="50%" valign="top" style="padding:10px 0 6px 8px;font-size:14px;">${etiquette('Délai')}<span style="font-weight:${gras ? 800 : 700};color:${c.couleur};">${delaiTexte(o.dateLimite as Date, now, bloc)}</span></td>
    </tr><tr>
      <td class="col" width="50%" valign="top" style="padding:6px 8px 4px 0;font-size:14px;color:#111827;">${etiquette('Montant proposé')}${montant}</td>
      <td class="col" width="50%" valign="top" style="padding:6px 0 4px 8px;font-size:14px;color:#111827;">${etiquette('Dossier')}${barre(progressionMoyenne)}</td>
    </tr></table></td></tr>
  <tr><td style="padding:0 16px 14px 16px;"><a href="${baseUrl}/opportunites/${encodeURIComponent(o.id)}" style="display:inline-block;padding:8px 16px;background:${NAVY};color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;">Ouvrir la fiche &rarr;</a></td></tr>
</table>`
}

function ligne(o: OffreEcheance, bloc: BlocEcheance, now: Date, baseUrl: string, i: number): string {
  const c = BLOCS[bloc]
  const { date, heure } = echeanceLisible(o.dateLimite as Date)
  const fond = i % 2 ? '#F9FAFB' : '#FFFFFF'
  return `<tr>
    <td style="padding:9px 10px;background:${fond};border-bottom:1px solid #EEF0F3;font-size:13px;color:#111827;line-height:1.35;">
      <a href="${baseUrl}/opportunites/${encodeURIComponent(o.id)}" style="color:#111827;text-decoration:none;"><span style="color:#6B7280;font-weight:600;">${echapper(o.reference ?? '—')}</span> &middot; ${echapper(o.objet)}</a>
      <div style="font-size:12px;color:#6B7280;margin-top:2px;">${echapper(o.autoriteContractante)} &middot; ${echapper(STATUT_OPPORTUNITE_LABELS[o.statut] ?? o.statut)}</div>
    </td>
    <td class="col" align="right" valign="top" style="padding:9px 10px;background:${fond};border-bottom:1px solid #EEF0F3;font-size:12px;white-space:nowrap;"><span style="color:#374151;">${date}${heure ? ` · ${heure}` : ''}</span><div style="font-weight:700;color:${c.couleur};margin-top:2px;">${delaiTexte(o.dateLimite as Date, now, bloc)}</div></td>
  </tr>`
}

function section(bloc: BlocEcheance, offres: OffreEcheance[], now: Date, baseUrl: string, limite: number): string {
  if (offres.length === 0) return ''
  const c = BLOCS[bloc]
  const visibles = offres.slice(0, Math.max(0, limite))
  const caches = offres.length - visibles.length
  const compact = bloc === 'bleu' && offres.length > SEUIL_COMPACT
  const corps = compact
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #E5E7EB;border-left:5px solid ${c.couleur};">${visibles.map((o, i) => ligne(o, bloc, now, baseUrl, i)).join('')}</table>`
    : visibles.map((o) => carte(o, bloc, now, baseUrl)).join('')
  const reste = caches > 0
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;"><tr><td align="center" style="padding:12px;background:${c.fond};"><a href="${baseUrl}/opportunites?echeance=a-rendre" style="display:inline-block;padding:9px 18px;background:${NAVY};color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;">Voir les ${caches} autre${caches > 1 ? 's' : ''} dans l’ERP &rarr;</a></td></tr></table>`
    : ''
  return `
<tr><td style="padding:22px 24px 6px 24px;">
  <div style="font-size:17px;font-weight:700;color:${c.couleur};">${c.titre} <span style="display:inline-block;margin-left:6px;padding:1px 9px;background:${c.fond};font-size:13px;">${offres.length}</span></div>
  <div style="font-size:12px;color:#6B7280;padding-bottom:10px;">${c.sous}</div>
  ${corps}${reste}
</td></tr>`
}

function compteur(n: number, titre: string, couleur: string): string {
  return `<td align="center" width="33%" style="padding:12px 4px;"><div style="font-size:26px;font-weight:700;color:${n ? couleur : '#9CA3AF'};line-height:1;">${n}</div><div style="font-size:11px;color:#4B5563;margin-top:4px;">${titre}</div></td>`
}

export function buildEcheancesMatinEmail(
  g: GroupesEcheances,
  now: Date,
  baseUrl: string
): { subject: string; html: string; text: string } {
  const subject = objetMail(g)
  const total = g.rouge.length + g.orange.length + g.bleu.length
  const limiteBleu = SEUIL_TOTAL - g.rouge.length - g.orange.length
  const corps = total
    ? section('rouge', g.rouge, now, baseUrl, g.rouge.length) +
      section('orange', g.orange, now, baseUrl, g.orange.length) +
      section('bleu', g.bleu, now, baseUrl, limiteBleu)
    : `<tr><td style="padding:34px 24px;text-align:center;"><div style="font-size:17px;font-weight:700;color:#111827;">Rien à rendre dans les 7 prochains jours</div><div style="font-size:13px;color:#6B7280;margin-top:6px;">Ce mail confirme que le suivi fonctionne : l’absence de mail, elle, serait un signal à vérifier.</div></td></tr>`

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${echapper(subject)}</title>
<style>@media only screen and (max-width:640px){.wrap{width:100% !important}.col{display:block !important;width:100% !important;padding-left:0 !important;padding-right:0 !important}.pad{padding-left:16px !important;padding-right:16px !important}}</style></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${echapper(subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:16px 0;"><tr><td align="center">
<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:100%;background:#FFFFFF;">
  <tr><td class="pad" style="background:${NAVY};padding:24px 24px 20px 24px;">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${GOLD};font-weight:700;">ERP Marchés STAM</div>
    <div style="font-size:22px;font-weight:700;color:#FFFFFF;margin-top:6px;">Échéances du matin</div>
    <div style="font-size:13px;color:#D1D5DB;margin-top:4px;">${FORMAT_JOUR.format(now)}</div>
  </td></tr>
  <tr><td style="background:#F9FAFB;border-bottom:1px solid #E5E7EB;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    ${compteur(g.rouge.length, 'À régulariser', BLOCS.rouge.couleur)}${compteur(g.orange.length, 'Aujourd’hui / demain', BLOCS.orange.couleur)}${compteur(g.bleu.length, 'Sous 7 jours', BLOCS.bleu.couleur)}
  </tr></table></td></tr>
  ${corps}
  <tr><td style="padding:18px 24px 22px 24px;border-top:1px solid #E5E7EB;background:#F9FAFB;font-size:12px;color:#6B7280;line-height:1.5;">
    Sont listées les offres au statut En analyse, GO ou Dossier en préparation, dont l’échéance est dépassée ou tombe dans les 7 jours. Sans heure renseignée, l’échéance est à 23 h 59.<br>Généré automatiquement par ERP Marchés STAM.
  </td></tr>
</table></td></tr></table></body></html>`

  const texteBloc = (bloc: BlocEcheance, titre: string, offres: OffreEcheance[]) =>
    offres.length === 0
      ? []
      : ['', `${titre} (${offres.length})`, ...offres.map((o) => {
          const { date, heure } = echeanceLisible(o.dateLimite as Date)
          return `- [${o.reference ?? '—'}] ${o.objet} | ${o.autoriteContractante} | ${date}${heure ? ` ${heure}` : ''} | ${delaiTexte(o.dateLimite as Date, now, bloc)} | ${montantProposeAffiche(o.lots).texte}`
        })]
  const text = [
    `ÉCHÉANCES DU MATIN — ${FORMAT_JOUR.format(now)}`,
    subject,
    ...texteBloc('rouge', 'À RÉGULARISER', g.rouge),
    ...texteBloc('orange', 'AUJOURD’HUI ET DEMAIN', g.orange),
    ...texteBloc('bleu', 'DANS LES 7 JOURS', g.bleu),
    ...(total === 0 ? ['', 'Aucune offre à rendre dans les 7 prochains jours.'] : []),
  ].join('\n')

  return { subject, html, text }
}
