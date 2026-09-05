import { test, expect, type Page } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';

/**
 * Filtrage serveur des cautions (correctif F10).
 *
 * Les filtres sont portés par l'URL et appliqués dans getCautions() : ils
 * doivent donc s'appliquer à l'ensemble des cautions et pas au seul lot
 * déjà paginé. Ces tests vérifient la combinatoire de filtres à partir de
 * liens directs — ce qui était impossible tant que l'état vivait uniquement
 * dans le state React de CautionFilters.
 *
 * AUCUN test ne déclenche de suppression : la confirmation est ouverte puis
 * annulée (données de production).
 */

const CARD = '[data-testid="caution-card"]';

async function gotoCautions(page: Page, query: string) {
  await page.goto(`/cautions${query}`);
  await page.waitForLoadState('networkidle');
  // Le titre existe aussi dans l'en-tête applicatif : on cible celui de la page
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Cautions & Garanties' })
  ).toBeVisible();
}

test.describe('Cautions - Filtres serveur pilotés par l\'URL', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin);
  });

  test('un filtre niveauAlerte passé dans l\'URL est bien appliqué côté serveur', async ({ page }) => {
    await gotoCautions(page, '');
    const total = await page.locator(CARD).count();

    await gotoCautions(page, '?niveauAlerte=ATTENTION');
    const attention = await page.locator(CARD).count();

    // Le filtre réduit (ou laisse identique) l'ensemble, il ne l'élargit jamais
    expect(attention).toBeLessThanOrEqual(total);

    // Le filtre issu de l'URL est reflété dans l'UI (chip de filtre actif)
    await expect(page.getByText('Alerte:')).toBeVisible();

    // Une caution en ATTENTION n'est jamais expirée
    const cards = page.locator(CARD);
    for (let i = 0; i < attention; i++) {
      await expect(cards.nth(i)).not.toContainText('Expirée');
    }
  });

  test('combinaison niveauAlerte + type : les deux critères s\'appliquent', async ({ page }) => {
    await gotoCautions(page, '?niveauAlerte=ATTENTION');
    const attention = await page.locator(CARD).count();

    await gotoCautions(page, '?niveauAlerte=ATTENTION&type=RETENUE_GARANTIE');
    const combine = await page.locator(CARD).count();

    expect(combine).toBeLessThanOrEqual(attention);

    // Les deux chips de filtre actif sont présents
    await expect(page.getByText('Alerte:')).toBeVisible();
    await expect(page.getByText('Type:')).toBeVisible();

    // Toutes les cautions affichées portent bien le type demandé
    const cards = page.locator(CARD);
    for (let i = 0; i < combine; i++) {
      await expect(cards.nth(i)).toContainText('Caution de retenue de garantie');
    }
  });

  test('combinaison niveauAlerte=EXPIRE + statut : ne renvoie que des cautions échues', async ({ page }) => {
    await gotoCautions(page, '?niveauAlerte=EXPIRE&statut=ACTIVE');
    const cards = page.locator(CARD);
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText('Expirée');
      await expect(cards.nth(i)).toContainText('Active');
    }
  });

  test('le bouton Réinitialiser vide les filtres de l\'URL', async ({ page }) => {
    await gotoCautions(page, '?niveauAlerte=ATTENTION&type=RETENUE_GARANTIE');

    await page.getByRole('button', { name: 'Réinitialiser' }).click();
    await page.waitForURL((url) => !url.search.includes('niveauAlerte'));

    expect(new URL(page.url()).search).toBe('');
  });

  test('une seule pagination est rendue (pas de pagination cliente en doublon)', async ({ page }) => {
    await gotoCautions(page, '');

    // L'ancienne pagination interne de CautionList a été supprimée
    await expect(page.getByRole('button', { name: 'Précédent' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Suivant' })).toHaveCount(0);
  });

  test('le total en en-tête reflète le compte filtré, pas le total non filtré', async ({ page }) => {
    // Ce total (pagination.totalItems) est ce qui pilote la pagination : s'il
    // restait calculé sur l'ensemble non filtré (bug du filtrage client
    // post-pagination), il ne correspondrait plus au nombre de cautions
    // réellement affichées dès qu'un filtre est actif, et la pagination
    // deviendrait fausse sur un jeu de résultats filtrés étalé sur plusieurs pages.
    const headerBadge = (p: Page) =>
      p.getByRole('main').locator('h1:has-text("Cautions & Garanties") + span');

    await gotoCautions(page, '?niveauAlerte=ATTENTION');
    const filteredBadge = await headerBadge(page).textContent();
    const filteredCardCount = await page.locator(CARD).count();

    expect(Number(filteredBadge)).toBe(filteredCardCount);

    await gotoCautions(page, '');
    const totalBadge = await headerBadge(page).textContent();
    expect(Number(filteredBadge)).toBeLessThanOrEqual(Number(totalBadge));
  });

  test('un filtre combiné à page=2 reste appliqué (pas de retour silencieux aux données non filtrées)', async ({ page }) => {
    // Avec la pagination pilotée uniquement par CautionList (bug initial), la
    // page ne pouvait pas du tout être un lot filtré + décalé : le filtrage
    // se faisait après coup sur le seul lot déjà renvoyé par le serveur pour
    // la page demandée. Ici, filtre et page sont deux paramètres d'URL
    // indépendants transmis ensemble à getCautions() : le filtre doit rester
    // appliqué (chip visible) quel que soit le nombre de résultats sur cette page.
    await gotoCautions(page, '?niveauAlerte=ATTENTION&page=2');

    await expect(page.getByText('Alerte:')).toBeVisible();

    const cards = page.locator(CARD);
    const count = await cards.count();

    if (count === 0) {
      await expect(page.getByText('Aucune caution ne correspond')).toBeVisible();
    } else {
      for (let i = 0; i < count; i++) {
        await expect(cards.nth(i)).not.toContainText('Expirée');
      }
    }
  });
});

test.describe('Cautions - Sécurité des actions de suppression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin);
  });

  test('le menu de la carte ne propose plus de fausse action Supprimer', async ({ page }) => {
    await gotoCautions(page, '');
    const firstCard = page.locator(CARD).first();
    await expect(firstCard).toBeVisible();

    await firstCard.getByRole('button', { name: 'Actions' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Supprimer' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Voir détails' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('la suppression sur le détail demande une confirmation explicite', async ({ page }) => {
    await gotoCautions(page, '');
    await page.locator(CARD).first().getByRole('link', { name: 'Voir détails' }).first().click();
    await page.waitForURL(/\/cautions\/[^/]+$/);

    await page.getByRole('button', { name: 'Supprimer' }).click();

    // Le dialog de confirmation s'ouvre : aucune suppression n'a été déclenchée
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('irréversible');
    await expect(dialog.getByRole('button', { name: 'Supprimer définitivement' })).toBeVisible();

    // On annule — on ne supprime jamais de données réelles depuis un test
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/cautions\/[^/]+$/);
  });
});
