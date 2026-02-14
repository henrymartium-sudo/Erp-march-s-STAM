import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { waitForDashboardLoaded } from '../helpers/dashboard';

/**
 * Tests E2E - Dashboard - Quick Actions
 * Vérifie les 4 boutons de navigation rapide
 */
test.describe('Dashboard - Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'ADMIN pour tous les tests
    await login(page, TEST_USERS.admin);
    await waitForDashboardLoaded(page);
  });

  test('devrait afficher la section Actions rapides', async ({ page }) => {
    const section = page.locator('text=Actions rapides').locator('..');

    await expect(section).toBeVisible();

    // Vérifier la présence des 4 boutons
    await expect(page.locator('text=Nouveau marché')).toBeVisible();
    await expect(page.locator('text=Nouvelle caution')).toBeVisible();
    await expect(page.locator('text=Nouveau véhicule')).toBeVisible();
    await expect(page.locator('text=Voir les documents')).toBeVisible();
  });

  test('devrait naviguer vers /marches/nouveau', async ({ page }) => {
    await page.click('text=Nouveau marché');

    // Vérifier la navigation
    await page.waitForURL('/marches/nouveau', { timeout: 5000 });

    // Vérifier la présence du formulaire
    await expect(page.locator('text=Créer un nouveau marché').or(
      page.locator('text=Nouveau marché')
    )).toBeVisible();
  });

  test('devrait naviguer vers /cautions/nouvelle', async ({ page }) => {
    await page.click('text=Nouvelle caution');

    await page.waitForURL('/cautions/nouvelle', { timeout: 5000 });

    await expect(page.locator('text=Créer une nouvelle caution').or(
      page.locator('text=Nouvelle caution')
    )).toBeVisible();
  });

  test('devrait naviguer vers /vehicules/nouveau', async ({ page }) => {
    await page.click('text=Nouveau véhicule');

    await page.waitForURL('/vehicules/nouveau', { timeout: 5000 });

    await expect(page.locator('text=Créer un nouveau véhicule').or(
      page.locator('text=Nouveau véhicule')
    )).toBeVisible();
  });

  test('devrait naviguer vers /documents', async ({ page }) => {
    await page.click('text=Voir les documents');

    await page.waitForURL('/documents', { timeout: 5000 });

    await expect(page.locator('text=Documents').or(
      page.locator('text=Gestion des documents')
    )).toBeVisible();
  });

  test('devrait afficher les actions en grille responsive', async ({ page }) => {
    const grid = page.locator('text=Actions rapides').locator('..').locator('div[class*="grid"]').first();

    // Vérifier la présence de classes responsive
    const className = await grid.getAttribute('class');
    expect(className).toContain('grid');

    // Desktop devrait avoir 2 ou 4 colonnes
    expect(className).toMatch(/grid-cols-(2|4)/);
  });
});
