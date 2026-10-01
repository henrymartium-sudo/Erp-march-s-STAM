import 'dotenv/config'
import { Client } from 'pg'
import type { ResultatLot, StatutOpportunite } from '@prisma/client'
import { agregerStatutOpportunite } from '../lib/utils/lots'

const DRY_RUN = process.argv.includes('--dry-run')
const CIBLE_ARG = process.argv.find((a) => a.startsWith('--cible='))
const CIBLE = CIBLE_ARG ? CIBLE_ARG.slice('--cible='.length) : undefined

function resultatDepuis(statut: StatutOpportunite): ResultatLot {
  if (statut === 'GAGNEE') return 'GAGNE'
  if (statut === 'PERDUE') return 'PERDU'
  if (statut === 'ATTRIBUE_PROVISOIREMENT') return 'ATTRIBUE_PROVISOIREMENT'
  return 'EN_COURS'
}

async function main() {
  const host = new URL(process.env.DATABASE_URL!).host
  console.log(`Cible : ${host} — mode ${DRY_RUN ? 'DRY-RUN' : 'ÉCRITURE'}`)

  if (!DRY_RUN && CIBLE !== host) {
    console.error(
      `Refus : mode écriture sans --cible=${host} correspondant exactement à la cible réelle (${host}).`
    )
    process.exit(1)
  }

  // Base locale (Docker de test) : pas de TLS ; toute autre cible (production) : certificat vérifié.
  // Les paramètres ssl* de l'URL (sslmode=no-verify dans .env) sont retirés : node-postgres les applique
  // par-dessus l'option `ssl` et annuleraient la vérification.
  const url = new URL(process.env.DATABASE_URL!)
  for (const k of Array.from(url.searchParams.keys())) if (/^ssl/i.test(k)) url.searchParams.delete(k)
  const local = ['127.0.0.1', 'localhost'].includes(url.hostname)
  const db = new Client({ connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: true } })
  try {
    await db.connect()
  } catch (e) {
    if (/certificate/i.test((e as Error).message)) {
      console.error("Certificat refusé : fournir l'autorité via NODE_EXTRA_CA_CERTS=<fichier.pem> ; ne jamais désactiver la vérification.")
    }
    throw e
  }
  try {
    const { rows: opps } = await db.query(`
      SELECT o.id, o.statut, o.objet, o."montantEstime", o."montantPropose",
             o."motifPerte", o."concurrentGagnant", o."montantOffreConcurrent"
      FROM opportunites o
      WHERE NOT EXISTS (SELECT 1 FROM lots l WHERE l."opportuniteId" = o.id)`)
    console.log(`${opps.length} opportunité(s) sans lot — mode ${DRY_RUN ? 'DRY-RUN' : 'ÉCRITURE'}`)

    for (const o of opps) {
      const resultat = resultatDepuis(o.statut)
      const agrege = agregerStatutOpportunite([resultat])
      const ecart = agrege && ['ATTRIBUE_PROVISOIREMENT', 'GAGNEE', 'PERDUE'].includes(o.statut) && agrege !== o.statut
      const { rows: dossiers } = await db.query(
        `SELECT id, titre FROM dossiers_offre WHERE "opportuniteId" = $1 ORDER BY "createdAt" ASC`, [o.id])
      console.log(`- ${o.objet} [${o.statut}] → lot ${resultat}, ${dossiers.length} dossier(s)${ecart ? ' ⚠ ÉCART' : ''}`)
      if (dossiers.length > 1) console.log(`  ⚠ dossiers supplémentaires non rattachés : ${dossiers.slice(1).map((d) => d.titre).join(' | ')}`)
      if (DRY_RUN) continue

      await db.query('BEGIN')
      const { rows: [lot] } = await db.query(
        `INSERT INTO lots (id, "opportuniteId", numero, intitule, "montantEstime", "montantPropose", resultat,
                           "motifPerte", "concurrentGagnant", "montantOffreConcurrent", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, 1, 'Lot unique', $2, $3, $4::"ResultatLot", $5, $6, $7, now(), now())
         RETURNING id`,
        [o.id, o.montantEstime, o.montantPropose, resultat, o.motifPerte, o.concurrentGagnant, o.montantOffreConcurrent])
      if (dossiers[0]) {
        await db.query(`UPDATE dossiers_offre SET "lotId" = $1 WHERE id = $2`, [lot.id, dossiers[0].id])
      }
      await db.query('COMMIT')
    }
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    await db.end()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
