import { describe, expect, it, vi, beforeEach } from 'vitest'

const authMock = vi.fn()

vi.mock('@/lib/auth/auth.config', () => ({ auth: authMock }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: { marche: {}, caution: {} },
}))

const { createCaution, updateCaution, deleteCaution } = await import('./cautions')

function sessionFor(role: string) {
  return { user: { id: 'u1', email: 'u@stam.local', role, accountStatus: 'ACTIVE' } }
}

beforeEach(() => {
  authMock.mockReset()
})

// createCaution/updateCaution passent par requireMarcheWrite() (ADMIN/AVANCE),
// deleteCaution par requireDelete() (ADMIN/AVANCE). Les deux jettent avant tout
// accès Prisma pour un rôle non autorisé — pas besoin de mocker les méthodes
// prisma.caution.* pour tester le rejet.
describe('RBAC — server actions cautions', () => {
  it.each(['EXPLOITATION', 'VISITEUR'])(
    'createCaution rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await createCaution({})
      expect(result.success).toBe(false)
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'updateCaution rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await updateCaution({ id: 'caution-1' })
      expect(result.success).toBe(false)
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'deleteCaution rejette le rôle %s (EXPLOITATION n\'a jamais accès à la suppression)',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await deleteCaution('caution-1')
      expect(result.success).toBe(false)
    }
  )
})
