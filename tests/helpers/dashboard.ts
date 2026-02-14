import { Page, Locator } from '@playwright/test';

/**
 * Helpers spécifiques pour les tests E2E du Dashboard enrichi
 */

/**
 * Attendre que le dashboard soit complètement chargé
 * Vérifie la présence des sections principales
 */
export async function waitForDashboardLoaded(page: Page, timeout: number = 10000): Promise<void> {
  // Attendre que la page soit chargée
  await page.waitForLoadState('networkidle', { timeout });

  // Attendre la présence d'au moins une KPI card
  await page.waitForSelector('text=Marchés actifs', { timeout });
}

/**
 * Vérifier si un graphique Recharts est visible
 * @param page - Page Playwright
 * @param chartTitle - Titre ou texte identifiant le graphique
 * @returns true si le SVG du graphique est visible
 */
export async function isChartVisible(page: Page, chartTitle: string): Promise<boolean> {
  try {
    const chartSection = page.locator(`text=${chartTitle}`).locator('..').locator('..');
    const svg = chartSection.locator('svg').first();

    await svg.waitFor({ state: 'visible', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Survoler un graphique Recharts et vérifier l'apparition d'un tooltip
 * Note: Les tooltips peuvent être instables, assertions souples recommandées
 *
 * @param page - Page Playwright
 * @param chartSelector - Sélecteur du container du graphique
 * @param tooltipPattern - Pattern regex ou texte pour identifier le tooltip
 * @returns true si le tooltip apparaît
 */
export async function hoverChartAndCheckTooltip(
  page: Page,
  chartSelector: string,
  tooltipPattern: string | RegExp
): Promise<boolean> {
  try {
    const chart = page.locator(chartSelector).first();
    const svg = chart.locator('svg').first();

    await svg.waitFor({ state: 'visible', timeout: 5000 });

    // Survoler le centre approximatif du SVG
    await svg.hover({ position: { x: 120, y: 120 } });

    // Attendre l'apparition du tooltip (souple)
    const tooltip = page.locator(
      typeof tooltipPattern === 'string'
        ? `text=${tooltipPattern}`
        : `text=${tooltipPattern.source}`
    );

    const isVisible = await tooltip.isVisible({ timeout: 2000 }).catch(() => false);
    return isVisible;
  } catch {
    return false;
  }
}

/**
 * Compter le nombre d'items dans une section Recent Activity
 * @param page - Page Playwright
 * @param sectionTitle - Titre de la section (ex: "Marchés récents")
 * @returns Nombre d'items trouvés
 */
export async function countRecentItems(page: Page, sectionTitle: string): Promise<number> {
  try {
    const section = page.locator(`text=${sectionTitle}`).locator('..').locator('..');
    const items = section.locator('a[href^="/"]');

    const count = await items.count();
    return count;
  } catch {
    return 0;
  }
}

/**
 * Vérifier le nombre de colonnes d'une grille responsive
 * @param page - Page Playwright
 * @param selector - Sélecteur du container de grille
 * @param expectedClass - Classe CSS attendue (ex: 'lg:grid-cols-3')
 * @returns true si la classe est présente
 */
export async function checkGridColumns(
  page: Page,
  selector: string,
  expectedClass: string
): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    const className = await element.getAttribute('class');

    return className?.includes(expectedClass) ?? false;
  } catch {
    return false;
  }
}

/**
 * Vérifier si une section conditionnelle est affichée
 * Certaines sections peuvent retourner null côté serveur
 *
 * @param page - Page Playwright
 * @param sectionText - Texte identifiant la section
 * @returns true si la section est visible
 */
export async function isSectionVisible(page: Page, sectionText: string): Promise<boolean> {
  try {
    const section = page.locator(`text=${sectionText}`).first();
    return await section.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
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

/**
 * Cliquer sur un lien et vérifier la navigation
 * @param page - Page Playwright
 * @param linkText - Texte du lien
 * @param expectedUrlPattern - Pattern regex de l'URL attendue
 */
export async function clickLinkAndVerify(
  page: Page,
  linkText: string,
  expectedUrlPattern: RegExp
): Promise<void> {
  await page.click(`text=${linkText}`);
  await page.waitForURL(expectedUrlPattern, { timeout: 5000 });
}

/**
 * Vérifier le format d'un montant FCFA
 * @param text - Texte contenant le montant
 * @returns true si le format est correct (ex: "1 000 000 FCFA")
 */
export function isValidFCFAFormat(text: string): boolean {
  // Pattern: chiffres avec espaces + FCFA
  const pattern = /^[\d\s]+FCFA$/;
  return pattern.test(text.replace(/\s+/g, ' ').trim());
}

/**
 * Attendre qu'un nombre minimum d'éléments soit visible
 * @param locator - Locator Playwright
 * @param minCount - Nombre minimum d'éléments attendus
 * @param timeout - Timeout en ms
 */
export async function waitForMinElements(
  locator: Locator,
  minCount: number,
  timeout: number = 5000
): Promise<void> {
  await locator.first().waitFor({ state: 'visible', timeout });

  const count = await locator.count();
  if (count < minCount) {
    throw new Error(`Expected at least ${minCount} elements, found ${count}`);
  }
}
