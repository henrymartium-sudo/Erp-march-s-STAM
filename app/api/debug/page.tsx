/**
 * Page de diagnostic système
 * URL: /api/debug
 * WARNING: À supprimer avant production finale
 */

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 Diagnostic Système
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            Outils de diagnostic pour identifier les problèmes de connexion
          </p>

          <div className="space-y-6">
            {/* Test 1: Connexion Base de Données */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                1. Test Connexion Base de Données
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Vérifie que l'application peut se connecter à PostgreSQL et lister les utilisateurs de test
              </p>
              <a
                href="/api/debug/db"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Tester la connexion DB →
              </a>
            </div>

            {/* Test 2: Test Authentification Complète */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                2. Test Authentification Complète
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Teste toutes les étapes de l'authentification (connexion DB, recherche user, bcrypt)
              </p>
              <a
                href="/api/debug/auth?email=admin@erp-marches.local&password=Admin123!"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Tester l'authentification Admin →
              </a>
            </div>

            {/* Test 3: Page de Login */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Tester la Connexion Réelle
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Essayer de se connecter avec le formulaire de login
              </p>
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Credentials de test :
                </p>
                <p className="text-sm text-gray-600 font-mono">
                  Email: admin@erp-marches.local
                </p>
                <p className="text-sm text-gray-600 font-mono">
                  Password: Admin123!
                </p>
              </div>
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Aller à la page de login →
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📋 Résultats Attendus
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>
                  <strong>Test 1 (DB):</strong> Devrait afficher 4 utilisateurs de test avec leurs emails
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>
                  <strong>Test 2 (Auth):</strong> Devrait afficher "success": true avec 4 étapes validées
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                <span>
                  <strong>Test 3 (Login):</strong> Devrait vous connecter et rediriger vers le dashboard
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>⚠️ ATTENTION:</strong> Cette page de diagnostic doit être supprimée avant la mise en production finale car elle expose des informations sensibles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
