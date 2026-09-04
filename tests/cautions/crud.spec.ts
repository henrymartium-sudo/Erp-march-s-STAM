import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';

// Les ids Prisma cuid() commencent toujours par 'c' — contrairement à un
// [a-z0-9]+ générique, ce pattern ne matche jamais accidentellement le
// segment littéral "nouvelle" de /cautions/nouvelle.
const CAUTION_DETAIL_URL = /\/cautions\/c[a-z0-9]+$/;
const CAUTION_EDIT_URL = /\/cautions\/c[a-z0-9]+\/edit$/;

function uniqueReference(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

/** Remplit les champs communs du formulaire caution (hors devise/marché, non requis). */
async function fillCautionForm(
  page: import('@playwright/test').Page,
  { reference, banqueNom }: { reference: string; banqueNom: string }
) {
  await page.getByRole('textbox', { name: 'Référence *' }).fill(reference);

  await page.getByRole('combobox', { name: 'Type de caution *' }).click();
  await page.getByRole('option', { name: 'Caution de soumission' }).click();

  await page.getByRole('spinbutton', { name: 'Montant (FCFA) *' }).fill('15000');

  // Date d'émission : "Today". Le Popover Radix ne se ferme pas tout seul à la
  // sélection (pas de close-on-select câblé dans caution-form.tsx) : Escape
  // pour le fermer avant d'ouvrir le second, sinon les deux calendriers
  // restent montés en même temps et les locators deviennent ambigus.
  await page.getByRole('button', { name: "Date d'émission *" }).click();
  await page.getByRole('button', { name: /^Today/ }).click();
  await page.keyboard.press('Escape');

  // Date d'échéance : dernier jour visible dans le calendrier du mois courant
  // (toujours postérieur à aujourd'hui) — évite toute navigation de mois et
  // toute ambiguïté avec le premier calendrier.
  await page.getByRole('button', { name: "Date d'échéance *" }).click();
  await page.getByRole('grid').getByRole('button').last().click();
  await page.keyboard.press('Escape');

  await page.getByRole('textbox', { name: 'Nom de la banque *' }).fill(banqueNom);
}

test.describe('Cautions - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin);
  });

  test('devrait afficher la liste des cautions', async ({ page }) => {
    await page.goto('/cautions');
    // "Cautions & Garanties" apparaît à la fois dans le bandeau (h1) et dans
    // le titre de page (h1) — on scope au contenu principal pour lever l'ambiguïté.
    await expect(page.getByRole('main').getByRole('heading', { name: 'Cautions & Garanties' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nouvelle caution' })).toBeVisible();
  });

  test('devrait pouvoir créer une nouvelle caution', async ({ page }) => {
    const reference = uniqueReference('CAU-E2E');

    await page.goto('/cautions/nouvelle');
    await fillCautionForm(page, { reference, banqueNom: 'Banque E2E Test' });
    await page.getByRole('button', { name: 'Créer la caution' }).click();

    // Redirection vers la page de détail de la caution créée
    await page.waitForURL(CAUTION_DETAIL_URL, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: reference })).toBeVisible();
    await expect(page.getByText('Banque E2E Test')).toBeVisible();

    // Visible dans la liste. La liste est triée par dateEcheance croissante
    // avec pagination côté serveur, donc une caution fraîchement créée n'est
    // pas garantie d'apparaître sur la première page. On passe par le
    // paramètre d'URL ?search= (lu server-side par getCautions, qui filtre
    // en base sur reference/banqueNom/marché) plutôt que par le champ
    // "Rechercher une caution..." du filtre — celui-ci ne filtre en réalité
    // que la page déjà chargée côté client (CautionsContent.filteredCautions),
    // sans jamais requêter le paramètre d'URL correspondant : il ne trouverait
    // donc pas une caution absente de la première page. Écart UX réel, non
    // corrigé ici (question de conception plus large que ce test).
    await page.goto(`/cautions?search=${encodeURIComponent(reference)}`);
    await expect(page.getByText(reference)).toBeVisible();
  });

  test('devrait pouvoir voir le détail d\'une caution', async ({ page }) => {
    const reference = uniqueReference('CAU-E2E-DETAIL');

    await page.goto('/cautions/nouvelle');
    await fillCautionForm(page, { reference, banqueNom: 'Banque Détail Test' });
    await page.getByRole('button', { name: 'Créer la caution' }).click();
    await page.waitForURL(CAUTION_DETAIL_URL, { timeout: 10000 });

    await expect(page.getByRole('heading', { name: reference })).toBeVisible();
    await expect(page.getByText('Informations financières')).toBeVisible();
    await expect(page.getByText('15 000 FCFA')).toBeVisible();
    await expect(page.getByText('Banque Détail Test')).toBeVisible();
  });

  test('devrait pouvoir modifier une caution existante', async ({ page }) => {
    const reference = uniqueReference('CAU-E2E-EDIT');

    await page.goto('/cautions/nouvelle');
    await fillCautionForm(page, { reference, banqueNom: 'Banque Avant Modif' });
    await page.getByRole('button', { name: 'Créer la caution' }).click();
    await page.waitForURL(CAUTION_DETAIL_URL, { timeout: 10000 });

    await page.getByRole('button', { name: 'Modifier' }).click();
    await page.waitForURL(CAUTION_EDIT_URL);

    await page.getByRole('textbox', { name: 'Nom de la banque *' }).fill('Banque Après Modif');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await page.waitForURL(CAUTION_DETAIL_URL, { timeout: 10000 });
    await expect(page.getByText('Banque Après Modif')).toBeVisible();
    await expect(page.getByText('Banque Avant Modif')).not.toBeVisible();
  });

  test('devrait pouvoir supprimer une caution', async ({ page }) => {
    const reference = uniqueReference('CAU-E2E-DELETE');

    await page.goto('/cautions/nouvelle');
    await fillCautionForm(page, { reference, banqueNom: 'Banque À Supprimer' });
    await page.getByRole('button', { name: 'Créer la caution' }).click();
    await page.waitForURL(CAUTION_DETAIL_URL, { timeout: 10000 });

    // Pas de dialog de confirmation sur cette action (cf. CautionDetailContent.handleDelete)
    await page.getByRole('button', { name: 'Supprimer' }).click();

    await page.waitForURL('/cautions', { timeout: 10000 });
    await expect(page.getByText(reference)).not.toBeVisible();
  });

  test('devrait respecter les permissions (VISITEUR ne peut ni créer ni modifier ni supprimer)', async ({ page }) => {
    // Se déconnecter d'abord : le middleware redirige un utilisateur déjà
    // authentifié loin de /login, donc un second login() sans déconnexion
    // préalable ne trouverait jamais le formulaire.
    await page.goto('/');
    await page.getByRole('button', { name: 'Déconnexion' }).click();
    await page.waitForURL('/login');

    await login(page, TEST_USERS.visiteur);

    await page.goto('/cautions');
    await expect(page.getByRole('link', { name: 'Nouvelle caution' })).toHaveCount(0);

    const firstCautionLink = page.locator('a[href^="/cautions/"]').first();
    const hasCaution = await firstCautionLink.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCaution) {
      await firstCautionLink.click();
      await page.waitForURL(CAUTION_DETAIL_URL);
      await expect(page.getByRole('button', { name: 'Modifier' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Supprimer' })).toHaveCount(0);
    }
  });
});
