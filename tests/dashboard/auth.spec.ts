import { test, expect } from '@playwright/test';
import { login, logout, TEST_USERS } from '../helpers/auth';
import { waitForDashboardLoaded } from '../helpers/dashboard';

/**
 * Tests E2E - Dashboard - Authentification & Redirection
 * Vérifie que l'accès au dashboard nécessite une authentification
 */
test.describe('Dashboard - Authentification', () => {
  test('devrait rediriger vers /login si non authentifié', async ({ page }) => {
    // Tenter d'accéder au dashboard sans être connecté
    await page.goto('/');

    // Vérifier la redirection vers /login (avec callbackUrl possible)
    await expect(page).toHaveURL(/\/login/);
  });

  test('devrait afficher le dashboard après login ADMIN', async ({ page }) => {
    // Se connecter en tant qu'ADMIN
    await login(page, TEST_USERS.admin);

    // Attendre le chargement du dashboard
    await waitForDashboardLoaded(page);

    // Vérifier la présence d'éléments du dashboard
    await expect(page.locator('text=Marchés actifs')).toBeVisible();
    await expect(page.locator('text=Actions rapides')).toBeVisible();
  });

  test('devrait afficher le dashboard après login AVANCE', async ({ page }) => {
    await login(page, TEST_USERS.avance);
    await waitForDashboardLoaded(page);

    await expect(page.locator('text=Marchés actifs')).toBeVisible();
  });

  test('devrait afficher le dashboard après login EXPLOITATION', async ({ page }) => {
    await login(page, TEST_USERS.exploitation);
    await waitForDashboardLoaded(page);

    await expect(page.locator('text=Marchés actifs')).toBeVisible();
  });

  test('devrait afficher le dashboard après login VISITEUR', async ({ page }) => {
    await login(page, TEST_USERS.visiteur);
    await waitForDashboardLoaded(page);

    // Les visiteurs peuvent voir le dashboard (read-only)
    await expect(page.locator('text=Marchés actifs')).toBeVisible();
  });
});
