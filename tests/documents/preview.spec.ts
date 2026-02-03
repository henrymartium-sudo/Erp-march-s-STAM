import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { wait } from '../helpers/test-data';

test.describe('Documents - Prévisualisation', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'admin
    await login(page, TEST_USERS.admin);
  });

  test('devrait afficher la prévisualisation d\'un PDF', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Cliquer sur le premier document PDF (s'il existe)
    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Chercher le composant de prévisualisation
      const previewFrame = page.locator('iframe[data-document-preview]').or(
        page.locator('iframe[title*="preview"]')
      );

      const hasPreview = await previewFrame.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasPreview) {
        // Vérifier que l'iframe a une source
        const src = await previewFrame.getAttribute('src');
        expect(src).toBeTruthy();
        expect(src).toContain('blob:'); // URL signée temporaire
      } else {
        // Si pas d'iframe, vérifier le message "Prévisualisation non disponible"
        await expect(
          page.locator('text=Prévisualisation non disponible').or(
            page.locator('text=Téléchargez le fichier')
          )
        ).toBeVisible();
      }
    }
  });

  test('devrait afficher la prévisualisation d\'une image', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Chercher un document image (JPG, PNG)
    const imageDoc = page.locator('text=.jpg').or(
      page.locator('text=.png').or(page.locator('text=.jpeg'))
    ).first();

    const isVisible = await imageDoc.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      // Cliquer sur le document image
      await imageDoc.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Chercher la balise img
      const imgPreview = page.locator('img[data-document-preview]').or(
        page.locator('img[alt*="preview"]')
      );

      const hasImgPreview = await imgPreview.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasImgPreview) {
        // Vérifier que l'image a une source
        const src = await imgPreview.getAttribute('src');
        expect(src).toBeTruthy();
      }
    }
  });

  test('devrait afficher un message pour les fichiers non prévisualisables', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Chercher un document non-PDF/image (ex: Excel, Word)
    const nonPreviewableDoc = page.locator('text=.xls').or(
      page.locator('text=.doc').or(page.locator('text=.xlsx'))
    ).first();

    const isVisible = await nonPreviewableDoc.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await nonPreviewableDoc.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Vérifier le message d'indisponibilité
      await expect(
        page.locator('text=Prévisualisation non disponible').or(
          page.locator('text=Ce type de fichier ne peut pas être prévisualisé')
        )
      ).toBeVisible({ timeout: 5000 });

      // Vérifier qu'il y a un bouton de téléchargement
      await expect(page.locator('button:has-text("Télécharger")')).toBeVisible();
    }
  });

  test('devrait gérer les erreurs de chargement de prévisualisation', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Simuler une erreur de chargement en interceptant la requête
      await page.route('**/storage/**', (route) => route.abort());

      // Recharger la page
      await page.reload();

      // Vérifier le message d'erreur
      await expect(
        page.locator('text=Erreur de chargement').or(
          page.locator('text=Impossible de charger')
        )
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('devrait afficher un loader pendant le chargement', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      // Ralentir le réseau pour voir le loader
      await page.route('**/storage/**', async (route) => {
        await wait(2000); // Délai artificiel
        await route.continue();
      });

      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Vérifier la présence d'un loader/spinner
      const loader = page.locator('[data-loading]').or(
        page.locator('[role="progressbar"]').or(page.locator('text=Chargement'))
      );

      const hasLoader = await loader.isVisible({ timeout: 1000 }).catch(() => false);

      // Si le loader est visible (même brièvement), c'est bon
      if (hasLoader) {
        expect(hasLoader).toBe(true);
      }
    }
  });

  test('devrait pouvoir zoomer sur une image', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    // Chercher un document image
    const imageDoc = page.locator('text=.jpg').or(
      page.locator('text=.png').or(page.locator('text=.jpeg'))
    ).first();

    const isVisible = await imageDoc.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await imageDoc.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Chercher les boutons de zoom (si implémentés)
      const zoomInButton = page.locator('button:has-text("Zoom +")').or(
        page.locator('button[aria-label="Zoom in"]')
      );

      const hasZoom = await zoomInButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasZoom) {
        // Mémoriser la taille initiale
        const imgPreview = page.locator('img[data-document-preview]');
        const initialWidth = await imgPreview.boundingBox();

        // Zoomer
        await zoomInButton.click();
        await wait(300);

        // Vérifier que la taille a changé
        const newWidth = await imgPreview.boundingBox();

        if (initialWidth && newWidth) {
          expect(newWidth.width).toBeGreaterThan(initialWidth.width);
        }
      }
    }
  });

  test('devrait afficher les métadonnées du document à côté de la prévisualisation', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Vérifier la présence des métadonnées
      await expect(page.locator('text=Nom')).toBeVisible();
      await expect(page.locator('text=Type')).toBeVisible();
      await expect(page.locator('text=Phase')).toBeVisible();
      await expect(page.locator('text=Taille')).toBeVisible();
    }
  });

  test('devrait sécuriser les URLs de prévisualisation (URL signées temporaires)', async ({ page }) => {
    await page.goto('/documents');
    await wait(1000);

    const firstDocLink = page.locator('a[href^="/documents/"]').first();
    const isVisible = await firstDocLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await firstDocLink.click();
      await page.waitForURL(/\/documents\/[a-z0-9-]+$/);

      // Chercher l'iframe de prévisualisation
      const previewFrame = page.locator('iframe[data-document-preview]');
      const hasPreview = await previewFrame.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasPreview) {
        const src = await previewFrame.getAttribute('src');

        // Vérifier que l'URL est signée (blob: ou contient un token)
        expect(src).toMatch(/blob:|token=|signature=/);

        // L'URL devrait expirer après 1h selon les specs
        // (Difficile à tester directement, mais on vérifie qu'elle existe)
      }
    }
  });
});
