import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { waitForDashboardLoaded } from '../helpers/dashboard';

/**
 * Tests E2E - Page d'accueil - Création selon le rôle
 * ADMIN et AVANCE créent (bouton « Nouvelle opportunité » et menu « Créer… ») ; EXPLOITATION et VISITEUR non.
 * Le détail des blocs et des montants par rôle est dans tableau-de-bord.spec.ts.
 */
test.describe('Tableau de bord - Création selon le rôle', () => {
  test.describe.configure({ timeout: 120000 });

  test('ADMIN : le menu « Créer… » mène aux formulaires de création', async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await waitForDashboardLoaded(page);

    await page.getByRole('button', { name: /Créer/ }).click();
    await page.getByRole('menuitem', { name: 'Marché' }).click();
    await page.waitForURL('**/marches/nouveau', { timeout: 60000 });
  });

  test('AVANCE : « Nouvelle opportunité » est proposé', async ({ page }) => {
    await login(page, TEST_USERS.avance);
    await waitForDashboardLoaded(page);

    await expect(page.getByRole('link', { name: 'Nouvelle opportunité' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Créer/ })).toBeVisible();
  });

  for (const role of ['exploitation', 'visiteur'] as const) {
    test(`${role.toUpperCase()} : aucun bouton de création`, async ({ page }) => {
      await login(page, TEST_USERS[role]);
      await waitForDashboardLoaded(page);

      await expect(page.getByRole('link', { name: 'Nouvelle opportunité' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Créer/ })).toHaveCount(0);
    });
  }
});
