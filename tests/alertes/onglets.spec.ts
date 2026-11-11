import { test, expect } from '@playwright/test';
import type { Browser, Cookie, Page } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth';
import type { TestUser } from '../helpers/auth';

/**
 * Tests E2E — Onglets de /admin/alertes (livraison 3 « Alertes et e-mails »)
 *
 * ─ O1  Anciennes adresses → bon onglet (redirections permanentes)
 * ─ O2  ADMIN : 4 onglets
 * ─ O3  AVANCE : 3 onglets, adresse directe de Rapports refusée
 * ─ O4  EXPLOITATION : Envoi manuel seulement, autres onglets refusés
 * ─ O5  375 px : pas de débordement horizontal, onglets atteignables au clavier
 *
 * La création d'une règle (retour sur l'onglet Règles, règle visible) est couverte
 * par tests/alertes/rules.spec.ts. Aucun test ne déclenche d'envoi.
 */

test.setTimeout(120000);

const ONGLETS = ['Envoi manuel', 'Règles', 'Rapports', 'Historique'] as const;
const SECTION = 'nav[aria-label^="Sections de la page Alertes"]';

async function connecter(browser: Browser, user: TestUser): Promise<Cookie[]> {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  await page.goto('/login');
  await page.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });
  await page.waitForLoadState('networkidle');
  const cookies = await context.cookies();
  await context.close();
  return cookies;
}

async function ouvrir(page: Page, cookies: Cookie[], chemin: string) {
  page.setDefaultNavigationTimeout(60000);
  await page.context().addCookies(cookies);
  await page.goto(chemin);
  await page.waitForLoadState('networkidle');
}

function onglet(page: Page, libelle: string) {
  return page.locator(SECTION).getByRole('link', { name: libelle, exact: true });
}

function surOnglet(valeur: string | null) {
  return (url: URL) =>
    url.pathname === '/admin/alertes' && url.searchParams.get('onglet') === valeur;
}

test.describe('Alertes et e-mails — ADMIN', () => {
  let cookies: Cookie[] = [];

  test.beforeAll(async ({ browser }) => {
    cookies = await connecter(browser, TEST_USERS.admin);
  });

  test('O1 — les anciennes adresses atterrissent sur le bon onglet', async ({ page }) => {
    const cas: [string, string, string][] = [
      ['/admin/reporting', 'rapports', 'Rapports'],
      ['/admin/alertes/rules', 'regles', 'Règles'],
      ['/admin/alertes/history', 'historique', 'Historique'],
    ];
    for (const [ancienne, valeur, libelle] of cas) {
      await ouvrir(page, cookies, ancienne);
      expect(surOnglet(valeur)(new URL(page.url())), `${ancienne} → ${page.url()}`).toBe(true);
      await expect(onglet(page, libelle)).toHaveAttribute('aria-current', 'page');
    }
  });

  test('O2 — ADMIN voit les 4 onglets, Envoi manuel actif par défaut', async ({ page }) => {
    await ouvrir(page, cookies, '/admin/alertes');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Alertes et e-mails', exact: true })).toBeVisible();
    for (const libelle of ONGLETS) {
      await expect(onglet(page, libelle)).toBeVisible();
    }
    await expect(onglet(page, 'Envoi manuel')).toHaveAttribute('aria-current', 'page');

    await onglet(page, 'Rapports').click();
    await page.waitForURL(surOnglet('rapports'), { timeout: 60000 });
    await expect(onglet(page, 'Rapports')).toHaveAttribute('aria-current', 'page');
  });

  test('O2b — onglet inconnu : retour sur Envoi manuel', async ({ page }) => {
    await ouvrir(page, cookies, '/admin/alertes?onglet=nimporte');
    await expect(onglet(page, 'Envoi manuel')).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('Alertes et e-mails — AVANCE', () => {
  let cookies: Cookie[] = [];

  test.beforeAll(async ({ browser }) => {
    cookies = await connecter(browser, TEST_USERS.avance);
  });

  test('O3 — AVANCE : 3 onglets, Rapports refusé en adresse directe', async ({ page }) => {
    await ouvrir(page, cookies, '/admin/alertes');
    for (const libelle of ['Envoi manuel', 'Règles', 'Historique']) {
      await expect(onglet(page, libelle)).toBeVisible();
    }
    await expect(onglet(page, 'Rapports')).toHaveCount(0);

    await ouvrir(page, cookies, '/admin/alertes?onglet=rapports');
    expect(new URL(page.url()).pathname).not.toBe('/admin/alertes');

    // L'ancienne adresse du reporting suit la même règle
    await ouvrir(page, cookies, '/admin/reporting');
    expect(new URL(page.url()).pathname).not.toBe('/admin/alertes');
  });
});

test.describe('Alertes et e-mails — EXPLOITATION', () => {
  let cookies: Cookie[] = [];

  test.beforeAll(async ({ browser }) => {
    cookies = await connecter(browser, TEST_USERS.exploitation);
  });

  test('O4 — EXPLOITATION : Envoi manuel seulement', async ({ page }) => {
    await ouvrir(page, cookies, '/admin/alertes');
    await expect(onglet(page, 'Envoi manuel')).toBeVisible();
    for (const libelle of ['Règles', 'Rapports', 'Historique']) {
      await expect(onglet(page, libelle)).toHaveCount(0);
    }

    for (const valeur of ['regles', 'rapports', 'historique']) {
      await ouvrir(page, cookies, `/admin/alertes?onglet=${valeur}`);
      expect(new URL(page.url()).pathname, `onglet ${valeur}`).not.toBe('/admin/alertes');
    }
  });
});

test.describe('Alertes et e-mails — 375 px', () => {
  let cookies: Cookie[] = [];

  test.beforeAll(async ({ browser }) => {
    cookies = await connecter(browser, TEST_USERS.admin);
  });

  test('O5 — pas de débordement horizontal sur chaque onglet', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    for (const valeur of ['envoi', 'regles', 'rapports', 'historique']) {
      await ouvrir(page, cookies, valeur === 'envoi' ? '/admin/alertes' : `/admin/alertes?onglet=${valeur}`);
      // À 375 px, innerWidth s'élargit : comparer scrollWidth à clientWidth
      const { debordement, fautifs } = await page.evaluate(() => {
        const racine = document.documentElement;
        const limite = racine.clientWidth;
        const fautifs = Array.from(document.body.querySelectorAll('*'))
          .filter((el) => el.getBoundingClientRect().right > limite + 1)
          .slice(0, 8)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} (droite ${Math.round(el.getBoundingClientRect().right)})`);
        return { debordement: racine.scrollWidth - limite, fautifs };
      });
      expect(debordement, `onglet ${valeur} — éléments qui dépassent : ${fautifs.join(' | ')}`).toBeLessThanOrEqual(1);
    }
  });

  test('O5b — les onglets s\'enchaînent au clavier', async ({ page }) => {
    await ouvrir(page, cookies, '/admin/alertes');
    await onglet(page, 'Envoi manuel').focus();
    for (const suivant of ['Règles', 'Rapports', 'Historique']) {
      await page.keyboard.press('Tab');
      await expect(onglet(page, suivant)).toBeFocused();
    }
  });
});
