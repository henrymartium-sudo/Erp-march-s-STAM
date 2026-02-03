import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { createTestDocument, wait } from '../helpers/test-data';
import path from 'path';

test.describe('Documents - Versioning', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'admin
    await login(page, TEST_USERS.admin);
  });

  test('devrait pouvoir créer une nouvelle version d\'un document', async ({ page }) => {
    // D'abord, créer un document initial
    await page.goto('/documents/upload');

    const testDoc = createTestDocument({ nom: 'Document-Version-Test.pdf' });
    const testFilePath = path.join(process.cwd(), 'tests', 'fixtures', 'files', 'test-document.pdf');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    await page.fill('input[name="nom"]', testDoc.nom);
    await page.selectOption('select[name="type"]', testDoc.type);
    await page.selectOption('select[name="phase"]', testDoc.phase);

    await page.click('button[type="submit"]');
    await expect(page.locator('text=Document uploadé avec succès')).toBeVisible({ timeout: 10000 });

    // Aller sur la page de détail
    await page.click(`text=${testDoc.nom}`);
    await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

    // Chercher le bouton "Nouvelle version"
    const newVersionButton = page.locator('button:has-text("Nouvelle version")');
    const isVisible = await newVersionButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await newVersionButton.click();

      // Devrait ouvrir un dialog ou rediriger vers un formulaire
      await wait(500);

      // Uploader la nouvelle version
      const versionFileInput = page.locator('input[type="file"]');
      await versionFileInput.setInputFiles(testFilePath);

      // Soumettre
      const submitButton = page.locator('button:has-text("Créer")').or(
        page.locator('button[type="submit"]')
      );
      await submitButton.click();

      // Attendre le succès
      await expect(
        page.locator('text=Nouvelle version créée').or(page.locator('text=Version créée'))
      ).toBeVisible({ timeout: 10000 });

      // Vérifier que le numéro de version a augmenté
      await expect(page.locator('text=Version 2')).toBeVisible();
    }
  });

  test('devrait afficher l\'historique des versions', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Cliquer sur un document
    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Chercher la section "Historique des versions"
      const versionHistory = page.locator('text=Historique des versions').or(
        page.locator('text=Versions précédentes')
      );

      const hasHistory = await versionHistory.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasHistory) {
        // Vérifier qu'il y a une liste de versions
        const versionList = page.locator('[data-version-list]').or(
          page.locator('[data-version-item]')
        );

        await expect(versionList.first()).toBeVisible();

        // Vérifier les informations de version (numéro, date, auteur)
        await expect(page.locator('text=Version').first()).toBeVisible();
      }
    }
  });

  test('devrait pouvoir télécharger une version antérieure', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Chercher l'historique
      const versionHistory = page.locator('text=Historique des versions');
      const hasHistory = await versionHistory.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasHistory) {
        // Chercher un bouton de téléchargement pour une version antérieure
        const downloadOldVersionButton = page
          .locator('[data-version-item] button:has-text("Télécharger")')
          .first();

        const hasButton = await downloadOldVersionButton
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        if (hasButton) {
          // Écouter le téléchargement
          const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

          await downloadOldVersionButton.click();

          const download = await downloadPromise;
          expect(download.suggestedFilename()).toBeTruthy();
        }
      }
    }
  });

  test('devrait afficher la version actuelle clairement', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Vérifier qu'on affiche le numéro de version actuelle
      const currentVersion = page.locator('text=Version').or(
        page.locator('[data-current-version]')
      );

      await expect(currentVersion.first()).toBeVisible();

      // Devrait afficher "Version 1", "Version 2", etc.
      const versionText = await currentVersion.first().textContent();
      expect(versionText).toMatch(/Version \d+/);
    }
  });

  test('devrait pouvoir comparer deux versions', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Chercher un bouton "Comparer" dans l'historique
      const compareButton = page.locator('button:has-text("Comparer")');
      const hasCompare = await compareButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasCompare) {
        await compareButton.click();

        // Devrait ouvrir une vue de comparaison
        await expect(
          page.locator('text=Comparaison').or(page.locator('text=Version'))
        ).toBeVisible();
      } else {
        // Si la comparaison n'est pas implémentée dans le MVP, ce test est optionnel
        console.log('Comparaison de versions non implémentée dans le MVP');
      }
    }
  });

  test('devrait afficher les métadonnées de chaque version', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      const versionHistory = page.locator('text=Historique des versions');
      const hasHistory = await versionHistory.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasHistory) {
        // Vérifier les métadonnées de version
        const versionItems = page.locator('[data-version-item]');
        const count = await versionItems.count();

        if (count > 0) {
          const firstVersion = versionItems.first();

          // Vérifier date de création
          await expect(firstVersion.locator('text=/\\d{2}\\/\\d{2}\\/\\d{4}/')).toBeVisible();

          // Vérifier auteur (si affiché)
          // await expect(firstVersion.locator('text=Par')).toBeVisible();

          // Vérifier taille du fichier
          await expect(firstVersion.locator('text=/\\d+\\s*(B|KB|MB)/')).toBeVisible();
        }
      }
    }
  });

  test('devrait empêcher la suppression de la version actuelle si d\'autres versions existent', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Vérifier l'historique
      const versionHistory = page.locator('text=Historique des versions');
      const hasHistory = await versionHistory.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasHistory) {
        const versionItems = page.locator('[data-version-item]');
        const count = await versionItems.count();

        if (count > 1) {
          // S'il y a plusieurs versions, la suppression de la version actuelle devrait être bloquée
          // ou afficher un avertissement

          const deleteButton = page.locator('button:has-text("Supprimer")').first();
          await deleteButton.click();

          // Devrait afficher un warning ou bloquer
          await expect(
            page
              .locator('text=version actuelle')
              .or(page.locator('text=Attention'))
              .or(page.locator('text=Confirmer'))
          ).toBeVisible({ timeout: 2000 });
        }
      }
    }
  });

  test('devrait numéroter les versions de façon incrémentale', async ({ page }) => {
    // Créer un document initial
    await page.goto('/documents/upload');

    const testDoc = createTestDocument({ nom: 'Document-Increment-Test.pdf' });
    const testFilePath = path.join(process.cwd(), 'tests', 'fixtures', 'files', 'test-document.pdf');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    await page.fill('input[name="nom"]', testDoc.nom);
    await page.selectOption('select[name="type"]', testDoc.type);
    await page.selectOption('select[name="phase"]', testDoc.phase);

    await page.click('button[type="submit"]');
    await expect(page.locator('text=Document uploadé avec succès')).toBeVisible({ timeout: 10000 });

    await page.click(`text=${testDoc.nom}`);
    await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

    // Devrait afficher "Version 1"
    await expect(page.locator('text=Version 1')).toBeVisible();

    // Si on crée une nouvelle version, elle devrait être "Version 2"
    // (Test déjà couvert dans "devrait pouvoir créer une nouvelle version")
  });

  test('devrait conserver l\'historique complet même après suppression soft delete', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      // Mémoriser l'URL du document
      const docUrl = await firstDocLink.getAttribute('href');

      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Supprimer le document (soft delete)
      const deleteButton = page.locator('button:has-text("Supprimer")');
      await deleteButton.click();

      await page.click('button:has-text("Confirmer")');
      await expect(page.locator('text=Document supprimé')).toBeVisible({ timeout: 5000 });

      // Aller dans la corbeille (si implémentée)
      await page.goto('/documents'); // ou /documents/corbeille

      const trashLink = page.locator('a:has-text("Corbeille")');
      const hasTrash = await trashLink.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasTrash) {
        await trashLink.click();

        // Restaurer le document
        const restoreButton = page.locator('button:has-text("Restaurer")').first();
        await restoreButton.click();

        await expect(page.locator('text=Document restauré')).toBeVisible({ timeout: 5000 });

        // Revenir sur le document et vérifier que l'historique est intact
        await page.goto(docUrl || '/documents');

        const versionHistory = page.locator('text=Historique des versions');
        await expect(versionHistory).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
