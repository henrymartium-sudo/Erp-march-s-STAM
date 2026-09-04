import { describe, expect, it, vi, beforeEach } from 'vitest'

const authMock = vi.fn()

vi.mock('@/lib/auth/auth.config', () => ({ auth: authMock }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: { document: {} },
}))

const {
  uploadDocument,
  saveDocumentMetadata,
  uploadDocumentVersion,
  updateDocument,
  deleteDocument,
  restoreDocument,
} = await import('./documents')

function sessionFor(role: string) {
  return { user: { id: 'u1', email: 'u@stam.local', role, accountStatus: 'ACTIVE' } }
}

beforeEach(() => {
  authMock.mockReset()
})

// uploadDocument/saveDocumentMetadata/uploadDocumentVersion/updateDocument passent
// par requireMarcheWrite() (ADMIN/AVANCE) ; deleteDocument/restoreDocument par
// requireDelete() (ADMIN/AVANCE). Note : ceci restreint la création de documents
// à ADMIN/AVANCE, alors qu'ARCHITECTURE.md documente un "ajout limité" pour
// EXPLOITATION — écart connu, non corrigé ici (frontière métier à confirmer,
// pas une brèche de sécurité).
describe('RBAC — server actions documents', () => {
  it.each(['EXPLOITATION', 'VISITEUR'])(
    'uploadDocument rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await uploadDocument(new FormData())
      expect(result.success).toBe(false)
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'saveDocumentMetadata rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await saveDocumentMetadata({
        storagePath: 'x', nom: 'x', nomOriginal: 'x', type: 'AUTRE' as never,
      } as never)
      expect(result.success).toBe(false)
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'uploadDocumentVersion rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await uploadDocumentVersion('document-1', new FormData())
      expect(result.success).toBe(false)
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'updateDocument rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await updateDocument('document-1', {})
      expect(result.success).toBe(false)
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'deleteDocument rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await deleteDocument('document-1')
      expect(result.success).toBe(false)
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'restoreDocument rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await restoreDocument('document-1')
      expect(result.success).toBe(false)
    }
  )
})
