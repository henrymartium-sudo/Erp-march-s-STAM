'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  FileText,
  Shield,
  Car,
  FolderOpen,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserCircle,
  Wrench,
  Users,
  ClipboardList,
  BarChart2,
  Receipt,
  Target,
  FolderCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { NotificationBell } from '@/components/admin/alertes/notifications/notification-bell'

type BadgeVariant = 'success' | 'warning' | 'info' | 'muted'

function getRoleVariant(role?: string | null): BadgeVariant {
  switch (role) {
    case 'ADMIN':       return 'success'
    case 'AVANCE':      return 'warning'
    case 'EXPLOITATION': return 'info'
    default:            return 'muted'
  }
}

function getRoleLabel(role?: string | null): string {
  switch (role) {
    case 'ADMIN':       return 'Admin'
    case 'AVANCE':      return 'Avancé'
    case 'EXPLOITATION': return 'Exploitation'
    case 'VISITEUR':    return 'Visiteur'
    default:            return role ?? 'Visiteur'
  }
}

/* ── Navigation items ─────────────────────────────────────────────── */
const navItems = [
  { href: '/',                      label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/marches',               label: 'Marchés',      icon: FileText },
  { href: '/cautions',              label: 'Cautions',     icon: Shield },
  { href: '/vehicules',             label: 'Véhicules',    icon: Car },
  { href: '/vehicules/sav',         label: 'SAV',          icon: Wrench },
  { href: '/factures',              label: 'Facturation',  icon: Receipt },
  { href: '/opportunites',          label: 'Opportunités',    icon: Target },
  { href: '/dossiers-offre',        label: "Dossiers d'offre", icon: FolderCheck },
  { href: '/documents',             label: 'Documents',        icon: FolderOpen },
  { href: '/admin/alertes',         label: 'Alertes',      icon: Bell },
  { href: '/admin/utilisateurs',    label: 'Utilisateurs', icon: Users, roles: ['ADMIN'] },
  { href: '/admin/audit-logs',      label: 'Journal des logs', icon: ClipboardList, roles: ['ADMIN'] },
  { href: '/admin/reporting',       label: 'Reporting',        icon: BarChart2,     roles: ['ADMIN'] },
]

const pageTitles: Record<string, string> = {
  '/':                   'Tableau de bord',
  '/marches':            'Marchés publics',
  '/cautions':           'Cautions & Garanties',
  '/vehicules':          'Véhicules',
  '/vehicules/sav':      'SAV — Vue globale',
  '/factures':           'Facturation',
  '/opportunites':       'Opportunités',
  '/dossiers-offre':     "Dossiers d'offre",
  '/documents':          'Documents',
  '/admin/alertes':      'Alertes & Notifications',
  '/admin/utilisateurs': 'Gestion des utilisateurs',
  '/admin/audit-logs':   'Journal des logs',
  '/admin/reporting':    'Reporting Email',
  '/profil':             'Mon profil',
}

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Tableau de bord'
  for (const [path, title] of Object.entries(pageTitles)) {
    if (path !== '/' && pathname.startsWith(path)) return title
  }
  return 'STAM ERP'
}

/* ── Sidebar content ──────────────────────────────────────────────── */
interface SidebarContentProps {
  userName?: string | null
  userRole?: string | null
  onClose?: () => void
  /** true = mobile overlay (full labels forcées) */
  forceExpanded?: boolean
}

