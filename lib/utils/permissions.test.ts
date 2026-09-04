import { describe, expect, it, vi, beforeEach } from 'vitest'

const authMock = vi.fn()

vi.mock('@/lib/auth/auth.config', () => ({
  auth: authMock,
}))

const {
  requireAuth,
  requireRole,
  requireAdmin,
  requireMarcheWrite,
  requireDelete,
  requireRead,
  canWrite,
  isExploitation,
  getMarcheStatutRestriction,
  canExport,
  canWriteSAV,
  canWriteCommentaireContractuel,
} = await import('./permissions')

function sessionFor(role: string, accountStatus = 'ACTIVE') {
  return { user: { id: 'u1', email: 'u@stam.local', role, accountStatus } }
}

beforeEach(() => {
  authMock.mockReset()
})

describe('requireAuth', () => {
  it('rejette une session absente', async () => {
    authMock.mockResolvedValue(null)
    await expect(requireAuth()).rejects.toThrow('Non authentifié')
  })

  it('rejette un compte PENDING, REJECTED ou DEACTIVATED', async () => {
    for (const accountStatus of ['PENDING', 'REJECTED', 'DEACTIVATED']) {
      authMock.mockResolvedValue(sessionFor('ADMIN', accountStatus))
      await expect(requireAuth()).rejects.toThrow(/attente de validation ou désactivé/)
    }
  })

  it('accepte un compte ACTIVE', async () => {
    authMock.mockResolvedValue(sessionFor('VISITEUR', 'ACTIVE'))
    await expect(requireAuth()).resolves.toBeTruthy()
  })
})

describe('requireRole', () => {
  it('rejette un rôle absent de la liste autorisée', async () => {
    authMock.mockResolvedValue(sessionFor('VISITEUR'))
    await expect(requireRole(['ADMIN', 'AVANCE'])).rejects.toThrow(/Non autorisé/)
  })

  it('accepte un rôle présent dans la liste autorisée', async () => {
    authMock.mockResolvedValue(sessionFor('AVANCE'))
    await expect(requireRole(['ADMIN', 'AVANCE'])).resolves.toBeTruthy()
  })
})

describe('requireAdmin / requireMarcheWrite / requireDelete / requireRead', () => {
  it.each([
    ['requireAdmin', requireAdmin, ['ADMIN']],
    ['requireMarcheWrite', requireMarcheWrite, ['ADMIN', 'AVANCE']],
    ['requireDelete', requireDelete, ['ADMIN', 'AVANCE']],
  ] as const)('%s : autorise exactement %s', async (_name, fn, allowedRoles) => {
    for (const role of ['ADMIN', 'AVANCE', 'EXPLOITATION', 'VISITEUR']) {
      authMock.mockResolvedValue(sessionFor(role))
      if ((allowedRoles as readonly string[]).includes(role)) {
        await expect(fn()).resolves.toBeTruthy()
      } else {
        await expect(fn()).rejects.toThrow(/Non autorisé/)
      }
    }
  })

  it('requireRead accepte les 4 rôles (lecture ouverte à tous les comptes actifs)', async () => {
    for (const role of ['ADMIN', 'AVANCE', 'EXPLOITATION', 'VISITEUR']) {
      authMock.mockResolvedValue(sessionFor(role))
      await expect(requireRead()).resolves.toBeTruthy()
    }
  })
})

describe('helpers synchrones (utilisés côté UI pour l\'affichage conditionnel)', () => {
  it('canWrite : ADMIN et AVANCE uniquement', () => {
    expect(canWrite('ADMIN')).toBe(true)
    expect(canWrite('AVANCE')).toBe(true)
    expect(canWrite('EXPLOITATION')).toBe(false)
    expect(canWrite('VISITEUR')).toBe(false)
    expect(canWrite(undefined)).toBe(false)
    expect(canWrite(null)).toBe(false)
  })

  it('canWriteSAV : ADMIN, AVANCE et EXPLOITATION (pas VISITEUR)', () => {
    expect(canWriteSAV('ADMIN')).toBe(true)
    expect(canWriteSAV('AVANCE')).toBe(true)
    expect(canWriteSAV('EXPLOITATION')).toBe(true)
    expect(canWriteSAV('VISITEUR')).toBe(false)
  })

  it('canWriteCommentaireContractuel : ADMIN et AVANCE uniquement (plus strict que canWriteSAV)', () => {
    expect(canWriteCommentaireContractuel('ADMIN')).toBe(true)
    expect(canWriteCommentaireContractuel('AVANCE')).toBe(true)
    expect(canWriteCommentaireContractuel('EXPLOITATION')).toBe(false)
    expect(canWriteCommentaireContractuel('VISITEUR')).toBe(false)
  })

  it('canExport : ADMIN, AVANCE et VISITEUR (pas EXPLOITATION, géré au niveau page)', () => {
    expect(canExport('ADMIN')).toBe(true)
    expect(canExport('AVANCE')).toBe(true)
    expect(canExport('VISITEUR')).toBe(true)
    expect(canExport('EXPLOITATION')).toBe(false)
  })

  it('isExploitation / getMarcheStatutRestriction : restreint uniquement EXPLOITATION à EN_EXECUTION', () => {
    expect(isExploitation('EXPLOITATION')).toBe(true)
    expect(isExploitation('ADMIN')).toBe(false)

    expect(getMarcheStatutRestriction('EXPLOITATION')).toBe('EN_EXECUTION')
    for (const role of ['ADMIN', 'AVANCE', 'VISITEUR', undefined]) {
      expect(getMarcheStatutRestriction(role)).toBeUndefined()
    }
  })
})
