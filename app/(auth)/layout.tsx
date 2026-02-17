import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion — STAM Marchés Publics',
  description: "Connexion à l'application de gestion des marchés publics STAM",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche : identité STAM (desktop uniquement) ── */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{ backgroundColor: 'hsl(214 52% 18%)' }}
      >
        {/* Motif géométrique décoratif */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-[0.06]"
            style={{ backgroundColor: 'hsl(45 77% 44%)' }}
          />
          <div
            className="absolute bottom-16 -left-16 w-64 h-64 rounded-full opacity-[0.05]"
            style={{ backgroundColor: 'hsl(45 77% 44%)' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.03]"
            style={{ border: '2px solid hsl(45 77% 44%)' }}
          />
        </div>

        {/* Logo haut */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="10" fill="hsl(45 77% 44%)" />
              <text x="24" y="35" textAnchor="middle"
                fontFamily="DM Sans, system-ui, sans-serif"
                fontWeight="900" fontSize="26" fill="hsl(214 52% 18%)">S</text>
            </svg>
            <div>
              <div className="text-white font-bold text-xl tracking-[0.1em] uppercase leading-tight">
                STAM
              </div>
              <div className="text-[11px] tracking-[0.15em] uppercase leading-tight"
                   style={{ color: 'hsl(214 25% 58%)' }}>
                Société Togolaise d'Automobile
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Gestion des<br />
            <span style={{ color: 'hsl(45 77% 44%)' }}>Marchés Publics</span>
          </h2>
          <p className="text-[15px] leading-relaxed" style={{ color: 'hsl(214 25% 70%)' }}>
            Centralisez, suivez et maîtrisez votre portefeuille de marchés publics en toute sécurité.
          </p>
        </div>

        {/* Features bas */}
        <div className="relative z-10 space-y-3">
          {[
            'Suivi des marchés en temps réel',
            'Gestion des cautions et garanties',
            'Alertes et échéances automatiques',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'hsl(45 77% 44%)' }}
              />
              <span className="text-sm" style={{ color: 'hsl(214 25% 70%)' }}>
                {feature}
              </span>
            </div>
          ))}
          <div className="mt-8 text-xs" style={{ color: 'hsl(214 25% 45%)' }}>
            © {new Date().getFullYear()} STAM — Tous droits réservés
          </div>
        </div>
      </div>

      {/* ── Panneau droit : formulaire ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
