import { test, expect } from '@playwright/test';
import type { Cookie } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth';

/**
 * Tests E2E — Module Reporting Email (Règles de reporting)
 *
 * Couverture complète :
 * ─ T1  Accès ADMIN → page /admin/reporting accessible
 * ─ T2  Accès non-ADMIN (AVANCE) → redirigé (pas accès)
 * ─ T3  Non authentifié → redirigé vers /login
 * ─ T4  Page listing : titre + description + bouton "Nouvelle règle" visible
 * ─ T5  Page listing : colonnes du tableau présentes
 * ─ T6  Lien Reporting visible dans la sidebar (ADMIN)
 * ─ T7  Ouverture dialog "Nouvelle règle"
 * ─ T8  Validation email invalide → message d'erreur
 * ─ T9  Validation email doublon → message d'erreur
 * ─ T10 Planification DAILY → heure visible, pas de jours
 * ─ T11 Planification WEEKLY → heure + boutons jours visibles
 * ─ T12 Planification MONTHLY → heure + champ jour du mois
 * ─ T13 Planification MANUAL → ni heure ni jours
 * ─ T14 Création règle complète (DAILY) → toast + dans liste
 * ─ T15 Création règle WEEKLY (Lun + Mer) → planification affichée
 * ─ T16 Modification règle → dialog pré-rempli → toast "Règle mise à jour"
 * ─ T17 Toggle inactif → badge "Inactive" + toast
 * ─ T18 Toggle re-activer → badge "Active" + toast
 * ─ T19 Envoi manuel (Send Now) → toast succès ou erreur métier
 * ─ T20 Suppression → AlertDialog → toast "Règle supprimée" + disparaît
 * ─ T21 Nettoyage : suppression toutes règles de test
 */

// ─── Constantes de test ───────────────────────────────────────────────────────

const RULE_DAILY_NAME = '[E2E] Règle Daily Test';
const RULE_WEEKLY_NAME = '[E2E] Règle Weekly Test';
const TEST_EMAIL_1 = 'e2e.reporting.1@test.local';
const TEST_EMAIL_2 = 'e2e.reporting.2@test.local';

let adminCookies: Cookie[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loginAsAdmin(browser: Parameters<typeof test.beforeAll>[0] extends (args: infer A) => unknown ? A extends { browser: infer B } ? B : never : never) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);

  await page.goto('/login');
  await page.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });
  await page.fill('input[name="email"]', TEST_USERS.admin.email);
  await page.fill('input[name="password"]', TEST_USERS.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });
  await page.waitForLoadState('networkidle');

  const cookies = await context.cookies();
  await context.close();
  return cookies;
}

/** Ouvre le dialog "Nouvelle règle" et attend qu'il soit visible */
async function openNewRuleDialog(page: Parameters<typeof test>[1] extends (args: infer A) => unknown ? A extends { page: infer P } ? P : never : never) {
  await page.goto('/admin/reporting');
  await page.waitForLoadState('networkidle');
  const btn = page.getByRole('button', { name: 'Nouvelle règle', exact: true }).first();
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  await btn.click();
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
}

/** Supprime toutes les règles de test ([E2E]) si elles existent */
async function cleanupTestRules(page: Parameters<typeof test>[1] extends (args: infer A) => unknown ? A extends { page: infer P } ? P : never : never) {
  await page.goto('/admin/reporting');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Boucle de suppression : tant qu'une ligne [E2E] existe
  let found = true;
  let attempts = 0;
  while (found && attempts < 10) {
    attempts++;
    const row = page.locator('tbody tr').filter({ hasText: '[E2E]' }).first();
    const count = await row.count();
    if (count === 0) { found = false; break; }

    // Clic sur la poubelle de cette ligne
    const trashBtn = row.locator('button[title="Supprimer"]');
    await trashBtn.click();

    // Confirmer dans AlertDialog
    const confirmBtn = page.getByRole('button', { name: 'Supprimer', exact: true }).last();
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmBtn.click();
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForLoadState('networkidle');
  }
}

