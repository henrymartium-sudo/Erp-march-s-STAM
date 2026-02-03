import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour ERP Marchés STAM
 * Tests E2E pour Documents, Cautions, Véhicules, etc.
 */
export default defineConfig({
  testDir: './tests',

  // Timeout pour chaque test (30 secondes)
  timeout: 30 * 1000,

  // Attente max pour les expect()
  expect: {
    timeout: 5000,
  },

  // Exécuter les tests en parallèle
  fullyParallel: true,

  // Échouer le build CI si des tests sont marqués .only
  forbidOnly: !!process.env.CI,

  // Nombre de retry en cas d'échec
  retries: process.env.CI ? 2 : 0,

  // Nombre de workers (tests en parallèle)
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Configuration partagée pour tous les projets
  use: {
    // URL de base de l'application
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collecter les traces uniquement en cas d'échec
    trace: 'on-first-retry',

    // Screenshots en cas d'échec
    screenshot: 'only-on-failure',

    // Vidéo en cas d'échec
    video: 'retain-on-failure',

    // Timeout pour les navigations
    navigationTimeout: 15 * 1000,

    // Timeout pour les actions
    actionTimeout: 10 * 1000,
  },

  // Projets de test (navigateurs)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Tests mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Serveur de développement
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
