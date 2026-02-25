import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * Locator robuste pour les cartes véhicules — exclut /vehicules/sav et /vehicules/nouveau
 */
function vehicleCardLinks(page: ReturnType<BrowserContext['newPage'] extends (...args: any[]) => infer R ? () => R : never>) {
  return page.locator('a[href^="/vehicules/"]:not([href="/vehicules/sav"]):not([href="/vehicules/nouveau"])');
}

// ─── T12 : Permissions véhicules ──────────────────────────────────────────────

test.describe('T12 — Permissions Véhicules (EXPLOITATION)', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await login(page, TEST_USERS.exploitation);
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('T12-A : /vehicules/nouveau redirige vers /vehicules', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules/nouveau');
    // Attendre que l'URL ne contienne plus "/nouveau" (redirect serveur)
    await page.waitForURL((url) => !url.toString().includes('/nouveau'), { timeout: 15000 });
    expect(page.url()).toMatch(/\/vehicules$/);
    await page.close();
  });

  test('T12-B : /vehicules/[id]/edit redirige vers /vehicules/[id]', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('a[href^="/vehicules/"]:not([href="/vehicules/sav"]):not([href="/vehicules/nouveau"])').first();
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();
    const vehiculeId = href!.split('/vehicules/')[1];

    await page.goto(`/vehicules/${vehiculeId}/edit`);
    await page.waitForURL(
      (url) => url.toString().includes(`/vehicules/${vehiculeId}`) && !url.toString().includes('/edit'),
      { timeout: 15000 }
    );
    expect(page.url()).not.toContain('/edit');
    await page.close();
  });

  test('T12-C : bouton "+ Ajouter un véhicule" absent de la liste', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /nouveau véhicule/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /ajouter un véhicule/i })).not.toBeVisible();
    await page.close();
  });

  test('T12-D : boutons "Modifier" et "Supprimer" absents du détail', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('a[href^="/vehicules/"]:not([href="/vehicules/sav"]):not([href="/vehicules/nouveau"])').first();
    await firstCard.click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /modifier/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /supprimer/i })).not.toBeVisible();
    await page.close();
  });

  test('T12-E : bouton "Signaler une intervention" présent (EXPLOITATION peut intervenir)', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules');
    await page.waitForLoadState('networkidle');

    // Naviguer vers un véhicule (exclure /vehicules/sav)
    const firstCard = page.locator('a[href^="/vehicules/"]:not([href="/vehicules/sav"]):not([href="/vehicules/nouveau"])').first();
    await firstCard.click();
    await page.waitForLoadState('networkidle');

    // EXPLOITATION peut signaler une intervention
    await expect(
      page.getByRole('button', { name: /signaler une intervention/i })
    ).toBeVisible({ timeout: 10000 });
    await page.close();
  });
});

test.describe('T12 — Permissions Véhicules (VISITEUR)', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await login(page, TEST_USERS.visiteur);
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('T12-F : VISITEUR — /vehicules/nouveau redirige vers /vehicules', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules/nouveau');
    await page.waitForURL((url) => !url.toString().includes('/nouveau'), { timeout: 15000 });
    expect(page.url()).toMatch(/\/vehicules$/);
    await page.close();
  });

  test('T12-G : VISITEUR — aucun bouton action dans le détail', async () => {
    const page = await context.newPage();
    await page.goto('/vehicules');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('a[href^="/vehicules/"]:not([href="/vehicules/sav"]):not([href="/vehicules/nouveau"])').first();
    await firstCard.click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /modifier/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /supprimer/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /signaler une intervention/i })).not.toBeVisible();
    await page.close();
  });
});

// ─── Helpers T13 ──────────────────────────────────────────────────────────────

async function checkExportMenu(context: BrowserContext, path: string): Promise<boolean> {
  const page = await context.newPage();
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  const exportBtn = page
    .getByRole('button', { name: /pdf|excel|export/i })
    .or(page.locator('[data-testid="export-menu"]'))
    .first();
  const visible = await exportBtn.isVisible().catch(() => false);
  await page.close();
  return visible;
}

// ─── T13 : EXPLOITATION — export absent ───────────────────────────────────────

test.describe('T13 — ExportMenu EXPLOITATION (doit être absent)', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await login(page, TEST_USERS.exploitation);
    await page.close();
  });

  test.afterAll(async () => { await context.close(); });

  test('T13-A : ExportMenu absent sur /vehicules', async () => {
    expect(await checkExportMenu(context, '/vehicules')).toBe(false);
  });

  test('T13-B : ExportMenu absent sur /cautions', async () => {
    expect(await checkExportMenu(context, '/cautions')).toBe(false);
  });

  test('T13-C : ExportMenu absent sur /marches', async () => {
    expect(await checkExportMenu(context, '/marches')).toBe(false);
  });
});

// ─── T13 : AVANCE — export présent ────────────────────────────────────────────

test.describe('T13 — ExportMenu AVANCE (doit être présent)', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await login(page, TEST_USERS.avance);
    await page.close();
  });

  test.afterAll(async () => { await context.close(); });

  test('T13-D : ExportMenu présent sur /vehicules', async () => {
    expect(await checkExportMenu(context, '/vehicules')).toBe(true);
  });

  test('T13-E : ExportMenu présent sur /cautions', async () => {
    expect(await checkExportMenu(context, '/cautions')).toBe(true);
  });
});

// ─── T13 : ADMIN — export présent ─────────────────────────────────────────────

test.describe('T13 — ExportMenu ADMIN (doit être présent)', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await login(page, TEST_USERS.admin);
    await page.close();
  });

  test.afterAll(async () => { await context.close(); });

  test('T13-F : ExportMenu présent sur /vehicules', async () => {
    expect(await checkExportMenu(context, '/vehicules')).toBe(true);
  });

  test('T13-G : ExportMenu présent sur /marches', async () => {
    expect(await checkExportMenu(context, '/marches')).toBe(true);
  });

  test('T13-H : ExportMenu présent sur /cautions', async () => {
    expect(await checkExportMenu(context, '/cautions')).toBe(true);
  });

  test('T13-I : ExportMenu présent sur /documents', async () => {
    expect(await checkExportMenu(context, '/documents')).toBe(true);
  });
});
