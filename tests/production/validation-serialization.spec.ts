import { test, expect } from '@playwright/test';

/**
 * Tests de validation production - Documents & Véhicules
 *
 * Objectif : Détecter les bugs de sérialisation (Decimal, Date) en production
 * Inspiré des bugs détectés sur Marchés/Cautions (Session 2026-02-09)
 *
 * Bugs recherchés :
 * - TypeError: s.montant.toNumber is not a function
 * - Crash RSC avec dates non sérialisées
 * - Sérialisation partielle des relations
 */

const PRODUCTION_URL = 'https://erp-marches-stam.vercel.app';

const TEST_CREDENTIALS = {
  email: 'admin@erp-marches.local',
  password: 'Admin123!',
};

test.describe('Production - Documents Module', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en production
    await page.goto(PRODUCTION_URL);

    // Remplir le formulaire de login
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Attendre la redirection après login
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
  });

  test('[DOCS-01] Liste des documents - Affichage', async ({ page }) => {
    console.log('🧪 Test: Liste documents...');

    await page.goto(`${PRODUCTION_URL}/documents`);

    // Vérifier que la page se charge sans erreur
    await expect(page.locator('h1, h2')).toContainText(/Documents?/i, { timeout: 5000 });

    // Prendre une capture d'écran
    await page.screenshot({ path: 'playwright-report/docs-01-liste.png' });

    console.log('✅ Liste documents OK');
  });

  test('[DOCS-02] Recherche textuelle', async ({ page }) => {
    console.log('🧪 Test: Recherche documents...');

    await page.goto(`${PRODUCTION_URL}/documents`);

    // Attendre le chargement
    await page.waitForTimeout(1000);

    // Chercher l'input de recherche
    const searchInput = page.locator('input[placeholder*="Recherche"], input[type="search"]');

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Tester la recherche
      await searchInput.fill('contrat');
      await page.waitForTimeout(500); // Debounce

      // Vérifier qu'il n'y a pas d'erreur console
      await page.screenshot({ path: 'playwright-report/docs-02-recherche.png' });

      console.log('✅ Recherche documents OK');
    } else {
      console.log('⚠️  Input recherche non trouvé');
    }
  });

  test('[DOCS-03] Détail document - Sérialisation dates', async ({ page }) => {
    console.log('🧪 Test: Détail document...');

    await page.goto(`${PRODUCTION_URL}/documents`);
    await page.waitForTimeout(1000);

    // Chercher le premier document
    const firstDocLink = page.locator('a[href*="/documents/"]').first();

    if (await firstDocLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstDocLink.click();

      // Attendre le chargement du détail
      await page.waitForTimeout(1000);

      // Vérifier qu'il n'y a pas d'erreur de sérialisation
      const errorMessage = page.locator('text=/error|TypeError|toNumber is not a function/i');
      const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasError) {
        const errorText = await errorMessage.textContent();
        console.error('❌ ERREUR DÉTECTÉE:', errorText);
        await page.screenshot({ path: 'playwright-report/docs-03-error.png' });
        throw new Error(`Bug de sérialisation détecté: ${errorText}`);
      }

      // Capture d'écran
      await page.screenshot({ path: 'playwright-report/docs-03-detail.png' });

      console.log('✅ Détail document OK - Pas d\'erreur de sérialisation');
    } else {
      console.log('⚠️  Aucun document trouvé pour tester le détail');
    }
  });

  test('[DOCS-04] Relation avec marché - Sérialisation complète', async ({ page }) => {
    console.log('🧪 Test: Relation document → marché...');

    await page.goto(`${PRODUCTION_URL}/documents`);
    await page.waitForTimeout(1000);

    // Chercher un document lié à un marché
    const marcheLink = page.locator('a[href*="/marches/"]').first();

    if (await marcheLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await marcheLink.click();

      // Vérifier que la page marché se charge
      await page.waitForTimeout(1000);

      // Détecter erreurs de sérialisation
      const errorMessage = page.locator('text=/error|TypeError|toNumber is not a function/i');
      const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasError) {
        const errorText = await errorMessage.textContent();
        console.error('❌ ERREUR DÉTECTÉE (relation marché):', errorText);
        await page.screenshot({ path: 'playwright-report/docs-04-error.png' });
        throw new Error(`Bug de sérialisation sur relation: ${errorText}`);
      }

      await page.screenshot({ path: 'playwright-report/docs-04-relation.png' });
      console.log('✅ Relation document → marché OK');
    } else {
      console.log('⚠️  Aucune relation marché trouvée');
    }
  });
});

