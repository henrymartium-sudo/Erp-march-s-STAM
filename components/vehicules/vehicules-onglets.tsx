import Link from 'next/link'
import { cn } from '@/lib/utils'
import { urlOngletVehicules, type OngletVehicules } from '@/lib/vehicules/onglets'

const ONGLETS: { valeur: OngletVehicules; libelle: string }[] = [
  { valeur: 'parc', libelle: 'Parc' },
  { valeur: 'sav', libelle: 'SAV' },
]

/** Onglets en liens : l'onglet change d'adresse et le serveur ne charge que son contenu. */
export function VehiculesOnglets({ onglet }: { onglet: OngletVehicules }) {
  return (
    <nav
      aria-label="Sections de la page Véhicules"
      className="inline-flex h-auto items-center rounded-md bg-muted p-1 text-muted-foreground"
    >
      {ONGLETS.map(({ valeur, libelle }) => {
        const actif = valeur === onglet
        return (
          <Link
            key={valeur}
            href={urlOngletVehicules(valeur)}
            aria-current={actif ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-sm px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              actif && 'bg-background text-foreground shadow-sm'
            )}
          >
            {libelle}
          </Link>
        )
      })}
    </nav>
  )
}
