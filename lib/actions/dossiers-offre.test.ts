import { describe, expect, it, vi, beforeEach } from 'vitest'

const authMock = vi.fn()

vi.mock('@/lib/auth/auth.config', () => ({ auth: authMock }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: { dossierOffre: {} },
}))

const {
  createDossierOffre,
  updateDossierOffre,
  deleteDossierOffre,
  updatePieceStatut,
} = await import('./dossiers-offre')

function sessionFor(role: string) {
  return { user: { id: 'u1', email: 'u@stam.local', role, accountStatus: 'ACTIVE' } }
}

beforeEach(() => {
  authMock.mockReset()
})

// Les 4 mutations vérifient requireAuth() PUIS canWrite(role) (ADMIN/AVANCE)
// avant tout accès Prisma — le rejet renvoie directement { success: false,
// error: 'Permissions insuffisantes' } sans jamais toucher la base.
describe('RBAC — server actions dossiers-offre', () => {
  it.each(['EXPLOITATION', 'VISITEUR'])(
    'createDossierOffre rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await createDossierOffre({})
      expect(result).toEqual({ success: false, error: 'Permissions insuffisantes' })
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'updateDossierOffre rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await updateDossierOffre('dossier-1', {})
      expect(result).toEqual({ success: false, error: 'Permissions insuffisantes' })
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'deleteDossierOffre rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await deleteDossierOffre('dossier-1')
      expect(result).toEqual({ success: false, error: 'Permissions insuffisantes' })
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'updatePieceStatut rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await updatePieceStatut('piece-1', 'VALIDE')
      expect(result).toEqual({ success: false, error: 'Permissions insuffisantes' })
    }
  )
})
