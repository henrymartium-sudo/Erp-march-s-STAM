import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ERP Marchés Publics</h1>
        <p className="mt-2 text-sm text-gray-600">
          Connectez-vous pour accéder à votre espace
        </p>
      </div>

      <LoginForm />

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Système de gestion des marchés publics - STAM
        </p>
      </div>
    </div>
  )
}
