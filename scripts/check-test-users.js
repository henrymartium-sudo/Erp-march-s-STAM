/**
 * ============================================
 * PHASE 1 : VÉRIFICATION UTILISATEURS DE TEST
 * ============================================
 *
 * ⚠️ CE SCRIPT NE MODIFIE RIEN - LECTURE SEULE
 *
 * Objectif : Analyser l'état actuel de la base de données
 * - Lister tous les utilisateurs existants
 * - Identifier les utilisateurs de test manquants
 * - Afficher un rapport détaillé
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Utilisateurs de test cibles
const TEST_USERS = [
  {
    id: 'test-admin-001',
    email: 'admin@erp-marches.local',
    name: 'Admin Test',
    role: 'ADMIN'
  },
  {
    id: 'test-avance-001',
    email: 'avance@erp-marches.local',
    name: 'Avance Test',
    role: 'AVANCE'
  },
  {
    id: 'test-exploitation-001',
    email: 'exploitation@erp-marches.local',
    name: 'Exploitation Test',
    role: 'EXPLOITATION'
  },
  {
    id: 'test-visiteur-001',
    email: 'visiteur@erp-marches.local',
    name: 'Visiteur Test',
    role: 'VISITEUR'
  }
];

async function checkTestUsers() {
  console.log('\n🔍 PHASE 1 : ANALYSE DE LA BASE DE DONNÉES\n');
  console.log('━'.repeat(60));

  try {
    // 1. Lister TOUS les utilisateurs existants
    console.log('\n📊 ÉTAPE 1 : Liste de tous les utilisateurs existants\n');

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        role: 'asc'
      }
    });

    console.log(`   Total utilisateurs : ${allUsers.length}`);
    console.log('\n   Détails :\n');

    if (allUsers.length === 0) {
      console.log('   ⚠️  AUCUN UTILISATEUR TROUVÉ');
    } else {
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - Nom: ${user.name}`);
        console.log(`      - Rôle: ${user.role}`);
        console.log(`      - Créé: ${user.createdAt.toISOString()}`);
        console.log('');
      });
    }

    console.log('━'.repeat(60));

    // 2. Vérifier l'existence de chaque utilisateur de test
    console.log('\n📋 ÉTAPE 2 : Vérification des utilisateurs de test\n');

    const results = [];

    for (const testUser of TEST_USERS) {
      const existingUser = await prisma.user.findUnique({
        where: { email: testUser.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      results.push({
        ...testUser,
        exists: !!existingUser,
        current: existingUser
      });
    }

    // 3. Afficher le rapport
    console.log('   Résultats de la vérification :\n');

    let existingCount = 0;
    let missingCount = 0;
    const missingUsers = [];

    results.forEach((result, index) => {
      if (result.exists) {
        existingCount++;
        console.log(`   ${index + 1}. ✅ EXISTE : ${result.email}`);
        console.log(`      - ID actuel : ${result.current.id}`);
        console.log(`      - Rôle actuel : ${result.current.role}`);
        console.log(`      - Créé le : ${result.current.createdAt.toISOString()}`);

        // Vérifier si le rôle correspond
        if (result.current.role !== result.role) {
          console.log(`      ⚠️  ATTENTION : Rôle différent (attendu: ${result.role})`);
        }
      } else {
        missingCount++;
        missingUsers.push(result);
        console.log(`   ${index + 1}. ❌ MANQUANT : ${result.email}`);
        console.log(`      - ID attendu : ${result.id}`);
        console.log(`      - Rôle attendu : ${result.role}`);
      }
      console.log('');
    });

    console.log('━'.repeat(60));

    // 4. Résumé
    console.log('\n📊 RÉSUMÉ DE L\'ANALYSE\n');
    console.log(`   Total utilisateurs de test : 4`);
    console.log(`   ✅ Existants : ${existingCount}`);
    console.log(`   ❌ Manquants : ${missingCount}`);
    console.log('');

    if (missingCount === 0) {
      console.log('   🎉 TOUS LES UTILISATEURS DE TEST EXISTENT DÉJÀ !');
      console.log('   ℹ️  Aucune action requise.');
    } else {
      console.log('   📝 UTILISATEURS À CRÉER :\n');
      missingUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.role})`);
      });
    }

    console.log('\n━'.repeat(60));
    console.log('\n✅ PHASE 1 TERMINÉE - Aucune modification effectuée\n');

    // Retourner les résultats pour utilisation ultérieure
    return {
      total: allUsers.length,
      existingCount,
      missingCount,
      missingUsers,
      allUsers
    };

  } catch (error) {
    console.error('\n❌ ERREUR lors de l\'analyse :', error.message);
    console.error('\nDétails techniques :');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
if (require.main === module) {
  checkTestUsers()
    .then(() => {
      console.log('📊 Analyse terminée avec succès\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Échec de l\'analyse\n');
      process.exit(1);
    });
}

module.exports = { checkTestUsers, TEST_USERS };
