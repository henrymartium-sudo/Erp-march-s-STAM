import { Client } from 'pg'

/**
 * Exécute une requête sur la base de test Docker locale (127.0.0.1:5433), et nulle part ailleurs :
 * l'hôte et le port sont vérifiés avant toute connexion. Usage réservé au dépôt et au nettoyage
 * des données de test préfixées « [E2E-… ] ».
 */
export async function requeteLocale<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL absente : la base de test locale est introuvable.')

  let hote = ''
  let port = ''
  try {
    const u = new URL(url)
    hote = u.hostname
    port = u.port
  } catch {
    throw new Error('DATABASE_URL illisible : connexion refusée.')
  }
  if (hote !== '127.0.0.1' || port !== '5433') {
    throw new Error(`Connexion refusée : la base de test doit être 127.0.0.1:5433 (hôte lu : ${hote}, port lu : ${port}).`)
  }

  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    const res = await client.query(sql, params)
    return res.rows as T[]
  } finally {
    await client.end()
  }
}
