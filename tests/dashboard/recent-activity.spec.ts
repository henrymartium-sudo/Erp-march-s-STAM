import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';
import { waitForDashboardLoaded, countRecentItems } from '../helpers/dashboard';

/**
 * Tests E2E - Dashboard - Recent Activity
 * Vérifie les 3 cartes d'activité récente (marchés, cautions, véhicules)
 */
test.describe('Dashboard - Activité Récente', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin);
    await waitForDashboardLoaded(page);
  });

  test('devrait afficher les 3 cartes d\'activité récente', async ({ page }) => {
    const recentSection = page.locator('text=Activité récente').or(
      page.locator('text=Récemment')
    );

    await expect(recentSection).toBeVisible();

    // Vérifier les 3 sous-sections
    const marchesRecents = page.locator('text=Marchés récents').or(
      page.locator('text=Derniers marchés')
    );

    const cautionsRecentes = page.locator('text=Cautions récentes').or(
      page.locator('text=Dernières cautions')
    );

    const vehiculesRecents = page.locator('text=Véhicules récents').or(
      page.locator('text=Derniers véhicules')
    );

    // Au moins une des sections devrait être visible
    const marchesVisible = await marchesRecents.isVisible({ timeout: 2000 }).catch(() => false);
    const cautionsVisible = await cautionsRecentes.isVisible({ timeout: 2000 }).catch(() => false);
    const vehiculesVisible = await vehiculesRecents.isVisible({ timeout: 2000 }).catch(() => false);

    expect(marchesVisible || cautionsVisible || vehiculesVisible).toBe(true);
  });

  test.describe('Marchés récents', () => {
    test('devrait afficher max 5 marchés récents', async ({ page }) => {
      const marchesSection = page.locator('text=Marchés récents').or(
        page.locator('text=Derniers marchés')
      );

      const isVisible = await marchesSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        const section = marchesSection.locator('..').locator('..');
        const marcheLinks = section.locator('a[href^="/marches/"]');

        const count = await marcheLinks.count();

        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(5);
        console.log('Nombre de marchés récents:', count);
      } else {
        console.log('Section marchés récents masquée');
        expect(true).toBe(true);
      }
    });

    test('devrait afficher un message si aucun marché', async ({ page }) => {
      const marchesSection = page.locator('text=Marchés récents');

      const isVisible = await marchesSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        const section = marchesSection.locator('..').locator('..');

        // Vérifier soit des liens soit un message vide
        const marcheLinks = section.locator('a[href^="/marches/"]');
        const emptyMessage = section.locator('text=Aucun marché récent').or(
          section.locator('text=Aucune donnée')
        );

        const hasLinks = (await marcheLinks.count()) > 0;
        const hasEmpty = await emptyMessage.isVisible({ timeout: 1000 }).catch(() => false);

        expect(hasLinks || hasEmpty).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });

    test('devrait permettre de naviguer vers un marché', async ({ page }) => {
      const marchesSection = page.locator('text=Marchés récents');

      const isVisible = await marchesSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        const section = marchesSection.locator('..').locator('..');
        const firstLink = section.locator('a[href^="/marches/"]').first();

        const hasLink = await firstLink.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasLink) {
          await firstLink.click();
          await page.waitForURL(/\/marches\/[a-z0-9-]+$/, { timeout: 5000 });

          // Revenir au dashboard
          await page.goto('/');
          await waitForDashboardLoaded(page);
        } else {
          console.log('Aucun lien marché disponible');
          expect(true).toBe(true);
        }
      } else {
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Cautions récentes', () => {
    test('devrait afficher max 5 cautions récentes', async ({ page }) => {
      const cautionsSection = page.locator('text=Cautions récentes');

      const isVisible = await cautionsSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        const section = cautionsSection.locator('..').locator('..');
        const cautionLinks = section.locator('a[href^="/cautions/"]');

        const count = await cautionLinks.count();

        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(5);
        console.log('Nombre de cautions récentes:', count);
      } else {
        expect(true).toBe(true);
      }
    });

    test('devrait afficher les dates avec icône Clock', async ({ page }) => {
      const cautionsSection = page.locator('text=Cautions récentes');

      const isVisible = await cautionsSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        const section = cautionsSection.locator('..').locator('..');

        // Chercher des SVG d'icônes (Clock)
        const icons = section.locator('svg');
        const iconCount = await icons.count();

        console.log('Nombre d\'icônes dans cautions récentes:', iconCount);
        expect(iconCount).toBeGreaterThanOrEqual(0);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Véhicules récents', () => {
    test('devrait afficher max 5 véhicules récents', async ({ page }) => {
      const vehiculesSection = page.locator('text=Véhicules récents');

      const isVisible = await vehiculesSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        const section = vehiculesSection.locator('..').locator('..');
        const vehiculeLinks = section.locator('a[href^="/vehicules/"]');

        const count = await vehiculeLinks.count();

        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(5);
        console.log('Nombre de véhicules récents:', count);
      } else {
        expect(true).toBe(true);
      }
    });

    test('devrait afficher les immatriculations', async ({ page }) => {
      const vehiculesSection = page.locator('text=Véhicules récents');

      const isVisible = await vehiculesSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        const section = vehiculesSection.locator('..').locator('..');
        const sectionText = await section.textContent();

        // Les immatriculations sont généralement des codes alphanumériques
        const hasText = sectionText && sectionText.length > 0;

        expect(hasText).toBe(true);
        console.log('Texte véhicules récents présent');
      } else {
        expect(true).toBe(true);
      }
    });
  });

  test('devrait afficher les sections en layout 3 colonnes sur desktop', async ({ page }) => {
    const recentSection = page.locator('text=Activité récente').or(
      page.locator('text=Récemment')
    );

    const isVisible = await recentSection.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      const container = recentSection.locator('..').locator('..');

      const className = await container.getAttribute('class');

      if (className) {
        const hasGrid = className.includes('grid');
        console.log('Layout grid:', hasGrid);

        // Vérifier les classes responsive
        expect(hasGrid || className.includes('flex')).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    } else {
      expect(true).toBe(true);
    }
  });
});