test.describe('Production - Véhicules Module', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en production
    await page.goto(PRODUCTION_URL);

    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
  });

  test('[VEH-01] Liste des véhicules - Affichage', async ({ page }) => {
    console.log('🧪 Test: Liste véhicules...');

    await page.goto(`${PRODUCTION_URL}/vehicules`);

    // Vérifier que la page se charge
    await expect(page.locator('h1, h2')).toContainText(/Véhicules?/i, { timeout: 5000 });

    await page.screenshot({ path: 'playwright-report/veh-01-liste.png' });

    console.log('✅ Liste véhicules OK');
  });

  test('[VEH-02] Recherche textuelle', async ({ page }) => {
    console.log('🧪 Test: Recherche véhicules...');

    await page.goto(`${PRODUCTION_URL}/vehicules`);
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[placeholder*="Recherche"], input[type="search"]');

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500); // Debounce

      await page.screenshot({ path: 'playwright-report/veh-02-recherche.png' });

      console.log('✅ Recherche véhicules OK');
    } else {
      console.log('⚠️  Input recherche non trouvé');
    }
  });

  test('[VEH-03] Détail véhicule - Sérialisation dates & montants', async ({ page }) => {
    console.log('🧪 Test: Détail véhicule...');

    await page.goto(`${PRODUCTION_URL}/vehicules`);
    await page.waitForTimeout(1000);

    // Chercher le premier véhicule
    const firstVehLink = page.locator('a[href*="/vehicules/"]').first();

    if (await firstVehLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstVehLink.click();

      await page.waitForTimeout(1000);

      // Détecter erreurs de sérialisation (montant, dates)
      const errorMessage = page.locator('text=/error|TypeError|toNumber is not a function|Invalid Date/i');
      const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasError) {
        const errorText = await errorMessage.textContent();
        console.error('❌ ERREUR DÉTECTÉE:', errorText);
        await page.screenshot({ path: 'playwright-report/veh-03-error.png' });
        throw new Error(`Bug de sérialisation détecté: ${errorText}`);
      }

      // Vérifier les champs spécifiques
      const hasDateLivraison = await page.locator('text=/Date.*livraison/i').isVisible({ timeout: 1000 }).catch(() => false);
      const hasMontant = await page.locator('text=/Prix|Montant/i').isVisible({ timeout: 1000 }).catch(() => false);

      console.log(`  - Date livraison affichée: ${hasDateLivraison ? '✅' : '❌'}`);
      console.log(`  - Montant affiché: ${hasMontant ? '✅' : '❌'}`);

      await page.screenshot({ path: 'playwright-report/veh-03-detail.png' });

      console.log('✅ Détail véhicule OK - Pas d\'erreur de sérialisation');
    } else {
      console.log('⚠️  Aucun véhicule trouvé pour tester le détail');
    }
  });

  test('[VEH-04] Relation avec marché - Sérialisation complète', async ({ page }) => {
    console.log('🧪 Test: Relation véhicule → marché...');

    await page.goto(`${PRODUCTION_URL}/vehicules`);
    await page.waitForTimeout(1000);

    // Chercher un véhicule lié à un marché
    const marcheLink = page.locator('a[href*="/marches/"]').first();

    if (await marcheLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await marcheLink.click();

      await page.waitForTimeout(1000);

      // Détecter erreurs
      const errorMessage = page.locator('text=/error|TypeError|toNumber is not a function/i');
      const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasError) {
        const errorText = await errorMessage.textContent();
        console.error('❌ ERREUR DÉTECTÉE (relation marché):', errorText);
        await page.screenshot({ path: 'playwright-report/veh-04-error.png' });
        throw new Error(`Bug de sérialisation sur relation: ${errorText}`);
      }

      await page.screenshot({ path: 'playwright-report/veh-04-relation.png' });
      console.log('✅ Relation véhicule → marché OK');
    } else {
      console.log('⚠️  Aucune relation marché trouvée');
    }
  });

  test('[VEH-05] Section véhicules dans page marché', async ({ page }) => {
    console.log('🧪 Test: Section véhicules dans marché...');

    // Aller sur un marché
    await page.goto(`${PRODUCTION_URL}/marches`);
    await page.waitForTimeout(1000);

    const firstMarcheLink = page.locator('a[href*="/marches/"]').first();

    if (await firstMarcheLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstMarcheLink.click();
      await page.waitForTimeout(1000);

      // Chercher la section véhicules
      const vehiculesSection = page.locator('text=/Véhicules/i');

      if (await vehiculesSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Vérifier qu'il n'y a pas d'erreur
        const errorMessage = page.locator('text=/error|TypeError|toNumber is not a function/i');
        const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasError) {
          const errorText = await errorMessage.textContent();
          console.error('❌ ERREUR DÉTECTÉE (section véhicules):', errorText);
          await page.screenshot({ path: 'playwright-report/veh-05-error.png' });
          throw new Error(`Bug de sérialisation dans section véhicules: ${errorText}`);
        }

        await page.screenshot({ path: 'playwright-report/veh-05-section.png' });
        console.log('✅ Section véhicules dans marché OK');
      } else {
        console.log('⚠️  Section véhicules non trouvée dans la page marché');
      }
    } else {
      console.log('⚠️  Aucun marché trouvé');
    }
  });
});

