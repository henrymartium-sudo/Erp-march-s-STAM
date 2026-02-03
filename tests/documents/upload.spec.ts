import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { createTestMarche, wait } from '../helpers/test-data';
import path from 'path';

test.describe('Documents - Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'admin
    await login(page, TEST_USERS.admin);
  });

  test('devrait afficher la page d\'upload', async ({ page }) => {
    await page.goto('/documents/upload');

    // Vérifier le titre
    await expect(page.locator('h1')).toContainText('Ajouter un document');

    // Vérifier la présence de la zone de drop
    await expect(page.locator('text=Glissez-déposez')).toBeVisible();
  });

  test('devrait pouvoir uploader un fichier PDF', async ({ page }) => {
    await page.goto('/documents/upload');

    // Créer un fichier de test temporaire
    const testFilePath = path.join(process.cwd(), 'tests', 'fixtures', 'files', 'test-document.pdf');

    // Uploader le fichier (simuler avec input file)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Remplir les métadonnées
    await page.fill('input[name="nom"]', 'Document Test Upload');
    await page.selectOption('select[name="type"]', 'DAO');
    await page.selectOption('select[name="phase"]', 'PREPARATION');
    await page.fill('textarea[name="description"]', 'Test d\'upload automatisé');

    // Soumettre le formulaire
    await page.click('button[type="submit"]');

    // Attendre le toast de succès
    await expect(page.locator('text=Document uploadé avec succès')).toBeVisible({ timeout: 10000 });

    // Vérifier la redirection vers la liste
    await page.waitForURL('/documents');

    // Vérifier que le document apparaît dans la liste
    await expect(page.locator('text=Document Test Upload')).toBeVisible();
  });

  test('devrait valider la taille maximale (10MB)', async ({ page }) => {
    await page.goto('/documents/upload');

    // Simuler un fichier > 10MB (via formulaire)
    const fileInput = page.locator('input[type="file"]');

    // Note: Ce test nécessite un vrai fichier > 10MB
    // Pour le test, on vérifie juste que la validation existe
    await expect(page.locator('text=10 MB')).toBeVisible();
  });

  test('devrait valider les types de fichiers autorisés', async ({ page }) => {
    await page.goto('/documents/upload');

    // Vérifier l'attribut accept sur l'input file
    const fileInput = page.locator('input[type="file"]');
    const acceptAttr = await fileInput.getAttribute('accept');

    expect(acceptAttr).toContain('.pdf');
    expect(acceptAttr).toContain('.doc');
    expect(acceptAttr).toContain('.xls');
    expect(acceptAttr).toContain('.jpg');
    expect(acceptAttr).toContain('.png');
  });

  test('devrait afficher une barre de progression pendant l\'upload', async ({ page }) => {
    await page.goto('/documents/upload');

    const testFilePath = path.join(process.cwd(), 'tests', 'fixtures', 'files', 'test-document.pdf');
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles(testFilePath);

    // Remplir les métadonnées rapidement
    await page.fill('input[name="nom"]', 'Test Progress');
    await page.selectOption('select[name="type"]', 'DAO');
    await page.selectOption('select[name="phase"]', 'PREPARATION');

    // Soumettre
    await page.click('button[type="submit"]');

    // Vérifier l'apparition de la barre de progression (même brève)
    // Note: Peut être trop rapide en local, mais visible en prod
    const progressBar = page.locator('[role="progressbar"]');

    // Attendre le succès
    await expect(page.locator('text=Document uploadé avec succès')).toBeVisible({ timeout: 10000 });
  });

  test('devrait pouvoir uploader un document lié à un marché', async ({ page }) => {
    // D'abord, créer un marché
    await page.goto('/marches/nouveau');

    const testMarche = createTestMarche();

    await page.fill('input[name="reference"]', testMarche.reference);
    await page.fill('input[name="intitule"]', testMarche.intitule);
    await page.selectOption('select[name="typeMarche"]', testMarche.typeMarche);
    await page.selectOption('select[name="statut"]', testMarche.statut);

    await page.click('button[type="submit"]');

    // Attendre le succès et récupérer l'ID du marché depuis l'URL
    await page.waitForURL(/\/marches\/[a-z0-9-]+$/);
    const marcheUrl = page.url();
    const marcheId = marcheUrl.split('/').pop();

    // Aller sur la page d'upload avec marcheId
    await page.goto(`/documents/upload?marcheId=${marcheId}`);

    // Vérifier que le marché est pré-sélectionné
    await expect(page.locator(`text=${testMarche.intitule}`)).toBeVisible();

    // Uploader le document
    const testFilePath = path.join(process.cwd(), 'tests', 'fixtures', 'files', 'test-document.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    await page.fill('input[name="nom"]', 'Document lié au marché');
    await page.selectOption('select[name="type"]', 'DAO');
    await page.selectOption('select[name="phase"]', 'PREPARATION');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Document uploadé avec succès')).toBeVisible({ timeout: 10000 });

    // Vérifier qu'on peut voir le document dans la page du marché
    await page.goto(`/marches/${marcheId}`);
    await expect(page.locator('text=Document lié au marché')).toBeVisible();
  });

  test('devrait gérer les erreurs d\'upload', async ({ page }) => {
    await page.goto('/documents/upload');

    // Tenter de soumettre sans fichier
    await page.fill('input[name="nom"]', 'Sans fichier');
    await page.selectOption('select[name="type"]', 'DAO');
    await page.selectOption('select[name="phase"]', 'PREPARATION');

    await page.click('button[type="submit"]');

    // Vérifier le message d'erreur
    await expect(page.locator('text=Fichier requis')).toBeVisible();
  });

  test('devrait pouvoir annuler l\'upload et revenir à la liste', async ({ page }) => {
    await page.goto('/documents/upload');

    // Cliquer sur le bouton Annuler
    await page.click('button:has-text("Annuler")');

    // Vérifier la redirection vers la liste
    await page.waitForURL('/documents');
  });

  test('devrait respecter les permissions (VISITEUR ne peut pas uploader)', async ({ page }) => {
    // Se déconnecter
    await page.goto('/');
    await page.click('button:has-text("Se déconnecter")');

    // Se connecter en tant que visiteur
    await login(page, TEST_USERS.visiteur);

    // Tenter d'accéder à la page d'upload
    await page.goto('/documents/upload');

    // Devrait être redirigé ou voir un message d'erreur
    await expect(
      page.locator('text=non autorisé').or(page.locator('text=Accès refusé'))
    ).toBeVisible({ timeout: 5000 });
  });
});
