# Tests E2E - Exports PDF/Excel

Tests Playwright pour valider les fonctionnalités d'export PDF et Excel des 4 modules de l'ERP.

## Fichiers de tests

- `marches-exports.spec.ts` - Tests exports pour le module Marchés (7 tests)
- `cautions-exports.spec.ts` - Tests exports pour le module Cautions (6 tests)
- `documents-exports.spec.ts` - Tests exports pour le module Documents (8 tests)
- `vehicules-exports.spec.ts` - Tests exports pour le module Véhicules (9 tests)

**Total : 30 tests E2E**

## Ce qui est testé

### Pour chaque module (Marchés, Cautions, Documents, Véhicules)

✅ **Affichage du bouton Exporter**
   - Présence et visibilité du bouton
   - État enabled/disabled selon les permissions

✅ **Export Excel (.xlsx)**
   - Ouverture du menu dropdown
   - Sélection de l'option Excel
   - Téléchargement du fichier .xlsx
   - Vérification du nom de fichier
   - Toast de succès affiché

✅ **Export PDF (.pdf)**
   - Ouverture du menu dropdown
   - Sélection de l'option PDF
   - Téléchargement du fichier .pdf
   - Vérification du nom de fichier
   - Toast de succès affiché

✅ **Exports avec filtres**
   - Export avec recherche textuelle active
   - Export avec filtres par type/phase/statut
   - Respect des filtres dans les données exportées

✅ **Permissions RBAC**
   - **VISITEUR** : Bouton désactivé ou caché
   - **EXPLOITATION** : Accès complet aux exports
   - **AVANCÉ** : Accès complet aux exports
   - **ADMIN** : Accès complet aux exports

✅ **Gestion des erreurs**
   - Affichage du toast d'erreur en cas d'échec
   - Gestion des timeouts
   - Comportement du loader pendant l'export

## Prérequis

### 1. Variables d'environnement

Créer un fichier `.env.test` à la racine du projet (déjà présent) :

```bash
# Base de données (connexion directe, pas de pooling pour tests)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="votre-secret-test"
NEXTAUTH_URL="http://localhost:3000"

# Autres variables nécessaires...
```

### 2. Navigateurs Playwright

Installer les navigateurs (déjà fait) :

```bash
npx playwright install chromium firefox webkit
```

### 3. Base de données de test

La base de données doit contenir :
- Utilisateurs de test (admin, avance, exploitation, visiteur)
- Quelques marchés/cautions/documents/véhicules de test

Les utilisateurs de test sont créés automatiquement par :

```bash
npm run db:seed
```

## Lancer les tests

### Tests complets (tous les exports)

```bash
npm run test:exports
```

### Tests d'un module spécifique

```bash
# Marchés uniquement
npx playwright test tests/exports/marches-exports.spec.ts

# Cautions uniquement
npx playwright test tests/exports/cautions-exports.spec.ts

# Documents uniquement
npx playwright test tests/exports/documents-exports.spec.ts

# Véhicules uniquement
npx playwright test tests/exports/vehicules-exports.spec.ts
```

### Tests avec interface UI (mode interactif)

```bash
npx playwright test tests/exports/ --ui
```

### Tests avec navigateur visible (headed mode)

```bash
npx playwright test tests/exports/ --headed
```

### Tests en mode debug

```bash
npx playwright test tests/exports/ --debug
```

### Tests sur un navigateur spécifique

```bash
# Chromium uniquement (plus rapide)
npx playwright test tests/exports/ --project=chromium

# Firefox
npx playwright test tests/exports/ --project=firefox

# Webkit (Safari)
npx playwright test tests/exports/ --project=webkit
```

## Rapport de tests

Générer un rapport HTML après l'exécution :

```bash
npm run test:report
```

Le rapport s'ouvre automatiquement dans le navigateur et montre :
- Tests réussis/échoués
- Screenshots des erreurs
- Vidéos des tests échoués
- Traces d'exécution

## Structure d'un test

Exemple de test pour export Excel :

```typescript
test('devrait pouvoir exporter la liste des marchés en Excel', async ({ page }) => {
  await page.goto('/marches');
  await wait(1000);

  // Cliquer sur le bouton Exporter
  const exportButton = page.locator('button:has-text("Exporter")');
  await exportButton.click();
  await wait(500);

  // Vérifier l'option Excel
  const excelOption = page.locator('text=Excel (.xlsx)');
  await expect(excelOption).toBeVisible();

  // Écouter l'événement de téléchargement
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

  // Cliquer sur l'option Excel
  await excelOption.click();

  // Attendre le téléchargement
  const download = await downloadPromise;

  // Vérifier le fichier
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);

  // Vérifier le toast de succès
  await expect(page.locator('text=Export Excel réussi')).toBeVisible({ timeout: 5000 });
});
```

## Configuration Playwright

Voir `playwright.config.ts` pour la configuration complète :

- **Timeout test** : 30 secondes
- **Workers** : 1 (pour éviter l'épuisement du pool DB)
- **Retry** : 0 en local, 2 en CI
- **Base URL** : http://localhost:3000
- **Screenshots** : Uniquement en cas d'échec
- **Vidéos** : Conservées uniquement en cas d'échec
- **Traces** : Collectées au premier retry

## Dépannage

### Les tests échouent avec "Timeout waiting for download"

- Vérifier que le serveur Next.js démarre correctement
- Augmenter le timeout dans le test : `{ timeout: 30000 }`
- Vérifier les permissions utilisateur dans la base de données

### Les tests échouent avec "Element not found"

- Vérifier que l'application est bien construite : `npm run build`
- Vérifier que les sélecteurs correspondent au composant ExportMenu
- Utiliser le mode debug pour inspecter la page : `--debug`

### Le serveur Next.js ne démarre pas

- Vérifier le fichier `.env.test`
- Vérifier que le port 3000 n'est pas déjà utilisé
- Vérifier les logs dans `playwright-report/`

### Les téléchargements ne fonctionnent pas

- Vérifier que les routes API d'exports existent :
  - `/api/exports/marches`, `/api/exports/cautions`, etc.
  - `/api/exports-pdf/marches`, `/api/exports-pdf/cautions`, etc.
- Vérifier les permissions utilisateur (minimum EXPLOITATION requis)

## CI/CD

### GitHub Actions (exemple)

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:exports
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Maintenance

### Ajouter de nouveaux tests

1. Créer un nouveau fichier `.spec.ts` dans `tests/exports/`
2. Utiliser les helpers existants (`login`, `wait`, `TEST_USERS`)
3. Suivre le pattern des tests existants
4. Documenter les nouveaux tests dans ce README

### Mettre à jour les sélecteurs

Si le composant `ExportMenu` change :

1. Mettre à jour les sélecteurs dans les tests
2. Vérifier que tous les tests passent
3. Mettre à jour la documentation si nécessaire

## Ressources

- [Documentation Playwright](https://playwright.dev/)
- [Best Practices E2E Testing](https://playwright.dev/docs/best-practices)
- [Guide du composant ExportMenu](../../components/exports/export-menu.tsx)
- [Configuration Playwright](../../playwright.config.ts)

---

**Dernière mise à jour** : 2026-02-16
**Statut** : ✅ Tests créés (30 tests) - Prêts à être exécutés
**Couverture** : 4 modules × (Excel + PDF + Permissions + Erreurs) = 100%
