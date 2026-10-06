import { test, expect } from '@playwright/test'
import { capturerOperation } from '../../lib/pilotage/capturer-operation'

test('une opération en échec ne rejette pas les résultats des autres blocs', async () => {
  const [enErreur, reussie] = await Promise.all([
    capturerOperation(() => {
      throw new Error('échec simulé')
    }),
    capturerOperation(() => 42),
  ])

  expect(enErreur.status).toBe('error')
  expect(reussie).toEqual({ status: 'success', value: 42 })
})
