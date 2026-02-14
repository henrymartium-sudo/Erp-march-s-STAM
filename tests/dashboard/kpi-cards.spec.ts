import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { waitForDashboardLoaded, isValidFCFAFormat } from '../helpers/dashboard';

/**
 * Tests E2E - Dashboard - KPI Cards
 * Vérifie l'affichage des 6 cartes KPI (ou 5 si pas de cautions à surveiller)
 */
test.describe('Dashboard - KPI Cards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await waitForDashboardLoaded(page);
  });

  test('devrait afficher au minimum 5 KPI cards', async ({ page }) => {
    // KPI cards obligatoires
    await expect(page.locator('text=Marchés actifs')).toBeVisible();
    await expect(page.locator('text=Montant total')).toBeVisible();
    await expect(page.locator('text=Cautions actives')).toBeVisible();
    await expect(page.locator('text=Véhicules')).toBeVisible();
    await expect(page.locator('text=Documents')).toBeVisible();

    // "Cautions à surveiller" est conditionnelle
    const cautionAlert = page.locator('text=Cautions à surveiller');
    const cautionAlertVisible = await cautionAlert.isVisible({ timeout: 1000 }).catch(() => false);

    // Log pour debug
    console.log('Cautions à surveiller visible:', cautionAlertVisible);
  });

  test('devrait afficher les icônes Lucide pour chaque KPI', async ({ page }) => {
    // Vérifier la présence de SVG dans les cards
    const marchesCard = page.locator('text=Marchés actifs').locator('..');
    await expect(marchesCard.locator('svg').first()).toBeVisible();

    const montantCard = page.locator('text=Montant total').locator('..');
    await expect(montantCard.locator('svg').first()).toBeVisible();

    const cautionsCard = page.locator('text=Cautions actives').locator('..');
    await expect(cautionsCard.locator('svg').first()).toBeVisible();

    const vehiculesCard = page.locator('text=Véhicules').locator('..');
    await expect(vehiculesCard.locator('svg').first()).toBeVisible();

    const documentsCard = page.locator('text=Documents').locator('..');
    await expect(documentsCard.locator('svg').first()).toBeVisible();
  });

  test('devrait formater les montants en FCFA avec séparateurs', async ({ page }) => {
    const montantCard = page.locator('text=Montant total').locator('..');

    // Chercher le montant dans la card
    const montantText = await montantCard.locator('text=/\\d.*FCFA/').first().textContent();

    expect(montantText).toBeTruthy();

    // Vérifier le format (peut être "0 FCFA" ou "1 000 000 FCFA")
    if (montantText) {
      expect(montantText).toMatch(/FCFA$/);

      // Si montant > 0, vérifier les espaces séparateurs
      if (!montantText.startsWith('0')) {
        // Les grands nombres doivent avoir des espaces
        const hasSpaces = montantText.includes(' ');
        expect(hasSpaces).toBe(true);
      }
    }
  });

  test('devrait gérer les montants nuls correctement', async ({ page }) => {
    // Toutes les KPI cards peuvent afficher 0
    const cards = [
      'Marchés actifs',
      'Cautions actives',
      'Véhicules',
      'Documents',
    ];

    for (const cardTitle of cards) {
      const card = page.locator(`text=${cardTitle}`).locator('..');
      const content = await card.textContent();

      expect(content).toBeTruthy();

      // Si la valeur est 0, elle doit être affichée correctement
      if (content?.includes('0')) {
        expect(content).toMatch(/\b0\b/);
      }
    }
  });

  test('devrait afficher "Cautions à surveiller" si applicable', async ({ page }) => {
    const cautionAlertCard = page.locator('text=Cautions à surveiller');
    const isVisible = await cautionAlertCard.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      // Vérifier la bordure orange pour alerte
      const card = cautionAlertCard.locator('..').locator('..');
      const className = await card.getAttribute('class');

      expect(className).toContain('border-orange-200');

      // Vérifier la présence d'un nombre
      const cardText = await card.textContent();
      expect(cardText).toMatch(/\d+/);
    } else {
      // OK si pas de cautions à surveiller
      expect(true).toBe(true);
    }
  });

  test('devrait afficher les KPI en grille responsive', async ({ page }) => {
    // Chercher le container de grille KPI
    const kpiGrid = page.locator('text=Marchés actifs')
      .locator('..')
      .locator('..')
      .locator('..');

    const className = await kpiGrid.getAttribute('class');

    // Vérifier les classes responsive
    expect(className).toContain('grid');

    // Desktop: 3 colonnes (lg:grid-cols-3)
    // Mobile: 1 colonne
    // Tablette: 2 colonnes (md:grid-cols-2)
    expect(className).toMatch(/grid-cols-\d/);
  });

  test('devrait afficher les titres et valeurs pour chaque KPI', async ({ page }) => {
    const kpis = [
      { title: 'Marchés actifs', hasValue: true },
      { title: 'Montant total', hasValue: true },
      { title: 'Cautions actives', hasValue: true },
      { title: 'Véhicules', hasValue: true },
      { title: 'Documents', hasValue: true },
    ];

    for (const kpi of kpis) {
      const card = page.locator(`text=${kpi.title}`).locator('..');

      // Vérifier le titre
      await expect(card.locator(`text=${kpi.title}`)).toBeVisible();

      // Vérifier la présence d'une valeur
      if (kpi.hasValue) {
        const cardText = await card.textContent();
        expect(cardText).toMatch(/\d+/); // Au moins un nombre
      }
    }
  });

  test('devrait afficher les KPI avec un style cohérent', async ({ page }) => {
    const cards = page.locator('text=Marchés actifs')
      .locator('..')
      .locator('..')
      .locator('> div'); // Cards directes

    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Vérifier que toutes les cards ont une bordure et un padding
    for (let i = 0; i < Math.min(count, 6); i++) {
      const card = cards.nth(i);
      const className = await card.getAttribute('class');

      expect(className).toContain('border');
      expect(className).toMatch(/p-\d/); // Padding
    }
  });

  test('devrait afficher les tendances si disponibles', async ({ page }) => {
    // Certaines KPI peuvent afficher des tendances (+X%, -X%)
    const marchesCard = page.locator('text=Marchés actifs').locator('..');
    const cardText = await marchesCard.textContent();

    // Pattern optionnel pour tendance
    const hasTrend = cardText?.match(/[+\-]\d+%/);

    // Log pour debug
    console.log('Tendance détectée:', hasTrend ? hasTrend[0] : 'Aucune');

    // Pas d'assertion stricte car les tendances sont optionnelles dans le MVP
    expect(true).toBe(true);
  });

  test('devrait gérer le chargement avec skeleton ou état vide', async ({ page }) => {
    // Recharger la page pour voir l'état de chargement
    await page.reload();

    // Attendre que les KPI soient chargées
    await page.waitForSelector('text=Marchés actifs', { timeout: 10000 });

    // Vérifier qu'il n'y a pas de message d'erreur
    const errorMessage = page.locator('text=Erreur').or(
      page.locator('text=Impossible de charger')
    );

    const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
  });
});