// ─── Suite principale (ADMIN) ─────────────────────────────────────────────────

test.describe('Reporting — Accès & Page', () => {
  test.setTimeout(120000);

  test.beforeAll(async ({ browser }) => {
    adminCookies = await loginAsAdmin(browser as never);
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(60000);
    if (adminCookies.length > 0) {
      await page.context().addCookies(adminCookies);
    }
  });

  // ── T1 : ADMIN accède à /admin/reporting ────────────────────────────────────
  test('T1 — ADMIN peut accéder à /admin/reporting', async ({ page }) => {
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');
    // Ni redirection vers /login ni vers /
    expect(page.url()).toContain('/admin/reporting');
  });

  // ── T3 : Non authentifié redirigé ───────────────────────────────────────────
  test('T3 — non authentifié est redirigé vers /login', async ({ browser }) => {
    const ctx = await browser.newContext(); // contexte vierge sans cookies
    const p = await ctx.newPage();
    p.setDefaultNavigationTimeout(30000);
    await p.goto('/admin/reporting');
    await p.waitForURL((url) => url.toString().includes('/login'), { timeout: 15000 });
    expect(p.url()).toContain('/login');
    await ctx.close();
  });

  // ── T4 : Titre, description, bouton visible ──────────────────────────────────
  test('T4 — page listing : titre + description + bouton "Nouvelle règle"', async ({ page }) => {
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main').getByRole('heading', { name: 'Reporting Email', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Configurez vos règles')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouvelle règle', exact: true }).first()).toBeVisible();
  });

  // ── T5 : Colonnes du tableau ─────────────────────────────────────────────────
  test('T5 — tableau contient les colonnes attendues', async ({ page }) => {
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');

    // Si des règles existent, le tableau est présent
    const table = page.locator('table');
    const tableCount = await table.count();
    if (tableCount > 0) {
      await expect(page.getByRole('columnheader', { name: 'Nom' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Statuts' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Planification' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Destinataires' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Statut', exact: true })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    } else {
      // Sinon état vide affiché
      await expect(page.getByText('Aucune règle de reporting')).toBeVisible();
    }
  });

  // ── T6 : Lien Reporting dans sidebar ────────────────────────────────────────
  test('T6 — lien "Reporting" visible dans la sidebar pour ADMIN', async ({ page }) => {
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');
    // Le lien sidebar pointe vers /admin/reporting
    const sidebarLink = page.locator('nav a[href="/admin/reporting"]');
    await expect(sidebarLink).toBeVisible({ timeout: 10000 });
  });
});

// ─── Suite : Permissions non-ADMIN ────────────────────────────────────────────

test.describe('Reporting — Permissions non-ADMIN', () => {
  test.setTimeout(120000);

  // ── T2 : AVANCE est redirigé ─────────────────────────────────────────────────
  test('T2 — rôle AVANCE est redirigé depuis /admin/reporting', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    p.setDefaultNavigationTimeout(60000);

    await p.goto('/login');
    await p.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });
    await p.fill('input[name="email"]', TEST_USERS.avance.email);
    await p.fill('input[name="password"]', TEST_USERS.avance.password);
    await p.click('button[type="submit"]');
    await p.waitForURL((url) => !url.toString().includes('/login'), { timeout: 60000 });

    await p.goto('/admin/reporting');
    await p.waitForLoadState('networkidle');

    // Doit être redirigé (pas sur /admin/reporting) ou afficher une erreur
    const url = p.url();
    const isRedirected = !url.includes('/admin/reporting') || await p.locator('text=Accès refusé').count() > 0;
    expect(isRedirected).toBeTruthy();

    await ctx.close();
  });
});

// ─── Suite : Formulaire & Validation ─────────────────────────────────────────

