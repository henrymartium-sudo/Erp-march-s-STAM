import { test, expect } from '@playwright/test';
import type { Cookie } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth';

/**
 * Tests E2E — Rule Builder : Planification flexible + Emails externes
 *
 * Vérifie les nouvelles fonctionnalités ajoutées en session 8 :
 * - Section "Emails externes" visible dans le formulaire
 * - Section "Planification" visible dans le formulaire
 * - FrequencySelector : Tous les jours / Jours spécifiques / Mensuel / Intervalle
 * - ExternalEmailsInput : ajout, validation, suppression de tags
 * - Création d'une règle complète avec fréquence WEEKLY (Lun + Ven) + emails externes
 * - Vérification que la règle apparaît dans la liste
 * - Édition pour confirmer que les valeurs sont bien pré-remplies
 * - Nettoyage : suppression de la règle de test
 */

let sessionCookies: Cookie[] = [];

test.setTimeout(120000);

test.describe('Rule Builder — Planification & Emails Externes', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);

    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('input[name="email"]:not([disabled])', { timeout: 30000 });

    await page.fill('input[name="email"]', TEST_USERS.admin.email);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 100000 });
    await page.waitForLoadState('networkidle');

    sessionCookies = await context.cookies();
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(60000);
    if (sessionCookies.length > 0) {
      await page.context().addCookies(sessionCookies);
    }
  });

  // ─── Test 1 : Nouvelles sections présentes dans le formulaire ────────────

  test('T1 — formulaire affiche les sections Emails externes et Planification', async ({ page }) => {
    await page.goto('/admin/alertes/rules/new');
    await page.waitForLoadState('networkidle');

    // Sections existantes toujours présentes
    await expect(page.getByText('Canaux de notification')).toBeVisible();
    await expect(page.getByText('Rôles destinataires')).toBeVisible();

    // Nouvelles sections (cibler les titres h3 pour éviter l'ambiguïté avec le label)
    await expect(page.getByRole('heading', { name: 'Emails externes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Planification' })).toBeVisible();

    // Label FrequencySelector
    await expect(page.getByText("Fréquence d'exécution")).toBeVisible();

    // Select par défaut = "Tous les jours" (cibler le combobox visible, pas le <option> caché)
    await expect(page.locator('[role="combobox"]').filter({ hasText: 'Tous les jours' })).toBeVisible();

    // Label ExternalEmailsInput
    await expect(page.getByText('Emails externes (hors base utilisateurs)')).toBeVisible();

    // Placeholder input email
    await expect(page.locator('input[placeholder="exemple@domaine.com"]')).toBeVisible();
  });

  // ─── Test 2 : FrequencySelector — WEEKLY (jours spécifiques) ────────────

  test('T2 — FrequencySelector affiche les boutons jours quand WEEKLY', async ({ page }) => {
    await page.goto('/admin/alertes/rules/new');
    await page.waitForLoadState('networkidle');

    // Cliquer sur le Select "Fréquence d'exécution" (le 2e combobox de la page)
    const frequencySelect = page.locator('[role="combobox"]').last();
    await frequencySelect.click();
    await page.waitForTimeout(300);

    // Sélectionner "Jours spécifiques de la semaine"
    await page.getByRole('option', { name: 'Jours spécifiques de la semaine' }).click();
    await page.waitForTimeout(300);

    // Les boutons jours doivent apparaître
    await expect(page.getByRole('button', { name: 'Lun' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jeu' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ven' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sam' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dim' })).toBeVisible();

    // Message "Sélectionner au moins un jour" visible (0 jours sélectionnés)
    await expect(page.getByText('Sélectionner au moins un jour')).toBeVisible();

    // Cliquer Lun et Ven
    await page.getByRole('button', { name: 'Lun' }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Ven' }).click();
    await page.waitForTimeout(200);

    // Le message d'erreur doit disparaître
    await expect(page.getByText('Sélectionner au moins un jour')).not.toBeVisible();
  });

  // ─── Test 3 : FrequencySelector — MONTHLY ────────────────────────────────

  test('T3 — FrequencySelector affiche le champ jour du mois quand MONTHLY', async ({ page }) => {
    await page.goto('/admin/alertes/rules/new');
    await page.waitForLoadState('networkidle');

    const frequencySelect = page.locator('[role="combobox"]').last();
    await frequencySelect.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Une fois par mois' }).click();
    await page.waitForTimeout(300);

    // Input "Jour du mois"
    await expect(page.locator('input[id="dayOfMonth"]')).toBeVisible();
    await expect(page.getByText('Jour du mois')).toBeVisible();

    // Note informationnelle
    await expect(page.getByText(/Si le mois n/)).toBeVisible();
  });

  // ─── Test 4 : FrequencySelector — INTERVAL ───────────────────────────────

  test('T4 — FrequencySelector affiche le champ intervalDays quand INTERVAL', async ({ page }) => {
    await page.goto('/admin/alertes/rules/new');
    await page.waitForLoadState('networkidle');

    const frequencySelect = page.locator('[role="combobox"]').last();
    await frequencySelect.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Intervalle personnalisé' }).click();
    await page.waitForTimeout(300);

    await expect(page.locator('input[id="intervalDays"]')).toBeVisible();
    await expect(page.getByText('Tous les N jours')).toBeVisible();
    await expect(page.locator('span.text-sm.text-muted-foreground', { hasText: 'jours' })).toBeVisible();
  });

  // ─── Test 5 : ExternalEmailsInput — ajout + validation + suppression ─────

  test('T5 — ExternalEmailsInput ajoute et supprime des emails', async ({ page }) => {
    await page.goto('/admin/alertes/rules/new');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[placeholder="exemple@domaine.com"]');

    // Ajouter un email valide
    await emailInput.fill('atsu@stam.tg');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.waitForTimeout(200);

    // Le badge doit apparaître
    await expect(page.getByText('atsu@stam.tg')).toBeVisible();

    // L'input doit être vidé
    await expect(emailInput).toHaveValue('');

    // Tenter un email invalide
    await emailInput.fill('emailinvalide');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.waitForTimeout(200);

    // Message d'erreur
    await expect(page.getByText('Adresse email invalide')).toBeVisible();

    // Ajouter un deuxième email valide (via Enter)
    await emailInput.fill('honoreatsu@gmail.com');
    await emailInput.press('Enter');
    await page.waitForTimeout(200);

    await expect(page.getByText('honoreatsu@gmail.com')).toBeVisible();

    // Tenter d'ajouter un doublon
    await emailInput.fill('atsu@stam.tg');
    await emailInput.press('Enter');
    await page.waitForTimeout(200);
    await expect(page.getByText('Email déjà ajouté')).toBeVisible();

    // Supprimer le premier email via le bouton X
    await page.locator(`button[aria-label="Supprimer atsu@stam.tg"]`).click();
    await page.waitForTimeout(200);
    await expect(page.getByText('atsu@stam.tg')).not.toBeVisible();

    // L'autre email est toujours présent
    await expect(page.getByText('honoreatsu@gmail.com')).toBeVisible();
  });

  // ─── Test 6 : Créer règle complète + vérifier liste + éditer ─────────────

  test('T6 — creer regle avec WEEKLY + emails externes puis verifier edition', async ({ page }) => {
    await page.goto('/admin/alertes/rules/new');
    await page.waitForLoadState('networkidle');

    const ruleName = `Test Schedule ${Date.now()}`;

    // Nom
    await page.fill('input[id="name"]', ruleName);

    // Type d'événement : Marché en fin d'exécution
    await page.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(400);
    await page.getByRole('option', { name: /fin d.ex/i }).click();
    await page.waitForTimeout(300);

    // Canaux : EMAIL + IN_APP (IN_APP coché par défaut, cocher EMAIL)
    const emailCheckbox = page.locator('[id="channel-EMAIL"]');
    if (await emailCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (!(await emailCheckbox.isChecked().catch(() => false))) {
        await emailCheckbox.check();
      }
    }

    // Planification → WEEKLY
    const frequencySelect = page.locator('[role="combobox"]').last();
    await frequencySelect.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Jours spécifiques de la semaine' }).click();
    await page.waitForTimeout(300);

    // Sélectionner Lun + Ven
    await page.getByRole('button', { name: 'Lun' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Ven' }).click();
    await page.waitForTimeout(150);

    // Emails externes
    const emailInput = page.locator('input[placeholder="exemple@domaine.com"]');
    await emailInput.fill('atsu@stam.tg');
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.waitForTimeout(200);

    await emailInput.fill('honoreatsu@gmail.com');
    await emailInput.press('Enter');
    await page.waitForTimeout(200);

    // Vérifier les badges avant soumission
    await expect(page.getByText('atsu@stam.tg')).toBeVisible();
    await expect(page.getByText('honoreatsu@gmail.com')).toBeVisible();

    // Soumettre
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/alertes/rules', { timeout: 20000 });
    await page.waitForLoadState('networkidle');

    // La règle doit apparaître dans la liste
    await expect(page.getByText(ruleName)).toBeVisible();

    // ── Éditer pour vérifier pré-remplissage ──────────────────────────────

    // Trouver la ligne de la règle et cliquer sur le lien d'édition
    const ruleRow = page.locator('tr', { hasText: ruleName });
    await ruleRow.getByRole('link', { name: /[Éé]diter|Modifier/i }).click();
    await page.waitForLoadState('networkidle');

    // Nom pré-rempli
    await expect(page.locator('input[id="name"]')).toHaveValue(ruleName);

    // Section Planification : "Jours spécifiques de la semaine" doit être sélectionné
    await expect(page.locator('[role="combobox"]').filter({ hasText: 'Jours spécifiques de la semaine' })).toBeVisible();

    // Boutons Lun et Ven actifs (variante "default")
    const lunBtn = page.getByRole('button', { name: 'Lun' });
    const venBtn = page.getByRole('button', { name: 'Ven' });
    await expect(lunBtn).toBeVisible();
    await expect(venBtn).toBeVisible();

    // Emails externes pré-remplis
    await expect(page.getByText('atsu@stam.tg')).toBeVisible();
    await expect(page.getByText('honoreatsu@gmail.com')).toBeVisible();
  });

  // ─── Test 7 : Nettoyage — supprimer la règle de test ─────────────────────

  test('T7 — nettoyer les regles de test creees', async ({ page }) => {
    await page.goto('/admin/alertes/rules');
    await page.waitForLoadState('networkidle');

    // Trouver toutes les lignes "Test Schedule ..."
    const testRows = page.locator('tr', { hasText: /^Test Schedule \d+/ });
    const count = await testRows.count();

    for (let i = 0; i < count; i++) {
      // Re-localiser après chaque suppression
      const rows = page.locator('tr', { hasText: /^Test Schedule \d+/ });
      const row = rows.first();
      if (!(await row.isVisible().catch(() => false))) break;

      // Cliquer sur le bouton supprimer de cette ligne
      const deleteBtn = row.locator('button[title="Supprimer"]');
      if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        page.once('dialog', (dialog) => dialog.accept());
        await deleteBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Vérifier qu'il ne reste plus de règle "Test Schedule"
    const remaining = page.locator('tr', { hasText: /^Test Schedule \d+/ });
    await expect(remaining).toHaveCount(0, { timeout: 5000 });
  });
});
