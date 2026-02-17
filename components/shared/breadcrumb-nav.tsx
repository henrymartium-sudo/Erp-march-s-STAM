import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
  /** Affiche l'icône Home en premier élément */
  showHome?: boolean
  className?: string
}

export function BreadcrumbNav({
  items,
  showHome = false,
  className,
}: BreadcrumbNavProps) {
  const allItems = showHome
    ? [{ label: 'Accueil', href: '/' }, ...items]
    : items

  return (
    <nav
      aria-label="Fil d'Ariane"
      className={cn('flex items-center gap-1 text-sm', className)}
    >
      {showHome && (
        <>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors duration-150 flex items-center"
            aria-label="Accueil"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          {items.length > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
          )}
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
            )}
            {isLast ? (
              <span
                className="font-medium text-foreground truncate max-w-[200px]"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-150 whitespace-nowrap"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-muted-foreground whitespace-nowrap">
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
