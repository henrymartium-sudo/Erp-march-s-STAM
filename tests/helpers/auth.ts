import { Page } from '@playwright/test';

/**
 * Helper d'authentification pour les tests E2E
 */

export interface TestUser {
  email: string;
  password: string;
  role: 'ADMIN' | 'AVANCE' | 'EXPLOITATION' | 'VISITEUR';
}

// Les mots de passe des comptes de test ont été rotés le 2026-07-09
// (valeurs jamais commitées). Les injecter via .env.test :
// TEST_ADMIN_PASSWORD, TEST_AVANCE_PASSWORD, TEST_EXPLOITATION_PASSWORD,
// TEST_VISITEUR_PASSWORD (+ TEST_*_EMAIL optionnels).
// Les fallbacks ci-dessous sont les anciennes valeurs publiques, invalides en prod.
// Type concret (satisfies) plutôt que Record<string, TestUser> :
// avec noUncheckedIndexedAccess, l'indexation d'un Record rendait
// TEST_USERS.admin « possibly undefined » dans tous les specs.
export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@erp-marches.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'Admin123!',
    role: 'ADMIN',
  },
  avance: {
    email: process.env.TEST_AVANCE_EMAIL || 'avance@erp-marches.local',
    password: process.env.TEST_AVANCE_PASSWORD || 'Avance123!',
    role: 'AVANCE',
  },
  exploitation: {
    email: process.env.TEST_EXPLOITATION_EMAIL || 'exploitation@erp-marches.local',
    password: process.env.TEST_EXPLOITATION_PASSWORD || 'Exploitation123!',
    role: 'EXPLOITATION',
  },
  visiteur: {
    email: process.env.TEST_VISITEUR_EMAIL || 'visiteur@erp-marches.local',
    password: process.env.TEST_VISITEUR_PASSWORD || 'Visiteur123!',
    role: 'VISITEUR',
  },
} satisfies Record<string, TestUser>;

/**
 * Se connecter avec un utilisateur test
 */
export async function login(page: Page, user: TestUser) {
  await page.goto('/login');

  // Attendre que la page soit complètement chargée
  await page.waitForLoadState('networkidle');

  // Remplir le formulaire
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);

  // Cliquer sur le bouton de soumission
  await page.click('button[type="submit"]');

  // Attendre la redirection vers le dashboard
  // On accepte toute URL hors /login (gère les cas ?callbackUrl=... ou latence)
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 30000 });
}

/**
 * Se déconnecter
 */
export async function logout(page: Page) {
  // Chercher le bouton de déconnexion dans le layout
  await page.click('button:has-text("Se déconnecter")');

  // Attendre la redirection vers login
  await page.waitForURL('/login');
}

/**
 * Vérifier qu'on est authentifié
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Vérifier si on est redirigé vers login
    await page.waitForURL('/login', { timeout: 1000 });
    return false;
  } catch {
    return true;
  }
}
