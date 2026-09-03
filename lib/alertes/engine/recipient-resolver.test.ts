import { describe, expect, it, vi, beforeEach } from 'vitest'

const findManyMock = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findMany: findManyMock,
    },
  },
}))

// Import après le mock (vi.mock est hoisté par Vitest avant les imports).
const { resolveRecipients } = await import('./recipient-resolver')

beforeEach(() => {
  findManyMock.mockReset()
})

describe('resolveRecipients', () => {
  it('ne requête pas la base si aucun rôle ni utilisateur ciblé', async () => {
    const result = await resolveRecipients([], [])
    expect(result).toEqual([])
    expect(findManyMock).not.toHaveBeenCalled()
  })

  it('interroge par rôles OR utilisateurs ciblés', async () => {
    findManyMock.mockResolvedValue([])
    await resolveRecipients(['ADMIN'], ['user-1'])

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        OR: [{ role: { in: ['ADMIN'] } }, { id: { in: ['user-1'] } }],
      },
      select: { id: true, email: true, role: true },
    })
  })

  it('déduplique les destinataires par email (un user ciblé à la fois par rôle et par id)', async () => {
    findManyMock.mockResolvedValue([
      { id: 'user-1', email: 'admin@stam.local', role: 'ADMIN' },
      { id: 'user-1', email: 'admin@stam.local', role: 'ADMIN' },
      { id: 'user-2', email: 'avance@stam.local', role: 'AVANCE' },
    ])

    const result = await resolveRecipients(['ADMIN'], ['user-1'])

    expect(result).toEqual([
      { userId: 'user-1', email: 'admin@stam.local', role: 'ADMIN' },
      { userId: 'user-2', email: 'avance@stam.local', role: 'AVANCE' },
    ])
  })
})
