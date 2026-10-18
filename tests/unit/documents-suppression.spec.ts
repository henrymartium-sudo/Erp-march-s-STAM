import { test, expect } from '@playwright/test'
import {
  supprimerDefinitivement,
  type DepsSuppression,
  type LigneDocument,
} from '../../lib/utils/documents-suppression'

type Base = Record<string, LigneDocument & { deleted?: boolean }>

/** Faux d'accès : aucun stockage ni base réels, tout est enregistré dans `appels`. */
function creerDeps(base: Base, options: { echecEffacement?: boolean; echecMarquage?: boolean } = {}) {
  const appels: string[] = []
  const effaces: string[][] = []
  const marques: string[][] = []
  const traces: Array<{ ids: string[]; complet: boolean }> = []
  const deps: DepsSuppression = {
    trouver: async (id) => base[id] ?? null,
    enfantsVivants: async (parents) =>
      Object.values(base).filter(
        (l) => !l.deleted && l.documentParentId && parents.includes(l.documentParentId)
      ),
    cheminsUtilisesAilleurs: async (chemins, ids) =>
      Object.values(base)
        .filter((l) => !l.deleted && !ids.includes(l.id) && chemins.includes(l.storagePath))
        .map((l) => l.storagePath),
    effacerFichiers: async (chemins) => {
      appels.push('effacer')
      effaces.push(chemins)
      return options.echecEffacement ? { error: 'panne stockage' } : { error: null }
    },
    marquerSupprimes: async (ids) => {
      appels.push('marquer')
      if (options.echecMarquage) throw new Error('panne base')
      marques.push(ids)
    },
    tracer: async (info) => {
      appels.push('tracer')
      traces.push({ ids: info.ids, complet: info.complet })
    },
  }
  return { deps, appels, effaces, marques, traces }
}

const ligne = (id: string, parent: string | null = null, extra: Partial<LigneDocument> = {}): LigneDocument => ({
  id,
  storagePath: `fictif/${id}.pdf`,
  documentParentId: parent,
  deleted: false,
  marcheId: null,
  ...extra,
})

test.describe('supprimerDefinitivement', () => {
  test('efface le fichier du stockage AVANT de marquer la ligne, puis trace', async () => {
    const { deps, appels, effaces, marques } = creerDeps({ a: ligne('a') })
    const r = await supprimerDefinitivement(deps, 'a')
    expect(r.success).toBe(true)
    expect(appels).toEqual(['effacer', 'marquer', 'tracer'])
    expect(effaces).toEqual([['fictif/a.pdf']])
    expect(marques).toEqual([['a']])
  })

  test("échec du stockage : la ligne n'est pas marquée, aucune trace de succès, erreur claire", async () => {
    const { deps, appels, marques } = creerDeps({ a: ligne('a') }, { echecEffacement: true })
    const r = await supprimerDefinitivement(deps, 'a')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toContain('rien n’a été supprimé')
    expect(appels).toEqual(['effacer'])
    expect(marques).toEqual([])
  })

  test('supprimer un document supprime aussi ses versions (descendants, à tous les niveaux)', async () => {
    const base = { a: ligne('a'), b: ligne('b', 'a'), c: ligne('c', 'b'), z: ligne('z') }
    const { deps, effaces, marques } = creerDeps(base)
    const r = await supprimerDefinitivement(deps, 'a')
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.nbDocuments).toBe(3)
    expect([...(effaces[0] ?? [])].sort()).toEqual(['fictif/a.pdf', 'fictif/b.pdf', 'fictif/c.pdf'])
    expect([...(marques[0] ?? [])].sort()).toEqual(['a', 'b', 'c'])
  })

  test('supprimer une version seule ne touche ni son parent ni ses frères', async () => {
    const base = { a: ligne('a'), b: ligne('b', 'a'), c: ligne('c', 'a') }
    const { deps, marques } = creerDeps(base)
    await supprimerDefinitivement(deps, 'b')
    expect(marques).toEqual([['b']])
  })

  test("n'efface jamais un fichier utilisé par une autre ligne vivante", async () => {
    const base = {
      a: ligne('a', null, { storagePath: 'fictif/commun.pdf' }),
      autre: ligne('autre', null, { storagePath: 'fictif/commun.pdf' }),
    }
    const { deps, effaces, marques } = creerDeps(base)
    const r = await supprimerDefinitivement(deps, 'a')
    expect(r.success).toBe(true)
    expect(effaces.flat()).not.toContain('fictif/commun.pdf')
    expect(marques).toEqual([['a']])
  })

  test('document introuvable ou déjà supprimé : rien ne bouge', async () => {
    const { deps, appels } = creerDeps({ d: ligne('d', null, { deleted: true }) })
    expect((await supprimerDefinitivement(deps, 'absent')).success).toBe(false)
    expect((await supprimerDefinitivement(deps, 'd')).success).toBe(false)
    expect(appels).toEqual([])
  })

  test("échec du marquage après effacement : erreur explicite, trace incomplète, nouvel essai possible", async () => {
    const { deps, appels, traces } = creerDeps({ a: ligne('a') }, { echecMarquage: true })
    const r = await supprimerDefinitivement(deps, 'a')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toContain('Réessayez')
    expect(appels).toEqual(['effacer', 'marquer', 'tracer'])
    expect(traces[0]?.complet).toBe(false)
  })

  test("identifiant invalide (vide, trop long, non texte) : refusé avant tout accès", async () => {
    const { deps, appels } = creerDeps({})
    for (const id of ['', 'x'.repeat(200), 42 as unknown as string]) {
      expect((await supprimerDefinitivement(deps, id)).success).toBe(false)
    }
    expect(appels).toEqual([])
  })
})