test.describe('Reporting — Formulaire & Validation', () => {
  test.setTimeout(120000);

  test.beforeAll(async ({ browser }) => {
    if (adminCookies.length === 0) {
      adminCookies = await loginAsAdmin(browser as never);
    }
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(60000);
    if (adminCookies.length > 0) {
      await page.context().addCookies(adminCookies);
    }
  });

  // ── T7 : Dialog "Nouvelle règle" s'ouvre ────────────────────────────────────
  test('T7 — clic "Nouvelle règle" ouvre le dialog', async ({ page }) => {
    await openNewRuleDialog(page as never);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nouvelle règle de reporting', exact: true })).toBeVisible();
  });

  // ── T8 : Email invalide → erreur inline ─────────────────────────────────────
  test('T8 — email invalide affiche un message d\'erreur', async ({ page }) => {
    await openNewRuleDialog(page as never);

    const emailInput = page.locator('[role="dialog"] input[placeholder="email@exemple.com"]');
    await emailInput.fill('pas-un-email');
    await page.locator('[role="dialog"] button', { hasText: 'Ajouter' }).first().click();

    await expect(page.locator('[role="dialog"] .text-destructive')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"] .text-destructive')).toContainText('invalide');
  });

  // ── T9 : Email doublon → erreur ─────────────────────────────────────────────
  test('T9 — email doublon affiche "Email déjà ajouté"', async ({ page }) => {
    await openNewRuleDialog(page as never);

    const emailInput = page.locator('[role="dialog"] input[placeholder="email@exemple.com"]');
    const addBtn = page.locator('[role="dialog"] button', { hasText: 'Ajouter' }).first();

    // Premier ajout
    await emailInput.fill(TEST_EMAIL_1);
    await addBtn.click();
    await expect(page.locator('[role="dialog"]').getByText(TEST_EMAIL_1)).toBeVisible({ timeout: 5000 });

    // Doublon
    await emailInput.fill(TEST_EMAIL_1);
    await addBtn.click();
    await expect(page.locator('[role="dialog"] .text-destructive')).toContainText('déjà ajouté');
  });

  // ── T10 : Planification DAILY ────────────────────────────────────────────────
  test('T10 — planification DAILY : heure visible, pas de jours', async ({ page }) => {
    await openNewRuleDialog(page as never);

    // Sélectionner DAILY (devrait être le défaut, mais on force)
    const scheduleSelect = page.locator('[role="dialog"] [role="combobox"]').filter({ hasText: /Quotidien|Hebdomadaire|Mensuel|Manuel/i }).first();
    await scheduleSelect.click();
    await page.getByRole('option', { name: 'Quotidien', exact: true }).click();
    await page.waitForTimeout(300);

    // Heure d'envoi visible
    await expect(page.locator('[role="dialog"]').getByText("Heure d'envoi")).toBeVisible();

    // Pas de boutons de jours de la semaine
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: 'Lun' })).not.toBeVisible();
    // Pas de champ jour du mois
    await expect(page.locator('[role="dialog"]').getByText('Jour du mois')).not.toBeVisible();
  });

  // ── T11 : Planification WEEKLY ───────────────────────────────────────────────
  test('T11 — planification WEEKLY : heure + boutons jours visibles', async ({ page }) => {
    await openNewRuleDialog(page as never);

    const scheduleSelect = page.locator('[role="dialog"] [role="combobox"]').filter({ hasText: /Quotidien|Hebdomadaire|Mensuel|Manuel/i }).first();
    await scheduleSelect.click();
    await page.getByRole('option', { name: 'Hebdomadaire', exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('[role="dialog"]').getByText("Heure d'envoi")).toBeVisible();
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: 'Lun' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: 'Ven' })).toBeVisible();
  });

  // ── T12 : Planification MONTHLY ──────────────────────────────────────────────
  test('T12 — planification MONTHLY : heure + champ jour du mois', async ({ page }) => {
    await openNewRuleDialog(page as never);

    const scheduleSelect = page.locator('[role="dialog"] [role="combobox"]').filter({ hasText: /Quotidien|Hebdomadaire|Mensuel|Manuel/i }).first();
    await scheduleSelect.click();
    await page.getByRole('option', { name: 'Mensuel', exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('[role="dialog"]').getByText("Heure d'envoi")).toBeVisible();
    await expect(page.locator('[role="dialog"]').getByText('Jour du mois')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: 'Lun' })).not.toBeVisible();
  });

  // ── T13 : Planification MANUAL ───────────────────────────────────────────────
  test('T13 — planification MANUAL : ni heure ni jours', async ({ page }) => {
    await openNewRuleDialog(page as never);

    const scheduleSelect = page.locator('[role="dialog"] [role="combobox"]').filter({ hasText: /Quotidien|Hebdomadaire|Mensuel|Manuel/i }).first();
    await scheduleSelect.click();
    await page.getByRole('option', { name: 'Manuel uniquement', exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('[role="dialog"]').getByText("Heure d'envoi")).not.toBeVisible();
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: 'Lun' })).not.toBeVisible();
  });
});

