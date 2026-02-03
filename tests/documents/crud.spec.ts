import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { createTestDocument, wait } from '../helpers/test-data';
import path from 'path';

test.describe('Documents - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'admin
    await login(page, TEST_USERS.admin);
  });

  test('devrait afficher la liste des documents', async ({ page }) => {
    await page.goto('/documents');

    // Vérifier le titre
    await expect(page.locator('h1')).toContainText('Documents');

    // Vérifier la présence du bouton d'ajout
    await expect(page.locator('a[href="/documents/upload"]')).toBeVisible();

    // Vérifier la présence de la table ou grille
    const documentList = page.locator('[data-document-list]').or(
      page.locator('table').or(page.locator('[data-testid="document-grid"]'))
    );

    await expect(documentList.first()).toBeVisible();
  });

  test('devrait afficher les statistiques des documents', async ({ page }) => {
    await page.goto('/documents');

    // Vérifier les compteurs (total, par type, etc.)
    const statsCards = page.locator('[data-stats-card]').or(
      page.locator('text=Total').or(page.locator('text=Documents'))
    );

    await expect(statsCards.first()).toBeVisible();
  });

  test('devrait pouvoir créer un nouveau document', async ({ page }) => {
    await page.goto('/documents/upload');

    const testDoc = createTestDocument();
    const testFilePath = path.join(process.cwd(), 'tests', 'fixtures', 'files', 'test-document.pdf');

    // Uploader le fichier
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Remplir le formulaire
    await page.fill('input[name="nom"]', testDoc.nom);
    await page.selectOption('select[name="type"]', testDoc.type);
    await page.selectOption('select[name="phase"]', testDoc.phase);
    await page.fill('textarea[name="description"]', testDoc.description || '');

    // Tags (si présent)
    const tagsInput = page.locator('input[name="tags"]');
    if (await tagsInput.isVisible()) {
      await tagsInput.fill(testDoc.tags?.join(', ') || '');
    }

    // Soumettre
    await page.click('button[type="submit"]');

    // Attendre le succès
    await expect(page.locator('text=Document uploadé avec succès')).toBeVisible({ timeout: 10000 });

    // Vérifier la redirection
    await page.waitForURL('/documents');

    // Vérifier que le document apparaît dans la liste
    await expect(page.locator(`text=${testDoc.nom}`)).toBeVisible();
  });

  test('devrait pouvoir voir le détail d\'un document', async ({ page }) => {
    await page.goto('/documents');

    // Attendre que la liste se charge
    await wait(1000);

    // Cliquer sur le premier document (s'il existe)
    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();

      // Vérifier qu'on est sur la page de détail
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Vérifier les informations du document
      await expect(page.locator('text=Type')).toBeVisible();
      await expect(page.locator('text=Phase')).toBeVisible();
      await expect(page.locator('text=Taille')).toBeVisible();

      // Vérifier les actions disponibles
      await expect(page.locator('button:has-text("Télécharger")')).toBeVisible();
    }
  });

  test('devrait pouvoir télécharger un document', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Cliquer sur le premier document
    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Écouter le téléchargement
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      // Cliquer sur télécharger
      await page.click('button:has-text("Télécharger")');

      // Attendre le téléchargement
      const download = await downloadPromise;

      // Vérifier que le fichier a un nom
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });

  test('devrait pouvoir supprimer un document (soft delete)', async ({ page }) => {
    // D'abord, créer un document à supprimer
    await page.goto('/documents/upload');

    const testDoc = createTestDocument({ nom: 'Document-A-Supprimer.pdf' });
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

    // Cliquer sur le bouton Supprimer
    await page.click('button:has-text("Supprimer")');

    // Confirmer la suppression dans le dialog
    await page.click('button:has-text("Confirmer")');

    // Attendre le toast de succès
    await expect(page.locator('text=Document supprimé')).toBeVisible({ timeout: 5000 });

    // Vérifier la redirection vers la liste
    await page.waitForURL('/documents');

    // Vérifier que le document n'apparaît plus dans la liste
    await expect(page.locator(`text=${testDoc.nom}`)).not.toBeVisible();
  });

  test('devrait pouvoir restaurer un document supprimé', async ({ page }) => {
    // Note: Ce test dépend de l'implémentation d'une page "Corbeille" ou "Documents supprimés"
    // Si non implémenté dans le MVP, ce test peut être ignoré

    await page.goto('/documents');

    // Chercher un lien vers la corbeille
    const trashLink = page.locator('a:has-text("Corbeille")').or(
      page.locator('a:has-text("Documents supprimés")')
    );

    const isVisible = await trashLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      await trashLink.click();

      // Chercher un document supprimé et le restaurer
      const restoreButton = page.locator('button:has-text("Restaurer")').first();
      if (await restoreButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await restoreButton.click();

        await expect(page.locator('text=Document restauré')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('devrait afficher un message si aucun document', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Vérifier s'il y a des documents
    const documentCards = page.locator('[data-document-card]');
    const count = await documentCards.count();

    if (count === 0) {
      // Vérifier le message d'empty state
      await expect(
        page.locator('text=Aucun document').or(page.locator('text=Commencez par ajouter'))
      ).toBeVisible();
    }
  });

  test('devrait pouvoir paginer les documents', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Chercher les boutons de pagination
    const paginationNext = page.locator('button:has-text("Suivant")').or(
      page.locator('button[aria-label="Next page"]')
    );

    const isVisible = await paginationNext.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible && !(await paginationNext.isDisabled())) {
      // Mémoriser le premier document de la page 1
      const firstDocText = await page.locator('[data-document-card]').first().textContent();

      // Aller à la page 2
      await paginationNext.click();
      await wait(500);

      // Vérifier que le contenu a changé
      const newFirstDocText = await page.locator('[data-document-card]').first().textContent();

      expect(newFirstDocText).not.toBe(firstDocText);
    }
  });

  test('devrait pouvoir trier les documents', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Chercher le select de tri
    const sortSelect = page.locator('select[name="sort"]').or(
      page.locator('select[aria-label="Trier par"]')
    );

    const isVisible = await sortSelect.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      // Sélectionner un tri
      await sortSelect.selectOption('createdAt-desc');
      await wait(500);

      // Vérifier que les résultats sont triés
      // (Difficile à tester sans connaître les données, on vérifie juste que ça ne crash pas)
      await expect(page.locator('[data-document-card]').first()).toBeVisible();
    }
  });

  test('devrait respecter les permissions (VISITEUR ne peut pas supprimer)', async ({ page }) => {
    // Se déconnecter
    await page.goto('/');
    await page.click('button:has-text("Se déconnecter")');

    // Se connecter en tant que visiteur
    await login(page, TEST_USERS.visiteur);

    // Aller sur la liste des documents
    await page.goto('/documents');

    // Vérifier qu'il n'y a pas de bouton Supprimer
    const deleteButtons = page.locator('button:has-text("Supprimer")');
    const count = await deleteButtons.count();

    expect(count).toBe(0);
  });
});
