/**
 * Script de migration manuelle pour les types de caution (PostgreSQL direct)
 * Exécute le SQL de migration pour mettre à jour l'enum TypeCaution
 *
 * Usage: npx tsx prisma/migrate-type-caution-pg.ts
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL not found in environment')
  }

  const client = new Client({ connectionString })

  try {
    await client.connect()
    console.log('✅ Connecté à la base de données\n')
    console.log('🔄 Début de la migration des types de caution...\n')

    // Vérifier les cautions existantes AVANT migration
    console.log('📊 Cautions existantes AVANT migration:')
    const cautionsAvant = await client.query(`
      SELECT id, reference, type FROM cautions ORDER BY "createdAt"
    `)
    console.table(cautionsAvant.rows)
    console.log(`Total: ${cautionsAvant.rowCount || 0} caution(s)\n`)

    // Exécuter la migration SQL étape par étape
    console.log('🔧 Application de la migration SQL...\n')

    // Étape 1: Créer le nouveau type enum
    await client.query(`
      CREATE TYPE "TypeCaution_new" AS ENUM (
        'SOUMISSION',
        'CAPACITE_FINANCIERE',
        'BONNE_EXECUTION',
        'AVANCE_DEMARRAGE',
        'RETENUE_GARANTIE'
      )
    `)
    console.log('✅ Nouveau type enum créé')

    // Étape 2: Ajouter colonne temporaire
    await client.query(`
      ALTER TABLE "cautions" ADD COLUMN "type_new" "TypeCaution_new"
    `)
    console.log('✅ Colonne temporaire ajoutée')

    // Étape 3: Migrer les données
    const result = await client.query(`
      UPDATE "cautions" SET "type_new" =
        CASE "type"
          WHEN 'PROVISOIRE' THEN 'SOUMISSION'::"TypeCaution_new"
          WHEN 'DEFINITIVE' THEN 'BONNE_EXECUTION'::"TypeCaution_new"
          WHEN 'AVANCE' THEN 'AVANCE_DEMARRAGE'::"TypeCaution_new"
          WHEN 'RETENUE_GARANTIE' THEN 'RETENUE_GARANTIE'::"TypeCaution_new"
        END
    `)
    console.log(`✅ Données migrées (${result.rowCount} ligne(s) mise(s) à jour)`)

    // Étape 4: Supprimer ancienne colonne
    await client.query(`
      ALTER TABLE "cautions" DROP COLUMN "type"
    `)
    console.log('✅ Ancienne colonne supprimée')

    // Étape 5: Renommer nouvelle colonne
    await client.query(`
      ALTER TABLE "cautions" RENAME COLUMN "type_new" TO "type"
    `)
    console.log('✅ Nouvelle colonne renommée')

    // Étape 6: Supprimer ancien type
    await client.query(`
      DROP TYPE "TypeCaution"
    `)
    console.log('✅ Ancien type supprimé')

    // Étape 7: Renommer nouveau type
    await client.query(`
      ALTER TYPE "TypeCaution_new" RENAME TO "TypeCaution"
    `)
    console.log('✅ Nouveau type renommé')

    // Étape 8: Restaurer contrainte NOT NULL
    await client.query(`
      ALTER TABLE "cautions" ALTER COLUMN "type" SET NOT NULL
    `)
    console.log('✅ Contrainte NOT NULL restaurée\n')

    // Vérifier les cautions APRÈS migration
    console.log('📊 Cautions existantes APRÈS migration:')
    const cautionsApres = await client.query(`
      SELECT id, reference, type FROM cautions ORDER BY "createdAt"
    `)
    console.table(cautionsApres.rows)
    console.log(`Total: ${cautionsApres.rowCount || 0} caution(s)\n`)

    console.log('✅ Migration terminée avec succès!')
    console.log('\n📝 Changements appliqués:')
    console.log('   - PROVISOIRE → SOUMISSION')
    console.log('   - DEFINITIVE → BONNE_EXECUTION')
    console.log('   - AVANCE → AVANCE_DEMARRAGE')
    console.log('   - RETENUE_GARANTIE (inchangé)')
    console.log('   - CAPACITE_FINANCIERE (nouveau type disponible)')

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    throw error
  } finally {
    await client.end()
    console.log('\n✅ Déconnexion de la base de données')
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
