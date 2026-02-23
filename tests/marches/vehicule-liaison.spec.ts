import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from '../helpers/auth';

/**
 * Tests E2E — Liaison Véhicules ↔ Marchés (Many-to-Many)
 *
 * Données DB connues :
 * - Marché N°00888/2023/AOO/MAEDR/F → 2 véhicules : GA-TG-7667, GA-TG-7668
 * - Véhicule GA-TG-7667 → 1 marché associé
 * - Véhicule STAM-09    → aucun marché lié (utilisé pour test d'ajout)
 * - Marché N°00366/2025/MPDC-SWEDD+/F/BM-IDA → aucun véhicule lié
 */

const MARCHE_AVEC_VEHICULES = {
  id: 'cmlm1n3pb0006s4tv4ubg0hu5',
  numero: 'N°00888/2023/AOO/MAEDR/F',
  vehicules: ['GA-TG-7667', 'GA-TG-7668'],
};

const VEHICULE_LIE = {
  id: 'cmlqz7j1z000004lb086ecbkk',
  immatriculation: 'GA-TG-7667',
};

const MARCHE_SANS_VEHICULES = {
  id: 'cmlqtfcaa000004kzdlxd7oom',
  numero: 'N°00366/2025/MPDC-SWEDD+/F/BM-IDA',
};

const VEHICULE_NON_LIE = {
  id: 'cmlzhbi67000004jolfhxhzm3',
  immatriculation: 'STAM-09',
};

// ============================================================================
// Test 1 : Affichage côté marché — page détail
// ============================================================================
test.describe('Test 1 — Marché détail : section Véhicules associés', () => {
  test('doit afficher les véhicules liés sur la page détail du marché', async ({ page }) => {
    await login(page, TEST_USERS.admin);

    await page.goto(`/marches/${MARCHE_AVEC_VEHICULES.id}`);
    await page.waitForLoadState('networkidle');

    // Vérifier que la section "Véhicules associés" est présente
    await expect(page.locator('text=Véhicules associés')).toBeVisible({ timeout: 10000 });

    // Vérifier le compteur (2 véhicules)
    await expect(page.locator('text=Véhicules associés (2)')).toBeVisible();

    // Vérifier que les deux immatriculations sont affichées
    for (const immat of MARCHE_AVEC_VEHICULES.vehicules) {
      await expect(page.locator(`text=${immat}`).first()).toBeVisible();
    }
  });
});

// ============================================================================
// Test 2 : Affichage côté véhicule — page détail
// ============================================================================
test.describe('Test 2 — Véhicule détail : section Marchés associés', () => {
  test('doit afficher le marché lié sur la page détail du véhicule', async ({ page }) => {
    await login(page, TEST_USERS.admin);

    await page.goto(`/vehicules/${VEHICULE_LIE.id}`);
    await page.waitForLoadState('networkidle');

    // Vérifier que la section "Marchés associés" est présente
    await expect(page.locator('text=Marchés associés')).toBeVisible({ timeout: 10000 });

    // Vérifier que le numéro de marché est affiché
    await expect(page.locator(`text=${MARCHE_AVEC_VEHICULES.numero}`).first()).toBeVisible();
  });
});

// ============================================================================
// Test 3 : Formulaire édition — pré-sélection des véhicules
// ============================================================================
test.describe('Test 3 — Formulaire édition : pré-sélection véhicules', () => {
  test('doit pré-sélectionner les véhicules existants dans le formulaire d\'édition', async ({ page }) => {
    await login(page, TEST_USERS.admin);

    await page.goto(`/marches/${MARCHE_AVEC_VEHICULES.id}/edit`);
    await page.waitForLoadState('networkidle');

    // Vérifier que la section "Véhicules associés" est dans le formulaire
    await expect(page.locator('h3:has-text("Véhicules associés")')).toBeVisible({ timeout: 10000 });

    // Le bouton doit afficher "2 véhicules sélectionnés" (basé sur vehiculeIds dans le form state)
    await expect(
      page.locator('button:has-text("2 véhicule")').first()
    ).toBeVisible({ timeout: 8000 });

    // Ouvrir le popover pour voir les checkboxes
    await page.locator('button:has-text("2 véhicule")').first().click();
    // Attendre que le chargement async des véhicules soit terminé dans le popover
    await page.waitForTimeout(3000);

    // Dans le popover, les deux véhicules doivent être cochés
    for (const immat of MARCHE_AVEC_VEHICULES.vehicules) {
      const vehicleRow = page.locator(`text=${immat}`).first();
      await expect(vehicleRow).toBeVisible({ timeout: 15000 });
    }

    // Fermer le popover
    await page.keyboard.press('Escape');
  });

  test('les badges des véhicules sélectionnés apparaissent après chargement async', async ({ page }) => {
    await login(page, TEST_USERS.admin);

    await page.goto(`/marches/${MARCHE_AVEC_VEHICULES.id}/edit`);
    await page.waitForLoadState('networkidle');

    // Attendre que le chargement async des véhicules soit terminé
    // (les badges apparaissent après que allVehicules soit chargé via useEffect)
    await page.waitForTimeout(4000);

    // Les badges avec les immatriculations doivent être visibles (via le composant VehicleMultiSelect)
    // Le Badge shadcn/ui est un div — on utilise un sélecteur générique
    for (const immat of MARCHE_AVEC_VEHICULES.vehicules) {
      await expect(page.locator(`text="${immat}"`).first()).toBeVisible({ timeout: 10000 });
    }
  });
});

