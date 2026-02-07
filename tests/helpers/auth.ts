import { Page } from '@playwright/test';

/**
 * Helper d'authentification pour les tests E2E
 */

export interface TestUser {
  email: string;
  password: string;
  role: 'ADMIN' | 'AVANCE' | 'EXPLOITATION' | 'VISITEUR';
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'admin@erp-marches.local',
    password: 'Admin123!',
    role: 'ADMIN',
  },
  avance: {
    email: 'avance@erp-marches.local',
    password: 'Avance123!',
    role: 'AVANCE',
  },
  exploitation: {
    email: 'exploitation@erp-marches.local',
    password: 'Exploitation123!',
    role: 'EXPLOITATION',
  },
  visiteur: {
    email: 'visiteur@erp-marches.local',
    password: 'Visiteur123!',
    role: 'VISITEUR',
  },
};

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

  // Attendre la redirection vers le dashboard (avec timeout augmenté)
  await page.waitForURL('/', { timeout: 30000 });
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