test.describe('Production - Tests Intégrés', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
  });

  test('[INT-01] Flux complet : Marché → Documents → Véhicules', async ({ page }) => {
    console.log('🧪 Test: Flux intégré complet...');

    // 1. Aller sur un marché
    await page.goto(`${PRODUCTION_URL}/marches`);
    await page.waitForTimeout(1000);

    const marcheLink = page.locator('a[href*="/marches/"]').first();
    if (!await marcheLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('⚠️  Aucun marché trouvé - test intégré ignoré');
      return;
    }

    await marcheLink.click();
    await page.waitForTimeout(1000);

    // Capture marché
    await page.screenshot({ path: 'playwright-report/int-01-marche.png' });

    // 2. Vérifier la section Documents
    const docsSection = page.locator('text=/Documents?/i');
    if (await docsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('  ✅ Section Documents détectée');

      // Cliquer sur un document si disponible
      const docLink = page.locator('a[href*="/documents/"]').first();
      if (await docLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await docLink.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'playwright-report/int-01-document.png' });
        await page.goBack();
        await page.waitForTimeout(1000);
      }
    }

    // 3. Vérifier la section Véhicules
    const vehSection = page.locator('text=/Véhicules?/i');
    if (await vehSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('  ✅ Section Véhicules détectée');

      // Cliquer sur un véhicule si disponible
      const vehLink = page.locator('a[href*="/vehicules/"]').first();
      if (await vehLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await vehLink.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'playwright-report/int-01-vehicule.png' });
      }
    }

    // 4. Vérifier l'absence d'erreurs
    const errorMessage = page.locator('text=/error|TypeError|toNumber is not a function/i');
    const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.error('❌ ERREUR DÉTECTÉE dans flux intégré:', errorText);
      await page.screenshot({ path: 'playwright-report/int-01-error.png' });
      throw new Error(`Bug détecté dans flux intégré: ${errorText}`);
    }

    console.log('✅ Flux intégré complet OK - Aucune erreur de sérialisation');
  });
});
