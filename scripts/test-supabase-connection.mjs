/**
 * Script de test de connexion Supabase Storage
 * Vérifie que les clés API sont correctes et que la connexion fonctionne
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

async function testConnection() {
  console.log('🔍 Test de connexion Supabase Storage...\n')

  try {
    // 1. Lister les buckets existants
    console.log('1️⃣ Récupération de la liste des buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('❌ Erreur lors de la récupération des buckets:', bucketsError.message)
      return
    }

    console.log('✅ Connexion réussie !')
    console.log(`📦 Buckets trouvés: ${buckets.length}`)

    if (buckets.length > 0) {
      console.log('\nBuckets existants:')
      buckets.forEach((bucket) => {
        console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
      })
    }

    // 2. Vérifier si le bucket 'marches-documents' existe
    const marchesBucket = buckets.find((b) => b.name === 'marches-documents')

    if (!marchesBucket) {
      console.log('\n⚠️  Le bucket "marches-documents" n\'existe pas encore.')
      console.log('\n📋 Prochaines étapes:')
      console.log('1. Va sur https://supabase.com/dashboard/project/awsvkjdziwzknnvkpuyq/storage/buckets')
      console.log('2. Clique sur "New bucket"')
      console.log('3. Remplis:')
      console.log('   - Name: marches-documents')
      console.log('   - Public: NON (décoché)')
      console.log('   - File size limit: 10 MB')
      console.log('4. Clique "Create bucket"')
      console.log('\nOu je peux créer un script pour le faire automatiquement.')
    } else {
      console.log('\n✅ Le bucket "marches-documents" existe déjà !')
      console.log(`   - Type: ${marchesBucket.public ? 'public' : 'private'}`)
      console.log(`   - ID: ${marchesBucket.id}`)

      // 3. Tester l'accès au bucket
      console.log('\n2️⃣ Test d\'accès au bucket...')
      const { data: files, error: filesError } = await supabase.storage
        .from('marches-documents')
        .list()

      if (filesError) {
        console.error('❌ Erreur d\'accès au bucket:', filesError.message)
        if (filesError.message.includes('not found')) {
          console.log('\n⚠️  Le bucket existe mais les politiques RLS ne sont peut-être pas configurées.')
          console.log('Consulte SUPABASE_STORAGE_SETUP.md étape 3 pour configurer les politiques.')
        }
      } else {
        console.log('✅ Accès au bucket réussi !')
        console.log(`📄 Fichiers dans le bucket: ${files.length}`)
      }
    }

    console.log('\n✅ Test terminé avec succès !')
  } catch (error) {
    console.error('❌ Erreur inattendue:', error)
  }
}

testConnection()
