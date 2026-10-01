import { defineConfig } from '@playwright/test'

// Tests unitaires (tests/unit) : fonctions pures et schémas, sans navigateur ni serveur web.
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: true,
  reporter: [['list']],
})
