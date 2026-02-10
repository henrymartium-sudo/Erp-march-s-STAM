/**
 * Script de migration manuelle pour les types de caution
 * Exécute le SQL de migration pour mettre à jour l'enum TypeCaution
 *
 * Usage: npx tsx prisma/migrate-type-caution.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Début de la migration des types de caution...\n')

  try {
    // Vérifier les cautions existantes AVANT migration
    console.log('📊 Cautions existantes AVANT migration:')
    const cautionsAvant = await prisma.$queryRaw<any[]>`
      SELECT id, reference, type FROM cautions ORDER BY "createdAt"
    `
    console.table(cautionsAvant)
    console.log(`Total: ${cautionsAvant.length} caution(s)\n`)

    // Exécuter la migration SQL
    console.log('🔧 Application de la migration SQL...\n')

    // Étape 1: Créer le nouveau type enum
    await prisma.$executeRawUnsafe(`
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
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cautions" ADD COLUMN "type_new" "TypeCaution_new"
    `)
    console.log('✅ Colonne temporaire ajoutée')

    // Étape 3: Migrer les données
    await prisma.$executeRawUnsafe(`
      UPDATE "cautions" SET "type_new" =
        CASE "type"
          WHEN 'PROVISOIRE' THEN 'SOUMISSION'::"TypeCaution_new"
          WHEN 'DEFINITIVE' THEN 'BONNE_EXECUTION'::"TypeCaution_new"
          WHEN 'AVANCE' THEN 'AVANCE_DEMARRAGE'::"TypeCaution_new"
          WHEN 'RETENUE_GARANTIE' THEN 'RETENUE_GARANTIE'::"TypeCaution_new"
        END
    `)
    console.log('✅ Données migrées')

    // Étape 4: Supprimer ancienne colonne
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cautions" DROP COLUMN "type"
    `)
    console.log('✅ Ancienne colonne supprimée')

    // Étape 5: Renommer nouvelle colonne
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cautions" RENAME COLUMN "type_new" TO "type"
    `)
    console.log('✅ Nouvelle colonne renommée')

    // Étape 6: Supprimer ancien type
    await prisma.$executeRawUnsafe(`
      DROP TYPE "TypeCaution"
    `)
    console.log('✅ Ancien type supprimé')

    // Étape 7: Renommer nouveau type
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "TypeCaution_new" RENAME TO "TypeCaution"
    `)
    console.log('✅ Nouveau type renommé')

    // Étape 8: Restaurer contrainte NOT NULL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cautions" ALTER COLUMN "type" SET NOT NULL
    `)
    console.log('✅ Contrainte NOT NULL restaurée\n')

    // Vérifier les cautions APRÈS migration
    console.log('📊 Cautions existantes APRÈS migration:')
    const cautionsApres = await prisma.$queryRaw<any[]>`
      SELECT id, reference, type FROM cautions ORDER BY "createdAt"
    `
    console.table(cautionsApres)
    console.log(`Total: ${cautionsApres.length} caution(s)\n`)

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
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
