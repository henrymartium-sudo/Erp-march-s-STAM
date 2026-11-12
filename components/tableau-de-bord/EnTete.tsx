import Link from 'next/link'
import { Car, ChevronDown, FileText, Plus, Receipt, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { canWrite } from '@/lib/utils/permissions'

const CREATIONS = [
  { href: '/marches/nouveau', libelle: 'Marché', Icone: FileText },
  { href: '/cautions/nouvelle', libelle: 'Caution', Icone: Shield },
  { href: '/vehicules/nouveau', libelle: 'Véhicule', Icone: Car },
  { href: '/factures/nouvelle', libelle: 'Facture', Icone: Receipt },
]

function dateDuJour(d: Date): string {
  const texte = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeZone: 'UTC' }).format(d)
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

/** Titre de la page (seul `<h1>`), date du jour, et création seulement pour les rôles qui peuvent écrire. */
export function EnTete({ role, aujourdHui }: { role: string | null | undefined; aujourdHui: Date }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">{dateDuJour(aujourdHui)}</p>
      </div>
      {canWrite(role) && (
        <div className="flex gap-2">
          <Button asChild className="min-h-11 flex-1 sm:flex-none">
            <Link href="/opportunites/nouvelle">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nouvelle opportunité
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-h-11">
                Créer…
                <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CREATIONS.map(({ href, libelle, Icone }) => (
                <DropdownMenuItem key={href} asChild className="min-h-11">
                  <Link href={href}>
                    <Icone className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {libelle}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
