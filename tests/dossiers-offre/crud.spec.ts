import { test, expect, type Page } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';

// Les ids Prisma cuid() commencent toujours par 'c' — contrairement à un
// [a-z0-9]+ générique, ce pattern ne matche jamais accidentellement le
// segment littéral "nouveau" de /dossiers-offre/nouveau.
const DOSSIER_DETAIL_URL = /\/dossiers-offre\/c[a-z0-9]+$/;
const DOSSIER_EDIT_URL = /\/dossiers-offre\/c[a-z0-9]+\/edit$/;

function uniqueTitre(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

/**
 * Crée un dossier d'offre puis navigue vers sa page de détail.
 * Contrairement aux cautions, la création d'un dossier redirige vers la
 * liste (pas vers le détail — cf. dossier-form.tsx: router.push(isEditing
 * ? `/dossiers-offre/${id}` : '/dossiers-offre')) : on clique donc le lien
 * du dossier fraîchement créé dans la liste, triée par createdAt desc
 * (toujours en première page).
 */
async function createDossierAndOpen(page: Page, titre: string) {
  await page.goto('/dossiers-offre/nouveau');
  await page.getByRole('textbox', { name: 'Titre du dossier *' }).fill(titre);
  await page.getByRole('button', { name: 'Créer le dossier' }).click();
  await page.waitForURL('/dossiers-offre', { timeout: 10000 });

  await page.getByRole('link', { name: titre }).click();
  await page.waitForURL(DOSSIER_DETAIL_URL, { timeout: 10000 });
}

test.describe('Dossiers d\'offre - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin);
  });

  test('devrait afficher la liste des dossiers d\'offre', async ({ page }) => {
    await page.goto('/dossiers-offre');
    // Le bandeau supérieur affiche aussi le titre de la page courante en h1 —
    // on scope au contenu principal pour lever l'ambiguïté.
    await expect(page.getByRole('main').getByRole('heading', { name: "Dossiers d'offre" })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nouveau dossier' })).toBeVisible();
  });

  test('devrait pouvoir créer un nouveau dossier d\'offre', async ({ page }) => {
    const titre = uniqueTitre('Dossier E2E');

    await createDossierAndOpen(page, titre);

    await expect(page.getByRole('main').getByRole('heading', { name: titre })).toBeVisible();
    // Le template standard précrée 12 pièces de checklist
    await expect(page.getByText(/12 pièces/)).toBeVisible();
  });

  test('devrait pouvoir voir le détail d\'un dossier d\'offre', async ({ page }) => {
    const titre = uniqueTitre('Dossier E2E Détail');

    await createDossierAndOpen(page, titre);

    await expect(page.getByRole('main').getByRole('heading', { name: titre })).toBeVisible();
    await expect(page.getByText('Informations')).toBeVisible();
  });

  test('devrait pouvoir modifier un dossier d\'offre existant', async ({ page }) => {
    const titre = uniqueTitre('Dossier E2E Edit');
    const titreModifie = `${titre} — Modifié`;

    await createDossierAndOpen(page, titre);

    await page.getByRole('link', { name: 'Modifier' }).click();
    await page.waitForURL(DOSSIER_EDIT_URL);

    await page.getByRole('textbox', { name: 'Titre du dossier *' }).fill(titreModifie);
    await page.getByRole('button', { name: 'Mettre à jour' }).click();

    await page.waitForURL(DOSSIER_DETAIL_URL, { timeout: 10000 });
    await expect(page.getByRole('main').getByRole('heading', { name: titreModifie })).toBeVisible();
  });

  test('devrait pouvoir supprimer un dossier d\'offre', async ({ page }) => {
    const titre = uniqueTitre('Dossier E2E Delete');

    await createDossierAndOpen(page, titre);

    // Ouvre l'AlertDialog de confirmation (icône seule, aria-label "Supprimer")
    await page.getByRole('button', { name: 'Supprimer' }).click();
    // Le bouton de confirmation dans le dialog porte le même libellé que le
    // déclencheur : on scope au rôle alertdialog pour lever l'ambiguïté.
    await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click();

    await page.waitForURL('/dossiers-offre', { timeout: 10000 });
    await expect(page.getByText(titre)).not.toBeVisible();
  });

  test('devrait respecter les permissions (VISITEUR ne peut ni créer ni modifier ni supprimer)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Déconnexion' }).click();
    await page.waitForURL('/login');

    await login(page, TEST_USERS.visiteur);

    await page.goto('/dossiers-offre');
    await expect(page.getByRole('link', { name: 'Nouveau dossier' })).toHaveCount(0);

    const firstDossierLink = page.locator('a[href^="/dossiers-offre/"]').first();
    const hasDossier = await firstDossierLink.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasDossier) {
      await firstDossierLink.click();
      await page.waitForURL(DOSSIER_DETAIL_URL);
      await expect(page.getByRole('link', { name: 'Modifier' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Supprimer' })).toHaveCount(0);
    }
  });
});