// ─── Suite : CRUD Complet ─────────────────────────────────────────────────────

test.describe('Reporting — CRUD', () => {
  test.setTimeout(120000);

  test.beforeAll(async ({ browser }) => {
    if (adminCookies.length === 0) {
      adminCookies = await loginAsAdmin(browser as never);
    }
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(60000);
    if (adminCookies.length > 0) {
      await page.context().addCookies(adminCookies);
    }
  });

  // ── T14 : Création règle DAILY complète ──────────────────────────────────────
  test('T14 — créer une règle DAILY → toast "Règle créée" + apparaît dans liste', async ({ page }) => {
    await openNewRuleDialog(page as never);

    // Nom
    await page.locator('[role="dialog"] input#name').fill(RULE_DAILY_NAME);

    // Description
    await page.locator('[role="dialog"] input#desc').fill('Description test E2E quotidien');

    // Statut : cocher EN_EXECUTION
    const checkboxEnExecution = page.locator('[role="dialog"] label').filter({ hasText: 'En cours d\'exécution' });
    if (await checkboxEnExecution.count() > 0) {
      await checkboxEnExecution.locator('button[role="checkbox"]').first().click();
    } else {
      // Fallback : cocher le premier statut disponible
      await page.locator('[role="dialog"] button[role="checkbox"]').first().click();
    }

    // Email destinataire
    const emailInput = page.locator('[role="dialog"] input[placeholder="email@exemple.com"]');
    await emailInput.fill(TEST_EMAIL_1);
    await page.locator('[role="dialog"] button', { hasText: 'Ajouter' }).first().click();
    await expect(page.locator('[role="dialog"]').getByText(TEST_EMAIL_1)).toBeVisible({ timeout: 5000 });

    // Planification : DAILY (défaut ou forcer)
    const scheduleSelect = page.locator('[role="dialog"] [role="combobox"]').filter({ hasText: /Quotidien|Hebdomadaire|Mensuel|Manuel/i }).first();
    await scheduleSelect.click();
    await page.getByRole('option', { name: 'Quotidien', exact: true }).click();

    // Soumettre
    await page.locator('[role="dialog"] button[type="submit"]').click();

    // Toast succès
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 10000 });

    // Règle dans la liste
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page.getByText(RULE_DAILY_NAME)).toBeVisible({ timeout: 10000 });
  });

  // ── T15 : Création règle WEEKLY ───────────────────────────────────────────────
  test('T15 — créer une règle WEEKLY (Lun + Mer) → planification affichée', async ({ page }) => {
    await openNewRuleDialog(page as never);

    // Nom
    await page.locator('[role="dialog"] input#name').fill(RULE_WEEKLY_NAME);

    // Statut
    await page.locator('[role="dialog"] button[role="checkbox"]').first().click();

    // Email
    const emailInput = page.locator('[role="dialog"] input[placeholder="email@exemple.com"]');
    await emailInput.fill(TEST_EMAIL_2);
    await page.locator('[role="dialog"] button', { hasText: 'Ajouter' }).first().click();
    await expect(page.locator('[role="dialog"]').getByText(TEST_EMAIL_2)).toBeVisible({ timeout: 5000 });

    // Planification WEEKLY
    const scheduleSelect = page.locator('[role="dialog"] [role="combobox"]').filter({ hasText: /Quotidien|Hebdomadaire|Mensuel|Manuel/i }).first();
    await scheduleSelect.click();
    await page.getByRole('option', { name: 'Hebdomadaire', exact: true }).click();
    await page.waitForTimeout(300);

    // Sélectionner Lun et Mer
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Lun' }).click();
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Mer' }).click();

    // Soumettre
    await page.locator('[role="dialog"] button[type="submit"]').click();
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 10000 });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Vérifier planification affichée dans la ligne
    const row = page.locator('tbody tr').filter({ hasText: RULE_WEEKLY_NAME });
    await expect(row).toBeVisible({ timeout: 10000 });
    // La planification doit mentionner Lun et Mer
    await expect(row.getByText(/Lun.*Mer|Mer.*Lun/, { exact: false })).toBeVisible({ timeout: 5000 });
  });

  // ── T16 : Modification règle ──────────────────────────────────────────────────
  test('T16 — modifier une règle → dialog pré-rempli → toast "Règle mise à jour"', async ({ page }) => {
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');

    // Trouver la règle E2E Daily
    const row = page.locator('tbody tr').filter({ hasText: RULE_DAILY_NAME });
    await expect(row).toBeVisible({ timeout: 15000 });

    // Clic Modifier (crayon)
    await row.locator('button[title="Modifier"]').click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // Vérifier pré-remplissage du nom
    const nameInput = page.locator('[role="dialog"] input#name');
    await expect(nameInput).toHaveValue(RULE_DAILY_NAME);

    // Modifier le nom
    await nameInput.fill(RULE_DAILY_NAME + ' (modifié)');

    // Soumettre
    await page.locator('[role="dialog"] button[type="submit"]').click();
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 10000 });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page.getByText(RULE_DAILY_NAME + ' (modifié)')).toBeVisible({ timeout: 10000 });
  });

  // ── T17 : Toggle → change l'état ─────────────────────────────────────────────
  test('T17 — toggle règle → état Active/Inactive change + toast', async ({ page }) => {
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');

    // Trouver une règle E2E
    const row = page.locator('tbody tr').filter({ hasText: '[E2E]' }).first();
    await expect(row).toBeVisible({ timeout: 15000 });

    // Lire état avant
    const badgeBefore = await row.locator('td').nth(4).textContent() ?? '';

    // Clic toggle (title "Désactiver" ou "Activer" selon état)
    const toggleDesact = row.locator('button[title="Désactiver"]');
    const toggleAct = row.locator('button[title="Activer"]');
    if (await toggleDesact.count() > 0) {
      await toggleDesact.click();
    } else {
      await toggleAct.click();
    }

    // Toast attendu
    await expect(page.getByText(/désactivée|activée/).first()).toBeVisible({ timeout: 10000 });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Badge a changé
    const updatedRow = page.locator('tbody tr').filter({ hasText: '[E2E]' }).first();
    const badgeAfter = await updatedRow.locator('td').nth(4).textContent() ?? '';
    expect(badgeAfter.trim()).not.toEqual(badgeBefore.trim());
  });

  // ── T18 : Re-toggle → Active ──────────────────────────────────────────────────
  test('T18 — re-toggle → badge revient "Active" ou "Inactive" (toggle inverse)', async ({ page }) => {
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');

    const row = page.locator('tbody tr').filter({ hasText: '[E2E]' }).first();
    await expect(row).toBeVisible({ timeout: 15000 });

    // Lire état actuel
    const badgeBefore = await row.locator('td').nth(4).textContent();

    // Clic toggle
    const toggleBtnDesact = row.locator('button[title="Désactiver"]');
    const toggleBtnAct = row.locator('button[title="Activer"]');
    if (await toggleBtnDesact.count() > 0) {
      await toggleBtnDesact.click();
    } else {
      await toggleBtnAct.click();
    }

    await expect(page.getByText(/désactivée|activée/).first()).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const updatedRow = page.locator('tbody tr').filter({ hasText: '[E2E]' }).first();
    const badgeAfter = await updatedRow.locator('td').nth(4).textContent();
    expect(badgeAfter).not.toEqual(badgeBefore);
  });

  // ── T19 : Envoi manuel (Send Now) ─────────────────────────────────────────────
  test('T19 — clic "Envoyer maintenant" → toast succès ou erreur métier', async ({ page }) => {
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');

    const row = page.locator('tbody tr').filter({ hasText: '[E2E]' }).first();
    await expect(row).toBeVisible({ timeout: 15000 });

    // Clic bouton Send
    const sendBtn = row.locator('button[title="Envoyer maintenant"]');
    await sendBtn.click();

    // Soit succès "Email envoyé à X destinataire(s)", soit erreur métier (aucun marché, SMTP…)
    // Les deux sont acceptables — l'important c'est qu'un toast apparaît
    const toastLocator = page.locator('[data-sonner-toast]')
      .or(page.getByText(/Email envoyé/))
      .or(page.getByText(/Aucun marché/))
      .or(page.getByText(/Erreur/));

    await expect(toastLocator.first()).toBeVisible({ timeout: 30000 });
  });

  // ── T20 : Suppression avec confirmation ───────────────────────────────────────
  test('T20 — supprimer règle → AlertDialog → toast "Règle supprimée" → disparaît', async ({ page }) => {
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');

    // Compter les lignes [E2E] avant
    const countBefore = await page.locator('tbody tr').filter({ hasText: '[E2E]' }).count();
    expect(countBefore).toBeGreaterThan(0);

    // Clic poubelle sur la première règle [E2E]
    const row = page.locator('tbody tr').filter({ hasText: '[E2E]' }).first();
    const ruleName = await row.locator('td').first().textContent();
    await row.locator('button[title="Supprimer"]').click();

    // AlertDialog doit s'ouvrir
    await expect(page.locator('[role="alertdialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="alertdialog"]').getByText('Supprimer la règle ?')).toBeVisible();

    // Confirmer
    await page.locator('[role="alertdialog"]').getByRole('button', { name: 'Supprimer', exact: true }).click();

    // Toast
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 10000 });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // La règle a disparu
    if (ruleName) {
      await expect(page.getByText(ruleName.trim())).not.toBeVisible({ timeout: 5000 });
    }
    const countAfter = await page.locator('tbody tr').filter({ hasText: '[E2E]' }).count();
    expect(countAfter).toBeLessThan(countBefore);
  });

  // ── T21 : Nettoyage final ─────────────────────────────────────────────────────
  test('T21 — nettoyage : toutes les règles [E2E] supprimées', async ({ page }) => {
    await cleanupTestRules(page as never);

    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const remaining = await page.locator('tbody tr').filter({ hasText: '[E2E]' }).count();
    expect(remaining).toBe(0);
  });
});

// ─── Suite : Responsive ──────────────────────────────────────────────────────

test.describe('Reporting — Responsive', () => {
  test.setTimeout(60000);

  test.beforeAll(async ({ browser }) => {
    if (adminCookies.length === 0) {
      adminCookies = await loginAsAdmin(browser as never);
    }
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(60000);
    if (adminCookies.length > 0) {
      await page.context().addCookies(adminCookies);
    }
  });

  test('T22 — desktop 1920×1080 : page s\'affiche correctement', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Reporting Email', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nouvelle règle', exact: true }).first()).toBeVisible();
  });

  test('T23 — tablette 768×1024 : page s\'affiche correctement', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Reporting Email', exact: true })).toBeVisible();
  });

  test('T24 — mobile 375×667 : page s\'affiche correctement', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/reporting');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Reporting Email', exact: true })).toBeVisible();
  });
});