function SidebarContent({ userName, userRole, onClose, forceExpanded = false }: SidebarContentProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}>

      {/* ── Logo zone ── */}
      <div
        className={cn(
          'flex items-center border-b py-[18px]',
          forceExpanded
            ? 'px-5 gap-3'
            : 'justify-center px-2 lg:justify-start lg:px-5 lg:gap-3'
        )}
        style={{
          backgroundColor: 'hsl(var(--sidebar-logo-bg))',
          borderColor: 'hsl(var(--sidebar-border))',
        }}
      >
        {/* Icône "S" — toujours visible */}
        <div className="flex-shrink-0">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="hsl(45 77% 44%)" />
            <rect x="1" y="1" width="34" height="34" rx="7" stroke="hsl(45 85% 60%)" strokeWidth="0.5" strokeOpacity="0.4" />
            <text
              x="18" y="26"
              textAnchor="middle"
              fontFamily="DM Sans, system-ui, sans-serif"
              fontWeight="900"
              fontSize="20"
              letterSpacing="-0.5"
              fill="hsl(214 52% 18%)"
            >S</text>
          </svg>
        </div>
        {/* Texte — masqué en mode icônes tablette */}
        <div className={cn('leading-none', forceExpanded ? 'block' : 'hidden lg:block')}>
          <div className="text-white font-bold text-[15px] tracking-[0.08em] uppercase leading-tight">
            STAM
          </div>
          <div
            className="text-[10px] tracking-[0.12em] uppercase leading-tight mt-0.5"
            style={{ color: 'hsl(214 25% 58%)' }}
          >
            Marchés Publics
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className={cn(
        'flex-1 py-5 overflow-y-auto space-y-0.5',
        forceExpanded ? 'px-3' : 'px-1.5 lg:px-3'
      )}>
        {navItems.filter(item => !item.roles || (userRole && item.roles.includes(userRole))).map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={item.label}
              className={cn(
                'group flex items-center py-[9px] rounded-lg text-[13px] font-medium transition-all duration-150 select-none',
                /* Tablette : centré, sans gap ni px. Desktop / mobile overlay : left, gap-3, px-3 */
                forceExpanded
                  ? 'justify-start gap-3 px-3'
                  : 'justify-center gap-0 px-0 lg:justify-start lg:gap-3 lg:px-3',
                active && 'sidebar-active-border',
              )}
              style={
                active
                  ? { backgroundColor: 'hsl(var(--sidebar-active-bg))', color: 'white' }
                  : { color: 'hsl(var(--sidebar-muted))' }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(var(--sidebar-hover-bg))'
                  ;(e.currentTarget as HTMLElement).style.color = 'hsl(0 0% 100%)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = ''
                  ;(e.currentTarget as HTMLElement).style.color = 'hsl(var(--sidebar-muted))'
                }
              }}
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span className={cn('flex-1', forceExpanded ? 'block' : 'hidden lg:block')}>
                {item.label}
              </span>
              {active && (
                <ChevronRight className={cn('h-3 w-3 opacity-50', forceExpanded ? 'block' : 'hidden lg:block')} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── User + Logout ── */}
      <div
        className={cn('border-t space-y-1', forceExpanded ? 'p-3' : 'p-1.5 lg:p-3')}
        style={{ borderColor: 'hsl(var(--sidebar-border))' }}
      >
        {/* Avatar + infos */}
        <div className={cn(
          'flex items-center py-2',
          forceExpanded ? 'gap-3 px-3' : 'justify-center gap-0 px-1 lg:justify-start lg:gap-3 lg:px-3'
        )}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, hsl(45 77% 44%) 0%, hsl(45 85% 55%) 100%)',
              color: 'hsl(214 52% 18%)',
            }}
          >
            {userName?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className={cn('min-w-0 flex-1', forceExpanded ? 'block' : 'hidden lg:block')}>
            <div className="text-white text-[13px] font-medium truncate leading-tight">
              {userName ?? 'Utilisateur'}
            </div>
            <div className="mt-1">
              <Badge
                variant={getRoleVariant(userRole)}
                className="text-[10px] px-1.5 py-0 h-4 leading-none"
              >
                {getRoleLabel(userRole)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Lien Mon profil */}
        <Link
          href="/profil"
          onClick={onClose}
          title="Mon profil"
          className={cn(
            'flex items-center w-full py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
            forceExpanded ? 'gap-3 px-3' : 'justify-center gap-0 px-1 lg:justify-start lg:gap-3 lg:px-3'
          )}
          style={{ color: 'hsl(var(--sidebar-muted))' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'white'
            el.style.backgroundColor = 'hsl(var(--sidebar-hover-bg))'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'hsl(var(--sidebar-muted))'
            el.style.backgroundColor = ''
          }}
        >
          <UserCircle className="h-4 w-4 flex-shrink-0" />
          <span className={forceExpanded ? 'block' : 'hidden lg:block'}>Mon profil</span>
        </Link>

        {/* Bouton déconnexion */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Déconnexion"
          className={cn(
            'flex items-center w-full py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
            forceExpanded ? 'gap-3 px-3' : 'justify-center gap-0 px-1 lg:justify-start lg:gap-3 lg:px-3'
          )}
          style={{ color: 'hsl(var(--sidebar-muted))' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'hsl(0 72% 65%)'
            el.style.backgroundColor = 'hsl(0 72% 51% / 0.08)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'hsl(var(--sidebar-muted))'
            el.style.backgroundColor = ''
          }}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span className={forceExpanded ? 'block' : 'hidden lg:block'}>Déconnexion</span>
        </button>
      </div>
    </div>
  )
}

/* ── DashboardShell ───────────────────────────────────────────────── */
interface DashboardShellProps {
  children: React.ReactNode
  userName?: string | null
  userRole?: string | null
}

export function DashboardShell({ children, userName, userRole }: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pageTitle = getPageTitle(pathname)

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Sidebar visible dès md : icônes (md) → labels (lg) ── */}
      <aside
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-14 lg:w-sidebar z-40"
        style={{ boxShadow: '2px 0 12px rgba(14, 30, 54, 0.3)' }}
      >
        <SidebarContent userName={userName} userRole={userRole} />
      </aside>

      {/* ── Sidebar mobile overlay (< md) ── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 w-sidebar z-50 flex flex-col md:hidden animate-slide-in-left"
          >
            <SidebarContent
              userName={userName}
              userRole={userRole}
              onClose={() => setMobileOpen(false)}
              forceExpanded
            />
          </aside>
        </>
      )}

      {/* ── Zone principale ── */}
      {/* md: décalée de 56px (icônes), lg: décalée de 240px (full) */}
      <div className="flex flex-col flex-1 min-h-screen md:pl-14 lg:pl-sidebar">

        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-4 bg-white px-4 lg:px-6"
          style={{
            height: '56px',
            borderBottom: '1px solid hsl(var(--border))',
            boxShadow: '0 1px 4px rgba(30, 58, 95, 0.07)',
          }}
        >
          {/* Hamburger — visible uniquement < md */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            onClick={() => setMobileOpen(!mobileOpen)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'hsl(var(--muted))')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Titre page */}
          <div className="flex-1 min-w-0">
            <h1
              className="text-[15px] font-semibold tracking-tight truncate"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {pageTitle}
            </h1>
          </div>

          {/* Cloche notifications in-app */}
          <NotificationBell />

          {/* Avatar + infos utilisateur */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end gap-0.5 leading-none">
              <div className="text-[13px] font-medium text-foreground">
                {userName ?? 'Utilisateur'}
              </div>
              <Badge
                variant={getRoleVariant(userRole)}
                className="text-[10px] px-1.5 py-0 h-4 leading-none"
              >
                {getRoleLabel(userRole)}
              </Badge>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold select-none"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--stam-primary)) 0%, hsl(var(--stam-primary-light)) 100%)',
                color: 'white',
              }}
            >
              {userName?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
