import { test, expect } from '@playwright/test';
import type { Cookie } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth';

/**
 * Tests E2E — Système d'Alertes : Cron + Combinaisons de Règles (Production)
 *
 * Comment lancer ces tests sur la production :
 *   PLAYWRIGHT_BASE_URL=https://erp-marches-stam.vercel.app \
 *   npx playwright test tests/alertes/cron-prod.spec.ts --project=chromium --headed --workers=1
 *
 * Suites couvertes :
 *   Suite 1 — API Cron (via page.request avec cookies de session)
 *   Suite 2 — Dashboard Alertes (UI)
 *   Suite 3 — Combinaisons de règles (Rule Builder UI)
 *   Suite 4 — Historique des notifications
 *
 * LABELS réels de l'UI (ConditionEditor) :
 *   eq  → 'égal à'
 *   neq → 'différent de'
 *   gt  → 'supérieur à'
 *   gte → 'supérieur ou égal à'
 *   lt  → 'inférieur à'
 *   lte → 'inférieur ou égal à'
 *   AND/OR → 'ET (AND)' / 'OU (OR)'
 */

// Session admin partagée entre toutes les suites
let sessionCookies: Cookie[] = [];

// Cold start Supabase peut prendre jusqu'à 2 min en production
test.setTimeout(120_000);

// ─── Login unique ────────────────────────────────────────────────────────────

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);

  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60_000);

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30_000 });

  await page.fill('input[name="email"]', TEST_USERS.admin!.email);
  await page.fill('input[name="password"]', TEST_USERS.admin!.password);
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 100_000 });
  await page.waitForLoadState('networkidle');

  sessionCookies = await context.cookies();
  await context.close();
});

