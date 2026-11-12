import Link from 'next/link'
import { paramVue, type Vue } from '@/lib/tableau-de-bord/presentation'
import { cn } from '@/lib/utils'

const VUES: { vue: Vue; libelle: string }[] = [
  { vue: 'tout', libelle: 'Tout' },
  { vue: 'passation', libelle: 'Passation' },
  { vue: 'exec', libelle: 'Exécution et finances' },
]

/** Filtre de la page : de simples liens, l'état vit dans l'adresse (`?vue=`). */
export function FiltreVue({ vue }: { vue: Vue }) {
  return (
    <nav aria-label="Filtrer la page" className="flex flex-wrap gap-2">
      {VUES.map((v) => {
        const param = paramVue(v.vue)
        const actif = v.vue === vue
        return (
          <Link
            key={v.vue}
            href={param ? `/?vue=${param}` : '/'}
            aria-current={actif ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors',
              actif
                ? 'border-stam-primary bg-stam-primary text-white'
                : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {v.libelle}
          </Link>
        )
      })}
    </nav>
  )
}
