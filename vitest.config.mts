import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    // Tests unitaires co-localisés dans lib/ uniquement — les specs E2E
    // Playwright vivent dans tests/ et ne doivent jamais être ramassées ici.
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
})
