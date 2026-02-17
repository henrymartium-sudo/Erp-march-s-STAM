import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(30,58,95,0.12)] border border-gray-100 p-8">
      {/* Header */}
      <div className="mb-8">
        {/* Logo mobile uniquement */}
        <div className="flex items-center gap-3 mb-6 lg:hidden">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="hsl(45 77% 44%)" />
            <text x="18" y="26" textAnchor="middle"
              fontFamily="DM Sans, system-ui, sans-serif"
              fontWeight="900" fontSize="20" fill="hsl(214 52% 18%)">S</text>
          </svg>
          <div>
            <div className="font-bold text-base tracking-widest uppercase text-foreground leading-tight">STAM</div>
            <div className="text-xs text-muted-foreground leading-tight">Marchés Publics</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Connexion
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Accédez à votre espace de gestion
        </p>
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Système sécurisé — STAM v2.0
      </p>
    </div>
  )
}
