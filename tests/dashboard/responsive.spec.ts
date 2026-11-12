import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { waitForDashboardLoaded } from '../helpers/dashboard';

/**
 * Tests E2E - Page d'accueil - Responsive
 * Trois tailles (desktop, tablette, mobile) : contenu présent et aucun débordement horizontal.
 * Une seule connexion ; la taille de la fenêtre change entre les cas.
 */
const TAILLES = [
  { nom: 'Desktop (1920x1080)', width: 1920, height: 1080 },
  { nom: 'Tablette (768x1024)', width: 768, height: 1024 },
  { nom: 'Mobile (375x667)', width: 375, height: 667 },
] as const;

test.describe('Tableau de bord - Responsive', () => {
  test.describe.configure({ mode: 'serial', timeout: 240000 });

  test('les trois blocs tiennent dans la largeur à chaque taille', async ({ page }) => {
    await login(page, TEST_USERS.admin);

    for (const taille of TAILLES) {
      await page.setViewportSize({ width: taille.width, height: taille.height });
      await page.goto('/');
      await waitForDashboardLoaded(page);

      await expect(page.getByRole('region', { name: 'À traiter' }), taille.nom).toBeVisible();
      await expect(page.getByRole('region', { name: 'Est-ce que ça va ?' }), taille.nom).toBeVisible();
      await expect(page.getByRole('region', { name: 'Pipeline des offres' }), taille.nom).toBeVisible();

      // À 375 px, `innerWidth` s'élargit si quelque chose déborde : comparer à la largeur du document.
      const debordement = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        fenetre: document.documentElement.clientWidth,
        elements: Array.from(document.querySelectorAll('main *'))
          .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className?.toString().slice(0, 40)}`),
      }));
      expect(debordement.document, `${taille.nom} : ${debordement.elements.join(' | ')}`).toBeLessThanOrEqual(debordement.fenetre);
    }
  });

  test('mobile : les cibles tactiles du filtre et de la création font au moins 44 px', async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForDashboardLoaded(page);

    const cibles = [
      page.getByRole('link', { name: 'Tout', exact: true }),
      page.getByRole('link', { name: 'Passation', exact: true }),
      page.getByRole('link', { name: 'Nouvelle opportunité' }),
      page.getByRole('button', { name: /Créer/ }),
    ];
    for (const cible of cibles) {
      const boite = await cible.boundingBox();
      expect(boite?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    }
  });
});
