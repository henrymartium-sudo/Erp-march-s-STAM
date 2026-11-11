import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ongletsAutorises, urlOngletAlertes, type OngletAlertes } from '@/lib/alertes/onglets'

const LIBELLES: Record<OngletAlertes, string> = {
  envoi: 'Envoi manuel',
  regles: 'Règles',
  rapports: 'Rapports',
  historique: 'Historique',
}

/** Onglets en liens : l'onglet change d'adresse et le serveur ne charge que son contenu. Seuls ceux du rôle sont rendus. */
export function AlertesOnglets({ onglet, role }: { onglet: OngletAlertes; role: string | undefined }) {
  const visibles = ongletsAutorises(role)
  if (visibles.length === 0) return null

  return (
    <nav
      aria-label="Sections de la page Alertes et e-mails"
      className="max-w-full overflow-x-auto"
    >
      <div className="inline-flex h-auto items-center rounded-md bg-muted p-1 text-muted-foreground">
        {visibles.map((valeur) => {
          const actif = valeur === onglet
          return (
            <Link
              key={valeur}
              href={urlOngletAlertes(valeur)}
              aria-current={actif ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-sm px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                actif && 'bg-background text-foreground shadow-sm'
              )}
            >
              {LIBELLES[valeur]}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