// ============================================================================
// Test 4 : Liaison effective — ajout d'un véhicule
// ============================================================================
test.describe('Test 4 — Liaison effective : ajout et persistance', () => {
  test('doit lier un véhicule à un marché et persister après sauvegarde', async ({ page }) => {
    await login(page, TEST_USERS.admin);

    // Naviguer vers le formulaire d'édition du marché SANS véhicules
    await page.goto(`/marches/${MARCHE_SANS_VEHICULES.id}/edit`);
    await page.waitForLoadState('networkidle');

    // Vérifier que le formulaire est chargé
    await expect(page.locator('h3:has-text("Véhicules associés")')).toBeVisible({ timeout: 10000 });

    // Le bouton devrait indiquer aucun véhicule sélectionné initialement
    await expect(
      page.locator('button:has-text("Sélectionner des véhicules")').first()
    ).toBeVisible({ timeout: 8000 });

    // Ouvrir le popover de sélection
    await page.locator('button:has-text("Sélectionner des véhicules")').first().click();
    await page.waitForTimeout(3000); // Attendre le chargement async des véhicules via useEffect

    // Chercher et cocher STAM-09
    const vehiculeRow = page.locator(`text=${VEHICULE_NON_LIE.immatriculation}`).first();
    await expect(vehiculeRow).toBeVisible({ timeout: 15000 });
    await vehiculeRow.click();

    // Fermer le popover
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Le bouton doit maintenant indiquer "1 véhicule sélectionné"
    await expect(
      page.locator('button:has-text("1 véhicule sélectionné")').first()
    ).toBeVisible({ timeout: 5000 });

    // Sauvegarder le formulaire
    const submitBtn = page.locator('button[type="submit"]').last();
    await submitBtn.click();

    // Attendre la redirection vers la page détail
    await page.waitForURL(`/marches/${MARCHE_SANS_VEHICULES.id}`, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Vérifier que la section "Véhicules associés" apparaît maintenant
    await expect(page.locator('text=Véhicules associés (1)')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${VEHICULE_NON_LIE.immatriculation}`).first()).toBeVisible();
  });

  test('doit restaurer la liaison après test (retirer le véhicule ajouté)', async ({ page }) => {
    await login(page, TEST_USERS.admin);

    // Retourner en édition pour nettoyer
    await page.goto(`/marches/${MARCHE_SANS_VEHICULES.id}/edit`);
    await page.waitForLoadState('networkidle');

    // Vérifier que le véhicule ajouté est bien pré-sélectionné
    await expect(
      page.locator('button:has-text("1 véhicule sélectionné")').first()
    ).toBeVisible({ timeout: 10000 });

    // Ouvrir le popover et décocher STAM-09
    await page.locator('button:has-text("1 véhicule sélectionné")').first().click();
    await page.waitForTimeout(1500);

    // Cibler la ligne dans le popover (pas le badge en dehors du popover)
    const popoverContent = page.locator('[data-radix-popper-content-wrapper]').first();
    await expect(popoverContent).toBeVisible({ timeout: 5000 });
    const vehiculeRow = popoverContent.locator(`text=${VEHICULE_NON_LIE.immatriculation}`).first();
    await vehiculeRow.click();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);

    // Vérifier retour à 0 sélections
    await expect(
      page.locator('button:has-text("Sélectionner des véhicules")').first()
    ).toBeVisible({ timeout: 10000 });

    // Sauvegarder
    await page.locator('button[type="submit"]').last().click();
    await page.waitForURL(`/marches/${MARCHE_SANS_VEHICULES.id}`, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Vérifier que la section "Véhicules associés" n'apparaît plus
    await expect(page.locator('text=Véhicules associés')).not.toBeVisible({ timeout: 5000 });
  });
});

// ============================================================================
// Test 5 : Cohérence bidirectionnelle
// ============================================================================
test.describe('Test 5 — Cohérence bidirectionnelle', () => {
  test('le véhicule GA-TG-7667 pointe vers le marché qui le liste', async ({ page }) => {
    await login(page, TEST_USERS.admin);

    // Depuis la page véhicule, cliquer sur "Voir" le marché
    await page.goto(`/vehicules/${VEHICULE_LIE.id}`);
    await page.waitForLoadState('networkidle');

    // Vérifier section marchés
    await expect(page.locator('text=Marchés associés')).toBeVisible({ timeout: 10000 });

    // Cliquer sur le lien "Voir" pour aller à la page du marché
    await page.locator('a:has-text("Voir")').first().click();
    await page.waitForLoadState('networkidle');

    // Vérifier qu'on est bien sur la page du marché N°00888
    await expect(page.locator(`text=${MARCHE_AVEC_VEHICULES.numero}`).first()).toBeVisible({ timeout: 8000 });

    // Et que ce marché liste bien le véhicule GA-TG-7667
    await expect(page.locator(`text=${VEHICULE_LIE.immatriculation}`).first()).toBeVisible();
  });
});
