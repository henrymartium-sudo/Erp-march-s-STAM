import { Page } from '@playwright/test';

/**
 * Helpers pour les tests E2E de la page d'accueil (tableau de bord)
 */

/**
 * Attendre que la page d'accueil soit chargée : le titre, puis le bloc « Est-ce que ça va ? »
 * (rendu après les données, donc après le squelette de chargement).
 */
export async function waitForDashboardLoaded(page: Page, timeout: number = 60000): Promise<void> {
  await page.getByRole('heading', { level: 1, name: 'Tableau de bord' }).waitFor({ timeout });
  await page.getByRole('heading', { name: 'Est-ce que ça va ?' }).waitFor({ timeout });
}

/**
 * Naviguer vers une page et attendre le chargement
 * @param page - Page Playwright
 * @param url - URL relative (ex: '/marches/nouveau')
 */
export async function navigateAndWait(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}