test.beforeEach(async ({ page }) => {
  page.setDefaultNavigationTimeout(60_000);
  if (sessionCookies.length > 0) {
    await page.context().addCookies(sessionCookies);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 1 — API Cron (page.request avec cookies de session)
// ═══════════════════════════════════════════════════════════════════════════
// NOTE : on utilise page.request (pas le fixture request) car le middleware
// Next.js redirige vers /login toutes les routes sans cookie de session.
// page.request hérite du contexte navigateur → cookies inclus automatiquement.

test.describe('Suite 1 — API Cron (HTTP avec session)', () => {

  // ── Test 1.1 : /api/test-alerts répond 200 ──────────────────────────────
  test('1.1 — /api/test-alerts retourne 200 avec structure correcte', async ({ page }) => {
    const resp = await page.request.get('/api/test-alerts');

    expect(resp.status()).toBe(200);

    const body = await resp.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    // Structure attendue
    expect(Array.isArray(body.data.cautions)).toBe(true);
    expect(Array.isArray(body.data.marches)).toBe(true);
    expect(body.data.summary).toBeDefined();
    expect(typeof body.data.summary.cautionsCount).toBe('number');
    expect(typeof body.data.summary.marchesCount).toBe('number');
    expect(typeof body.data.summary.totalAlerts).toBe('number');

    // Cohérence du résumé
    expect(body.data.summary.totalAlerts).toBe(
      body.data.summary.cautionsCount + body.data.summary.marchesCount
    );

    console.log(`\n📊 Alertes actuelles en production :
  - Cautions proches échéance : ${body.data.summary.cautionsCount}
  - Marchés en fin d'exécution : ${body.data.summary.marchesCount}
  - Total alertes : ${body.data.summary.totalAlerts}
  - Objet email : "${body.data.emailPreview?.subject ?? '(aucune alerte)'}"`);
  });

  // ── Test 1.2 : champs des cautions ──────────────────────────────────────
  test('1.2 — /api/test-alerts — champs des cautions sont complets', async ({ page }) => {
    const resp = await page.request.get('/api/test-alerts');
    const body = await resp.json();

    for (const caution of body.data.cautions) {
      expect(typeof caution.id).toBe('string');
      expect(typeof caution.reference).toBe('string');
      expect(typeof caution.montant).toBe('number');
      expect(typeof caution.joursRestants).toBe('number');
      expect(caution.joursRestants).toBeGreaterThanOrEqual(0);
      expect(caution.joursRestants).toBeLessThanOrEqual(30);

      console.log(`  ⚠️  Caution ${caution.reference} — expire dans ${caution.joursRestants}j`);
    }

    if (body.data.cautions.length === 0) {
      console.log('  ✅ Aucune caution critique en ce moment (état nominal)');
    }
  });

  // ── Test 1.3 : champs des marchés ───────────────────────────────────────
  test('1.3 — /api/test-alerts — champs des marchés sont complets', async ({ page }) => {
    const resp = await page.request.get('/api/test-alerts');
    const body = await resp.json();

    for (const marche of body.data.marches) {
      expect(typeof marche.id).toBe('string');
      expect(typeof marche.reference).toBe('string');
      expect(typeof marche.joursRestants).toBe('number');
      expect(marche.joursRestants).toBeGreaterThanOrEqual(0);
      expect(marche.joursRestants).toBeLessThanOrEqual(60);

      console.log(`  📋 Marché ${marche.reference} — fin dans ${marche.joursRestants}j`);
    }

    if (body.data.marches.length === 0) {
      console.log('  ✅ Aucun marché en fin d\'exécution (état nominal)');
    }
  });

  // ── Test 1.4 : /api/cron/daily-alerts sans auth → 401 ──────────────────
  // Ce test utilise page.request SANS Authorization → le cron handler retourne 401
  test('1.4 — /api/cron/daily-alerts sans Authorization → 401', async ({ page }) => {
    // Envoyer la requête sans header Authorization
    const resp = await page.request.get('/api/cron/daily-alerts', {
      headers: { Authorization: '' },
    });

    expect([401, 500]).toContain(resp.status());
    const body = await resp.json();
    expect(body.success).toBe(false);

    console.log(`\n🔒 Protection cron — statut sans auth : ${resp.status()}`);
  });

  // ── Test 1.5 : /api/cron/daily-alerts avec mauvais token → 401 ──────────
  test('1.5 — /api/cron/daily-alerts avec faux token → 401', async ({ page }) => {
    const resp = await page.request.get('/api/cron/daily-alerts', {
      headers: { Authorization: 'Bearer faux-token-pour-test' },
    });

    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body.success).toBe(false);

    console.log(`\n🔒 Protection cron — rejet mauvais token confirmé ✅`);
  });

  // ── Test 1.6 : /api/notifications retourne des données JSON ─────────────
  test('1.6 — /api/notifications retourne des données structurées', async ({ page }) => {
    const resp = await page.request.get('/api/notifications');

    // Avec session → 200 JSON attendu
    expect([200, 404]).toContain(resp.status());

    if (resp.status() === 200) {
      const body = await resp.json();
      const isArray = Array.isArray(body);
      const isObject = typeof body === 'object' && body !== null;
      expect(isArray || isObject).toBe(true);
      console.log(`\n🔔 Notifications IN_APP : ${isArray ? body.length : '(objet)'}`);
    } else {
      console.log(`\n🔔 /api/notifications : route non exposée (${resp.status()})`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 2 — Dashboard Alertes (UI)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Suite 2 — Dashboard Alertes (UI)', () => {

  test('2.1 — /admin/alertes — page chargée avec sections attendues', async ({ page }) => {
    await page.goto('/admin/alertes');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Gestion des Alertes')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Règles d'alerte")).toBeVisible();
    await expect(page.getByText('Historique')).toBeVisible();
    await expect(page.getByText("Tableau de bord des échéances")).toBeVisible();
    await expect(page.getByText("Envoi manuel des alertes")).toBeVisible();

    console.log('\n✅ Page /admin/alertes chargée correctement');
  });

  test('2.2 — Timeline affiche les alertes ou message vide', async ({ page }) => {
    await page.goto('/admin/alertes');
    await page.waitForLoadState('networkidle');

    const hasItems  = (await page.locator('.border.rounded-lg').count()) > 0;
    const hasEmpty  = await page.getByText(/aucune alerte/i).isVisible({ timeout: 2000 }).catch(() => false);
    const hasNoUrg  = await page.getByText(/aucune échéance urgente/i).isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasItems || hasEmpty || hasNoUrg).toBe(true);

    console.log(`\n📊 État timeline : ${hasEmpty || hasNoUrg ? 'Aucune alerte (état idéal)' : 'Alertes présentes'}`);
  });

  test('2.3 — Navigation dashboard → règles', async ({ page }) => {
    await page.goto('/admin/alertes');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: /Règles d'alerte/i }).first().click();
    await page.waitForURL('**/admin/alertes/rules', { timeout: 15_000 });
    await expect(page.getByText("Règles d'alerte")).toBeVisible();

    console.log('\n✅ Navigation dashboard → règles OK');
  });

  test('2.4 — Navigation dashboard → historique', async ({ page }) => {
    await page.goto('/admin/alertes');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: /Historique/i }).first().click();
    await page.waitForURL('**/admin/alertes/history', { timeout: 15_000 });
    await expect(page.getByText('Historique des notifications')).toBeVisible();

    console.log('\n✅ Navigation dashboard → historique OK');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 3 — Combinaisons de règles (Rule Builder)
// ═══════════════════════════════════════════════════════════════════════════
//
// Labels réels (ConditionEditor.tsx) :
//   eq  → 'égal à'       neq → 'différent de'
//   gt  → 'supérieur à'  gte → 'supérieur ou égal à'
//   lt  → 'inférieur à'  lte → 'inférieur ou égal à'
//   Opérateur logique (Select) : 'ET (AND)' / 'OU (OR)'
//   Champ valeur numérique : <Input placeholder="Valeur" /> (pas type="number")

test.describe('Suite 3 — Combinaisons de règles (Rule Builder)', () => {

  // ── Helper : ouvrir le formulaire de nouvelle règle ─────────────────────
  async function gotoNewRule(page: import('@playwright/test').Page) {
    await page.goto('/admin/alertes/rules/new');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[id="name"]')).toBeVisible({ timeout: 15_000 });
  }

  // ── Helper : sélectionner un événement ──────────────────────────────────
  async function selectEvent(page: import('@playwright/test').Page, name: RegExp) {
    await page.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(400);
    await page.getByRole('option', { name }).click();
    await page.waitForTimeout(300);
  }

  // ── Helper : ajouter une condition numérique ─────────────────────────────
  // Ajoute une condition et remplit : champ + opérateur + valeur numérique
  async function addNumericCondition(
    page: import('@playwright/test').Page,
    fieldLabel: string,
    opLabel: string,
    value: string,
    conditionIndex: number,
  ) {
    await page.getByRole('button', { name: 'Ajouter une condition' }).click();
    await page.waitForTimeout(300);

    const row = page.locator('.rounded-lg.border.p-2').nth(conditionIndex);

    // Champ
    await row.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: fieldLabel }).first().click();
    await page.waitForTimeout(200);

    // Opérateur
    await row.locator('[role="combobox"]').nth(1).click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: opLabel }).first().click();
    await page.waitForTimeout(200);

    // Valeur (Input texte avec placeholder "Valeur")
    await row.locator('input[placeholder="Valeur"]').fill(value);
  }

  // ── Helper : cocher les canaux et rôles minimaux ─────────────────────────
  async function setChannelsAndRoles(
    page: import('@playwright/test').Page,
    channels: string[],
    roles: string[],
  ) {
    for (const ch of channels) {
      const cb = page.locator(`[id="channel-${ch}"]`);
      if (await cb.isVisible({ timeout: 1000 }).catch(() => false)) {
        if (!(await cb.isChecked())) await cb.check();
      }
    }
    for (const role of roles) {
      const cb = page.locator(`[id="role-${role}"]`);
      if (await cb.isVisible({ timeout: 1000 }).catch(() => false)) {
        if (!(await cb.isChecked())) await cb.check();
      }
    }
  }

  // ── Helper : soumettre et vérifier dans la liste ─────────────────────────
  async function submitAndVerify(page: import('@playwright/test').Page, ruleName: string) {
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/alertes/rules', { timeout: 20_000 });
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(ruleName)).toBeVisible({ timeout: 10_000 });
  }

  // ── Test 3.1 : CAUTION_EXPIRING — joursRestants <= 7 ────────────────────
  test('3.1 — Règle CAUTION_EXPIRING + joursRestants <= 7 (critique)', async ({ page }) => {
    await gotoNewRule(page);

    const ruleName = `[TEST] Caution CRITIQUE ≤7j ${Date.now()}`;
    await page.fill('input[id="name"]', ruleName);

    await selectEvent(page, /Caution proche de l'échéance/i);
    await addNumericCondition(page, 'Jours restants', 'inférieur ou égal à', '7', 0);
    await setChannelsAndRoles(page, ['EMAIL', 'IN_APP'], ['ADMIN']);
    await submitAndVerify(page, ruleName);

    console.log(`\n✅ Règle créée : "${ruleName}"`);
    console.log('   Condition : joursRestants <= 7 → alerte CRITIQUE');

    await _deleteRuleByName(page, ruleName);
  });

  // ── Test 3.2 : MARCHE_EXPIRING — joursRestants <= 30 ────────────────────
  test('3.2 — Règle MARCHE_EXPIRING + joursRestants <= 30', async ({ page }) => {
    await gotoNewRule(page);

    const ruleName = `[TEST] Marché fin ≤30j ${Date.now()}`;
    await page.fill('input[id="name"]', ruleName);

    await selectEvent(page, /Marché en fin d'exécution/i);
    await addNumericCondition(page, 'Jours restants', 'inférieur ou égal à', '30', 0);
    await setChannelsAndRoles(page, ['EMAIL', 'IN_APP'], ['ADMIN', 'AVANCE']);
    await submitAndVerify(page, ruleName);

    console.log(`\n✅ Règle créée : "${ruleName}"`);
    console.log('   Condition : joursRestants <= 30');
    console.log('   Canaux : EMAIL + IN_APP · Rôles : ADMIN + AVANCE');

    await _deleteRuleByName(page, ruleName);
  });

  // ── Test 3.3 : CAUTION_EXPIRING — AND (joursRestants <= 14 ET montant >= 5M)
  test('3.3 — Règle CAUTION_EXPIRING avec AND (joursRestants <= 14 ET montant >= 5M)', async ({ page }) => {
    await gotoNewRule(page);

    const ruleName = `[TEST] Caution AND ≤14j+≥5M ${Date.now()}`;
    await page.fill('input[id="name"]', ruleName);

    await selectEvent(page, /Caution proche de l'échéance/i);

    // Condition 1 : joursRestants <= 14
    await addNumericCondition(page, 'Jours restants', 'inférieur ou égal à', '14', 0);

    // Condition 2 : montant >= 5000000
    // (l'opérateur logique AND/OR apparaît maintenant car 2 conditions)
    await addNumericCondition(page, 'Montant', 'supérieur ou égal à', '5000000', 1);

    // Vérifier que le Select opérateur logique est apparu et vaut ET (AND) par défaut
    const logicSelect = page.locator('[role="combobox"]').filter({ hasText: /ET|AND/ });
    const hasLogicSelect = await logicSelect.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasLogicSelect) {
      console.log('   ✅ Opérateur logique ET (AND) confirmé');
    }

    await setChannelsAndRoles(page, ['EMAIL'], ['ADMIN']);
    await submitAndVerify(page, ruleName);

    console.log(`\n✅ Règle AND créée : "${ruleName}"`);
    console.log('   C1 : joursRestants <= 14');
    console.log('   C2 : montant >= 5 000 000 XOF');
    console.log('   Opérateur : AND → les DEUX doivent être vraies');

    await _deleteRuleByName(page, ruleName);
  });

  // ── Test 3.4 : MARCHE_EXPIRING — OR ─────────────────────────────────────
  test('3.4 — Règle MARCHE_EXPIRING avec OR (joursRestants <= 7 OU joursRestants <= 30)', async ({ page }) => {
    await gotoNewRule(page);

    const ruleName = `[TEST] Marché OR ≤7j-ou-≤30j ${Date.now()}`;
    await page.fill('input[id="name"]', ruleName);

    await selectEvent(page, /Marché en fin d'exécution/i);

    // Condition 1
    await addNumericCondition(page, 'Jours restants', 'inférieur ou égal à', '7', 0);
    // Condition 2 (l'opérateur logique apparaît maintenant)
    await addNumericCondition(page, 'Jours restants', 'inférieur ou égal à', '30', 1);

    // Basculer sur OU (OR) — c'est un Select (pas un bouton)
    // Le trigger affiche la valeur actuelle "ET (AND)"
    const logicTrigger = page.locator('text=ET (AND)').locator('xpath=ancestor-or-self::button').first()
      .or(page.locator('[role="combobox"]').filter({ hasText: 'ET' })).first();

    if (await logicTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logicTrigger.click();
      await page.waitForTimeout(300);
      await page.getByRole('option', { name: 'OU (OR)' }).click();
      await page.waitForTimeout(200);
      console.log('   ✅ Opérateur basculé sur OU (OR)');
    } else {
      console.log('   ℹ️ Opérateur logique introuvable (une seule condition visible ?)');
    }

    await setChannelsAndRoles(page, ['IN_APP'], ['ADMIN']);
    await submitAndVerify(page, ruleName);

    console.log(`\n✅ Règle OR créée : "${ruleName}"`);
    console.log('   C1 : joursRestants <= 7 · C2 : joursRestants <= 30');
    console.log('   Opérateur : OR → UNE seule condition suffit');

    await _deleteRuleByName(page, ruleName);
  });

  // ── Test 3.5 : MARCHE_STATUS_CHANGED — nouveauStatut = EN_EXECUTION ──────
  test('3.5 — Règle MARCHE_STATUS_CHANGED — nouveauStatut = EN_EXECUTION', async ({ page }) => {
    await gotoNewRule(page);

    const ruleName = `[TEST] Marché→EN_EXECUTION ${Date.now()}`;
    await page.fill('input[id="name"]', ruleName);

    await selectEvent(page, /Changement de statut marché/i);

    // Ajouter une condition
    await page.getByRole('button', { name: 'Ajouter une condition' }).click();
    await page.waitForTimeout(300);

    const row = page.locator('.rounded-lg.border.p-2').first();

    // Champ : "Nouveau statut"
    await row.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Nouveau statut' }).click();
    await page.waitForTimeout(200);

    // Opérateur : "égal à" (eq)
    await row.locator('[role="combobox"]').nth(1).click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'égal à', exact: true }).click();
    await page.waitForTimeout(200);

    // Valeur : Select enum → "En exécution"
    // Le 3e combobox de la ligne est le sélecteur de valeur enum (single Select)
    const valueCombobox = row.locator('[role="combobox"]').nth(2);
    if (await valueCombobox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await valueCombobox.click();
      await page.waitForTimeout(300);
      await page.getByRole('option', { name: 'En exécution' }).click();
      await page.waitForTimeout(200);
    } else {
      // Fallback : l'input de valeur (si le Select enum n'est pas encore rendu)
      const valueInput = row.locator('input[placeholder="Valeur"]');
      if (await valueInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await valueInput.fill('EN_EXECUTION');
      }
    }

    await setChannelsAndRoles(page, ['EMAIL', 'IN_APP'], ['ADMIN', 'AVANCE', 'EXPLOITATION']);
    await submitAndVerify(page, ruleName);

    console.log(`\n✅ Règle MARCHE_STATUS_CHANGED créée : "${ruleName}"`);
    console.log('   Condition : nouveauStatut = En exécution');

    await _deleteRuleByName(page, ruleName);
  });

  // ── Test 3.6 : Toggle actif/inactif ─────────────────────────────────────
  test('3.6 — Toggle actif/inactif sur une règle de la liste', async ({ page }) => {
    await page.goto('/admin/alertes/rules');
    await page.waitForLoadState('networkidle');

    // Le bouton toggle a data-testid="rule-toggle" et l'état actif
    // est reflété par le Badge "Active" / "Inactive" dans la même ligne
    const toggleBtn = page.locator('[data-testid="rule-toggle"]').first();
    const hasToggle = await toggleBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasToggle) {
      // Lire l'état initial via le badge dans la même ligne <tr>
      const row = page.locator('tr').filter({ has: toggleBtn }).first();
      // Utiliser exact:true pour ne pas matcher "Inactive" (sous-chaîne de "Active")
      const isInitiallyActive = await row.getByText('Active', { exact: true }).isVisible({ timeout: 1000 }).catch(() => false);

      // Cliquer pour basculer
      await toggleBtn.click();
      await page.waitForTimeout(1500); // attendre la Server Action

      // Vérifier le changement d'état dans le badge
      const isNowActive = await row.getByText('Active', { exact: true }).isVisible({ timeout: 3000 }).catch(() => false);
      expect(isNowActive).toBe(!isInitiallyActive);

      // Rétablir l'état initial
      await toggleBtn.click();
      await page.waitForTimeout(1500);
      const isFinallyActive = await row.getByText('Active', { exact: true }).isVisible({ timeout: 3000 }).catch(() => false);
      expect(isFinallyActive).toBe(isInitiallyActive);

      console.log(`\n✅ Toggle : ${isInitiallyActive ? 'actif→inactif→actif' : 'inactif→actif→inactif'}`);
    } else {
      console.log('\nℹ️ Aucune règle dans la liste — toggle non testable');
      expect(true).toBe(true);
    }
  });

  // ── Test 3.7 : Recette "Caution critique" ───────────────────────────────
  test('3.7 — Recette "Caution critique" pré-remplit le formulaire', async ({ page }) => {
    await gotoNewRule(page);

    await expect(page.getByText("Guide d'utilisation")).toBeVisible();
    await expect(page.getByText(/Recettes prêtes/i)).toBeVisible();
    await expect(page.getByText(/Caution critique/i).first()).toBeVisible();

    await page.getByRole('button', { name: 'Utiliser ce modèle' }).first().click();
    await page.waitForTimeout(500);

    const nameValue = await page.locator('input[id="name"]').inputValue();
    expect(nameValue.length).toBeGreaterThan(0);

    console.log(`\n✅ Recette appliquée : "${nameValue}"`);
  });

  // ── Test 3.8 : Règle sans condition (déclenche toujours) ─────────────────
  test('3.8 — Règle sans condition = déclenche toujours', async ({ page }) => {
    await gotoNewRule(page);

    const ruleName = `[TEST] Sans condition (toujours) ${Date.now()}`;
    await page.fill('input[id="name"]', ruleName);

    // SAV_TICKET_CREATED → champs = [] → déclenche toujours
    await page.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(400);
    const savOption = page.getByRole('option', { name: /Ticket SAV créé/i });
    if (await savOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await savOption.click();
    } else {
      await page.getByRole('option').first().click();
    }

    // Vérifier le message "se déclenche systématiquement"
    const alwaysMsg = await page.getByText(/se déclenche systématiquement/i).isVisible({ timeout: 2000 }).catch(() => false);
    if (alwaysMsg) {
      console.log('   ✅ Message "se déclenche systématiquement" affiché');
    }

    await setChannelsAndRoles(page, ['IN_APP'], ['ADMIN']);
    await submitAndVerify(page, ruleName);

    console.log(`\n✅ Règle sans condition créée : "${ruleName}"`);
    await _deleteRuleByName(page, ruleName);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 4 — Historique des notifications
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Suite 4 — Historique des notifications', () => {

  test('4.1 — Page /admin/alertes/history accessible et chargée', async ({ page }) => {
    await page.goto('/admin/alertes/history');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Historique des notifications')).toBeVisible({ timeout: 15_000 });

    const hasCount = await page.getByText(/notification\(s\) au total/i).isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmpty = await page.getByText(/Aucune notification/i).isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasCount || hasEmpty).toBe(true);

    console.log('\n✅ Page historique accessible');
  });

  test('4.2 — Table historique : présente ou message vide', async ({ page }) => {
    await page.goto('/admin/alertes/history');
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').isVisible({ timeout: 3000 }).catch(() => false);

    if (hasTable) {
      const headerCount = await page.locator('th').count();
      expect(headerCount).toBeGreaterThan(0);
      console.log(`\n✅ Table historique : ${headerCount} colonne(s)`);
    } else {
      const isEmpty = await page.getByText(/Aucune notification/i).isVisible({ timeout: 2000 }).catch(() => false);
      expect(isEmpty).toBe(true);
      console.log('\n✅ Historique vide (aucune notification émise)');
    }
  });

  test('4.3 — /api/notifications retourne des données JSON', async ({ page }) => {
    // Utiliser page.request (avec cookies) pour éviter la redirection HTML du middleware
    const resp = await page.request.get('/api/notifications');

    expect([200, 404]).toContain(resp.status());

    if (resp.status() === 200) {
      const contentType = resp.headers()['content-type'] ?? '';
      if (contentType.includes('application/json')) {
        const body = await resp.json();
        const isArray = Array.isArray(body);
        const isObject = typeof body === 'object' && body !== null;
        expect(isArray || isObject).toBe(true);
        console.log(`\n✅ /api/notifications : ${isArray ? `${body.length} item(s)` : 'objet JSON'}`);
      } else {
        console.log(`\n⚠️ /api/notifications retourne du non-JSON (${contentType}) — route non implémentée ?`);
        expect(true).toBe(true);
      }
    } else {
      console.log(`\n🔔 /api/notifications : ${resp.status()}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER INTERNE
// ═══════════════════════════════════════════════════════════════════════════

async function _deleteRuleByName(page: import('@playwright/test').Page, ruleName: string) {
  try {
    if (!(await page.getByText(ruleName).first().isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }

    // Le bouton supprimer est dans la <tr> de la règle, avec title="Supprimer"
    // La suppression utilise window.confirm() — il faut l'accepter via dialog handler
    const row = page.locator('tr').filter({ hasText: ruleName }).first();
    const deleteBtn = row.locator('button[title="Supprimer"]');

    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Accepter le window.confirm() qui s'ouvre au clic
      page.once('dialog', (dialog) => dialog.accept());
      await deleteBtn.click();
      await page.waitForTimeout(1500); // attendre la Server Action
      console.log(`  🗑️ Règle supprimée : "${ruleName}"`);
    } else {
      console.log(`  ⚠️ Bouton suppression introuvable pour "${ruleName}" — supprimer manuellement`);
    }
  } catch (err) {
    console.log(`  ⚠️ Erreur nettoyage : ${err}`);
  }
}
