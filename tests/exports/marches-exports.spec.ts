import { test, expect } from '@playwright/test';
import { login, logout, TEST_USERS } from '../helpers/auth';
import { wait } from '../helpers/test-data';

test.describe('Marchés - Exports PDF/Excel', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'admin (permission EXPLOITATION minimum requise)
    await login(page, TEST_USERS.admin);
  });

  test('devrait afficher le bouton Exporter sur la page marchés', async ({ page }) => {
    await page.goto('/marches');
    await wait(1000);

    // Vérifier la présence du bouton Exporter
    const exportButton = page.locator('button:has-text("Exporter")');
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
  });

  test('devrait pouvoir exporter la liste des marchés en Excel', async ({ page }) => {
    await page.goto('/marches');
    await wait(1000);

    // Cliquer sur le bouton Exporter
    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();

    // Attendre que le menu dropdown s'affiche
    await wait(500);

    // Vérifier que l'option Excel est visible
    const excelOption = page.locator('text=Excel (.xlsx)');
    await expect(excelOption).toBeVisible();

    // Écouter l'événement de téléchargement
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    // Cliquer sur l'option Excel
    await excelOption.click();

    // Attendre le téléchargement
    const download = await downloadPromise;

    // Vérifier le nom du fichier
    const filename = download.suggestedFilename();
    expect(filename).toBeTruthy();
    expect(filename).toMatch(/\.xlsx$/);

    // Vérifier le toast de succès
    await expect(page.locator('text=Export Excel réussi')).toBeVisible({ timeout: 5000 });
  });

  test('devrait pouvoir exporter la liste des marchés en PDF via la modal', async ({ page }) => {
    await page.goto('/marches');
    await wait(1000);

    // Ouvrir le menu export
    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();
    await wait(500);

    // Cliquer sur "PDF (.pdf)" — ouvre la modal (plus de téléchargement direct)
    const pdfOption = page.locator('text=PDF (.pdf)');
    await expect(pdfOption).toBeVisible();
    await pdfOption.click();

    // Vérifier que la modal s'ouvre
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Vérifier les éléments de la modal
    await expect(modal.locator('text=Export PDF')).toBeVisible();
    await expect(modal.locator('input[value="portrait"]')).toBeChecked();
    await expect(modal.locator('input[value="landscape"]')).toBeVisible();
    await expect(modal.locator('button:has-text("Prévisualiser")')).toBeVisible();
    await expect(modal.locator('button:has-text("Télécharger")')).toBeVisible();

    // Tester le téléchargement depuis la modal
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await modal.locator('button:has-text("Télécharger")').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    // Fermer la modal si elle est encore ouverte
    const cancelBtn = page.locator('button:has-text("Annuler")');
    if (await cancelBtn.isVisible()) await cancelBtn.click();
  });

  test('devrait pouvoir prévisualiser le PDF en paysage', async ({ page }) => {
    await page.goto('/marches');
    await wait(1000);

    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();
    await wait(500);

    await page.locator('text=PDF (.pdf)').click();
    await wait(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Sélectionner Paysage
    await modal.locator('input[value="landscape"]').click();
    await expect(modal.locator('input[value="landscape"]')).toBeChecked();

    // Prévisualiser
    await modal.locator('button:has-text("Prévisualiser")').click();

    // Attendre que l'iframe apparaisse (génération PDF peut prendre 5-10s en prod)
    await expect(modal.locator('iframe[title="Prévisualisation PDF"]')).toBeVisible({
      timeout: 20000,
    });

    // Fermer la modal
    await modal.locator('button:has-text("Annuler")').click();
  });

  test('devrait pouvoir exporter avec des filtres actifs', async ({ page }) => {
    await page.goto('/marches');
    await wait(1000);

    // Appliquer un filtre (si disponible)
    const searchInput = page.locator('input[type="search"]').or(
      page.locator('input[placeholder*="Rechercher"]')
    );

    const isVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      // Entrer un terme de recherche
      await searchInput.fill('test');
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

    // Aller sur la page marchés
    await page.goto('/marches');
    await wait(1000);

    // Vérifier que le bouton Exporter est soit désactivé, soit absent
    const exportButton = page.locator('button:has-text("Exporter")');
    const count = await exportButton.count();

    if (count > 0) {
      // Si le bouton existe, il doit être désactivé
      await expect(exportButton.first()).toBeDisabled();
    }
    // Sinon, le bouton n'est pas affiché (ce qui est aussi correct)
  });

  test('devrait afficher une erreur si l\'export échoue', async ({ page }) => {
    await page.goto('/marches');
    await wait(1000);

    // Intercepter la requête d'export pour simuler une erreur
    await page.route('**/api/exports/marches*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Erreur serveur simulée' }),
      });
    });

    // Tenter un export
    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();
    await wait(500);

    const excelOption = page.locator('text=Excel (.xlsx)');
    await excelOption.click();

    // Vérifier le toast d'erreur
    await expect(page.locator('text=Erreur lors de l\'export')).toBeVisible({ timeout: 5000 });
  });

  test('devrait afficher un loader pendant l\'export', async ({ page }) => {
    await page.goto('/marches');
    await wait(1000);

    // Ralentir artificiellement la requête pour voir le loader
    await page.route('**/api/exports/marches*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.continue();
    });

    // Lancer un export
    const exportButton = page.locator('button:has-text("Exporter")');
    await exportButton.click();
    await wait(500);

    const excelOption = page.locator('text=Excel (.xlsx)');
    await excelOption.click();

    // Vérifier la présence du loader
    const loader = page.locator('text=Export en cours...').or(
      page.locator('svg.animate-spin')
    );

    await expect(loader.first()).toBeVisible({ timeout: 1000 });
  });
});
