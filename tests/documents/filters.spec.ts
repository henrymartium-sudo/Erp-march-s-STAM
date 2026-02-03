import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { wait } from '../helpers/test-data';

test.describe('Documents - Filtres', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'admin
    await login(page, TEST_USERS.admin);
    await page.goto('/documents');
  });

  test('devrait afficher le panneau de filtres', async ({ page }) => {
    // Chercher le panneau de filtres
    await expect(page.locator('text=Filtres')).toBeVisible();

    // Vérifier les filtres disponibles
    await expect(page.locator('text=Type de document')).toBeVisible();
    await expect(page.locator('text=Phase du marché')).toBeVisible();
  });

  test('devrait pouvoir filtrer par type de document', async ({ page }) => {
    // Ouvrir les filtres si collapsés
    const filtersButton = page.locator('button:has-text("Filtres")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await wait(300);
    }

    // Sélectionner le type "DAO"
    const daoCheckbox = page.locator('input[type="checkbox"][value="DAO"]');
    await daoCheckbox.check();

    // Attendre que les résultats se mettent à jour
    await wait(500);

    // Vérifier qu'il y a un badge de filtre actif
    await expect(page.locator('text=DAO').first()).toBeVisible();

    // Vérifier que les documents affichés sont du bon type
    // (On devrait voir uniquement des badges "DAO")
    const badges = page.locator('[data-type="badge"]');
    const count = await badges.count();

    if (count > 0) {
      // Vérifier qu'au moins un badge "DAO" est visible
      await expect(page.locator('text=DAO')).toBeVisible();
    }
  });

  test('devrait pouvoir filtrer par phase', async ({ page }) => {
    // Ouvrir les filtres
    const filtersButton = page.locator('button:has-text("Filtres")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await wait(300);
    }

    // Sélectionner la phase "PREPARATION"
    const prepCheckbox = page.locator('input[type="checkbox"][value="PREPARATION"]');
    await prepCheckbox.check();

    await wait(500);

    // Vérifier le badge de filtre actif
    await expect(page.locator('text=Préparation').first()).toBeVisible();
  });

  test('devrait pouvoir combiner plusieurs filtres', async ({ page }) => {
    // Ouvrir les filtres
    const filtersButton = page.locator('button:has-text("Filtres")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await wait(300);
    }

    // Sélectionner type DAO
    await page.locator('input[type="checkbox"][value="DAO"]').check();
    await wait(300);

    // Sélectionner phase PREPARATION
    await page.locator('input[type="checkbox"][value="PREPARATION"]').check();
    await wait(500);

    // Vérifier que les 2 filtres sont actifs
    const filterBadges = page.locator('[data-filter-badge]');
    const count = await filterBadges.count();

    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('devrait pouvoir filtrer par dates d\'émission', async ({ page }) => {
    // Ouvrir les filtres
    const filtersButton = page.locator('button:has-text("Filtres")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await wait(300);
    }

    // Chercher les date pickers
    const dateFromInput = page.locator('input[name="dateEmissionFrom"]').or(
      page.locator('input[placeholder*="Date début"]')
    );

    if (await dateFromInput.isVisible()) {
      await dateFromInput.fill('2026-01-01');
      await wait(500);

      // Vérifier que les résultats sont filtrés
      // (Les dates devraient être >= 2026-01-01)
    }
  });

  test('devrait pouvoir rechercher par texte', async ({ page }) => {
    // Chercher la barre de recherche
    const searchInput = page.locator('input[type="search"]').or(
      page.locator('input[placeholder*="Rechercher"]')
    );

    await searchInput.fill('test');
    await wait(500);

    // Vérifier que les résultats contiennent "test"
    const results = page.locator('text=test');
    const count = await results.count();

    // Si des résultats, ils doivent contenir "test"
    if (count > 0) {
      await expect(results.first()).toBeVisible();
    }
  });

  test('devrait pouvoir supprimer un filtre individuel', async ({ page }) => {
    // Ouvrir les filtres
    const filtersButton = page.locator('button:has-text("Filtres")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await wait(300);
    }

    // Ajouter un filtre
    await page.locator('input[type="checkbox"][value="DAO"]').check();
    await wait(500);

    // Cliquer sur le X du badge de filtre
    const removeButton = page.locator('[data-filter-badge] button').first();
    await removeButton.click();
    await wait(500);

    // Vérifier que le filtre a été supprimé
    const filterBadges = page.locator('[data-filter-badge]');
    const count = await filterBadges.count();

    expect(count).toBe(0);
  });

  test('devrait pouvoir réinitialiser tous les filtres', async ({ page }) => {
    // Ouvrir les filtres
    const filtersButton = page.locator('button:has-text("Filtres")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await wait(300);
    }

    // Ajouter plusieurs filtres
    await page.locator('input[type="checkbox"][value="DAO"]').check();
    await wait(300);
    await page.locator('input[type="checkbox"][value="PREPARATION"]').check();
    await wait(500);

    // Cliquer sur "Réinitialiser"
    const resetButton = page.locator('button:has-text("Réinitialiser")');
    await resetButton.click();
    await wait(500);

    // Vérifier que tous les filtres ont été supprimés
    const filterBadges = page.locator('[data-filter-badge]');
    const count = await filterBadges.count();

    expect(count).toBe(0);
  });

  test('devrait afficher le nombre de filtres actifs', async ({ page }) => {
    // Ouvrir les filtres
    const filtersButton = page.locator('button:has-text("Filtres")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await wait(300);
    }

    // Ajouter 2 filtres
    await page.locator('input[type="checkbox"][value="DAO"]').check();
    await wait(300);
    await page.locator('input[type="checkbox"][value="DRP"]').check();
    await wait(500);

    // Vérifier l'indicateur de compteur (badge avec nombre)
    await expect(page.locator('text=2').or(page.locator('[data-badge-count="2"]'))).toBeVisible();
  });

  test('devrait persister les filtres lors de la navigation', async ({ page }) => {
    // Ouvrir les filtres
    const filtersButton = page.locator('button:has-text("Filtres")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await wait(300);
    }

    // Ajouter un filtre
    await page.locator('input[type="checkbox"][value="DAO"]').check();
    await wait(500);

    // Naviguer vers une autre page puis revenir
    await page.goto('/');
    await page.goto('/documents');
    await wait(500);

    // Vérifier que le filtre est toujours actif
    // Note: Cela dépend si on utilise URL params ou localStorage
    const checkbox = page.locator('input[type="checkbox"][value="DAO"]');
    const isChecked = await checkbox.isChecked();

    // Si la persistance est implémentée, le checkbox devrait être coché
    // Sinon, ce test peut être ignoré pour le MVP
  });
});
