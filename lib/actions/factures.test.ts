import { describe, expect, it, vi, beforeEach } from 'vitest'

const authMock = vi.fn()

vi.mock('@/lib/auth/auth.config', () => ({ auth: authMock }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: { marche: {}, facture: {} },
}))

const { createFacture, updateFacture, deleteFacture } = await import('./factures')

function sessionFor(role: string) {
  return { user: { id: 'u1', email: 'u@stam.local', role, accountStatus: 'ACTIVE' } }
}

beforeEach(() => {
  authMock.mockReset()
})

// createFacture/updateFacture/deleteFacture vérifient requireAuth() PUIS
// canWrite(role) (ADMIN/AVANCE) avant tout accès Prisma — un rejet de rôle
// n'atteint donc jamais la base, ce qui permet de tester le rejet sans mocker
// le comportement de prisma.facture.*.
describe('RBAC — server actions factures', () => {
  it.each(['EXPLOITATION', 'VISITEUR'])(
    'createFacture rejette le rôle %s (seuls ADMIN/AVANCE peuvent créer)',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await createFacture({})
      expect(result).toEqual({ success: false, error: 'Permissions insuffisantes' })
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'updateFacture rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await updateFacture('facture-1', {})
      expect(result).toEqual({ success: false, error: 'Permissions insuffisantes' })
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'deleteFacture rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await deleteFacture('facture-1')
      expect(result).toEqual({ success: false, error: 'Permissions insuffisantes' })
    }
  )

  it('un utilisateur non authentifié ne peut pas créer de facture', async () => {
    // requireAuth() jette, mais le try/catch de createFacture avale l'erreur
    // et retourne un message générique plutôt que de laisser la promesse rejeter.
    authMock.mockResolvedValue(null)
    const result = await createFacture({})
    expect(result.success).toBe(false)
  })
})
