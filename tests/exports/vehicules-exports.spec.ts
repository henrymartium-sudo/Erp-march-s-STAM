import { test, expect } from '@playwright/test';
import { login, logout, TEST_USERS } from '../helpers/auth';
import { wait } from '../helpers/test-data';

test.describe('Véhicules - Exports PDF/Excel', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'admin
    await login(page, TEST_USERS.admin);
  });

  test('devrait afficher le bouton Exporter sur la page véhicules', async ({ page }) => {
    await page.goto('/vehicules');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
  });

  test('devrait pouvoir exporter la liste des véhicules en Excel', async ({ page }) => {
    await page.goto('/vehicules');
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

  test('devrait pouvoir exporter la liste des véhicules en PDF via la modal', async ({ page }) => {
    await page.goto('/vehicules');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();
    await wait(500);

    // Cliquer sur "PDF (.pdf)" — ouvre la modal
    const pdfOption = page.locator('text=PDF (.pdf)');
    await expect(pdfOption).toBeVisible();
    await pdfOption.click();

    // Vérifier que la modal s'ouvre
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await expect(modal.locator('text=Export PDF')).toBeVisible();
    await expect(modal.locator('input[value="portrait"]')).toBeChecked();
    await expect(modal.locator('button:has-text("Télécharger")')).toBeVisible();

    // Télécharger depuis la modal
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await modal.locator('button:has-text("Télécharger")').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    const cancelBtn = page.locator('button:has-text("Annuler")');
    if (await cancelBtn.isVisible()) await cancelBtn.click();
  });

  test('devrait pouvoir exporter avec recherche textuelle active', async ({ page }) => {
    await page.goto('/vehicules');
    await wait(1000);

    const searchInput = page.locator('input[type="search"]').or(
      page.locator('input[placeholder*="Rechercher"]')
    );

    const isVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      // Rechercher par immatriculation, marque ou modèle
      await searchInput.fill('Toyota');
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

  test('devrait pouvoir exporter avec filtre par marché', async ({ page }) => {
    await page.goto('/vehicules');
    await wait(1000);

    // Chercher un filtre par marché
    const marcheSelect = page.locator('select[name="marcheId"]').or(
      page.locator('select[aria-label*="Marché"]')
    );

    const isVisible = await marcheSelect.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      // Sélectionner un marché
      await marcheSelect.selectOption({ index: 1 });
      await wait(1000);

      // Exporter avec le filtre actif — via la modal PDF
      const exportButton = page.locator('button:has-text("Exporter")');
      await exportButton.click();
      await wait(500);

      await page.locator('text=PDF (.pdf)').click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      await modal.locator('button:has-text("Télécharger")').click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);

      const cancelBtn = page.locator('button:has-text("Annuler")');
      if (await cancelBtn.isVisible()) await cancelBtn.click();
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

    await page.goto('/vehicules');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    const count = await exportButton.count();

    if (count > 0) {
      await expect(exportButton.first()).toBeDisabled();
    }
  });

  test('devrait tester l\'export avec utilisateur AVANCÉ', async ({ page }) => {
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

    // Se connecter en tant qu'avancé
    await login(page, TEST_USERS.avance);

    await page.goto('/vehicules');
    await wait(1000);

    // Vérifier que le bouton est accessible
    const exportButton = page.locator('button:has-text("Exporter")');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();

    // Tester un export — via la modal PDF
    await exportButton.click();
    await wait(500);

    await page.locator('text=PDF (.pdf)').click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await modal.locator('button:has-text("Télécharger")').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('devrait afficher les deux options d\'export dans le menu', async ({ page }) => {
    await page.goto('/vehicules');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();
    await wait(500);

    // Vérifier le titre du menu
    const menuLabel = page.locator('text=Format d\'export');
    await expect(menuLabel).toBeVisible();

    // Vérifier la présence des deux options
    const excelOption = page.locator('text=Excel (.xlsx)');
    const pdfOption = page.locator('text=PDF (.pdf)');

    await expect(excelOption).toBeVisible();
    await expect(pdfOption).toBeVisible();

    // Vérifier les descriptions
    const excelDesc = page.locator('text=Tableur avec totaux');
    const pdfDesc = page.locator('text=Aperçu + choix orientation');

    await expect(excelDesc).toBeVisible();
    await expect(pdfDesc).toBeVisible();
  });

  test('devrait fermer le menu après un export réussi', async ({ page }) => {
    await page.goto('/vehicules');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();
    await wait(500);

    const excelOption = page.locator('text=Excel (.xlsx)');
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await excelOption.click();

    await downloadPromise;

    // Attendre que le toast apparaisse
    await expect(page.locator('text=Export Excel réussi')).toBeVisible({ timeout: 5000 });

    // Vérifier que le menu est fermé
    await wait(1000);
    const menuLabel = page.locator('text=Format d\'export');
    await expect(menuLabel).not.toBeVisible();
  });
});
