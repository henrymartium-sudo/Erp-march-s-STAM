import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { waitForDashboardLoaded } from '../helpers/dashboard';

/**
 * Tests E2E - Page d'accueil - Authentification & accès par rôle
 * L'accès exige une connexion ; les quatre rôles voient le tableau de bord.
 */
test.describe('Tableau de bord - Authentification', () => {
  test.describe.configure({ timeout: 120000 });

  test('devrait rediriger vers /login si non authentifié', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  for (const role of ['admin', 'avance', 'exploitation', 'visiteur'] as const) {
    test(`devrait afficher le tableau de bord après login ${role.toUpperCase()}`, async ({ page }) => {
      await login(page, TEST_USERS[role]);
      await waitForDashboardLoaded(page);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByRole('region', { name: 'À traiter' })).toBeVisible();
    });
  }
});
