import { test, expect } from '@playwright/test';
import { login, logout, TEST_USERS } from '../helpers/auth';
import { wait } from '../helpers/test-data';

test.describe('Documents - Exports PDF/Excel', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'admin
    await login(page, TEST_USERS.admin);
  });

  test('devrait afficher le bouton Exporter sur la page documents', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
  });

  test('devrait pouvoir exporter la liste des documents en Excel', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();
    await wait(500);

    const excelOption = page.locator('text=Excel (.xlsx)');
    await expect(excelOption).toBeVisible();

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await excelOption.click();

    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toBeTruthy();
    expect(filename).toMatch(/\.xlsx$/);

    await expect(page.locator('text=Export Excel réussi')).toBeVisible({ timeout: 5000 });
  });

  test('devrait pouvoir exporter la liste des documents en PDF', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();
    await wait(500);

    const pdfOption = page.locator('text=PDF (.pdf)');
    await expect(pdfOption).toBeVisible();

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await pdfOption.click();

    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toBeTruthy();
    expect(filename).toMatch(/\.pdf$/);

    await expect(page.locator('text=Export PDF réussi')).toBeVisible({ timeout: 5000 });
  });

  test('devrait pouvoir exporter avec filtre par type de document', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Chercher un filtre de type de document
    const typeSelect = page.locator('select[name="type"]').or(
      page.locator('select[aria-label*="Type"]')
    );

    const isVisible = await typeSelect.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      // Sélectionner un type
      await typeSelect.selectOption({ index: 1 });
      await wait(1000);

      // Exporter avec le filtre actif
      const exportButton = page.locator('button:has-text("Exporter")');
      await exportButton.click();
      await wait(500);

      const excelOption = page.locator('text=Excel (.xlsx)');
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
      await excelOption.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    }
  });

  test('devrait pouvoir exporter avec filtre par phase', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Chercher un filtre de phase
    const phaseSelect = page.locator('select[name="phase"]').or(
      page.locator('select[aria-label*="Phase"]')
    );

    const isVisible = await phaseSelect.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      // Sélectionner une phase
      await phaseSelect.selectOption({ index: 1 });
      await wait(1000);

      // Exporter avec le filtre actif
      const exportButton = page.locator('button:has-text("Exporter")');
      await exportButton.click();
      await wait(500);

      const pdfOption = page.locator('text=PDF (.pdf)');
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
      await pdfOption.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    }
  });

  test('devrait pouvoir exporter avec recherche textuelle active', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const searchInput = page.locator('input[type="search"]').or(
      page.locator('input[placeholder*="Rechercher"]')
    );

    const isVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      await searchInput.fill('test');
      await wait(1000);

      const exportButton = page.locator('button:has-text("Exporter")');
      await exportButton.click();
      await wait(500);

      const excelOption = page.locator('text=Excel (.xlsx)');
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
      await excelOption.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    }
  });

  test('devrait désactiver le bouton Exporter pour un utilisateur VISITEUR', async ({ page }) => {
    // Se déconnecter
    await page.goto('/');
    const logoutButton = page.locator('button:has-text("Se déconnecter")').or(
      page.locator('button:has-text("Déconnexion")')
    );

    const isVisible = await logoutButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await logoutButton.click();
      await wait(1000);
    }

    // Se connecter en tant que visiteur
    await login(page, TEST_USERS.visiteur);

    await page.goto('/documents');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    const count = await exportButton.count();

    if (count > 0) {
      await expect(exportButton.first()).toBeDisabled();
    }
  });

  test('devrait vérifier que les deux formats sont disponibles simultanément', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();
    await wait(500);

    // Vérifier la présence des deux options
    const excelOption = page.locator('text=Excel (.xlsx)');
    const pdfOption = page.locator('text=PDF (.pdf)');

    await expect(excelOption).toBeVisible();
    await expect(pdfOption).toBeVisible();

    // Vérifier que les deux sont cliquables
    await expect(excelOption).not.toBeDisabled();
    await expect(pdfOption).not.toBeDisabled();
  });
});
