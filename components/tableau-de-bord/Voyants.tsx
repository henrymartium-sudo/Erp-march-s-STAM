import Link from 'next/link'
import { AlertTriangle, CheckCircle2, MinusCircle, XCircle, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import type { BlocTableauDeBord, TableauDeBordData } from '@/lib/actions/tableau-de-bord'
import type { EtatVoyant, Voyant } from '@/lib/tableau-de-bord/voyants'
import { ETATS_VOYANT, lienVoyant, SEUILS_EN_CLAIR, voyantsVisibles, type Vue } from '@/lib/tableau-de-bord/presentation'
import { formatMontant } from '@/lib/utils/format'
import { BlocIndisponible } from './BlocIndisponible'

const ETATS: Record<EtatVoyant, { Icone: LucideIcon; variante: 'success' | 'warning' | 'danger' | 'muted' }> = {
  vert: { Icone: CheckCircle2, variante: 'success' },
  ambre: { Icone: AlertTriangle, variante: 'warning' },
  rouge: { Icone: XCircle, variante: 'danger' },
  gris: { Icone: MinusCircle, variante: 'muted' },
}

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`

interface Presentation { valeur: string; detail?: string }

/** Une carte : l'état est dit par une icône ET un texte, jamais par la couleur seule. */
function CarteVoyant({ titre, etat, valeur, detail, seuil, href }: {
  titre: string; etat: EtatVoyant; valeur: string; detail?: string; seuil: string; href: string | null
}) {
  const { Icone, variante } = ETATS[etat]
  const contenu = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{titre}</span>
        <Badge variant={variante} className="shrink-0 gap-1">
          <Icone className="h-3 w-3" aria-hidden="true" />
          {ETATS_VOYANT[etat]}
        </Badge>
      </span>
      <span className="mt-1 block text-lg font-bold">{valeur}</span>
      {detail && <span className="block text-sm text-muted-foreground">{detail}</span>}
      <span className="mt-2 block text-xs text-muted-foreground">{seuil}</span>
    </>
  )
  const classes = 'block min-h-11 rounded-lg border bg-card p-3'
  return href
    ? <Link href={href} className={`${classes} hover:bg-muted/60 focus-visible:bg-muted/60`}>{contenu}</Link>
    : <div className={classes}>{contenu}</div>
}

/** Rend un voyant : rien si le bloc est `null` (pas de droit), un message s'il est en erreur. */
function Emplacement<D>({ bloc, titre, cle, role, aujourdHui, presenter }: {
  bloc: BlocTableauDeBord<Voyant<D>> | null; titre: string; cle: Parameters<typeof lienVoyant>[0]
  role: string | null | undefined; aujourdHui: Date; presenter: (v: Voyant<D>) => Presentation
}) {
  if (bloc === null) return null
  if (bloc.status === 'error') return <BlocIndisponible titre={`Le voyant « ${titre} »`} />
  const p = presenter(bloc.value)
  return (
    <CarteVoyant
      titre={titre} etat={bloc.value.etat} valeur={p.valeur} detail={p.detail}
      seuil={SEUILS_EN_CLAIR[cle]} href={lienVoyant(cle, role, aujourdHui)}
    />
  )
}

function delaiCaution(jours: number): string {
  if (jours < 0) return `la plus proche est échue depuis ${-jours} j`
  if (jours === 0) return "la plus proche échoit aujourd'hui"
  return `la plus proche dans ${jours} j`
}

/** « Est-ce que ça va ? » : les cinq voyants jugés par le serveur ; l'interface n'en recalcule aucun état. */
export function Voyants({ voyants, vue, role, aujourdHui }: {
  voyants: TableauDeBordData['voyants']; vue: Vue; role: string | null | undefined; aujourdHui: Date
}) {
  const visibles = voyantsVisibles(vue)
  const commun = { role, aujourdHui }
  return (
    <Card role="region" aria-labelledby="titre-voyants">
      <CardHeader>
        <h2 id="titre-voyants" className="text-base font-semibold leading-none tracking-tight">Est-ce que ça va ?</h2>
        <CardDescription>Chaque voyant a un seuil. Un clic ouvre la liste la plus proche.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.encaissements && (
          <Emplacement
            {...commun} cle="encaissements" titre="Encaissements en retard" bloc={voyants.encaissements}
            presenter={({ detail: d }) => ({
              valeur: `${d.pourcentageEnRetard} % en retard`,
              detail: `Total non encaissé : ${formatMontant(d.totalNonEncaisse)}${
                d.facturesSansDate.length > 0 ? ` · ${pluriel(d.facturesSansDate.length, 'facture non datée', 'factures non datées')}, non comptée${d.facturesSansDate.length > 1 ? 's' : ''}` : ''}`,
            })}
          />
        )}
        {visibles.resteAFacturer && (
          <Emplacement
            {...commun} cle="resteAFacturer" titre="Reste à facturer après réception" bloc={voyants.resteAFacturer}
            presenter={({ detail: d }) => ({
              valeur: `${pluriel(d.marches.length, 'marché', 'marchés')}, total ${formatMontant(d.total)}`,
            })}
          />
        )}
        {visibles.cautions && (
          <Emplacement
            {...commun} cle="cautions" titre="Cautions encore nécessaires" bloc={voyants.cautions}
            presenter={({ detail: d }) => ({
              valeur: `${d.sous30} sous 30 j`,
              detail: d.plusProcheDansJours === null ? undefined : delaiCaution(d.plusProcheDansJours),
            })}
          />
        )}
        {visibles.tauxSucces && (
          <Emplacement
            {...commun} cle="tauxSucces" titre="Taux de succès des offres" bloc={voyants.tauxSucces}
            presenter={(v) => ({
              valeur: v.etat === 'gris' || v.detail.taux6Mois === null
                ? `Pas assez de résultats (${v.detail.resultats6Mois})`
                : `${v.detail.taux6Mois} % sur 6 mois`,
              detail: v.detail.taux24Mois === null ? undefined : `${v.detail.taux24Mois} % sur 24 mois`,
            })}
          />
        )}
        {visibles.depots && (
          <Emplacement
            {...commun} cle="depots" titre="Dépôts sous 14 j non prêts" bloc={voyants.depots}
            presenter={({ detail: d }) => ({
              valeur: `${d.nonPrets} sur ${d.depotsSous14} non prêts`,
              detail: d.depotsSous14 === 0 ? 'Aucun dépôt dans les 14 prochains jours' : undefined,
            })}
          />
        )}
      </CardContent>
    </Card>
  )
}
