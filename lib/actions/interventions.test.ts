import { describe, expect, it, vi, beforeEach } from 'vitest'

const authMock = vi.fn()

vi.mock('@/lib/auth/auth.config', () => ({ auth: authMock }))
vi.mock('@/lib/db/prisma', () => ({
  prisma: { intervention: {} },
}))

const {
  createIntervention,
  updateInterventionStatut,
  updateCommentaireContractuel,
  deleteIntervention,
} = await import('./interventions')

function sessionFor(role: string) {
  return { user: { id: 'u1', email: 'u@stam.local', role, accountStatus: 'ACTIVE' } }
}

beforeEach(() => {
  authMock.mockReset()
})

describe('RBAC — server actions interventions (SAV)', () => {
  // createIntervention / updateInterventionStatut : canWriteSAV = ADMIN/AVANCE/EXPLOITATION.
  // Seul VISITEUR doit être rejeté ici.
  it('createIntervention rejette VISITEUR', async () => {
    authMock.mockResolvedValue(sessionFor('VISITEUR'))
    const result = await createIntervention({})
    expect(result.success).toBe(false)
  })

  it('updateInterventionStatut rejette VISITEUR', async () => {
    authMock.mockResolvedValue(sessionFor('VISITEUR'))
    const result = await updateInterventionStatut({})
    expect(result.success).toBe(false)
  })

  // updateCommentaireContractuel : canWriteCommentaireContractuel = ADMIN/AVANCE
  // uniquement — plus strict que les deux fonctions ci-dessus. EXPLOITATION est
  // rejeté ici alors qu'il est autorisé sur createIntervention : c'est
  // volontaire (cf. ARCHITECTURE.md), pas une incohérence à corriger.
  it.each(['EXPLOITATION', 'VISITEUR'])(
    'updateCommentaireContractuel rejette le rôle %s',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await updateCommentaireContractuel({})
      expect(result.success).toBe(false)
    }
  )

  it.each(['EXPLOITATION', 'VISITEUR'])(
    'deleteIntervention rejette le rôle %s (requireDelete = ADMIN/AVANCE)',
    async (role) => {
      authMock.mockResolvedValue(sessionFor(role))
      const result = await deleteIntervention('intervention-1')
      expect(result.success).toBe(false)
    }
  )
})
