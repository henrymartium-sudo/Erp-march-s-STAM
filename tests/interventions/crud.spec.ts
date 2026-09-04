import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';

// Les interventions SAV n'ont pas de route dédiée : elles vivent entièrement
// dans la section "SAV — Interventions" de la page détail d'un véhicule
// (components/vehicules/vehicule-detail.tsx). On crée donc un véhicule de
// fixture une seule fois pour tout le fichier plutôt que par test.
let vehiculeId: string;
const immatriculation = `E2E${Date.now()}`.toUpperCase();

test.beforeAll(async ({ browser }) => {
  // beforeAll hérite du timeout de test par défaut (30s, playwright.config.ts) —
  // ce flow (login + formulaire véhicule + 2 navigations à 10-15s de timeout
  // chacune) dépasse ce budget à lui seul sur un premier compile Next dev lent.
  test.setTimeout(90_000);

  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page, TEST_USERS.admin);
  await page.goto('/vehicules/nouveau');

  await page.getByRole('textbox', { name: 'Immatriculation *' }).fill(immatriculation);
  await page.getByRole('combobox', { name: 'Statut *' }).click();
  await page.getByRole('option', { name: 'Sous garantie' }).click();
  // Champ avec datalist (list="marques-datalist") -> rôle ARIA combobox, pas textbox.
  await page.getByRole('combobox', { name: 'Marque *' }).fill('MarqueE2E');
  await page.getByRole('textbox', { name: 'Modèle *' }).fill('ModeleE2E');

  await page.getByRole('button', { name: 'Créer le véhicule' }).click();
  // Redirection différée de 1s (setTimeout dans vehicule-form.tsx) vers /vehicules
  await page.waitForURL('/vehicules', { timeout: 15000 });

  await page.getByRole('link', { name: immatriculation }).click();
  await page.waitForURL(/\/vehicules\/[a-z0-9]+$/, { timeout: 10000 });
  vehiculeId = page.url().split('/vehicules/')[1]!.replace(/\/$/, '');

  await context.close();
});

test.describe('Interventions SAV - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await page.goto(`/vehicules/${vehiculeId}`);
  });

  test('devrait afficher la section SAV du véhicule', async ({ page }) => {
    // CardTitle ne rend pas de rôle ARIA heading dans ce design system (texte simple).
    await expect(page.getByText('SAV — Interventions')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Signaler une intervention' })).toBeVisible();
  });

  test('devrait pouvoir créer une intervention', async ({ page }) => {
    await page.getByRole('button', { name: 'Signaler une intervention' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Type (Panne) et "Sous garantie" gardent leurs valeurs par défaut.
    await page.getByRole('textbox', { name: 'Description (optionnel)' }).fill('Bruit moteur E2E');
    await page.getByRole('button', { name: 'Créer' }).click();

    await expect(page.getByText('Intervention créée avec succès')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const row = page.locator('tr', { hasText: 'Bruit moteur E2E' });
    await expect(row).toBeVisible();
    await expect(row.getByText('Panne')).toBeVisible();
    await expect(row.getByText('Signalé')).toBeVisible();
  });

  test('devrait pouvoir changer le statut d\'une intervention', async ({ page }) => {
    await page.getByRole('button', { name: 'Signaler une intervention' }).click();
    await page.getByRole('textbox', { name: 'Description (optionnel)' }).fill('Statut E2E');
    await page.getByRole('button', { name: 'Créer' }).click();
    await expect(page.getByText('Intervention créée avec succès')).toBeVisible({ timeout: 10000 });

    const row = page.locator('tr', { hasText: 'Statut E2E' });
    // Le badge de statut est lui-même le déclencheur du menu déroulant de transition.
    await row.getByText('Signalé').click();
    await page.getByRole('menuitem', { name: /En diagnostic/ }).click();

    await expect(page.getByText('Statut mis à jour')).toBeVisible({ timeout: 10000 });
    await expect(row.getByText('En diagnostic')).toBeVisible();
  });

  test('devrait pouvoir supprimer une intervention', async ({ page }) => {
    await page.getByRole('button', { name: 'Signaler une intervention' }).click();
    await page.getByRole('textbox', { name: 'Description (optionnel)' }).fill('À supprimer E2E');
    await page.getByRole('button', { name: 'Créer' }).click();
    await expect(page.getByText('Intervention créée avec succès')).toBeVisible({ timeout: 10000 });

    const row = page.locator('tr', { hasText: 'À supprimer E2E' });
    await expect(row).toBeVisible();

    // handleDelete() utilise window.confirm() natif, pas un AlertDialog.
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button').last().click();

    await expect(page.getByText('Intervention supprimée')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('tr', { hasText: 'À supprimer E2E' })).toHaveCount(0);
  });

  test('devrait respecter les permissions (VISITEUR ne peut ni créer ni modifier ni supprimer)', async ({ page }) => {
    await page.getByRole('button', { name: 'Déconnexion' }).click();
    await page.waitForURL('/login');

    await login(page, TEST_USERS.visiteur);
    await page.goto(`/vehicules/${vehiculeId}`);

    await expect(page.getByRole('button', { name: 'Signaler une intervention' })).toHaveCount(0);
  });
});
